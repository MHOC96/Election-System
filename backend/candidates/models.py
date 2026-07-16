from django.db import models

from positions.models import Position


class AcademicYear(models.TextChoices):
    SECOND_YEAR = "2nd Year", "2nd Year"
    THIRD_YEAR = "3rd Year", "3rd Year"


class Candidate(models.Model):
    full_name = models.CharField(max_length=200)
    academic_year = models.CharField(max_length=10, choices=AcademicYear.choices)
    photo_url = models.URLField(max_length=500)
    declaration_file = models.URLField(max_length=500, blank=True, default="")
    election = models.ForeignKey("voting.Election", on_delete=models.CASCADE, related_name="candidates")
    position = models.ForeignKey(
        Position,
        on_delete=models.PROTECT,
        related_name="candidates",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["full_name"]
        indexes = [
            models.Index(fields=["position", "academic_year"]),
            models.Index(fields=["election", "position"], name="cand_election_position_idx"),
        ]

    def __str__(self):
        return f"{self.full_name} ({self.position.name})"

    def save(self, *args, **kwargs):
        self.full_name = self.full_name.strip()
        super().save(*args, **kwargs)

    def has_votes(self) -> bool:
        return hasattr(self, "votes") and self.votes.exists()


class ApplicationStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    PENDING_REVIEW = "PENDING_REVIEW", "Pending Review"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"
    WITHDRAWN = "WITHDRAWN", "Withdrawn"


class CandidateApplication(models.Model):
    election = models.ForeignKey("voting.Election", on_delete=models.CASCADE, related_name="applications")
    member = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="applications")
    position = models.ForeignKey("positions.Position", on_delete=models.PROTECT, related_name="applications")
    
    full_name = models.CharField(max_length=200)
    cpm_number = models.CharField(max_length=50)
    contact_number = models.CharField(max_length=20)
    photo_url = models.URLField(max_length=500)
    declaration_file = models.URLField(max_length=500)
    
    status = models.CharField(max_length=20, choices=ApplicationStatus.choices, default=ApplicationStatus.PENDING_REVIEW)
    rejection_reason = models.TextField(blank=True, default="")
    
    submitted_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="approved_applications")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["election", "status"], name="candapp_elect_status_idx"),
            models.Index(fields=["election", "member"], name="candapp_election_member_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["election", "member"],
                condition=~models.Q(status__in=[ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN]),
                name="unique_active_application_per_member_election",
            ),
        ]

    def __str__(self):
        return f"Application by {self.full_name} for {self.position.name} ({self.status})"
