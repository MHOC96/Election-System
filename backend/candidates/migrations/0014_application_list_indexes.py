from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("candidates", "0013_candidate_declaration_file"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="candidateapplication",
            index=models.Index(fields=["-submitted_at"], name="candapp_submitted_desc_idx"),
        ),
        migrations.AddIndex(
            model_name="candidateapplication",
            index=models.Index(fields=["cpm_number"], name="candapp_cpm_idx"),
        ),
    ]
