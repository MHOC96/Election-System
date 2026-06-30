from django.conf import settings
from django.db import models


class AuditAction(models.TextChoices):
    LOGIN = "LOGIN", "Login"
    LOGOUT = "LOGOUT", "Logout"
    VOTE_SUBMITTED = "VOTE_SUBMITTED", "Vote Submitted"
    MEMBER_IMPORT = "MEMBER_IMPORT", "Member Import"
    MEMBER_UPDATED = "MEMBER_UPDATED", "Member Updated"
    MEMBER_DELETED = "MEMBER_DELETED", "Member Deleted"
    CANDIDATE_CREATED = "CANDIDATE_CREATED", "Candidate Created"
    CANDIDATE_UPDATED = "CANDIDATE_UPDATED", "Candidate Updated"
    CANDIDATE_DELETED = "CANDIDATE_DELETED", "Candidate Deleted"
    CANDIDATE_PHOTO_UPLOADED = "CANDIDATE_PHOTO_UPLOADED", "Candidate Photo Uploaded"
    POSITION_CREATED = "POSITION_CREATED", "Position Created"
    POSITION_UPDATED = "POSITION_UPDATED", "Position Updated"
    POSITION_DELETED = "POSITION_DELETED", "Position Deleted"
    ELECTION_CREATED = "ELECTION_CREATED", "Election Created"
    ELECTION_STARTED = "ELECTION_STARTED", "Election Started"
    ELECTION_STOPPED = "ELECTION_STOPPED", "Election Stopped"
    ELECTION_CLOSED = "ELECTION_CLOSED", "Election Closed"


class AuditLog(models.Model):
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=40, choices=AuditAction.choices, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["action", "created_at"]),
            models.Index(fields=["actor", "created_at"]),
        ]

    def __str__(self):
        actor_label = self.actor.cpm_number if self.actor else "system"
        return f"{self.action} by {actor_label} at {self.created_at}"

    def save(self, *args, **kwargs):
        if self.pk is not None:
            raise ValueError("Audit logs are immutable and cannot be updated.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("Audit logs are immutable and cannot be deleted.")
