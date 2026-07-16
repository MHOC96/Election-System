from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('candidates', '0012_performance_indexes'),
    ]

    operations = [
        migrations.AddField(
            model_name='candidate',
            name='declaration_file',
            field=models.URLField(blank=True, default='', max_length=500),
        ),
    ]
