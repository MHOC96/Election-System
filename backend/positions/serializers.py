from rest_framework import serializers

from positions.models import Position


class PositionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Position
        fields = ("id", "name", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError("Position name cannot be empty.")

        queryset = Position.objects.annotate().filter(name__iexact=name)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("A position with this name already exists.")

        return name
