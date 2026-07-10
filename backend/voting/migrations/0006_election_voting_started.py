from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("voting", "0005_remove_election_unique_active_election_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="election",
            name="voting_started",
            field=models.BooleanField(default=False),
        ),
    ]
