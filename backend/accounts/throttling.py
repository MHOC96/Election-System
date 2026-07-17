from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class AuthRateThrottle(AnonRateThrottle):
    """Login / token refresh — keyed by client IP."""

    scope = "auth"


class AuthenticatedAuthRateThrottle(UserRateThrottle):
    """Sensitive authenticated auth actions (password change)."""

    scope = "auth_user"
