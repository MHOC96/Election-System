import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AuditLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "action",
                    models.CharField(
                        choices=[
                            ("LOGIN", "Login"),
                            ("LOGOUT", "Logout"),
                            ("VOTE_SUBMITTED", "Vote Submitted"),
                            ("MEMBER_IMPORT", "Member Import"),
                            ("CANDIDATE_CREATED", "Candidate Created"),
                            ("CANDIDATE_UPDATED", "Candidate Updated"),
                            ("CANDIDATE_DELETED", "Candidate Deleted"),
                            ("CANDIDATE_PHOTO_UPLOADED", "Candidate Photo Uploaded"),
                            ("POSITION_CREATED", "Position Created"),
                            ("POSITION_UPDATED", "Position Updated"),
                            ("POSITION_DELETED", "Position Deleted"),
                            ("ELECTION_CREATED", "Election Created"),
                            ("ELECTION_STARTED", "Election Started"),
                            ("ELECTION_STOPPED", "Election Stopped"),
                            ("ELECTION_CLOSED", "Election Closed"),
                        ],
                        db_index=True,
                        max_length=40,
                    ),
                ),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "actor",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="audit_logs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["action", "created_at"], name="audit_audit_action_7d0f2b_idx"),
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["actor", "created_at"], name="audit_audit_actor_i_a4b8c1_idx"),
        ),
    ]
