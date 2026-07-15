"""Short-lived cache for position list responses."""

from django.core.cache import cache

from accounts.models import User

POSITIONS_LIST_CACHE_SECONDS = 60


def _cache_version() -> int:
    return cache.get("positions:list:ver", 0)


def bump_positions_list_cache() -> None:
    key = "positions:list:ver"
    try:
        cache.incr(key)
    except ValueError:
        cache.set(key, 1, timeout=None)


def get_positions_list_cache_key(user: User) -> str:
    academic_year = getattr(user, "academic_year", None) or "all"
    role = getattr(user, "role", "unknown")
    return f"positions:list:v{_cache_version()}:{role}:{academic_year}"


def get_cached_positions_list(user: User):
    return cache.get(get_positions_list_cache_key(user))


def set_cached_positions_list(user: User, payload) -> None:
    cache.set(
        get_positions_list_cache_key(user),
        payload,
        POSITIONS_LIST_CACHE_SECONDS,
    )
