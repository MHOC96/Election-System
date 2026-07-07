from django.db.models import Count

from candidates.models import Candidate
from positions.models import Position
from voting.models import Election, ElectionStatus


class ElectionGuardError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


def election_in_progress() -> bool:
    return Election.objects.filter(
        status__in=(ElectionStatus.ACTIVE, ElectionStatus.STOPPED)
    ).exists()


def assert_candidate_changes_allowed() -> None:
    if election_in_progress():
        raise ElectionGuardError(
            "Candidates cannot be modified while an election is active or paused."
        )


def assert_election_can_be_created() -> None:
    if not Candidate.objects.exists():
        raise ElectionGuardError(
            "At least one candidate is required before creating an election."
        )


def validate_election_start_readiness() -> None:
    if not Candidate.objects.exists():
        raise ElectionGuardError(
            "At least one candidate is required before starting an election."
        )

    positions_without_candidates = Position.objects.annotate(
        candidate_count=Count("candidates")
    ).filter(candidate_count=0)

    if positions_without_candidates.exists():
        names = ", ".join(positions_without_candidates.values_list("name", flat=True))
        raise ElectionGuardError(
            "Each position must have at least one candidate before starting. "
            f"Add candidates for: {names}."
        )
