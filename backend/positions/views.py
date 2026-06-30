from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsAdminOrReadOnly
from audit.models import AuditAction
from audit.services.logger import log_action
from positions.models import Position
from positions.serializers import PositionSerializer


class PositionListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    serializer_class = PositionSerializer
    queryset = Position.objects.all()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        position = serializer.save()
        log_action(
            request=request,
            action=AuditAction.POSITION_CREATED,
            actor=request.user,
            metadata={"position_id": position.id, "name": position.name},
        )
        return Response(
            {"success": True, "data": serializer.data},
            status=status.HTTP_201_CREATED,
        )

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return Response({"success": True, "data": response.data})


class PositionDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    serializer_class = PositionSerializer
    queryset = Position.objects.all()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({"success": True, "data": serializer.data})

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_action(
            request=request,
            action=AuditAction.POSITION_UPDATED,
            actor=request.user,
            metadata={"position_id": instance.id, "name": instance.name},
        )
        return Response({"success": True, "data": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.has_dependencies():
            raise ValidationError(
                "Cannot delete this position because it has linked candidates or votes."
            )
        metadata = {"position_id": instance.id, "name": instance.name}
        instance.delete()
        log_action(
            request=request,
            action=AuditAction.POSITION_DELETED,
            actor=request.user,
            metadata=metadata,
        )
        return Response(
            {"success": True, "message": "Position deleted successfully."},
            status=status.HTTP_200_OK,
        )
