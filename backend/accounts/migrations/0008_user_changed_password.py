from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0007_performance_indexes"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="changed_password",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
    ]
