from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsAdminOrReadOnly
from dashboard.services.stats_service import invalidate_dashboard_cache
from positions.models import Position
from positions.serializers import PositionSerializer
from audit.constants import AuditAction
from audit.services.audit_service import log_action


class PositionListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    serializer_class = PositionSerializer
    
    def get_queryset(self):
        queryset = Position.objects.all()
        user = self.request.user
        # If user is a member and has an academic year, only show matching or 'Any' year positions
        if getattr(user, 'role', None) == 'MEMBER':
            from django.db.models import Q
            if user.academic_year:
                queryset = queryset.filter(
                    Q(academic_year__isnull=True) | 
                    Q(academic_year="") | 
                    Q(academic_year=user.academic_year)
                )
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        position = serializer.save()
        invalidate_dashboard_cache()
        log_action(
            action=AuditAction.POSITION_CREATED,
            request=request,
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
        invalidate_dashboard_cache()
        log_action(
            action=AuditAction.POSITION_UPDATED,
            request=request,
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
        position_id = instance.id
        name = instance.name
        instance.delete()
        invalidate_dashboard_cache()
        log_action(
            action=AuditAction.POSITION_DELETED,
            request=request,
            actor=request.user,
            metadata={"position_id": position_id, "name": name},
        )
        return Response(
            {"success": True, "message": "Position deleted successfully."},
            status=status.HTTP_200_OK,
        )
