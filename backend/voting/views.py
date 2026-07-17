from django.utils import timezone
from django.utils.dateparse import parse_datetime
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
from dashboard.services.stats_service import invalidate_election_dashboard_caches
from positions.models import Position
from positions.serializers import PositionSerializer
from voting.models import Election, ElectionPhase, ElectionStatus, Vote
from voting.serializers import ElectionSerializer, VoteSubmitSerializer
from voting.services.election_lifecycle import (
    ElectionLifecycleError,
    can_edit_application_window,
    can_edit_voting_window,
    validate_application_window,
    validate_voting_window,
)
from voting.services.ongoing_election_cache import get_cached_ongoing_election
from voting.services.vote_service import (
    VoteError,
    build_member_vote_status,
    get_member_vote_status,
    submit_vote,
)
from config.throttling import AUTHENTICATED_API_THROTTLE_CLASSES
from voting.throttling import VoteRateThrottle
from audit.constants import AuditAction
from audit.services.audit_service import log_action


class ElectionListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdmin]
    serializer_class = ElectionSerializer
    queryset = Election.with_phase_annotations().all()

    def create(self, request, *args, **kwargs):

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        election = serializer.save()
        invalidate_election_dashboard_caches()
        log_action(
            action=AuditAction.ELECTION_CREATED,
            request=request,
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


class ElectionDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdmin]
    serializer_class = ElectionSerializer
    queryset = Election.with_phase_annotations().all()

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return Response({"success": True, "data": serializer.data})

    def update(self, request, *args, **kwargs):
        election = self.get_object()
        partial = kwargs.pop("partial", True)
        data = request.data.copy()

        if election.status == ElectionStatus.ARCHIVED:
            raise ValidationError("Archived elections cannot be edited.")

        now = timezone.now()

        if "application_start_at" in data or "application_end_at" in data:
            if not can_edit_application_window(election, now=now):
                raise ValidationError(
                    "Application dates are locked after the application period ends."
                )

        if "voting_end_at" in data:
            if not can_edit_voting_window(election, now=now):
                raise ValidationError(
                    "Voting end time can only be changed before voting closes."
                )
            if election.voting_started and election.voting_end_at and now >= election.voting_end_at:
                raise ValidationError("Voting has already ended.")

        if "voting_start_at" in data:
            if election.voting_started:
                raise ValidationError("Voting start time cannot be changed after voting has begun.")
            if "voting_end_at" in data and data["voting_start_at"] and data["voting_end_at"]:
                if data["voting_start_at"] >= data["voting_end_at"]:
                    raise ValidationError("Voting start time must be before voting end time.")

        serializer = self.get_serializer(election, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)

        updated = serializer.save()

        try:
            if updated.application_start_at and updated.application_end_at:
                validate_application_window(
                    updated.application_start_at,
                    updated.application_end_at,
                    now=now,
                )
            if updated.voting_end_at:
                validate_voting_window(updated.voting_end_at, now=now)
        except ElectionLifecycleError as exc:
            raise ValidationError(str(exc)) from exc

        invalidate_election_dashboard_caches(updated.id)
        log_action(
            action=AuditAction.ELECTION_UPDATED,
            request=request,
            actor=request.user,
            metadata={"election_id": updated.id, "name": updated.name},
        )
        return Response({"success": True, "data": ElectionSerializer(updated).data})

    def destroy(self, request, *args, **kwargs):
        election = self.get_object()
        election_id = election.id

        with transaction.atomic():
            Vote.objects.filter(election_id=election_id).delete()
            from candidates.models import Candidate, CandidateApplication

            CandidateApplication.objects.filter(election_id=election_id).delete()
            Candidate.objects.filter(election_id=election_id).delete()
            Election.objects.filter(pk=election_id).delete()

        invalidate_election_dashboard_caches(election_id)
        log_action(
            action=AuditAction.ELECTION_DELETED,
            request=request,
            actor=request.user,
            metadata={"election_id": election_id, "name": election.name},
        )
        return Response(
            {"success": True, "message": "Election deleted successfully."},
            status=status.HTTP_200_OK,
        )


class ElectionScheduleView(APIView):
    """Open the application window (DRAFT → SCHEDULED)."""

    permission_classes = [IsAdmin]

    def post(self, request, pk):
        election = generics.get_object_or_404(Election, pk=pk)
        try:
            election.open_applications()
        except ElectionLifecycleError as exc:
            raise ValidationError(str(exc)) from exc
        except ValueError as exc:
            raise ValidationError(str(exc)) from exc
        invalidate_election_dashboard_caches(election.id)
        log_action(
            action=AuditAction.ELECTION_SCHEDULED,
            request=request,
            actor=request.user,
            metadata={"election_id": election.id, "name": election.name},
        )
        return Response(
            {"success": True, "data": ElectionSerializer(election).data},
            status=status.HTTP_200_OK,
        )


class ElectionStartVotingView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        election = generics.get_object_or_404(Election, pk=pk)
        voting_start_at = request.data.get("voting_start_at")
        voting_end_at = request.data.get("voting_end_at")
        update_fields = []

        if voting_start_at:
            parsed_start = parse_datetime(voting_start_at)
            if parsed_start is None:
                raise ValidationError("Invalid voting start time.")
            if timezone.is_naive(parsed_start):
                parsed_start = timezone.make_aware(parsed_start, timezone.get_current_timezone())
            election.voting_start_at = parsed_start
            update_fields.append("voting_start_at")

        if voting_end_at and not election.voting_end_at:
            parsed = parse_datetime(voting_end_at)
            if parsed is None:
                raise ValidationError("Invalid voting end time.")
            if timezone.is_naive(parsed):
                parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
            election.voting_end_at = parsed
            update_fields.append("voting_end_at")

        if update_fields:
            update_fields.append("updated_at")
            election.save(update_fields=update_fields)

        try:
            election.start_voting()
        except ElectionLifecycleError as exc:
            raise ValidationError(str(exc)) from exc
        invalidate_election_dashboard_caches(election.id)
        log_action(
            action=AuditAction.ELECTION_VOTING_STARTED,
            request=request,
            actor=request.user,
            metadata={"election_id": election.id, "name": election.name},
        )
        return Response(
            {"success": True, "data": ElectionSerializer(election).data},
            status=status.HTTP_200_OK,
        )


class ElectionPublishResultsView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        election = generics.get_object_or_404(Election, pk=pk)
        try:
            election.publish_results()
        except ElectionLifecycleError as exc:
            raise ValidationError(str(exc)) from exc
        except ValueError as exc:
            raise ValidationError(str(exc)) from exc
        invalidate_election_dashboard_caches(election.id)
        log_action(
            action=AuditAction.ELECTION_RESULTS_PUBLISHED,
            request=request,
            actor=request.user,
            metadata={"election_id": election.id, "name": election.name},
        )
        return Response(
            {"success": True, "data": ElectionSerializer(election).data},
            status=status.HTTP_200_OK,
        )


class ElectionArchiveView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        election = generics.get_object_or_404(Election, pk=pk)
        try:
            election.archive()
        except ElectionLifecycleError as exc:
            raise ValidationError(str(exc)) from exc
        except ValueError as exc:
            raise ValidationError(str(exc)) from exc
        invalidate_election_dashboard_caches(election.id)
        log_action(
            action=AuditAction.ELECTION_ARCHIVED,
            request=request,
            actor=request.user,
            metadata={"election_id": election.id, "name": election.name},
        )
        return Response(
            {"success": True, "data": ElectionSerializer(election).data},
            status=status.HTTP_200_OK,
        )


class OngoingElectionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from voting.services.ongoing_election_cache import get_ongoing_election_payload

        payload = get_ongoing_election_payload()
        if payload is None:
            return Response(
                {"success": True, "data": None, "message": "No ongoing election."},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"success": True, "data": payload},
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

class DraftElectionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        election = Election.objects.filter(status=ElectionStatus.DRAFT).first()
        if election is None:
            return Response(
                {
                    "success": True,
                    "data": None,
                    "message": "No draft election.",
                },
                status=status.HTTP_200_OK,
            )
        return Response(
            {"success": True, "data": ElectionSerializer(election).data},
            status=status.HTTP_200_OK,
        )

class VoteSubmitView(APIView):
    permission_classes = [IsVoter]
    throttle_classes = [VoteRateThrottle, *AUTHENTICATED_API_THROTTLE_CLASSES]

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
            action=AuditAction.VOTE_SUBMITTED,
            request=request,
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
    """Members see their own votes only while an election is ongoing (not after close)."""

    permission_classes = [IsVoter]

    def get(self, request):
        election = get_cached_ongoing_election()
        status_data = get_member_vote_status(request.user, election)
        return Response({"success": True, "data": status_data})


class BallotView(APIView):
    """Positions, candidates, and member vote status for the ongoing election."""

    permission_classes = [IsVoter]

    def get(self, request):
        election = get_cached_ongoing_election()
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

        base_positions = Position.objects.prefetch_related(
            Prefetch(
                "candidates",
                queryset=Candidate.objects.filter(election_id=election.id).select_related(
                    "position"
                ),
            )
        ).order_by("name")

        if request.user.academic_year:
            positions = base_positions.filter(academic_year=request.user.academic_year)
        else:
            positions = Position.objects.none()
            
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

        current_phase = election.get_current_phase()
        can_vote = current_phase == ElectionPhase.VOTING_OPEN

        return Response(
            {
                "success": True,
                "data": {
                    "election": ElectionSerializer(election).data,
                    "positions": position_items,
                    "can_vote": can_vote,
                    "election_ended": False,
                    "vote_status": build_member_vote_status(
                        request.user,
                        election,
                        votes=member_votes_qs,
                        positions_total=len(position_items),
                        current_phase=current_phase,
                    ),
                },
            },
            status=status.HTTP_200_OK,
        )


class PublishedResultsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from voting.services.results_service import get_published_results

        academic_year = getattr(request.user, "academic_year", None)
        data = get_published_results(academic_year=academic_year)
        if data is None:
            return Response(
                {
                    "success": True,
                    "data": None,
                    "message": "No published results available.",
                },
                status=status.HTTP_200_OK,
            )
        return Response({"success": True, "data": data}, status=status.HTTP_200_OK)
