import logging

from django.core.cache import cache
from rest_framework_simplejwt.authentication import JWTAuthentication

logger = logging.getLogger(__name__)

USER_AUTH_CACHE_SECONDS = 60


def user_auth_cache_key(user_id: int) -> str:
    return f"auth:user:{user_id}"


def invalidate_user_auth_cache(user_id: int) -> None:
    try:
        cache.delete(user_auth_cache_key(user_id))
    except Exception as exc:
        logger.warning("Auth cache delete failed (%s)", exc)


class CachedJWTAuthentication(JWTAuthentication):
    """JWT auth with a short-lived user cache to avoid a DB hit on every API request."""

    def get_user(self, validated_token):
        user_id = validated_token.get("user_id")
        if user_id is None:
            return super().get_user(validated_token)

        cache_key = user_auth_cache_key(user_id)
        try:
            cached_user = cache.get(cache_key)
            if cached_user is not None:
                return cached_user
        except Exception as exc:
            logger.warning("Auth cache read failed (%s)", exc)

        user = super().get_user(validated_token)
        try:
            cache.set(cache_key, user, USER_AUTH_CACHE_SECONDS)
        except Exception as exc:
            logger.warning("Auth cache write failed (%s)", exc)
        return user
