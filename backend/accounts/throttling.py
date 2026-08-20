from config.throttling import SafeAnonRateThrottle, SafeUserRateThrottle


class AuthRateThrottle(SafeAnonRateThrottle):
    """Login / token refresh — keyed by client IP."""

    scope = "auth"


class AuthenticatedAuthRateThrottle(SafeUserRateThrottle):
    """Sensitive authenticated auth actions (password change)."""

    scope = "auth_user"
