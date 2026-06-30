from rest_framework import serializers

from audit.models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_cpm_number = serializers.CharField(source="actor.cpm_number", read_only=True)

    class Meta:
        model = AuditLog
        fields = (
            "id",
            "actor_id",
            "actor_cpm_number",
            "action",
            "ip_address",
            "metadata",
            "created_at",
        )
        read_only_fields = fields
