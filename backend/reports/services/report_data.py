from django.db.models import Count

from accounts.models import User, UserRole
from candidates.models import Candidate
from dashboard.services.stats_service import (
    _resolve_election,
    get_dashboard_summary,
    get_live_stats,
)
from positions.models import Position
from voting.models import Vote


class ReportDataError(Exception):
    def __init__(self, message, code="report_error"):
        self.message = message
        self.code = code
        super().__init__(message)


def _require_election(election_id: int | None = None):
    election = _resolve_election(election_id)
    if election is None:
        raise ReportDataError("No election found for this report.", code="no_election")
    return election


def get_results_report_data(election_id: int | None = None) -> dict:
    election = _require_election(election_id)
    stats = get_live_stats(election.id, use_cache=False)
    rows = []
    for position in stats["positions"]:
        for ranking in position["rankings"]:
            rows.append(
                {
                    "position": position["position_name"],
                    "rank": ranking["rank"],
                    "candidate": ranking["full_name"],
                    "votes": ranking["vote_count"],
                    "percentage": ranking["vote_percentage"],
                    "is_winner": ranking["rank"] == 1,
                }
            )
    return {
        "title": "Election Results Report",
        "election": stats["election"],
        "rows": rows,
        "total_votes": stats["total_votes"],
    }


def get_candidates_report_data(election_id: int | None = None) -> dict:
    election = _resolve_election(election_id)
    candidates = Candidate.objects.select_related("position").order_by(
        "position__name", "full_name"
    )
    rows = [
        {
            "full_name": candidate.full_name,
            "academic_year": candidate.academic_year,
            "position": candidate.position.name,
            "photo_url": candidate.photo_url,
        }
        for candidate in candidates
    ]
    return {
        "title": "Candidate List Report",
        "election": {
            "id": election.id,
            "name": election.name,
            "status": election.status,
        }
        if election
        else None,
        "rows": rows,
    }


def get_turnout_report_data(election_id: int | None = None) -> dict:
    election = _require_election(election_id)
    summary = get_dashboard_summary(election.id)
    rows = [
        {
            "position": item["position_name"],
            "votes_cast": item["votes_cast"],
            "turnout_percentage": item["turnout_percentage"],
            "remaining_voters": item["remaining_voters"],
        }
        for item in summary["position_turnout"]
    ]
    return {
        "title": "Turnout Report",
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


def get_participation_report_data(election_id: int | None = None) -> dict:
    election = _require_election(election_id)
    total_positions = Position.objects.count()
    members = User.objects.filter(role=UserRole.MEMBER, is_active=True).order_by(
        "cpm_number"
    )

    vote_map = (
        Vote.objects.filter(election=election)
        .values("member_id")
        .annotate(positions_voted=Count("position_id", distinct=True))
    )
    voted_counts = {row["member_id"]: row["positions_voted"] for row in vote_map}

    member_positions = {}
    for vote in (
        Vote.objects.filter(election=election)
        .select_related("position", "member")
        .order_by("member__cpm_number", "position__name")
    ):
        member_positions.setdefault(vote.member_id, []).append(vote.position.name)

    rows = []
    for member in members:
        positions_voted = voted_counts.get(member.id, 0)
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
                "voted_positions": ", ".join(member_positions.get(member.id, [])),
            }
        )

    return {
        "title": "Voter Participation Report",
        "election": {
            "id": election.id,
            "name": election.name,
            "status": election.status,
        },
        "rows": rows,
    }
