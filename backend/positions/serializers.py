from rest_framework import serializers

from positions.models import Position


class PositionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Position
        fields = ("id", "name", "academic_year", "importance", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError("Position name cannot be empty.")
        return name

    def validate(self, data):
        name = data.get("name")
        if not name and self.instance:
            name = self.instance.name
            
        academic_year = data.get("academic_year")
        if "academic_year" not in data and self.instance:
            academic_year = self.instance.academic_year
            
        queryset = Position.objects.filter(name__iexact=name, academic_year=academic_year)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
            
        if queryset.exists():
            raise serializers.ValidationError({"name": "A position with this name and academic year already exists."})
            
        return data
