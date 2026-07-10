from voting.models import Election, ElectionPhase, ElectionStatus


class ElectionGuardError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


def election_in_progress() -> bool:
    return Election.objects.filter(status=ElectionStatus.SCHEDULED).exists()


def assert_candidate_changes_allowed(election: Election | None) -> None:
    if election is None:
        return
    blocked = {
        ElectionPhase.APPLICATIONS_OPEN,
        ElectionPhase.VOTING_OPEN,
        ElectionPhase.VOTING_CLOSED,
        ElectionPhase.RESULTS_PUBLISHED,
        ElectionPhase.ARCHIVED,
    }
    if election.get_current_phase() in blocked:
        raise ElectionGuardError(
            "Candidates cannot be modified while applications are open or after voting begins."
        )
