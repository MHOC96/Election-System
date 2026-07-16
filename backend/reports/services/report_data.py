from django.contrib.postgres.aggregates import StringAgg
from django.db.models import Count

from accounts.models import User, UserRole
from candidates.models import Candidate
from dashboard.services.stats_service import (
    get_dashboard_summary,
    get_live_stats,
)
from positions.models import Position
from voting.models import Election, ElectionStatus, Vote


class ReportDataError(Exception):
    def __init__(self, message, code="report_error"):
        self.message = message
        self.code = code
        super().__init__(message)


def _resolve_report_election(election_id: int | None = None) -> Election | None:
    if election_id:
        return Election.objects.filter(pk=election_id).first()
    return (
        Election.objects.filter(status=ElectionStatus.ARCHIVED)
        .order_by("-created_at")
        .first()
    )


def _require_archived_election(election_id: int | None = None) -> Election:
    election = _resolve_report_election(election_id)
    if election is None:
        raise ReportDataError(
            "No archived election found. Reports are available after an election is archived.",
            code="no_election",
        )
    if election.status != ElectionStatus.ARCHIVED:
        raise ReportDataError(
            "Reports are available only for archived elections.",
            code="election_not_archived",
        )
    return election


def get_results_report_data(election_id: int | None = None, academic_year: str | None = None) -> dict:
    election = _require_archived_election(election_id)
    stats = get_live_stats(election.id, use_cache=True, academic_year=academic_year)
    rows = []
    for position in stats["positions"]:
        winner_ids = {w["candidate_id"] for w in position.get("winners", [])}
        for ranking in position["rankings"]:
            rows.append(
                {
                    "position": position["position_name"],
                    "rank": ranking["rank"],
                    "candidate": ranking["full_name"],
                    "votes": ranking["vote_count"],
                    "percentage": ranking["vote_percentage"],
                    "is_winner": ranking["candidate_id"] in winner_ids,
                }
            )
    title = "Election Results Report"
    if academic_year:
        title += f" - {academic_year}"
    return {
        "title": title,
        "election": stats["election"],
        "rows": rows,
        "total_votes": stats["total_votes"],
    }


def get_candidates_report_data(election_id: int | None = None, academic_year: str | None = None) -> dict:
    from django.db.models import Q

    election = _require_archived_election(election_id)
    candidates_qs = Candidate.objects.select_related("position").filter(election_id=election.id)
    if academic_year:
        candidates_qs = candidates_qs.filter(Q(position__academic_year__isnull=True) | Q(position__academic_year=academic_year))
    candidates = candidates_qs.order_by("position__name", "full_name")
    rows = [
        {
            "full_name": candidate.full_name,
            "academic_year": candidate.academic_year,
            "position": candidate.position.name,
            "photo_url": candidate.photo_url,
        }
        for candidate in candidates
    ]
    title = "Candidate List Report"
    if academic_year:
        title += f" - {academic_year}"
    return {
        "title": title,
        "election": {
            "id": election.id,
            "name": election.name,
            "status": election.status,
        },
        "rows": rows,
    }


def get_turnout_report_data(election_id: int | None = None, academic_year: str | None = None) -> dict:
    election = _require_archived_election(election_id)
    summary = get_dashboard_summary(election.id, use_cache=True, academic_year=academic_year)
    rows = [
        {
            "position": item["position_name"],
            "votes_cast": item["votes_cast"],
            "turnout_percentage": item["turnout_percentage"],
            "remaining_voters": item["remaining_voters"],
        }
        for item in summary["position_turnout"]
    ]
    title = "Turnout Report"
    if academic_year:
        title += f" - {academic_year}"
    return {
        "title": title,
        "election": summary["election"],
        "summary": {
            "total_members": summary["total_members"],
            "votes_cast": summary["votes_cast"],
            "turnout_percentage": summary["turnout_percentage"],
            "full_ballot_completion_percentage": summary["full_ballot_completion_percentage"],
            "members_completed_ballot": summary["members_completed_ballot"],
            "members_partial_ballot": summary["members_partial_ballot"],
            "members_no_votes": summary["members_no_votes"],
        },
        "rows": rows,
    }


def get_participation_report_data(election_id: int | None = None, academic_year: str | None = None) -> dict:
    election = _require_archived_election(election_id)
    from voting.services.vote_service import count_votable_positions

    total_positions = count_votable_positions(
        academic_year=academic_year,
        election_id=election.id,
    )

    members_qs = User.objects.filter(role=UserRole.MEMBER, is_active=True)
    if academic_year:
        members_qs = members_qs.filter(academic_year=academic_year)

    votes_qs = Vote.objects.filter(election=election)
    if academic_year:
        votes_qs = votes_qs.filter(member__academic_year=academic_year)

    vote_stats = {
        row["member_id"]: row
        for row in votes_qs.values("member_id").annotate(
            positions_voted=Count("position_id", distinct=True),
            voted_positions=StringAgg(
                "position__name",
                delimiter=", ",
                distinct=True,
                ordering="position__name",
            ),
        )
    }

    rows = []
    for member in members_qs.only("id", "cpm_number").order_by("cpm_number").iterator(
        chunk_size=500
    ):
        stats = vote_stats.get(member.id)
        positions_voted = stats["positions_voted"] if stats else 0
        if positions_voted == 0:
            status = "No Vote"
        elif total_positions > 0 and positions_voted >= total_positions:
            status = "Complete"
        else:
            status = "Partial"

        rows.append(
            {
                "cpm_number": member.cpm_number,
                "positions_voted": positions_voted,
                "total_positions": total_positions,
                "participation_status": status,
                "voted_positions": stats["voted_positions"] if stats else "",
            }
        )

    title = "Voter Participation Report"
    if academic_year:
        title += f" - {academic_year}"
    return {
        "title": title,
        "election": {
            "id": election.id,
            "name": election.name,
            "status": election.status,
        },
        "rows": rows,
    }
