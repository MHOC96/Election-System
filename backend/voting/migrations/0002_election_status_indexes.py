from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("voting", "0001_initial"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="election",
            index=models.Index(fields=["status", "stopped_at"], name="voting_elec_status_stopped_idx"),
        ),
        migrations.AddIndex(
            model_name="election",
            index=models.Index(fields=["status", "closed_at"], name="voting_elec_status_closed_idx"),
        ),
    ]
