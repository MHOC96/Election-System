"""Shared DRF throttle class lists for stacking scoped + global limits."""

from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

AUTHENTICATED_API_THROTTLE_CLASSES = (UserRateThrottle,)

PUBLIC_API_THROTTLE_CLASSES = (AnonRateThrottle, UserRateThrottle)
