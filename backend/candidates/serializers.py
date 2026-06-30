from rest_framework import serializers

from candidates.models import AcademicYear, Candidate
from positions.models import Position


class CandidateSerializer(serializers.ModelSerializer):
    position_name = serializers.CharField(source="position.name", read_only=True)

    class Meta:
        model = Candidate
        fields = (
            "id",
            "full_name",
            "academic_year",
            "photo_url",
            "position",
            "position_name",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "position_name", "created_at", "updated_at")

    def validate_full_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError("Full name cannot be empty.")
        return name

    def validate_academic_year(self, value):
        if value not in AcademicYear.values:
            raise serializers.ValidationError(
                "Academic year must be '2nd Year' or '3rd Year'."
            )
        return value

    def validate_position(self, value):
        if not Position.objects.filter(pk=value.pk).exists():
            raise serializers.ValidationError("Selected position does not exist.")
        return value

    def validate_photo_url(self, value):
        if not value.startswith("https://"):
            raise serializers.ValidationError("Photo URL must use HTTPS.")
        if "res.cloudinary.com" not in value:
            raise serializers.ValidationError("Photo URL must be a Cloudinary URL.")
        return value


class CandidatePhotoUploadSerializer(serializers.Serializer):
    photo = serializers.ImageField()

    def validate_photo(self, uploaded_file):
        from candidates.services.cloudinary_service import validate_image_file

        try:
            validate_image_file(uploaded_file)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc
        uploaded_file.seek(0)
        return uploaded_file
