from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin, IsAdminOrReadOnly
from candidates.models import Candidate
from candidates.serializers import CandidatePhotoUploadSerializer, CandidateSerializer
from candidates.services.cloudinary_service import upload_candidate_photo
from candidates.services.deletion_service import clear_all_candidates
from members.services.deletion_service import MemberDeletionNotAllowedError
from positions.models import Position


class CandidateListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    serializer_class = CandidateSerializer

    def get_queryset(self):
        queryset = Candidate.objects.select_related("position").all()
        position_id = self.request.query_params.get("position")
        if position_id:
            queryset = queryset.filter(position_id=position_id)
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"success": True, "data": serializer.data},
            status=status.HTTP_201_CREATED,
        )

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return Response({"success": True, "data": response.data})


class PositionCandidateListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    serializer_class = CandidateSerializer

    def get_position(self):
        return generics.get_object_or_404(Position, pk=self.kwargs["position_id"])

    def get_queryset(self):
        return Candidate.objects.select_related("position").filter(
            position_id=self.kwargs["position_id"]
        )

    def create(self, request, *args, **kwargs):
        position = self.get_position()
        data = request.data.copy()
        data["position"] = position.pk
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"success": True, "data": serializer.data},
            status=status.HTTP_201_CREATED,
        )

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
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"success": True, "data": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.has_votes():
            raise ValidationError("Cannot delete a candidate who has received votes.")
        instance.delete()
        return Response(
            {"success": True, "message": "Candidate deleted successfully."},
            status=status.HTTP_200_OK,
        )


class CandidateClearAllView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        try:
            result = clear_all_candidates()
        except MemberDeletionNotAllowedError as exc:
            raise ValidationError(str(exc)) from exc

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

        return Response(
            {"success": True, "data": result},
            status=status.HTTP_201_CREATED,
        )
