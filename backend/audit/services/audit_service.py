from __future__ import annotations

from audit.constants import AuditAction
from audit.models import AuditLog
from audit.utils import get_client_ip


def log_action(
    *,
    action: str | AuditAction,
    request,
    actor=None,
    metadata: dict | None = None,
) -> AuditLog:
    return AuditLog.objects.create(
        actor=actor,
        action=action,
        ip_address=get_client_ip(request),
        metadata=metadata or {},
    )
