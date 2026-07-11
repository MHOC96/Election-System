from rest_framework import serializers

from voting.models import Election, ElectionStatus


class ElectionSerializer(serializers.ModelSerializer):
    current_phase = serializers.SerializerMethodField()

    class Meta:
        model = Election
        fields = (
            "id",
            "name",
            "status",
            "current_phase",
            "application_start_at",
            "application_end_at",
            "voting_start_at",
            "voting_end_at",
            "voting_started",
            "results_published",
            "require_all_positions_filled",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "status",
            "current_phase",
            "voting_started",
            "results_published",
            "created_at",
            "updated_at",
        )

    def get_current_phase(self, obj) -> str:
        return obj.get_current_phase()

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError("Election name cannot be empty.")
        return name


class VoteSubmitSerializer(serializers.Serializer):
    position_id = serializers.IntegerField(min_value=1)
    candidate_id = serializers.IntegerField(min_value=1)


class MemberVoteSerializer(serializers.Serializer):
    position_id = serializers.IntegerField()
    position_name = serializers.CharField()
    candidate_id = serializers.IntegerField()
    candidate_name = serializers.CharField()
    voted_at = serializers.DateTimeField()


class ActiveElectionSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    status = serializers.ChoiceField(choices=ElectionStatus.choices)
