from django.db import models
from django.db.models.functions import Lower


class AcademicYear(models.TextChoices):
    SECOND_YEAR = "2nd Year", "2nd Year"
    THIRD_YEAR = "3rd Year", "3rd Year"


class Position(models.Model):
    name = models.CharField(max_length=100)
    academic_year = models.CharField(max_length=10, choices=AcademicYear.choices, null=True, blank=True)
    importance = models.IntegerField(default=0)
    max_winners = models.IntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["importance", "name"]
        constraints = [
            models.UniqueConstraint(
                Lower("name"),
                "academic_year",
                name="unique_position_name_year_ci",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.academic_year})"

    def save(self, *args, **kwargs):
        self.name = self.name.strip()
        super().save(*args, **kwargs)

    def has_dependencies(self) -> bool:
        if hasattr(self, "candidates") and self.candidates.exists():
            return True
        if hasattr(self, "votes") and self.votes.exists():
            return True
        if hasattr(self, "applications") and self.applications.exists():
            return True
        return False
