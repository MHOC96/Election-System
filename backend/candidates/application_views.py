from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone

from accounts.permissions import IsAdmin, IsAdminOrReadOnly
from candidates.models import CandidateApplication, ApplicationStatus, Candidate
from candidates.serializers import CandidateApplicationSerializer, ApplicationReviewSerializer, CandidateApplicationDocumentUploadSerializer, CandidatePhotoUploadSerializer
from candidates.services.cloudinary_service import upload_candidate_document, upload_candidate_photo
from voting.models import Election, ElectionStatus


class MemberApplicationListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CandidateApplicationSerializer

    def get_queryset(self):
        return CandidateApplication.objects.filter(member=self.request.user).select_related("election", "position", "member")

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return Response({"success": True, "data": response.data})

    def create(self, request, *args, **kwargs):
        from voting.models import ElectionPhase
        election = Election.get_ongoing()
        if not election:
            raise ValidationError("There is no scheduled election.")
            
        if election.get_current_phase() != ElectionPhase.APPLICATIONS_OPEN:
            raise ValidationError("Applications are not currently open.")

        # Ensure the member has not already applied for this position in this election
        position_id = request.data.get("position")
        if CandidateApplication.objects.filter(
            election=election,
            member=request.user,
            position_id=position_id,
        ).exclude(status__in=[ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN]).exists():
            raise ValidationError("You have already submitted an active application for this position.")

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
        serializer.save(
            election=election,
            member=request.user,
            status=ApplicationStatus.PENDING_REVIEW
        )
        
        return Response(
            {"success": True, "data": serializer.data},
            status=status.HTTP_201_CREATED,
        )

class AdminApplicationListView(generics.ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = CandidateApplicationSerializer
    
    def get_queryset(self):
        queryset = CandidateApplication.objects.select_related("election", "position", "member").all()
        
        election_id = self.request.query_params.get("election")
        if election_id:
            queryset = queryset.filter(election_id=election_id)
            
        position_id = self.request.query_params.get("position")
        if position_id:
            queryset = queryset.filter(position_id=position_id)
            
        status_param = self.request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param)
            
        return queryset

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return Response({"success": True, "data": response.data})

class AdminApplicationReviewView(APIView):
    permission_classes = [IsAdmin]
    
    def post(self, request, pk):
        try:
            application = CandidateApplication.objects.get(pk=pk)
        except CandidateApplication.DoesNotExist:
            return Response({"success": False, "error": "Application not found"}, status=status.HTTP_404_NOT_FOUND)
            
        if application.status != ApplicationStatus.PENDING_REVIEW:
            raise ValidationError(f"Cannot review an application with status {application.status}")
            
        serializer = ApplicationReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        action = serializer.validated_data["action"]
        
        if action == "APPROVE":
            application.status = ApplicationStatus.APPROVED
            application.approved_at = timezone.now()
            application.approved_by = request.user
            application.save()
            
            # Automatically create Candidate record
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
            application.save()
            
        return Response({"success": True, "data": CandidateApplicationSerializer(application).data})

class CandidateApplicationDocumentUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
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
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
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
