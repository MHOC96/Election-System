from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("voting", "0009_unique_scheduled_election"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="election",
            index=models.Index(
                condition=models.Q(
                    ("results_published", True),
                    ("status", "SCHEDULED"),
                ),
                fields=["status", "results_published", "-updated_at"],
                name="vote_elec_published_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="election",
            index=models.Index(
                condition=models.Q(
                    ("status", "SCHEDULED"),
                    ("voting_started", True),
                ),
                fields=["status", "voting_started", "-voting_end_at"],
                name="vote_elec_recent_closed_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="vote",
            index=models.Index(
                fields=["election", "member"],
                name="vote_election_member_idx",
            ),
        ),
    ]
