from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("candidates", "0006_candidate_election"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="candidateapplication",
            name="unique_active_application_per_member",
        ),
        migrations.AddConstraint(
            model_name="candidateapplication",
            constraint=models.UniqueConstraint(
                fields=("election", "member"),
                condition=models.Q(
                    ("status__in", ["DRAFT", "PENDING_REVIEW", "APPROVED"])
                ),
                name="unique_active_application_per_member_election",
            ),
        ),
    ]
