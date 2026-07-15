import logging
import sys
import threading
import time

from django.core.cache import cache
from django.db import close_old_connections

from dashboard.services.materialized_stats import (
    materialized_view_available,
    refresh_live_stats_view,
)

logger = logging.getLogger(__name__)

MV_STALE_SINCE_KEY = "dashboard:mv:stale_since"
MV_LAST_REFRESH_KEY = "dashboard:mv:last_refresh"
MV_DEBOUNCE_KEY = "dashboard:mv:refresh_debounce"
MV_REFRESH_DEBOUNCE_SECONDS = 10


def mark_mv_stale() -> None:
    cache.set(MV_STALE_SINCE_KEY, time.monotonic(), timeout=None)


def mv_counts_are_fresh() -> bool:
    stale_since = cache.get(MV_STALE_SINCE_KEY)
    if stale_since is None:
        return True
    last_refresh = cache.get(MV_LAST_REFRESH_KEY, 0)
    return last_refresh >= stale_since


def _record_mv_refresh() -> None:
    cache.set(MV_LAST_REFRESH_KEY, time.monotonic(), timeout=None)


def record_mv_refresh() -> None:
    """Mark the materialized view as up to date (e.g. after a manual refresh)."""
    _record_mv_refresh()


def _run_mv_refresh(*, from_worker: bool = False) -> None:
    if from_worker:
        close_old_connections()
    try:
        refresh_live_stats_view()
    except Exception:
        logger.debug("Debounced materialized view refresh failed.", exc_info=True)


def invalidate_live_stats_mv() -> None:
    """Mark vote-count MV stale and schedule a debounced refresh."""
    mark_mv_stale()
    schedule_debounced_mv_refresh()


def schedule_debounced_mv_refresh() -> None:
    """Refresh live-stats MV at most once per debounce window (async in production)."""
    if not materialized_view_available():
        return

    if "test" in sys.argv:
        _run_mv_refresh()
        return

    if not cache.add(MV_DEBOUNCE_KEY, 1, MV_REFRESH_DEBOUNCE_SECONDS):
        return

    threading.Thread(
        target=lambda: _run_mv_refresh(from_worker=True),
        daemon=True,
    ).start()
