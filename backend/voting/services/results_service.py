from django.db.models import Count, Q
from django.utils import timezone

from candidates.models import Candidate
from positions.models import Position
from voting.models import Election, ElectionPhase, ElectionStatus, Vote


def _pct(part: int, whole: int) -> float:
    if whole == 0:
        return 0.0
    return round((part / whole) * 100, 2)


def get_published_results(*, academic_year: str | None) -> dict | None:
    election = (
        Election.objects.filter(
            status=ElectionStatus.SCHEDULED,
            results_published=True,
        )
        .order_by("-updated_at")
        .first()
    )
    if election is None:
        return None

    positions_qs = Position.objects.all().order_by("name")
    if academic_year:
        positions_qs = positions_qs.filter(academic_year=academic_year)
    else:
        return {
            "election": {
                "id": election.id,
                "name": election.name,
                "current_phase": election.get_current_phase(),
            },
            "positions": [],
        }

    vote_filter = Q(votes__election_id=election.id)
    candidates = (
        Candidate.objects.filter(election_id=election.id, position__in=positions_qs)
        .select_related("position")
        .annotate(vote_count=Count("votes", filter=vote_filter))
        .order_by("position__name", "-vote_count", "full_name")
    )

    by_position: dict[int, list] = {}
    for candidate in candidates:
        by_position.setdefault(candidate.position_id, []).append(
            {
                "candidate_id": candidate.id,
                "full_name": candidate.full_name,
                "photo_url": candidate.photo_url,
                "vote_count": candidate.vote_count,
            }
        )

    position_items = []
    for position in positions_qs:
        ranked = by_position.get(position.id, [])
        total_votes = sum(item["vote_count"] for item in ranked)
        for index, item in enumerate(ranked, start=1):
            item["rank"] = index
            item["vote_percentage"] = _pct(item["vote_count"], total_votes)
        winner = ranked[0] if ranked else None
        position_items.append(
            {
                "position_id": position.id,
                "position_name": position.name,
                "academic_year": position.academic_year,
                "total_votes": total_votes,
                "winner": winner,
                "candidates": ranked,
            }
        )

    return {
        "election": {
            "id": election.id,
            "name": election.name,
            "current_phase": election.get_current_phase(),
            "results_published": election.results_published,
        },
        "positions": position_items,
    }
