import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_entrevistaprocesso'),
    ]

    operations = [
        migrations.CreateModel(
            name='VersaoFluxoBPMN',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('numero_versao', models.CharField(default='1.0', max_length=20, verbose_name='número da versão')),
                ('bpmn_xml', models.TextField(verbose_name='XML BPMN 2.0')),
                ('estrutura_json', models.JSONField(blank=True, default=dict, verbose_name='estrutura intermediária e rastreabilidade')),
                ('origem', models.CharField(choices=[('ia', 'Geração IA'), ('edicao_manual', 'Edição Manual'), ('regeneracao_ia', 'Regeneração IA')], default='ia', max_length=20, verbose_name='origem')),
                ('motivo_alteracao', models.CharField(default='Geração inicial do fluxo BPMN', max_length=255, verbose_name='motivo da versão')),
                ('criado_em', models.DateTimeField(auto_now_add=True, verbose_name='criado em')),
                ('gerado_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='versoes_bpmn_geradas', to=settings.AUTH_USER_MODEL)),
                ('processo', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='versoes_bpmn', to='core.processo')),
            ],
            options={
                'verbose_name': 'versão do fluxo BPMN',
                'verbose_name_plural': 'versões do fluxo BPMN',
                'db_table': 'versoes_fluxo_bpmn',
                'ordering': ['criado_em'],
            },
        ),
    ]
