"""Shared DRF throttle class lists for stacking scoped + global limits."""

from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

# Global UserRateThrottle already applies via DEFAULT_THROTTLE_CLASSES — do not duplicate here.
AUTHENTICATED_API_THROTTLE_CLASSES: tuple = ()

PUBLIC_API_THROTTLE_CLASSES = (AnonRateThrottle, UserRateThrottle)
