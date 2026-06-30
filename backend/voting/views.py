from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin, IsVoter
from audit.models import AuditAction
from audit.services.logger import log_action
from candidates.models import Candidate
from candidates.serializers import CandidateSerializer
from positions.models import Position
from positions.serializers import PositionSerializer
from voting.models import Election, ElectionStatus
from voting.serializers import ElectionSerializer, VoteSubmitSerializer
from voting.services.vote_service import VoteError, get_member_vote_status, submit_vote
from voting.throttling import VoteRateThrottle


class ElectionListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdmin]
    serializer_class = ElectionSerializer
    queryset = Election.objects.all()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        election = serializer.save()
        log_action(
            request=request,
            action=AuditAction.ELECTION_CREATED,
            actor=request.user,
            metadata={"election_id": election.id, "name": election.name},
        )
        return Response(
            {"success": True, "data": serializer.data},
            status=status.HTTP_201_CREATED,
        )

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return Response({"success": True, "data": response.data})


class ElectionDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAdmin]
    serializer_class = ElectionSerializer
    queryset = Election.objects.all()

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return Response({"success": True, "data": serializer.data})


class ElectionStartView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        election = generics.get_object_or_404(Election, pk=pk)
        try:
            election.start()
        except ValueError as exc:
            raise ValidationError(str(exc)) from exc
        log_action(
            request=request,
            action=AuditAction.ELECTION_STARTED,
            actor=request.user,
            metadata={"election_id": election.id, "name": election.name, "status": election.status},
        )
        return Response(
            {"success": True, "data": ElectionSerializer(election).data},
            status=status.HTTP_200_OK,
        )


class ElectionStopView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        election = generics.get_object_or_404(Election, pk=pk)
        try:
            election.stop()
        except ValueError as exc:
            raise ValidationError(str(exc)) from exc
        log_action(
            request=request,
            action=AuditAction.ELECTION_STOPPED,
            actor=request.user,
            metadata={"election_id": election.id, "name": election.name, "status": election.status},
        )
        return Response(
            {"success": True, "data": ElectionSerializer(election).data},
            status=status.HTTP_200_OK,
        )


class ElectionCloseView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        election = generics.get_object_or_404(Election, pk=pk)
        try:
            election.close()
        except ValueError as exc:
            raise ValidationError(str(exc)) from exc
        log_action(
            request=request,
            action=AuditAction.ELECTION_CLOSED,
            actor=request.user,
            metadata={"election_id": election.id, "name": election.name, "status": election.status},
        )
        return Response(
            {"success": True, "data": ElectionSerializer(election).data},
            status=status.HTTP_200_OK,
        )


class ActiveElectionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        election = Election.get_active()
        if election is None:
            return Response(
                {
                    "success": True,
                    "data": None,
                    "message": "No active election.",
                },
                status=status.HTTP_200_OK,
            )
        return Response(
            {"success": True, "data": ElectionSerializer(election).data},
            status=status.HTTP_200_OK,
        )


class VoteSubmitView(APIView):
    permission_classes = [IsVoter]
    throttle_classes = [VoteRateThrottle]

    def post(self, request):
        serializer = VoteSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            vote = submit_vote(
                member=request.user,
                position_id=serializer.validated_data["position_id"],
                candidate_id=serializer.validated_data["candidate_id"],
            )
        except VoteError as exc:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": exc.code,
                        "message": exc.message,
                        "details": None,
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        log_action(
            request=request,
            action=AuditAction.VOTE_SUBMITTED,
            actor=request.user,
            metadata={
                "vote_id": vote.id,
                "election_id": vote.election_id,
                "position_id": vote.position_id,
                "candidate_id": vote.candidate_id,
            },
        )

        return Response(
            {
                "success": True,
                "data": {
                    "id": vote.id,
                    "position_id": vote.position_id,
                    "position_name": vote.position.name,
                    "candidate_id": vote.candidate_id,
                    "candidate_name": vote.candidate.full_name,
                    "voted_at": vote.created_at,
                },
                "message": "Vote submitted successfully. This action is irreversible.",
            },
            status=status.HTTP_201_CREATED,
        )


class MyVoteStatusView(APIView):
    """Members see only their own votes."""

    permission_classes = [IsVoter]

    def get(self, request):
        election = Election.get_active()
        status_data = get_member_vote_status(request.user, election)
        return Response({"success": True, "data": status_data})


class BallotView(APIView):
    """Ballot for active election — positions, candidates, and member's own vote status."""

    permission_classes = [IsVoter]

    def get(self, request):
        election = Election.get_active()
        if election is None:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "election_not_active",
                        "message": "No active election.",
                        "details": None,
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        member_votes = {
            vote.position_id: vote.candidate_id
            for vote in request.user.votes.filter(election=election).select_related(
                "position", "candidate"
            )
        }

        positions = Position.objects.prefetch_related("candidates").order_by("name")
        ballot = []
        for position in positions:
            candidates = position.candidates.all()
            my_candidate_id = member_votes.get(position.id)
            ballot.append(
                {
                    "position": PositionSerializer(position).data,
                    "candidates": CandidateSerializer(candidates, many=True).data,
                    "has_voted": position.id in member_votes,
                    "my_candidate_id": my_candidate_id,
                }
            )

        return Response(
            {
                "success": True,
                "data": {
                    "election": ElectionSerializer(election).data,
                    "ballot": ballot,
                },
            },
            status=status.HTTP_200_OK,
        )
