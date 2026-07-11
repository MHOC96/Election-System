from django.core.cache import cache

from voting.models import Election
from voting.serializers import ElectionSerializer

ONGOING_ELECTION_CACHE_KEY = "elections:ongoing:payload"
ONGOING_ELECTION_CACHE_SECONDS = 10
_MISSING = "__none__"


def get_ongoing_election_payload() -> dict | None:
    cached = cache.get(ONGOING_ELECTION_CACHE_KEY)
    if cached == _MISSING:
        return None
    if cached is not None:
        return cached

    election = Election.get_ongoing()
    if election is None:
        cache.set(ONGOING_ELECTION_CACHE_KEY, _MISSING, ONGOING_ELECTION_CACHE_SECONDS)
        return None

    payload = ElectionSerializer(election).data
    cache.set(ONGOING_ELECTION_CACHE_KEY, payload, ONGOING_ELECTION_CACHE_SECONDS)
    return payload


def invalidate_ongoing_election_cache() -> None:
    cache.delete(ONGOING_ELECTION_CACHE_KEY)
