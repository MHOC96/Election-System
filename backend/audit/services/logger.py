from audit.models import AuditAction, AuditLog


def get_client_ip(request) -> str | None:
    if request is None:
        return None
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def log_action(*, request, action: str, actor=None, metadata: dict | None = None) -> AuditLog:
    if actor is None and request is not None and request.user.is_authenticated:
        actor = request.user

    return AuditLog.objects.create(
        actor=actor,
        action=action,
        ip_address=get_client_ip(request),
        metadata=metadata or {},
    )


__all__ = ["AuditAction", "AuditLog", "get_client_ip", "log_action"]
