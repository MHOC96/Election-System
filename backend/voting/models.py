from django.conf import settings
from django.db import models, transaction
from django.utils import timezone

from candidates.models import Candidate
from positions.models import Position


class ElectionStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    ACTIVE = "ACTIVE", "Active"
    STOPPED = "STOPPED", "Stopped"
    CLOSED = "CLOSED", "Closed"


class Election(models.Model):
    name = models.CharField(max_length=200)
    status = models.CharField(
        max_length=10,
        choices=ElectionStatus.choices,
        default=ElectionStatus.DRAFT,
        db_index=True,
    )
    started_at = models.DateTimeField(null=True, blank=True)
    stopped_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["status"],
                condition=models.Q(status=ElectionStatus.ACTIVE),
                name="unique_active_election",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.status})"

    @classmethod
    def get_active(cls):
        return cls.objects.filter(status=ElectionStatus.ACTIVE).first()

    @classmethod
    def get_ongoing(cls):
        """Election in progress — members may view details and their votes until closed."""
        active = cls.objects.filter(status=ElectionStatus.ACTIVE).first()
        if active:
            return active
        return (
            cls.objects.filter(status=ElectionStatus.STOPPED)
            .order_by("-stopped_at", "-updated_at")
            .first()
        )

    @classmethod
    def get_recently_closed(cls):
        return (
            cls.objects.filter(status=ElectionStatus.CLOSED)
            .order_by("-closed_at", "-updated_at")
            .first()
        )

    @property
    def is_voting_open(self):
        return self.status == ElectionStatus.ACTIVE

    def can_start(self):
        return self.status in (ElectionStatus.DRAFT, ElectionStatus.STOPPED)

    def can_stop(self):
        return self.status == ElectionStatus.ACTIVE

    def can_close(self):
        return self.status in (ElectionStatus.ACTIVE, ElectionStatus.STOPPED)

    def start(self):
        with transaction.atomic():
            election = Election.objects.select_for_update().get(pk=self.pk)
            if not election.can_start():
                raise ValueError(f"Cannot start an election with status '{election.status}'.")
            if (
                Election.objects.filter(status=ElectionStatus.ACTIVE)
                .exclude(pk=election.pk)
                .exists()
            ):
                raise ValueError("Another election is already active.")
            election.status = ElectionStatus.ACTIVE
            election.stopped_at = None
            if not election.started_at:
                election.started_at = timezone.now()
            election.save(
                update_fields=["status", "started_at", "stopped_at", "updated_at"]
            )
        self.refresh_from_db()

    def stop(self):
        if not self.can_stop():
            raise ValueError(f"Cannot stop an election with status '{self.status}'.")
        self.status = ElectionStatus.STOPPED
        self.stopped_at = timezone.now()
        self.save(update_fields=["status", "stopped_at", "updated_at"])

    def close(self):
        if not self.can_close():
            raise ValueError(f"Cannot close an election with status '{self.status}'.")
        self.status = ElectionStatus.CLOSED
        self.closed_at = timezone.now()
        self.save(update_fields=["status", "closed_at", "updated_at"])


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
        on_delete=models.PROTECT,
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
