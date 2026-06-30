from django.utils.dateparse import parse_datetime
from rest_framework import generics
from rest_framework.response import Response

from accounts.permissions import IsAdmin
from audit.models import AuditLog
from audit.serializers import AuditLogSerializer


class AuditLogListView(generics.ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = AuditLogSerializer

    def get_queryset(self):
        queryset = AuditLog.objects.select_related("actor").all()
        action = self.request.query_params.get("action")
        actor_id = self.request.query_params.get("actor_id")
        from_date = self.request.query_params.get("from_date")
        to_date = self.request.query_params.get("to_date")

        if action:
            queryset = queryset.filter(action=action.upper())
        if actor_id:
            queryset = queryset.filter(actor_id=actor_id)
        if from_date:
            parsed_from = parse_datetime(from_date)
            if parsed_from:
                queryset = queryset.filter(created_at__gte=parsed_from)
        if to_date:
            parsed_to = parse_datetime(to_date)
            if parsed_to:
                queryset = queryset.filter(created_at__lte=parsed_to)

        return queryset

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return Response({"success": True, "data": response.data})


class AuditLogDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAdmin]
    serializer_class = AuditLogSerializer
    queryset = AuditLog.objects.select_related("actor").all()

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return Response({"success": True, "data": serializer.data})
