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
    """Members may be removed when no election is active or ongoing."""
    return not Election.objects.filter(status=ElectionStatus.SCHEDULED).exists()


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

    batch_size = 1000
    with connection.cursor() as cursor:
        for i in range(0, len(user_ids), batch_size):
            batch = user_ids[i:i + batch_size]
            placeholders = ", ".join(["%s"] * len(batch))
            cursor.execute(
                f"DELETE FROM audit_auditlog WHERE actor_id IN ({placeholders})",
                batch,
            )


def _delete_members(user_ids: list[int]) -> int:
    if not user_ids:
        return 0

    total_deleted = 0
    with transaction.atomic():
        batch_size = 1000
        for i in range(0, len(user_ids), batch_size):
            batch = user_ids[i:i + batch_size]
            Vote.objects.filter(member_id__in=batch).delete()
            _clear_legacy_audit_logs_for_users(batch)
            deleted, _ = User.objects.filter(pk__in=batch, role=UserRole.MEMBER).delete()
            total_deleted += deleted

    return total_deleted


def delete_member(member: User) -> None:
    assert_member_deletion_allowed()
    if member.role != UserRole.MEMBER:
        raise ValueError("Only members can be deleted through this endpoint.")

    _delete_members([member.pk])


@dataclass
class ClearAllMembersResult:
    deleted: int


def clear_all_members(academic_year: str) -> ClearAllMembersResult:
    assert_member_deletion_allowed()

    queryset = User.objects.filter(role=UserRole.MEMBER, academic_year=academic_year)

    if not queryset.exists():
        return ClearAllMembersResult(deleted=0)

    member_ids = list(queryset.values_list("pk", flat=True))
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
