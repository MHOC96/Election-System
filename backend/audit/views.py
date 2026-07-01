from django.core.cache import cache
from django.utils.dateparse import parse_datetime
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from audit.models import AuditLog
from audit.serializers import AuditLogListSerializer, AuditLogRecentSerializer, AuditLogSerializer

RECENT_AUDIT_CACHE_SECONDS = 10


class AuditLogRecentView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        try:
            limit = int(request.query_params.get("limit", 5))
        except (TypeError, ValueError):
            limit = 5
        limit = max(1, min(limit, 20))

        cache_key = f"audit:recent:{limit}"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response({"success": True, "data": cached}, status=status.HTTP_200_OK)

        logs = AuditLog.objects.select_related("actor").order_by("-created_at")[:limit]
        data = AuditLogRecentSerializer(logs, many=True).data
        cache.set(cache_key, data, RECENT_AUDIT_CACHE_SECONDS)
        return Response({"success": True, "data": data}, status=status.HTTP_200_OK)


class AuditLogListView(generics.ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = AuditLogListSerializer

    def get_queryset(self):
        queryset = AuditLog.objects.select_related("actor").only(
            "id",
            "actor_id",
            "action",
            "ip_address",
            "created_at",
            "actor__cpm_number",
        )
        action = self.request.query_params.get("action")
        actor_id = self.request.query_params.get("actor_id")
        actor_cpm = self.request.query_params.get("actor_cpm")
        from_date = self.request.query_params.get("from_date")
        to_date = self.request.query_params.get("to_date")

        if action:
            queryset = queryset.filter(action=action.upper())
        if actor_id:
            queryset = queryset.filter(actor_id=actor_id)
        if actor_cpm:
            queryset = queryset.filter(actor__cpm_number__iexact=actor_cpm.strip())
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
