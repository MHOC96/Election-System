from accounts.models import User, UserRole


class MemberPasswordResetError(Exception):
    pass


def reset_member_password(member: User) -> None:
    """Restore login password to the member's institutional MC number (import value)."""
    if member.role != UserRole.MEMBER:
        raise MemberPasswordResetError("Only member accounts can have passwords reset.")
    if not member.mc_number:
        raise MemberPasswordResetError("Member has no institutional MC number on record.")

    member.set_password(member.mc_number)
    member.has_changed_password = False
    member.save(update_fields=["password", "has_changed_password", "updated_at"])
