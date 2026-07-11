from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):

    dependencies = [
        ("voting", "0008_vote_unique_per_election"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="election",
            constraint=models.UniqueConstraint(
                condition=Q(status="SCHEDULED"),
                fields=("status",),
                name="unique_scheduled_election",
            ),
        ),
    ]
