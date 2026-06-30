from rest_framework import serializers

from voting.models import Election, ElectionStatus


class ElectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Election
        fields = (
            "id",
            "name",
            "status",
            "started_at",
            "stopped_at",
            "closed_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "status",
            "started_at",
            "stopped_at",
            "closed_at",
            "created_at",
            "updated_at",
        )

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
