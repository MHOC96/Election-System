from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import transaction
from django.utils import timezone

from accounts.permissions import IsAdmin, IsAdminOrReadOnly, IsMember
from candidates.models import CandidateApplication, ApplicationStatus, Candidate
from candidates.serializers import CandidateApplicationSerializer, ApplicationReviewSerializer, CandidateApplicationDocumentUploadSerializer, CandidatePhotoUploadSerializer
from candidates.services.cloudinary_service import upload_candidate_document, upload_candidate_photo
from candidates.throttling import ApplicationUploadRateThrottle
from dashboard.services.stats_service import invalidate_dashboard_cache
from audit.constants import AuditAction
from audit.services.audit_service import log_action
from voting.models import Election, ElectionPhase, ElectionStatus


def ensure_application_upload_allowed(request):
    election = Election.get_ongoing()
    if not election:
        raise ValidationError("There is no scheduled election.")

    if election.get_current_phase() != ElectionPhase.APPLICATIONS_OPEN:
        raise ValidationError("Applications are not currently open.")


class MemberApplicationListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CandidateApplicationSerializer

    def get_queryset(self):
        return CandidateApplication.objects.filter(member=self.request.user).select_related("election", "position", "member")

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return Response({"success": True, "data": response.data})

    def create(self, request, *args, **kwargs):
        election = Election.get_ongoing()
        if not election:
            raise ValidationError("There is no scheduled election.")
            
        if election.get_current_phase() != ElectionPhase.APPLICATIONS_OPEN:
            raise ValidationError("Applications are not currently open.")

        # Ensure the member has not already applied for this election
        if CandidateApplication.objects.filter(
            election=election,
            member=request.user,
        ).exclude(status__in=[ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN]).exists():
            raise ValidationError(
                "You have already submitted an application for this election."
            )

        position_id = request.data.get("position")

        # Validate academic year
        from positions.models import Position
        try:
            position = Position.objects.get(pk=position_id)
        except Position.DoesNotExist:
            raise ValidationError("Selected position does not exist.")
            
        if position.academic_year and position.academic_year != request.user.academic_year:
            raise ValidationError(f"You are not eligible for this position. It requires {position.academic_year}.")

        data = request.data.copy()
        data["election"] = election.pk
        data["member"] = request.user.pk

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        application = serializer.save(
            election=election,
            member=request.user,
            status=ApplicationStatus.PENDING_REVIEW,
            cpm_number=request.user.cpm_number,
        )
        invalidate_dashboard_cache(election.id)
        log_action(
            action=AuditAction.APPLICATION_SUBMITTED,
            request=request,
            actor=request.user,
            metadata={
                "application_id": application.id,
                "election_id": election.id,
                "position_id": application.position_id,
            },
        )
        
        return Response(
            {"success": True, "data": serializer.data},
            status=status.HTTP_201_CREATED,
        )

class AdminApplicationListView(generics.ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = CandidateApplicationSerializer

    def get_queryset(self):
        queryset = CandidateApplication.objects.select_related(
            "election", "position", "member"
        ).order_by("-submitted_at")

        election_id = self.request.query_params.get("election")
        if election_id:
            queryset = queryset.filter(election_id=election_id)

        position_id = self.request.query_params.get("position")
        if position_id:
            queryset = queryset.filter(position_id=position_id)

        status_param = self.request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param)

        academic_year = self.request.query_params.get("academic_year")
        if academic_year:
            queryset = queryset.filter(member__academic_year=academic_year)

        search = (self.request.query_params.get("search") or "").strip()
        if search:
            from django.db.models import Q

            queryset = queryset.filter(
                Q(full_name__icontains=search)
                | Q(cpm_number__icontains=search)
                | Q(position__name__icontains=search)
            )

        return queryset

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return Response({"success": True, "data": response.data})

class AdminApplicationReviewView(APIView):
    permission_classes = [IsAdmin]
    
    def post(self, request, pk):
        serializer = ApplicationReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        action = serializer.validated_data["action"]

        with transaction.atomic():
            try:
                application = (
                    CandidateApplication.objects.select_for_update()
                    .select_related("election", "position", "member")
                    .get(pk=pk)
                )
            except CandidateApplication.DoesNotExist:
                return Response(
                    {"success": False, "error": "Application not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if application.status != ApplicationStatus.PENDING_REVIEW:
                raise ValidationError(f"Cannot review an application with status {application.status}")

            phase = application.election.get_current_phase()
            if phase not in (ElectionPhase.REVIEWING, ElectionPhase.READY_FOR_VOTING):
                raise ValidationError("Applications can only be reviewed after the application period ends.")

            if action == "APPROVE":
                application.status = ApplicationStatus.APPROVED
                application.approved_at = timezone.now()
                application.approved_by = request.user
                application.save(
                    update_fields=["status", "approved_at", "approved_by", "updated_at"]
                )

                Candidate.objects.create(
                    election=application.election,
                    full_name=application.full_name,
                    academic_year=application.member.academic_year,
                    photo_url=application.photo_url,
                    position=application.position,
                )

            elif action == "REJECT":
                application.status = ApplicationStatus.REJECTED
                application.rejection_reason = serializer.validated_data["rejection_reason"]
                application.save(update_fields=["status", "rejection_reason", "updated_at"])

        invalidate_dashboard_cache(application.election_id)
        if action == "APPROVE":
            log_action(
                action=AuditAction.APPLICATION_APPROVED,
                request=request,
                actor=request.user,
                metadata={
                    "application_id": application.id,
                    "election_id": application.election_id,
                    "position_id": application.position_id,
                    "member_id": application.member_id,
                },
            )
        else:
            log_action(
                action=AuditAction.APPLICATION_REJECTED,
                request=request,
                actor=request.user,
                metadata={
                    "application_id": application.id,
                    "election_id": application.election_id,
                    "position_id": application.position_id,
                    "member_id": application.member_id,
                    "rejection_reason": application.rejection_reason,
                },
            )

        return Response({"success": True, "data": CandidateApplicationSerializer(application).data})

class CandidateApplicationDocumentUploadView(APIView):
    permission_classes = [IsAuthenticated, IsMember]
    throttle_classes = [ApplicationUploadRateThrottle]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        ensure_application_upload_allowed(request)

        serializer = CandidateApplicationDocumentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            result = upload_candidate_document(serializer.validated_data["document"])
        except ValueError as exc:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "upload_failed",
                        "message": str(exc),
                        "details": None,
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "upload_failed",
                        "message": "Failed to upload document to Cloudinary.",
                        "details": str(exc),
                    },
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            {"success": True, "data": result},
            status=status.HTTP_201_CREATED,
        )

class CandidateApplicationPhotoUploadView(APIView):
    permission_classes = [IsAuthenticated, IsMember]
    throttle_classes = [ApplicationUploadRateThrottle]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        ensure_application_upload_allowed(request)

        serializer = CandidatePhotoUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            result = upload_candidate_photo(serializer.validated_data["photo"])
        except ValueError as exc:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "upload_failed",
                        "message": str(exc),
                        "details": None,
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "upload_failed",
                        "message": "Failed to upload photo to Cloudinary.",
                        "details": str(exc),
                    },
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            {"success": True, "data": result},
            status=status.HTTP_201_CREATED,
        )
