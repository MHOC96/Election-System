"""Shared DRF throttle class lists for stacking scoped + global limits."""

import logging

from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

logger = logging.getLogger(__name__)

# Global UserRateThrottle already applies via DEFAULT_THROTTLE_CLASSES — do not duplicate here.
AUTHENTICATED_API_THROTTLE_CLASSES: tuple = ()

PUBLIC_API_THROTTLE_CLASSES = (AnonRateThrottle, UserRateThrottle)


class CacheSafeThrottleMixin:
    """Allow requests when the cache backend is down (e.g. Redis misconfigured on deploy)."""

    def allow_request(self, request, view):
        try:
            return super().allow_request(request, view)
        except Exception as exc:
            logger.warning(
                "Rate limit cache unavailable; allowing request (%s)",
                exc,
            )
            return True


class SafeAnonRateThrottle(CacheSafeThrottleMixin, AnonRateThrottle):
    pass


class SafeUserRateThrottle(CacheSafeThrottleMixin, UserRateThrottle):
    pass
