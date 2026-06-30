from django.db import models

from positions.models import Position


class AcademicYear(models.TextChoices):
    SECOND_YEAR = "2nd Year", "2nd Year"
    THIRD_YEAR = "3rd Year", "3rd Year"


class Candidate(models.Model):
    full_name = models.CharField(max_length=200)
    academic_year = models.CharField(max_length=10, choices=AcademicYear.choices)
    photo_url = models.URLField(max_length=500)
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
        ]

    def __str__(self):
        return f"{self.full_name} ({self.position.name})"

    def save(self, *args, **kwargs):
        self.full_name = self.full_name.strip()
        super().save(*args, **kwargs)

    def has_votes(self) -> bool:
        return hasattr(self, "votes") and self.votes.exists()
