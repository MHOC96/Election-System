from rest_framework import serializers

from accounts.models import User


class MemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "cpm_number", "mc_number", "is_active", "created_at")
        read_only_fields = fields


class MemberUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("cpm_number", "mc_number", "is_active")

    def validate_cpm_number(self, value):
        normalized = value.strip().upper()
        queryset = User.objects.filter(cpm_number__iexact=normalized)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("A user with this CPM number already exists.")
        return normalized

    def update(self, instance, validated_data):
        mc_number = validated_data.pop("mc_number", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if mc_number is not None:
            instance.set_password(mc_number)
            instance.mc_number = mc_number
        instance.save()
        return instance


class MemberImportSerializer(serializers.Serializer):
    file = serializers.FileField()


class MemberBulkDeleteSerializer(serializers.Serializer):
    ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=False,
        max_length=500,
    )
