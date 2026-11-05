import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0007_revisaogovernanca'),
    ]

    operations = [
        migrations.CreateModel(
            name='PerguntaEntrevista',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('chave', models.CharField(max_length=50, unique=True, verbose_name='chave identificadora')),
                ('ordem', models.PositiveSmallIntegerField(default=1, verbose_name='ordem de exibição')),
                ('titulo', models.CharField(max_length=120, verbose_name='título')),
                ('enunciado', models.TextField(verbose_name='enunciado da pergunta')),
                ('obrigatoria', models.BooleanField(default=False, verbose_name='obrigatória')),
                ('ativa', models.BooleanField(default=True, verbose_name='ativa')),
                ('criado_em', models.DateTimeField(auto_now_add=True, verbose_name='criado em')),
                ('atualizado_em', models.DateTimeField(auto_now=True, verbose_name='atualizado em')),
            ],
            options={
                'verbose_name': 'pergunta da entrevista',
                'verbose_name_plural': 'perguntas da entrevista',
                'db_table': 'perguntas_entrevista',
                'ordering': ['ordem'],
            },
        ),
    ]
