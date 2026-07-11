from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("voting", "0007_election_require_all_positions_filled"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="vote",
            name="unique_vote_per_member_position",
        ),
        migrations.AddConstraint(
            model_name="vote",
            constraint=models.UniqueConstraint(
                fields=("member", "position", "election"),
                name="unique_vote_per_member_position_election",
            ),
        ),
    ]
