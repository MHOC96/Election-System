from django.db import transaction
from django.db.models import Prefetch
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin, IsVoter
from candidates.models import Candidate
from candidates.serializers import CandidateSerializer
from dashboard.services.stats_service import invalidate_dashboard_cache
from positions.models import Position
from positions.serializers import PositionSerializer
from voting.models import Election, ElectionStatus, Vote
from voting.serializers import ElectionSerializer, VoteSubmitSerializer
from voting.services.vote_service import (
    VoteError,
    build_member_vote_status,
    get_member_vote_status,
    submit_vote,
)
from voting.throttling import VoteRateThrottle


class ElectionListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdmin]
    serializer_class = ElectionSerializer
    queryset = Election.objects.all()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        invalidate_dashboard_cache()
        return Response(
            {"success": True, "data": serializer.data},
            status=status.HTTP_201_CREATED,
        )

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return Response({"success": True, "data": response.data})


class ElectionDetailView(generics.RetrieveDestroyAPIView):
    permission_classes = [IsAdmin]
    serializer_class = ElectionSerializer
    queryset = Election.objects.all()

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return Response({"success": True, "data": serializer.data})

    def destroy(self, request, *args, **kwargs):
        election = self.get_object()
        if election.status != ElectionStatus.CLOSED:
            raise ValidationError("Only closed elections can be deleted.")

        election_id = election.id

        with transaction.atomic():
            Vote.objects.filter(election_id=election_id).delete()
            Election.objects.filter(pk=election_id).delete()

        invalidate_dashboard_cache(election_id)
        return Response(
            {"success": True, "message": "Election deleted successfully."},
            status=status.HTTP_200_OK,
        )


class ElectionStartView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        election = generics.get_object_or_404(Election, pk=pk)
        try:
            election.start()
        except ValueError as exc:
            raise ValidationError(str(exc)) from exc
        invalidate_dashboard_cache(election.id)
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
        invalidate_dashboard_cache(election.id)
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
        invalidate_dashboard_cache(election.id)
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
    """Members see their own votes only while an election is ongoing (not after close)."""

    permission_classes = [IsVoter]

    def get(self, request):
        election = Election.get_ongoing()
        status_data = get_member_vote_status(request.user, election)
        return Response({"success": True, "data": status_data})


class BallotView(APIView):
    """Positions, candidates, and member vote status for the ongoing election."""

    permission_classes = [IsVoter]

    def get(self, request):
        election = Election.get_ongoing()
        if election is None:
            recently_closed = Election.get_recently_closed()
            vote_status = build_member_vote_status(request.user, None)
            return Response(
                {
                    "success": True,
                    "data": {
                        "election": None,
                        "positions": [],
                        "can_vote": False,
                        "election_ended": recently_closed is not None,
                        "vote_status": vote_status,
                    },
                },
                status=status.HTTP_200_OK,
            )

        member_votes_qs = list(
            request.user.votes.filter(election=election).select_related("position", "candidate")
        )
        member_votes = {vote.position_id: vote.candidate_id for vote in member_votes_qs}

        positions = Position.objects.prefetch_related(
            Prefetch(
                "candidates",
                queryset=Candidate.objects.select_related("position"),
            )
        ).order_by("name")
        position_items = []
        for position in positions:
            candidates = list(position.candidates.all())
            if not candidates:
                continue
            my_candidate_id = member_votes.get(position.id)
            position_items.append(
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
                    "positions": position_items,
                    "can_vote": election.is_voting_open,
                    "election_ended": False,
                    "vote_status": build_member_vote_status(
                        request.user,
                        election,
                        votes=member_votes_qs,
                        positions_total=len(position_items),
                    ),
                },
            },
            status=status.HTTP_200_OK,
        )
