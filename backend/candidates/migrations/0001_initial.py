from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("positions", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Candidate",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("full_name", models.CharField(max_length=200)),
                (
                    "academic_year",
                    models.CharField(
                        choices=[("2nd Year", "2nd Year"), ("3rd Year", "3rd Year")],
                        max_length=10,
                    ),
                ),
                ("photo_url", models.URLField(max_length=500)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "position",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="candidates",
                        to="positions.position",
                    ),
                ),
            ],
            options={
                "ordering": ["full_name"],
            },
        ),
        migrations.AddIndex(
            model_name="candidate",
            index=models.Index(fields=["position", "academic_year"], name="candidates_ca_positio_0a8f4d_idx"),
        ),
    ]
