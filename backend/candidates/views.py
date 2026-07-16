from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin, IsAdminOrReadOnly
from candidates.models import Candidate
from candidates.pagination import CandidateListPagination
from candidates.serializers import (
    CandidateApplicationDocumentUploadSerializer,
    CandidatePhotoUploadSerializer,
    CandidateSerializer,
)
from candidates.services.cloudinary_service import upload_candidate_document, upload_candidate_photo
from candidates.services.deletion_service import clear_all_candidates
from members.services.deletion_service import MemberDeletionNotAllowedError
from positions.models import Position
from dashboard.services.stats_service import invalidate_dashboard_cache
from voting.services.ongoing_election_cache import get_cached_ongoing_election
from voting.services.election_guard import ElectionGuardError, assert_candidate_changes_allowed
from audit.constants import AuditAction
from audit.services.audit_service import log_action


class CandidateListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    serializer_class = CandidateSerializer
    pagination_class = CandidateListPagination

    def get_queryset(self):
        queryset = Candidate.objects.select_related("position")
        election_id = self.request.query_params.get("election")
        if election_id:
            queryset = queryset.filter(election_id=election_id)
        else:
            election = get_cached_ongoing_election()
            if election is not None:
                queryset = queryset.filter(election_id=election.id)
        position_id = self.request.query_params.get("position")
        if position_id:
            queryset = queryset.filter(position_id=position_id)
        return queryset.order_by("position__name", "full_name")

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return Response({"success": True, "data": response.data})

    def create(self, request, *args, **kwargs):
        election = get_cached_ongoing_election()
        try:
            assert_candidate_changes_allowed(election)
        except ElectionGuardError as exc:
            raise ValidationError(str(exc)) from exc

        if election is None:
            raise ValidationError("A scheduled election is required before adding candidates.")

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        candidate = serializer.save(election=election)
        if election is not None:
            invalidate_dashboard_cache(election.id)
        else:
            invalidate_dashboard_cache()
        log_action(
            action=AuditAction.CANDIDATE_CREATED,
            request=request,
            actor=request.user,
            metadata={
                "candidate_id": candidate.id,
                "position_id": candidate.position_id,
                "election_id": candidate.election_id,
            },
        )
        return Response(
            {"success": True, "data": self.get_serializer(candidate).data},
            status=status.HTTP_201_CREATED,
        )


class CandidateModificationStatusView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]

    def get(self, request):
        election = get_cached_ongoing_election()
        if election is None:
            return Response({"success": True, "data": {"allowed": False, "reason": "No active election"}})
        
        try:
            assert_candidate_changes_allowed(election)
            return Response({"success": True, "data": {"allowed": True}})
        except ElectionGuardError as exc:
            return Response({"success": True, "data": {"allowed": False, "reason": str(exc)}})


class PositionCandidateListCreateView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    serializer_class = CandidateSerializer
    pagination_class = CandidateListPagination

    def get_position(self):
        return generics.get_object_or_404(Position, pk=self.kwargs["position_id"])

    def get_queryset(self):
        queryset = Candidate.objects.select_related("position").filter(
            position_id=self.kwargs["position_id"]
        )
        election_id = self.request.query_params.get("election")
        if election_id:
            queryset = queryset.filter(election_id=election_id)
        else:
            election = get_cached_ongoing_election()
            if election is not None:
                queryset = queryset.filter(election_id=election.id)
        return queryset.order_by("full_name")

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return Response({"success": True, "data": response.data})


class CandidateDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    serializer_class = CandidateSerializer
    queryset = Candidate.objects.select_related("position").all()

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return Response({"success": True, "data": serializer.data})

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            assert_candidate_changes_allowed(instance.election)
        except ElectionGuardError as exc:
            raise ValidationError(str(exc)) from exc

        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        if instance.election_id:
            invalidate_dashboard_cache(instance.election_id)
        else:
            invalidate_dashboard_cache()
        log_action(
            action=AuditAction.CANDIDATE_UPDATED,
            request=request,
            actor=request.user,
            metadata={"candidate_id": instance.id, "position_id": instance.position_id},
        )
        return Response({"success": True, "data": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            assert_candidate_changes_allowed(instance.election)
        except ElectionGuardError as exc:
            raise ValidationError(str(exc)) from exc

        if instance.has_votes():
            raise ValidationError("Cannot delete a candidate who has received votes.")
        candidate_id = instance.id
        position_id = instance.position_id
        election_id = instance.election_id
        instance.delete()
        if election_id:
            invalidate_dashboard_cache(election_id)
        else:
            invalidate_dashboard_cache()
        log_action(
            action=AuditAction.CANDIDATE_DELETED,
            request=request,
            actor=request.user,
            metadata={"candidate_id": candidate_id, "position_id": position_id},
        )
        return Response(
            {"success": True, "message": "Candidate deleted successfully."},
            status=status.HTTP_200_OK,
        )


class CandidateClearAllView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        raise ValidationError("Clearing candidates manually is no longer supported.")

        return Response(
            {
                "success": True,
                "data": {
                    "deleted": result.deleted,
                    "skipped": [
                        {
                            "id": item.id,
                            "full_name": item.full_name,
                            "reason": item.reason,
                        }
                        for item in result.skipped
                    ],
                },
                "message": f"Removed {result.deleted} candidate(s).",
            },
            status=status.HTTP_200_OK,
        )


class CandidatePhotoUploadView(APIView):
    permission_classes = [IsAdmin]
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
                        "message": "Failed to upload image to Cloudinary.",
                        "details": str(exc),
                    },
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        log_action(
            action=AuditAction.CANDIDATE_PHOTO_UPLOADED,
            request=request,
            actor=request.user,
            metadata={"public_id": result.get("public_id"), "photo_url": result.get("photo_url")},
        )

        return Response(
            {"success": True, "data": result},
            status=status.HTTP_201_CREATED,
        )


class CandidateDeclarationUploadView(APIView):
    permission_classes = [IsAdmin]
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
