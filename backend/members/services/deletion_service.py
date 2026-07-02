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
        with transaction.atomic():
            Vote.objects.filter(member_id__in=member_pks).delete()
            User.objects.filter(pk__in=member_pks, role=UserRole.MEMBER).delete()
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
