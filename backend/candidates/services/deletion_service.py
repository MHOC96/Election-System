from dataclasses import dataclass, field

from django.db import transaction
from django.db.models import Count

from candidates.models import Candidate
from members.services.deletion_service import (
    MemberDeletionNotAllowedError,
    assert_member_deletion_allowed,
)

SKIPPED_HAS_VOTES = "Candidate has received votes and cannot be deleted."


@dataclass
class SkippedCandidate:
    id: int
    full_name: str
    reason: str


@dataclass
class ClearAllCandidatesResult:
    deleted: int = 0
    skipped: list[SkippedCandidate] = field(default_factory=list)


def clear_all_candidates() -> ClearAllCandidatesResult:
    assert_member_deletion_allowed()

    candidates = list(
        Candidate.objects.annotate(vote_count=Count("votes")).order_by("full_name")
    )
    if not candidates:
        return ClearAllCandidatesResult()

    deletable_ids: list[int] = []
    skipped: list[SkippedCandidate] = []

    for candidate in candidates:
        if candidate.vote_count > 0:
            skipped.append(
                SkippedCandidate(
                    id=candidate.id,
                    full_name=candidate.full_name,
                    reason=SKIPPED_HAS_VOTES,
                )
            )
            continue
        deletable_ids.append(candidate.id)

    deleted = 0
    if deletable_ids:
        with transaction.atomic():
            deleted, _ = Candidate.objects.filter(pk__in=deletable_ids).delete()

    return ClearAllCandidatesResult(deleted=deleted, skipped=skipped)
