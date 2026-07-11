from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User, UserRole
from accounts.permissions import IsAdmin
from dashboard.services.stats_service import invalidate_dashboard_cache
from members.pagination import MemberListPagination
from members.serializers import (
    MemberBulkDeleteSerializer,
    MemberClearAllSerializer,
    MemberImportSerializer,
    MemberSerializer,
    MemberUpdateSerializer,
)
from members.services.deletion_service import (
    MemberDeletionNotAllowedError,
    bulk_delete_members,
    clear_all_members,
    delete_member,
    member_deletion_allowed,
)
from members.models import MemberImportJob
from members.services.import_job_service import (
    create_import_job,
    job_status_payload,
    should_import_async,
    start_import_job_async,
)
from members.services.import_service import import_members, import_result_to_dict
from audit.constants import AuditAction
from audit.services.audit_service import log_action


class MemberDeletionStatusView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return Response(
            {
                "success": True,
                "data": {"allowed": member_deletion_allowed()},
            },
            status=status.HTTP_200_OK,
        )


def _import_result_response(result, *, async_job: bool = False) -> dict:
    payload = import_result_to_dict(result)
    if async_job:
        payload["async"] = False
    return payload


class MemberImportView(APIView):
    permission_classes = [IsAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = MemberImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        uploaded_file = serializer.validated_data["file"]
        academic_year = serializer.validated_data["academic_year"]

        try:
            if hasattr(uploaded_file, "seek"):
                uploaded_file.seek(0)

            from members.services.import_service import parse_member_file, validate_import_file

            validate_import_file(uploaded_file)
            _, preview_rows = parse_member_file(uploaded_file)
            if hasattr(uploaded_file, "seek"):
                uploaded_file.seek(0)

            if should_import_async(len(preview_rows)):
                job = create_import_job(uploaded_file, academic_year, created_by=request.user)
                start_import_job_async(job.id)
                return Response(
                    {
                        "success": True,
                        "data": {
                            "async": True,
                            "job_id": job.id,
                            "status": job.status,
                            "total_rows": job.total_rows,
                        },
                    },
                    status=status.HTTP_202_ACCEPTED,
                )

            result = import_members(uploaded_file, academic_year)
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

        if result.successful:
            invalidate_dashboard_cache()
            log_action(
                action=AuditAction.MEMBER_IMPORTED,
                request=request,
                actor=request.user,
                metadata={
                    "academic_year": academic_year,
                    "total_rows": result.total_rows,
                    "successful": result.successful,
                    "failed_count": len(result.failed_rows),
                    "duplicate_count": len(result.duplicates),
                },
            )

        return Response(
            {
                "success": True,
                "data": _import_result_response(result),
            },
            status=status.HTTP_200_OK,
        )


class MemberImportStatusView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, job_id: int):
        try:
            job = MemberImportJob.objects.get(pk=job_id)
        except MemberImportJob.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "not_found",
                        "message": "Import job not found.",
                        "details": None,
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {"success": True, "data": job_status_payload(job)},
            status=status.HTTP_200_OK,
        )


class MemberClearAllView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        serializer = MemberClearAllSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        academic_year = serializer.validated_data["academic_year"]

        try:
            result = clear_all_members(academic_year)
        except MemberDeletionNotAllowedError as exc:
            raise ValidationError(str(exc)) from exc

        invalidate_dashboard_cache()
        log_action(
            action=AuditAction.MEMBERS_CLEARED,
            request=request,
            actor=request.user,
            metadata={"academic_year": academic_year, "deleted": result.deleted},
        )

        return Response(
            {
                "success": True,
                "data": {"deleted": result.deleted},
                "message": f"Removed {result.deleted} member(s).",
            },
            status=status.HTTP_200_OK,
        )


class MemberBulkDeleteView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        serializer = MemberBulkDeleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        member_ids = serializer.validated_data["ids"]

        try:
            result = bulk_delete_members(member_ids)
        except MemberDeletionNotAllowedError as exc:
            raise ValidationError(str(exc)) from exc

        if result.deleted:
            invalidate_dashboard_cache()
            log_action(
                action=AuditAction.MEMBERS_BULK_DELETED,
                request=request,
                actor=request.user,
                metadata={
                    "requested": result.requested,
                    "deleted": len(result.deleted),
                    "failed_count": len(result.failed),
                },
            )

        return Response(
            {
                "success": True,
                "data": {
                    "requested": result.requested,
                    "deleted": len(result.deleted),
                    "deleted_members": result.deleted,
                    "failed": result.failed,
                },
            },
            status=status.HTTP_200_OK,
        )


class MemberListView(generics.ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = MemberSerializer
    pagination_class = MemberListPagination

    def get_queryset(self):
        queryset = User.objects.filter(role=UserRole.MEMBER)
        academic_year = self.request.query_params.get("academic_year")
        if academic_year:
            queryset = queryset.filter(academic_year=academic_year)
        
        return (
            queryset.only("id", "cpm_number", "academic_year", "is_active", "created_at")
            .order_by("cpm_number")
        )

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return Response({"success": True, "data": response.data})


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
        invalidate_dashboard_cache()
        log_action(
            action=AuditAction.MEMBER_UPDATED,
            request=request,
            actor=request.user,
            metadata={"member_id": member.id, "cpm_number": member.cpm_number},
        )
        return Response(
            {"success": True, "data": MemberSerializer(member).data},
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        member_id = instance.id
        cpm_number = instance.cpm_number

        try:
            delete_member(instance)
        except MemberDeletionNotAllowedError as exc:
            raise ValidationError(str(exc)) from exc

        invalidate_dashboard_cache()
        log_action(
            action=AuditAction.MEMBER_DELETED,
            request=request,
            actor=request.user,
            metadata={"member_id": member_id, "cpm_number": cpm_number},
        )

        return Response(
            {"success": True, "message": "Member deleted successfully."},
            status=status.HTTP_200_OK,
        )
