from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User, UserRole
from accounts.permissions import IsAdmin
from audit.models import AuditAction
from audit.services.logger import log_action
from members.serializers import MemberImportSerializer, MemberSerializer, MemberUpdateSerializer
from members.services.import_service import import_members
from voting.models import Vote


class MemberImportView(APIView):
    permission_classes = [IsAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = MemberImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        uploaded_file = serializer.validated_data["file"]

        try:
            result = import_members(uploaded_file)
        except ValueError as exc:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "invalid_file",
                        "message": str(exc),
                        "details": None,
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        log_action(
            request=request,
            action=AuditAction.MEMBER_IMPORT,
            actor=request.user,
            metadata={
                "filename": uploaded_file.name,
                "total_rows": result.total_rows,
                "successful": result.successful,
                "failed_count": len(result.failed_rows),
                "duplicate_count": len(result.duplicates),
            },
        )

        return Response(
            {
                "success": True,
                "data": {
                    "total_rows": result.total_rows,
                    "successful": result.successful,
                    "failed_rows": [
                        {
                            "row": item.row,
                            "cpm_number": item.cpm_number,
                            "reason": item.reason,
                        }
                        for item in result.failed_rows
                    ],
                    "duplicates": [
                        {
                            "row": item.row,
                            "cpm_number": item.cpm_number,
                            "reason": item.reason,
                        }
                        for item in result.duplicates
                    ],
                },
            },
            status=status.HTTP_200_OK,
        )


class MemberListView(generics.ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = MemberSerializer

    def get_queryset(self):
        return (
            User.objects.filter(role=UserRole.MEMBER)
            .only("id", "cpm_number", "mc_number", "is_active", "created_at")
            .order_by("cpm_number")
        )


class MemberDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdmin]
    serializer_class = MemberSerializer

    def get_queryset(self):
        return User.objects.filter(role=UserRole.MEMBER)

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return MemberUpdateSerializer
        return MemberSerializer

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return Response({"success": True, "data": serializer.data})

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        member = serializer.save()
        log_action(
            request=request,
            action=AuditAction.MEMBER_UPDATED,
            actor=request.user,
            metadata={
                "member_id": member.id,
                "cpm_number": member.cpm_number,
            },
        )
        return Response(
            {"success": True, "data": MemberSerializer(member).data},
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if Vote.objects.filter(member=instance).exists():
            raise ValidationError("Cannot delete a member who has cast votes.")

        metadata = {
            "member_id": instance.id,
            "cpm_number": instance.cpm_number,
        }
        instance.delete()
        log_action(
            request=request,
            action=AuditAction.MEMBER_DELETED,
            actor=request.user,
            metadata=metadata,
        )
        return Response(
            {"success": True, "message": "Member deleted successfully."},
            status=status.HTTP_200_OK,
        )
