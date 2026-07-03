from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0003_drop_legacy_audit_tables"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="user",
            index=models.Index(fields=["role", "cpm_number"], name="accounts_user_role_cpm_idx"),
        ),
    ]
