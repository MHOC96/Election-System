from django.db import IntegrityError, transaction
from django.db.models import Count, Q

from accounts.models import User
from candidates.models import Candidate
from positions.models import Position
from voting.models import Election, ElectionPhase, Vote


class VoteError(Exception):
    def __init__(self, message, code="vote_error"):
        self.message = message
        self.code = code
        super().__init__(message)


def submit_vote(*, member: User, position_id: int, candidate_id: int) -> Vote:
    if not member.can_vote():
        raise VoteError("Only active members are allowed to vote.", code="not_authorized")

    with transaction.atomic():
        election = Election.get_ongoing()
        if election is None or not election.is_voting_open:
            raise VoteError("Voting is not currently open.", code="election_not_active")

        try:
            position = Position.objects.get(pk=position_id)
        except Position.DoesNotExist as exc:
            raise VoteError("Invalid position.", code="invalid_position") from exc

        try:
            candidate = Candidate.objects.select_related("position").get(
                pk=candidate_id,
                election_id=election.id,
            )
        except Candidate.DoesNotExist as exc:
            raise VoteError("Invalid candidate.", code="invalid_candidate") from exc

        if candidate.position_id != position.id:
            raise VoteError(
                "Candidate does not belong to the selected position.",
                code="candidate_position_mismatch",
            )

        if not member.academic_year:
            raise VoteError(
                "Your academic year is not set. Contact an administrator.",
                code="ineligible_position",
            )
        if position.academic_year != member.academic_year:
            raise VoteError(
                "You are not eligible to vote for this position.",
                code="ineligible_position",
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

    return Vote.objects.select_related("position", "candidate").get(pk=vote.pk)


def count_votable_positions(
    member: User | None = None,
    academic_year: str | None = None,
    election_id: int | None = None,
) -> int:
    candidate_filter = Q()
    if election_id:
        candidate_filter &= Q(candidates__election_id=election_id)

    qs = Position.objects.annotate(
        candidate_count=Count("candidates", filter=candidate_filter)
    ).filter(candidate_count__gt=0)

    target_year = academic_year or (member.academic_year if member else None)
    if target_year:
        qs = qs.filter(academic_year=target_year)
    else:
        return 0

    return qs.count()


def build_member_vote_status(
    member: User,
    election: Election | None,
    *,
    votes: list[Vote] | None = None,
    positions_total: int | None = None,
    current_phase: str | None = None,
) -> dict:
    if positions_total is None:
        positions_total = count_votable_positions(member, election_id=election.id if election else None)
    recently_closed = Election.get_recently_closed()

    if election is None:
        return {
            "election": None,
            "votes": [],
            "positions_voted": 0,
            "positions_total": positions_total,
            "positions_remaining": positions_total,
            "all_positions_voted": False,
            "can_vote": False,
            "election_ended": recently_closed is not None,
        }

    if votes is None:
        votes = list(
            Vote.objects.filter(member=member, election=election).select_related(
                "position", "candidate"
            )
        )

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

    positions_voted = len(vote_items)
    phase = current_phase or election.get_current_phase()
    can_vote = phase == ElectionPhase.VOTING_OPEN

    return {
        "election": {
            "id": election.id,
            "name": election.name,
            "status": election.status,
            "current_phase": phase,
            "voting_start_at": election.voting_start_at,
            "voting_end_at": election.voting_end_at,
        },
        "votes": vote_items,
        "positions_voted": positions_voted,
        "positions_total": positions_total,
        "positions_remaining": max(positions_total - positions_voted, 0),
        "all_positions_voted": positions_voted == positions_total and positions_total > 0,
        "can_vote": can_vote,
        "election_ended": False,
    }


def get_member_vote_status(member: User, election: Election | None = None) -> dict:
    return build_member_vote_status(member, election)
