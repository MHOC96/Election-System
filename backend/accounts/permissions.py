from rest_framework.permissions import BasePermission

from accounts.models import UserRole


class IsAdmin(BasePermission):
    message = "Admin access required."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.ADMIN
        )


class IsMember(BasePermission):
    message = "Member access required."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.MEMBER
        )


class IsVoter(BasePermission):
    """Members only — admins cannot vote."""

    message = "Only members are allowed to vote."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.can_vote()
        )


class IsAdminOrReadOnly(BasePermission):
    """Authenticated users can read; only admins can write."""

    message = "Admin access required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return request.user.role == UserRole.ADMIN
