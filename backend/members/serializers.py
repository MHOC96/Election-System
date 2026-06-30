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
        cpm_number = value.strip().upper()
        if not cpm_number:
            raise serializers.ValidationError("CPM Number is required.")
        duplicate = User.objects.filter(cpm_number=cpm_number).exclude(pk=self.instance.pk)
        if duplicate.exists():
            raise serializers.ValidationError("CPM Number already exists.")
        return cpm_number

    def validate_mc_number(self, value):
        mc_number = value.strip()
        if not mc_number:
            raise serializers.ValidationError("MC Number is required.")
        return mc_number

    def update(self, instance, validated_data):
        mc_number = validated_data.pop("mc_number", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        if mc_number is not None:
            instance.mc_number = mc_number
            instance.set_password(mc_number)
        instance.save()
        return instance


class MemberImportSerializer(serializers.Serializer):
    file = serializers.FileField()

    def validate_file(self, uploaded_file):
        from members.services.import_service import validate_import_file

        try:
            validate_import_file(uploaded_file)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc
        uploaded_file.seek(0)
        return uploaded_file
