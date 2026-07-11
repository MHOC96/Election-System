from django.conf import settings
from django.db import models
from django.utils import timezone

from candidates.models import ApplicationStatus, CandidateApplication


class ElectionStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    SCHEDULED = "SCHEDULED", "Scheduled"
    ARCHIVED = "ARCHIVED", "Archived"


class ElectionPhase(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    SCHEDULED = "SCHEDULED", "Scheduled"
    APPLICATIONS_OPEN = "APPLICATIONS_OPEN", "Applications Open"
    REVIEWING = "REVIEWING", "Reviewing Applications"
    READY_FOR_VOTING = "READY_FOR_VOTING", "Ready For Voting"
    VOTING_OPEN = "VOTING_OPEN", "Voting Open"
    VOTING_CLOSED = "VOTING_CLOSED", "Voting Closed"
    RESULTS_PUBLISHED = "RESULTS_PUBLISHED", "Results Published"
    ARCHIVED = "ARCHIVED", "Archived"


class Election(models.Model):
    name = models.CharField(max_length=200)
    status = models.CharField(
        max_length=15,
        choices=ElectionStatus.choices,
        default=ElectionStatus.DRAFT,
        db_index=True,
    )
    application_start_at = models.DateTimeField(null=True, blank=True)
    application_end_at = models.DateTimeField(null=True, blank=True)
    voting_start_at = models.DateTimeField(null=True, blank=True)
    voting_end_at = models.DateTimeField(null=True, blank=True)
    voting_started = models.BooleanField(default=False)
    results_published = models.BooleanField(default=False)
    require_all_positions_filled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.status})"

    @classmethod
    def get_active(cls):
        return cls.objects.exclude(status=ElectionStatus.ARCHIVED).order_by("-created_at").first()

    @classmethod
    def get_ongoing(cls):
        return cls.objects.filter(status=ElectionStatus.SCHEDULED).order_by("-created_at").first()

    @classmethod
    def get_recently_closed(cls):
        now = timezone.now()
        return (
            cls.objects.filter(
                status=ElectionStatus.SCHEDULED,
                voting_started=True,
                voting_end_at__lte=now,
            )
            .order_by("-voting_end_at")
            .first()
        )

    def _has_pending_applications(self) -> bool:
        return CandidateApplication.objects.filter(
            election=self,
            status=ApplicationStatus.PENDING_REVIEW,
        ).exists()

    def get_current_phase(self) -> str:
        if self.status == ElectionStatus.DRAFT:
            return ElectionPhase.DRAFT
        if self.status == ElectionStatus.ARCHIVED:
            return ElectionPhase.ARCHIVED

        if self.results_published:
            return ElectionPhase.RESULTS_PUBLISHED

        now = timezone.now()

        has_started_voting = self.voting_started or (self.voting_start_at and now >= self.voting_start_at)

        if has_started_voting and self.voting_end_at and now >= self.voting_end_at:
            return ElectionPhase.VOTING_CLOSED

        if has_started_voting:
            return ElectionPhase.VOTING_OPEN

        if self.application_end_at and now >= self.application_end_at:
            if self._has_pending_applications():
                return ElectionPhase.REVIEWING
            return ElectionPhase.READY_FOR_VOTING

        if (
            self.application_start_at
            and self.application_end_at
            and self.application_start_at <= now < self.application_end_at
        ):
            return ElectionPhase.APPLICATIONS_OPEN

        if self.status == ElectionStatus.SCHEDULED:
            return ElectionPhase.SCHEDULED

        return ElectionPhase.DRAFT

    @property
    def is_voting_open(self):
        return self.get_current_phase() == ElectionPhase.VOTING_OPEN

    @property
    def applications_locked(self) -> bool:
        if not self.application_end_at:
            return False
        return timezone.now() >= self.application_end_at

    def can_open_applications(self) -> bool:
        return self.status == ElectionStatus.DRAFT

    def open_applications(self):
        from voting.services.election_lifecycle import open_applications

        return open_applications(self)

    def start_voting(self):
        from voting.services.election_lifecycle import start_voting

        return start_voting(self)

    def publish_results(self):
        from voting.services.election_lifecycle import publish_results

        return publish_results(self)

    def archive(self):
        from voting.services.election_lifecycle import archive_election

        return archive_election(self)


class Vote(models.Model):
    member = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="votes",
    )
    position = models.ForeignKey(
        "positions.Position",
        on_delete=models.PROTECT,
        related_name="votes",
    )
    candidate = models.ForeignKey(
        "candidates.Candidate",
        on_delete=models.PROTECT,
        related_name="votes",
    )
    election = models.ForeignKey(
        Election,
        on_delete=models.CASCADE,
        related_name="votes",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["member", "position"],
                name="unique_vote_per_member_position",
            ),
        ]
        indexes = [
            models.Index(fields=["election", "position"]),
            models.Index(fields=["election", "candidate"]),
            models.Index(fields=["member", "election"]),
        ]

    def __str__(self):
        return f"Vote by {self.member_id} for position {self.position_id}"
