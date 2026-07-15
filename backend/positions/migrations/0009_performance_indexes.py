from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("positions", "0008_position_max_winners_alter_position_academic_year"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="position",
            index=models.Index(
                condition=models.Q(("academic_year__isnull", False)),
                fields=["academic_year"],
                name="positions_academic_year_idx",
            ),
        ),
    ]
