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


from candidates.models import CandidateApplication, ApplicationStatus

class CandidateApplicationSerializer(serializers.ModelSerializer):
    position_name = serializers.CharField(source="position.name", read_only=True)
    member_cpm = serializers.CharField(source="member.cpm_number", read_only=True)
    election_name = serializers.CharField(source="election.name", read_only=True)

    class Meta:
        model = CandidateApplication
        fields = (
            "id",
            "election",
            "election_name",
            "member",
            "member_cpm",
            "position",
            "position_name",
            "full_name",
            "mc_number",
            "cpm_number",
            "contact_number",
            "declaration_file",
            "status",
            "rejection_reason",
            "submitted_at",
            "approved_at",
            "approved_by",
        )
        read_only_fields = ("id", "election", "member", "status", "rejection_reason", "submitted_at", "approved_at", "approved_by", "position_name", "member_cpm", "election_name")

    def validate_full_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError("Full name cannot be empty.")
        return name
        
    def validate_declaration_file(self, value):
        if not value.startswith("https://"):
            raise serializers.ValidationError("Declaration file URL must use HTTPS.")
        if "res.cloudinary.com" not in value:
            raise serializers.ValidationError("Declaration file URL must be a Cloudinary URL.")
        return value


class ApplicationReviewSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["APPROVE", "REJECT"])
    rejection_reason = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        if data["action"] == "REJECT" and not data.get("rejection_reason", "").strip():
            raise serializers.ValidationError({"rejection_reason": "Reason is required when rejecting an application."})
        return data


class CandidateApplicationDocumentUploadSerializer(serializers.Serializer):
    document = serializers.FileField()

    def validate_document(self, uploaded_file):
        # Validate that it's a PDF
        name = getattr(uploaded_file, 'name', '') or ''
        if not name.lower().endswith('.pdf'):
            raise serializers.ValidationError("Only PDF files are allowed.")
        if uploaded_file.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("File size must not exceed 5MB.")
        return uploaded_file
