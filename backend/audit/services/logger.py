import threading

from django.core.cache import cache
from django.db import close_old_connections

from audit.models import AuditAction, AuditLog


def get_client_ip(request) -> str | None:
    if request is None:
        return None
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def _invalidate_recent_audit_cache() -> None:
    for limit in (5, 10, 20):
        cache.delete(f"audit:recent:{limit}")


def log_action(*, request, action: str, actor=None, metadata: dict | None = None) -> AuditLog:
    if actor is None and request is not None and request.user.is_authenticated:
        actor = request.user

    log = AuditLog.objects.create(
        actor=actor,
        action=action,
        ip_address=get_client_ip(request),
        metadata=metadata or {},
    )
    _invalidate_recent_audit_cache()
    return log


def log_action_async(
    *,
    action: str,
    actor_id: int | None = None,
    ip_address: str | None = None,
    metadata: dict | None = None,
) -> None:
    """Write audit log in a background thread so login responses are not blocked."""

    def _write() -> None:
        close_old_connections()
        try:
            from accounts.models import User

            actor = User.objects.filter(pk=actor_id).first() if actor_id else None
            AuditLog.objects.create(
                actor=actor,
                action=action,
                ip_address=ip_address,
                metadata=metadata or {},
            )
            _invalidate_recent_audit_cache()
        finally:
            close_old_connections()

    threading.Thread(target=_write, daemon=True).start()


__all__ = ["AuditAction", "AuditLog", "get_client_ip", "log_action", "log_action_async"]
