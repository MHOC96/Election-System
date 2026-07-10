from django.db.models import Count, Q
from django.utils import timezone

from candidates.models import ApplicationStatus, Candidate, CandidateApplication
from positions.models import Position
from voting.models import Election, ElectionPhase, ElectionStatus


class ElectionLifecycleError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


def _now():
    return timezone.now()


def has_pending_applications(election: Election) -> bool:
    return CandidateApplication.objects.filter(
        election=election,
        status=ApplicationStatus.PENDING_REVIEW,
    ).exists()


def positions_missing_approved_candidates(election: Election) -> list[str]:
    """Positions (with academic year set) that have no approved candidate for this election."""
    positions = Position.objects.annotate(
        approved_count=Count(
            "candidates",
            filter=Q(candidates__election_id=election.id),
        )
    )
    missing = []
    for position in positions:
        if position.approved_count == 0:
            missing.append(f"{position.name} ({position.academic_year})")
    return missing


def can_edit_application_window(election: Election, *, now=None) -> bool:
    now = now or _now()
    if election.status == ElectionStatus.ARCHIVED:
        return False
    if election.status == ElectionStatus.DRAFT:
        return True
    if election.status != ElectionStatus.SCHEDULED:
        return False
    if not election.application_end_at:
        return True
    return now < election.application_end_at


def can_edit_voting_window(election: Election, *, now=None) -> bool:
    now = now or _now()
    phase = election.get_current_phase()
    if phase not in (
        ElectionPhase.READY_FOR_VOTING,
        ElectionPhase.VOTING_OPEN,
    ):
        return False
    if not election.voting_end_at:
        return True
    return now < election.voting_end_at


def validate_application_window(start, end, *, now=None) -> None:
    now = now or _now()
    if not start or not end:
        raise ElectionLifecycleError("Application start and end times are required.")
    if start >= end:
        raise ElectionLifecycleError("Application start must be before application end.")


def validate_voting_window(end, *, now=None) -> None:
    now = now or _now()
    if not end:
        raise ElectionLifecycleError("Voting end time is required.")
    if end <= now:
        raise ElectionLifecycleError("Voting end time must be in the future.")


def assert_single_non_archived_election(election: Election) -> None:
    if (
        Election.objects.exclude(status=ElectionStatus.ARCHIVED)
        .exclude(pk=election.pk)
        .exists()
    ):
        raise ElectionLifecycleError(
            "Another election is already in progress. Archive it before starting a new one."
        )


def open_applications(election: Election) -> Election:
    if election.status != ElectionStatus.DRAFT:
        raise ElectionLifecycleError("Only draft elections can open applications.")

    validate_application_window(
        election.application_start_at,
        election.application_end_at,
    )
    assert_single_non_archived_election(election)

    election.status = ElectionStatus.SCHEDULED
    election.voting_start_at = None
    election.voting_end_at = None
    election.voting_started = False
    election.results_published = False
    election.save()
    return election


def start_voting(election: Election) -> Election:
    phase = election.get_current_phase()
    if phase != ElectionPhase.READY_FOR_VOTING:
        raise ElectionLifecycleError(
            "Voting can only start after applications close and all applications are reviewed."
        )
    if not election.voting_end_at:
        raise ElectionLifecycleError("Set the voting end time before starting voting.")

    now = _now()
    if election.voting_end_at <= now:
        raise ElectionLifecycleError("Voting end time must be in the future.")

    missing = positions_missing_approved_candidates(election)
    if missing:
        raise ElectionLifecycleError(
            "Each position must have at least one approved candidate before voting starts. "
            f"Missing: {', '.join(missing)}."
        )

    election.voting_started = True
    election.voting_start_at = now
    election.save()
    return election


def publish_results(election: Election) -> Election:
    if election.get_current_phase() != ElectionPhase.VOTING_CLOSED:
        raise ElectionLifecycleError("Cannot publish results until voting has ended.")
    election.results_published = True
    election.save()
    return election


def archive_election(election: Election) -> Election:
    if not election.results_published:
        raise ElectionLifecycleError("Publish results before archiving this election.")
    if election.status == ElectionStatus.ARCHIVED:
        return election
    election.status = ElectionStatus.ARCHIVED
    election.save()
    return election
