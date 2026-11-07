import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0006_feedbackfluxoia'),
    ]

    operations = [
        migrations.CreateModel(
            name='RevisaoGovernanca',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('decisao', models.CharField(choices=[('aprovado', 'Aprovado'), ('ajustes_solicitados', 'Ajustes Solicitados'), ('rejeitado', 'Rejeitado')], max_length=25, verbose_name='decisão')),
                ('parecer', models.TextField(blank=True, default='', verbose_name='parecer do revisor')),
                ('criado_em', models.DateTimeField(auto_now_add=True, verbose_name='criado em')),
                ('processo', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='revisoes_governanca', to='core.processo')),
                ('revisor', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='revisoes_realizadas', to=settings.AUTH_USER_MODEL)),
                ('versao_bpmn', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='revisoes', to='core.versaofluxobpmn')),
            ],
            options={
                'verbose_name': 'revisão de governança',
                'verbose_name_plural': 'revisões de governança',
                'db_table': 'revisoes_governanca',
                'ordering': ['-criado_em'],
            },
        ),
    ]
