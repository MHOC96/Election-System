from django.db import IntegrityError, transaction

from accounts.models import User
from candidates.models import Candidate
from positions.models import Position
from voting.models import Election, ElectionStatus, Vote


class VoteError(Exception):
    def __init__(self, message, code="vote_error"):
        self.message = message
        self.code = code
        super().__init__(message)


def submit_vote(*, member: User, position_id: int, candidate_id: int) -> Vote:
    if not member.can_vote():
        raise VoteError("Only active members are allowed to vote.", code="not_authorized")

    with transaction.atomic():
        election = (
            Election.objects.select_for_update()
            .filter(status=ElectionStatus.ACTIVE)
            .first()
        )
        if election is None:
            raise VoteError("No active election.", code="election_not_active")

        try:
            position = Position.objects.get(pk=position_id)
        except Position.DoesNotExist as exc:
            raise VoteError("Invalid position.", code="invalid_position") from exc

        try:
            candidate = Candidate.objects.select_related("position").get(pk=candidate_id)
        except Candidate.DoesNotExist as exc:
            raise VoteError("Invalid candidate.", code="invalid_candidate") from exc

        if candidate.position_id != position.id:
            raise VoteError(
                "Candidate does not belong to the selected position.",
                code="candidate_position_mismatch",
            )

        if Vote.objects.filter(member=member, position=position).exists():
            raise VoteError(
                "You have already voted for this position.",
                code="duplicate_vote",
            )

        try:
            vote = Vote.objects.create(
                member=member,
                position=position,
                candidate=candidate,
                election=election,
            )
        except IntegrityError as exc:
            raise VoteError(
                "You have already voted for this position.",
                code="duplicate_vote",
            ) from exc

    from dashboard.services.stats_service import invalidate_dashboard_cache

    invalidate_dashboard_cache(election.id)

    return vote


def get_member_vote_status(member: User, election: Election | None = None) -> dict:
    votes = Vote.objects.filter(member=member).select_related(
        "position", "candidate", "election"
    )
    if election:
        votes = votes.filter(election=election)

    vote_items = [
        {
            "position_id": vote.position_id,
            "position_name": vote.position.name,
            "candidate_id": vote.candidate_id,
            "candidate_name": vote.candidate.full_name,
            "voted_at": vote.created_at,
        }
        for vote in votes
    ]

    positions_total = Position.objects.count()
    positions_voted = len(vote_items)

    return {
        "election": {
            "id": election.id,
            "name": election.name,
            "status": election.status,
        }
        if election
        else None,
        "votes": vote_items,
        "positions_voted": positions_voted,
        "positions_total": positions_total,
        "positions_remaining": positions_total - positions_voted,
        "ballot_complete": positions_voted == positions_total and positions_total > 0,
    }
