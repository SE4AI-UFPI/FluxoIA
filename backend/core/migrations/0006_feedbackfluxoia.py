import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_versaofluxobpmn'),
    ]

    operations = [
        migrations.CreateModel(
            name='FeedbackFluxoIA',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('representa_processo', models.BooleanField(verbose_name='representa corretamente o processo')),
                ('nota_precisao_geral', models.PositiveSmallIntegerField(default=5, verbose_name='nota de precisão geral (1 a 5)')),
                ('nivel_edicao_necessario', models.CharField(choices=[('nenhuma', 'Pronto de primeira, sem ajustes'), ('pequenos_ajustes', 'Apenas pequenos ajustes de nomes ou textos'), ('ajustes_moderados', 'Precisou ajustar etapas, raias ou decisões'), ('reconstrucao', 'Precisou refazer grande parte do fluxo')], default='nenhuma', max_length=30, verbose_name='nível de edição necessário')),
                ('clareza_entrevista', models.PositiveSmallIntegerField(default=5, verbose_name='clareza da entrevista guiada (1 a 5)')),
                ('problemas_identificados', models.JSONField(blank=True, default=list, verbose_name='problemas identificados')),
                ('observacoes', models.TextField(blank=True, default='', verbose_name='observações opcionais')),
                ('criado_em', models.DateTimeField(auto_now_add=True, verbose_name='criado em')),
                ('autor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='feedbacks_ia_emitidos', to=settings.AUTH_USER_MODEL)),
                ('processo', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='feedbacks_ia', to='core.processo')),
                ('versao_bpmn', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='feedbacks', to='core.versaofluxobpmn')),
            ],
            options={
                'verbose_name': 'feedback da IA no fluxo',
                'verbose_name_plural': 'feedbacks da IA nos fluxos',
                'db_table': 'feedbacks_fluxo_ia',
                'ordering': ['-criado_em'],
            },
        ),
    ]
