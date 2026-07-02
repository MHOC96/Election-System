from dataclasses import dataclass

from django.db import connection, transaction

from accounts.models import User, UserRole
from voting.models import Election, ElectionStatus, Vote


class MemberDeletionNotAllowedError(Exception):
    def __init__(self, message: str = "Members can only be deleted after the election is over."):
        self.message = message
        super().__init__(message)


@dataclass
class BulkMemberDeleteResult:
    requested: int
    deleted: list[dict[str, str | int]]
    failed: list[dict[str, str | int]]


def member_deletion_allowed() -> bool:
    """Members may be removed when no election is active or currently paused."""
    if Election.objects.filter(status=ElectionStatus.ACTIVE).exists():
        return False

    stopped_elections = Election.objects.filter(status=ElectionStatus.STOPPED)
    if not stopped_elections.exists():
        return True

    latest_closed = (
        Election.objects.filter(status=ElectionStatus.CLOSED)
        .order_by("-closed_at", "-updated_at")
        .first()
    )
    if latest_closed is None:
        return False

    latest_stopped = stopped_elections.order_by("-stopped_at", "-updated_at").first()
    stopped_at = latest_stopped.stopped_at or latest_stopped.updated_at
    closed_at = latest_closed.closed_at or latest_closed.updated_at
    return closed_at >= stopped_at


def assert_member_deletion_allowed() -> None:
    if not member_deletion_allowed():
        raise MemberDeletionNotAllowedError()


_legacy_audit_log_table_exists_cache: bool | None = None


def _legacy_audit_log_table_exists() -> bool:
    global _legacy_audit_log_table_exists_cache
    if _legacy_audit_log_table_exists_cache is not None:
        return _legacy_audit_log_table_exists_cache

    with connection.cursor() as cursor:
        tables = connection.introspection.table_names(cursor)
    _legacy_audit_log_table_exists_cache = "audit_auditlog" in tables
    return _legacy_audit_log_table_exists_cache


def _clear_legacy_audit_logs_for_users(user_ids: list[int]) -> None:
    """Remove orphan audit rows that still reference users after audit app removal."""
    if not user_ids or not _legacy_audit_log_table_exists():
        return

    placeholders = ", ".join(["%s"] * len(user_ids))
    with connection.cursor() as cursor:
        cursor.execute(
            f"DELETE FROM audit_auditlog WHERE actor_id IN ({placeholders})",
            user_ids,
        )


def _delete_members(user_ids: list[int]) -> int:
    if not user_ids:
        return 0

    with transaction.atomic():
        Vote.objects.filter(member_id__in=user_ids).delete()
        _clear_legacy_audit_logs_for_users(user_ids)
        deleted, _ = User.objects.filter(pk__in=user_ids, role=UserRole.MEMBER).delete()

    return deleted


def delete_member(member: User) -> None:
    assert_member_deletion_allowed()
    if member.role != UserRole.MEMBER:
        raise ValueError("Only members can be deleted through this endpoint.")

    _delete_members([member.pk])


@dataclass
class ClearAllMembersResult:
    deleted: int


def clear_all_members() -> ClearAllMembersResult:
    assert_member_deletion_allowed()

    member_ids = list(User.objects.filter(role=UserRole.MEMBER).values_list("pk", flat=True))
    if not member_ids:
        return ClearAllMembersResult(deleted=0)

    deleted = _delete_members(member_ids)
    return ClearAllMembersResult(deleted=deleted)


def bulk_delete_members(member_ids: list[int]) -> BulkMemberDeleteResult:
    assert_member_deletion_allowed()

    result = BulkMemberDeleteResult(requested=len(member_ids), deleted=[], failed=[])
    unique_ids = list(dict.fromkeys(member_ids))

    members = list(User.objects.filter(pk__in=unique_ids, role=UserRole.MEMBER))
    members_by_id = {member.id: member for member in members}

    for member_id in unique_ids:
        if member_id not in members_by_id:
            result.failed.append(
                {"id": member_id, "cpm_number": "", "reason": "Member not found."}
            )

    if not members:
        return result

    member_pks = [member.id for member in members]
    try:
        _delete_members(member_pks)
        for member in members:
            result.deleted.append({"id": member.id, "cpm_number": member.cpm_number})
    except Exception as exc:  # noqa: BLE001 — surface batch failure to caller
        for member in members:
            result.failed.append(
                {
                    "id": member.id,
                    "cpm_number": member.cpm_number,
                    "reason": str(exc),
                }
            )

    return result
