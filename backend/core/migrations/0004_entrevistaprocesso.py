import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_processo'),
    ]

    operations = [
        migrations.CreateModel(
            name='EntrevistaProcesso',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('pergunta_atual_idx', models.PositiveSmallIntegerField(default=0, verbose_name='índice da pergunta atual')),
                ('respostas', models.JSONField(blank=True, default=dict, verbose_name='respostas da entrevista')),
                ('atualizado_em', models.DateTimeField(auto_now=True, verbose_name='atualizado em')),
                ('processo', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='entrevista', to='core.processo')),
            ],
            options={
                'verbose_name': 'entrevista do processo',
                'verbose_name_plural': 'entrevistas dos processos',
                'db_table': 'entrevistas_processo',
            },
        ),
    ]
