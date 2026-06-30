from django.db import models
from django.db.models.functions import Lower


class Position(models.Model):
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                Lower("name"),
                name="unique_position_name_ci",
            ),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        self.name = self.name.strip()
        super().save(*args, **kwargs)

    def has_dependencies(self) -> bool:
        if hasattr(self, "candidates") and self.candidates.exists():
            return True
        if hasattr(self, "votes") and self.votes.exists():
            return True
        return False
