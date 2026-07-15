from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("candidates", "0011_remove_candidateapplication_mc_number"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="candidateapplication",
            index=models.Index(
                fields=["election", "member"],
                name="candapp_election_member_idx",
            ),
        ),
    ]
