from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0006_user_has_changed_password"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="user",
            index=models.Index(
                condition=models.Q(("role", "MEMBER")),
                fields=["role", "is_active", "academic_year"],
                name="acc_user_member_year_idx",
            ),
        ),
    ]
