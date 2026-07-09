from django.db.models import Count

from candidates.models import Candidate
from positions.models import Position
from voting.models import Election, ElectionStatus


class ElectionGuardError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


def election_in_progress() -> bool:
    return Election.objects.filter(status=ElectionStatus.SCHEDULED).exists()

def assert_candidate_changes_allowed(election) -> None:
    from voting.models import ElectionPhase
    if election.get_current_phase() in [ElectionPhase.VOTING_OPEN, ElectionPhase.VOTING_CLOSED, ElectionPhase.RESULTS_PUBLISHED]:
        raise ElectionGuardError("Candidates cannot be modified during or after voting.")
