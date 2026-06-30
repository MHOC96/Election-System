import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("candidates", "0001_initial"),
        ("positions", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Election",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=200)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("DRAFT", "Draft"),
                            ("ACTIVE", "Active"),
                            ("STOPPED", "Stopped"),
                            ("CLOSED", "Closed"),
                        ],
                        db_index=True,
                        default="DRAFT",
                        max_length=10,
                    ),
                ),
                ("started_at", models.DateTimeField(blank=True, null=True)),
                ("stopped_at", models.DateTimeField(blank=True, null=True)),
                ("closed_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="Vote",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "candidate",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="votes",
                        to="candidates.candidate",
                    ),
                ),
                (
                    "election",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="votes",
                        to="voting.election",
                    ),
                ),
                (
                    "member",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="votes",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "position",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="votes",
                        to="positions.position",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="election",
            constraint=models.UniqueConstraint(
                condition=models.Q(("status", "ACTIVE")),
                fields=("status",),
                name="unique_active_election",
            ),
        ),
        migrations.AddConstraint(
            model_name="vote",
            constraint=models.UniqueConstraint(
                fields=("member", "position"),
                name="unique_vote_per_member_position",
            ),
        ),
        migrations.AddIndex(
            model_name="vote",
            index=models.Index(fields=["election", "position"], name="voting_vote_electio_6ab0f1_idx"),
        ),
        migrations.AddIndex(
            model_name="vote",
            index=models.Index(fields=["election", "candidate"], name="voting_vote_electio_2c8e4a_idx"),
        ),
        migrations.AddIndex(
            model_name="vote",
            index=models.Index(fields=["member", "election"], name="voting_vote_member__a3f21b_idx"),
        ),
    ]
