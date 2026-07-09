from django.conf import settings
from django.db import models, transaction
from django.utils import timezone

from candidates.models import Candidate
from positions.models import Position


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
    results_published = models.BooleanField(default=False)
    
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
        """Election that is not DRAFT and not ARCHIVED."""
        return cls.objects.filter(status=ElectionStatus.SCHEDULED).first()

    @classmethod
    def get_recently_closed(cls):
        # We can define recently closed as an election where voting_end_at < now, but still SCHEDULED
        now = timezone.now()
        return (
            cls.objects.filter(status=ElectionStatus.SCHEDULED, voting_end_at__lte=now)
            .order_by("-voting_end_at")
            .first()
        )

    def get_current_phase(self) -> str:
        if self.status == ElectionStatus.DRAFT:
            return ElectionPhase.DRAFT
        if self.status == ElectionStatus.ARCHIVED:
            return ElectionPhase.ARCHIVED
            
        if self.results_published:
            return ElectionPhase.RESULTS_PUBLISHED
            
        now = timezone.now()
        
        if self.voting_end_at and now >= self.voting_end_at:
            return ElectionPhase.VOTING_CLOSED
            
        if self.voting_start_at and now >= self.voting_start_at:
            return ElectionPhase.VOTING_OPEN
            
        if self.application_end_at and now >= self.application_end_at:
            # We can distinguish between REVIEWING and READY_FOR_VOTING by checking pending applications
            # For simplicity in model, we can return REVIEWING if not voting yet
            return ElectionPhase.REVIEWING
            
        if self.application_start_at and now >= self.application_start_at:
            return ElectionPhase.APPLICATIONS_OPEN
            
        return ElectionPhase.SCHEDULED

    @property
    def is_voting_open(self):
        return self.get_current_phase() == ElectionPhase.VOTING_OPEN
        
    def can_schedule(self):
        return self.status == ElectionStatus.DRAFT

    def schedule(self):
        if not self.can_schedule():
            raise ValueError("Only DRAFT elections can be scheduled.")
        
        # Validation checks
        if not all([self.application_start_at, self.application_end_at, self.voting_start_at, self.voting_end_at]):
            raise ValueError("All dates must be set before scheduling.")
            
        if self.application_start_at >= self.application_end_at:
            raise ValueError("Application start must be before end.")
        if self.application_end_at > self.voting_start_at:
            raise ValueError("Application end must be before voting start.")
        if self.voting_start_at >= self.voting_end_at:
            raise ValueError("Voting start must be before end.")
            
        # Ensure no other scheduled election
        if Election.objects.filter(status=ElectionStatus.SCHEDULED).exclude(pk=self.pk).exists():
            raise ValueError("Another election is already scheduled. Archive it first.")
            
        self.status = ElectionStatus.SCHEDULED
        self.save()

    def publish_results(self):
        if self.get_current_phase() != ElectionPhase.VOTING_CLOSED:
            raise ValueError("Cannot publish results until voting is closed.")
        self.results_published = True
        self.save()
        
    def archive(self):
        if self.status == ElectionStatus.ARCHIVED:
            return
        self.status = ElectionStatus.ARCHIVED
        self.save()


class Vote(models.Model):
    member = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="votes",
    )
    position = models.ForeignKey(
        Position,
        on_delete=models.PROTECT,
        related_name="votes",
    )
    candidate = models.ForeignKey(
        Candidate,
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
