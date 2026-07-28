from django.core.cache import cache
from rest_framework_simplejwt.authentication import JWTAuthentication

USER_AUTH_CACHE_SECONDS = 60


def user_auth_cache_key(user_id: int) -> str:
    return f"auth:user:{user_id}"


def invalidate_user_auth_cache(user_id: int) -> None:
    cache.delete(user_auth_cache_key(user_id))


class CachedJWTAuthentication(JWTAuthentication):
    """JWT auth with a short-lived user cache to avoid a DB hit on every API request."""

    def get_user(self, validated_token):
        user_id = validated_token.get("user_id")
        if user_id is None:
            return super().get_user(validated_token)

        cache_key = user_auth_cache_key(user_id)
        cached_user = cache.get(cache_key)
        if cached_user is not None:
            return cached_user

        user = super().get_user(validated_token)
        cache.set(cache_key, user, USER_AUTH_CACHE_SECONDS)
        return user
