from dataclasses import dataclass

from django.db import transaction

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
    """Members may be removed only when no election is active or paused for voting."""
    return not Election.objects.filter(
        status__in=(ElectionStatus.ACTIVE, ElectionStatus.STOPPED)
    ).exists()


def assert_member_deletion_allowed() -> None:
    if not member_deletion_allowed():
        raise MemberDeletionNotAllowedError()


def delete_member(member: User) -> None:
    assert_member_deletion_allowed()
    if member.role != UserRole.MEMBER:
        raise ValueError("Only members can be deleted through this endpoint.")

    with transaction.atomic():
        Vote.objects.filter(member=member).delete()
        member.delete()


def bulk_delete_members(member_ids: list[int]) -> BulkMemberDeleteResult:
    assert_member_deletion_allowed()

    result = BulkMemberDeleteResult(requested=len(member_ids), deleted=[], failed=[])
    unique_ids = list(dict.fromkeys(member_ids))

    for member_id in unique_ids:
        try:
            member = User.objects.get(pk=member_id, role=UserRole.MEMBER)
        except User.DoesNotExist:
            result.failed.append(
                {"id": member_id, "cpm_number": "", "reason": "Member not found."}
            )
            continue

        try:
            with transaction.atomic():
                Vote.objects.filter(member=member).delete()
                cpm_number = member.cpm_number
                member.delete()
            result.deleted.append({"id": member_id, "cpm_number": cpm_number})
        except Exception as exc:  # noqa: BLE001 — collect per-row failures for bulk UI
            result.failed.append(
                {
                    "id": member_id,
                    "cpm_number": member.cpm_number,
                    "reason": str(exc),
                }
            )

    return result
