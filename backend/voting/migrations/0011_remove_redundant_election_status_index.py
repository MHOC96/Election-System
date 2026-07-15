from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("voting", "0010_performance_indexes"),
    ]

    operations = [
        migrations.RemoveIndex(
            model_name="election",
            name="voting_elec_status_1bccd8_idx",
        ),
    ]
