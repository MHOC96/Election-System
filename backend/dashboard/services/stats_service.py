from collections import defaultdict

from django.core.cache import cache
from django.db.models import Count, Q

from accounts.models import User, UserRole
from candidates.models import Candidate
from positions.models import Position
from voting.models import Election, ElectionStatus, Vote

LIVE_STATS_CACHE_SECONDS = 8
SUMMARY_CACHE_SECONDS = 15
OVERVIEW_CACHE_SECONDS = 10


def _cache_version(scope: str | int) -> int:
    return cache.get(f"dashboard:ver:{scope}", 0)


def _bump_cache_version(scope: str | int) -> None:
    key = f"dashboard:ver:{scope}"
    try:
        cache.incr(key)
    except ValueError:
        cache.set(key, 1, timeout=None)


def _summary_cache_key(election_id: int | None) -> str:
    scope = election_id if election_id is not None else "default"
    return f"dashboard:summary:{scope}:v{_cache_version(scope)}"


def _live_stats_cache_key(election_id: int) -> str:
    return f"dashboard:live_stats:{election_id}:v{_cache_version(election_id)}"


def _overview_cache_key(election_id: int | None) -> str:
    scope = election_id if election_id is not None else "default"
    return f"dashboard:overview:{scope}:v{_cache_version(scope)}"


def _resolve_election(election_id: int | None = None) -> Election | None:
    if election_id:
        return Election.objects.filter(pk=election_id).first()
    active = Election.get_active()
    if active:
        return active
    return Election.objects.exclude(status=ElectionStatus.DRAFT).order_by("-created_at").first()


def _pct(part: int, whole: int) -> float:
    if whole == 0:
        return 0.0
    return round((part / whole) * 100, 2)


def get_dashboard_overview(
    election_id: int | None = None, *, use_cache: bool = True
) -> dict:
    """Return summary and live stats in one response (single round trip)."""
    cache_key = _overview_cache_key(election_id)
    if use_cache:
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

    result = {
        "summary": get_dashboard_summary(election_id, use_cache=use_cache),
        "live": get_live_stats(election_id, use_cache=use_cache),
    }
    if use_cache:
        cache.set(cache_key, result, OVERVIEW_CACHE_SECONDS)
    return result


def get_dashboard_summary(
    election_id: int | None = None, *, use_cache: bool = True
) -> dict:
    cache_key = _summary_cache_key(election_id)
    if use_cache:
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

    election = _resolve_election(election_id)
    total_members = User.objects.filter(role=UserRole.MEMBER, is_active=True).count()
    total_candidates = Candidate.objects.count()
    total_positions = Position.objects.count()

    position_turnout = []
    members_completed_ballot = 0
    members_partial_ballot = 0
    members_no_votes = total_members
    votes_cast = 0

    if election and total_positions > 0 and total_members > 0:
        vote_filter = Q(votes__election_id=election.id)
        annotated_positions = (
            Position.objects.annotate(votes_cast=Count("votes", filter=vote_filter))
            .order_by("name")
        )

        for position in annotated_positions:
            position_votes = position.votes_cast
            votes_cast += position_votes
            position_turnout.append(
                {
                    "position_id": position.id,
                    "position_name": position.name,
                    "votes_cast": position_votes,
                    "turnout_percentage": _pct(position_votes, total_members),
                    "remaining_voters": total_members - position_votes,
                }
            )

        member_vote_counts = (
            Vote.objects.filter(election=election)
            .values("member_id")
            .annotate(positions_voted=Count("position_id", distinct=True))
        )
        for row in member_vote_counts:
            count = row["positions_voted"]
            if count >= total_positions:
                members_completed_ballot += 1
            elif count > 0:
                members_partial_ballot += 1

        members_no_votes = (
            total_members - members_completed_ballot - members_partial_ballot
        )
    elif election:
        votes_cast = Vote.objects.filter(election=election).count()

    avg_position_turnout = (
        round(
            sum(item["turnout_percentage"] for item in position_turnout)
            / len(position_turnout),
            2,
        )
        if position_turnout
        else 0.0
    )

    payload = {
        "election": _election_payload(election),
        "total_members": total_members,
        "total_candidates": total_candidates,
        "total_positions": total_positions,
        "votes_cast": votes_cast,
        "turnout_percentage": avg_position_turnout,
        "full_ballot_completion_percentage": _pct(members_completed_ballot, total_members),
        "remaining_voters": members_no_votes,
        "remaining_incomplete_ballot": members_partial_ballot,
        "members_completed_ballot": members_completed_ballot,
        "members_partial_ballot": members_partial_ballot,
        "members_no_votes": members_no_votes,
        "position_turnout": position_turnout,
    }

    if use_cache:
        cache.set(cache_key, payload, SUMMARY_CACHE_SECONDS)

    return payload


def get_live_stats(election_id: int | None = None, *, use_cache: bool = True) -> dict:
    election = _resolve_election(election_id)
    if election is None:
        return {
            "election": None,
            "total_votes": 0,
            "candidates": [],
            "positions": [],
            "highest_voted_overall": None,
        }

    cache_key = _live_stats_cache_key(election.id)
    if use_cache:
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

    vote_filter = Q(votes__election_id=election.id)

    candidates = (
        Candidate.objects.select_related("position")
        .annotate(vote_count=Count("votes", filter=vote_filter))
        .order_by("position__name", "-vote_count", "full_name")
    )

    total_votes = 0
    candidate_stats = []
    for candidate in candidates:
        total_votes += candidate.vote_count
        candidate_stats.append(
            {
                "candidate_id": candidate.id,
                "full_name": candidate.full_name,
                "position_id": candidate.position_id,
                "position_name": candidate.position.name,
                "vote_count": candidate.vote_count,
                "vote_percentage": 0.0,
            }
        )

    if total_votes > 0:
        for item in candidate_stats:
            item["vote_percentage"] = _pct(item["vote_count"], total_votes)

    candidates_by_position: dict[int, list[dict]] = defaultdict(list)
    for item in candidate_stats:
        candidates_by_position[item["position_id"]].append(item)

    positions = Position.objects.all().order_by("name")
    position_stats = []
    highest_overall = None

    for position in positions:
        position_candidates = candidates_by_position.get(position.id, [])
        position_candidates.sort(key=lambda item: (-item["vote_count"], item["full_name"]))

        rankings = []
        for rank, item in enumerate(position_candidates, start=1):
            entry = {**item, "rank": rank}
            rankings.append(entry)
            if highest_overall is None or entry["vote_count"] > highest_overall["vote_count"]:
                highest_overall = entry
            elif (
                highest_overall
                and entry["vote_count"] == highest_overall["vote_count"]
                and entry["full_name"] < highest_overall["full_name"]
            ):
                highest_overall = entry

        position_total_votes = sum(item["vote_count"] for item in position_candidates)
        top = rankings[0] if rankings else None

        position_stats.append(
            {
                "position_id": position.id,
                "position_name": position.name,
                "total_votes": position_total_votes,
                "rankings": rankings,
                "highest_voted_candidate": top,
            }
        )

    payload = {
        "election": _election_payload(election),
        "total_votes": total_votes,
        "candidates": candidate_stats,
        "positions": position_stats,
        "highest_voted_overall": highest_overall,
        "cached_seconds": LIVE_STATS_CACHE_SECONDS,
    }

    if use_cache:
        cache.set(cache_key, payload, LIVE_STATS_CACHE_SECONDS)

    return payload


def get_position_rankings(position_id: int, election_id: int | None = None) -> dict | None:
    election = _resolve_election(election_id)
    if election is None:
        return None

    try:
        position = Position.objects.get(pk=position_id)
    except Position.DoesNotExist:
        return None

    live_stats = get_live_stats(election.id, use_cache=True)
    for item in live_stats["positions"]:
        if item["position_id"] == position_id:
            return {
                "election": live_stats["election"],
                "position_id": position.id,
                "position_name": position.name,
                "total_votes": item["total_votes"],
                "rankings": item["rankings"],
                "highest_voted_candidate": item["highest_voted_candidate"],
            }
    return {
        "election": live_stats["election"],
        "position_id": position.id,
        "position_name": position.name,
        "total_votes": 0,
        "rankings": [],
        "highest_voted_candidate": None,
    }


def _election_payload(election: Election | None) -> dict | None:
    if election is None:
        return None
    return {
        "id": election.id,
        "name": election.name,
        "status": election.status,
        "started_at": election.started_at,
        "stopped_at": election.stopped_at,
        "closed_at": election.closed_at,
    }


def invalidate_dashboard_cache(election_id: int | None = None) -> None:
    """Bump cache versions so readers miss stale entries without delete storms."""
    _bump_cache_version("default")
    if election_id is not None:
        _bump_cache_version(election_id)
