import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_rbac_user_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='Processo',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('codigo', models.CharField(blank=True, max_length=40, null=True, unique=True, verbose_name='código')),
                ('nome', models.CharField(max_length=200, verbose_name='nome do processo')),
                ('secretaria', models.CharField(blank=True, default='', max_length=120, verbose_name='secretaria / órgão')),
                ('setor', models.CharField(max_length=120, verbose_name='setor / unidade')),
                ('objetivo', models.TextField(verbose_name='objetivo do processo')),
                ('descricao', models.TextField(blank=True, default='', verbose_name='descrição geral')),
                ('legislacao', models.TextField(blank=True, default='', verbose_name='legislação ou norma relacionada')),
                ('etapa_atual', models.PositiveSmallIntegerField(default=1, verbose_name='etapa atual')),
                ('status', models.CharField(choices=[('rascunho', 'Rascunho'), ('em_entrevista', 'Em Entrevista'), ('em_modelagem', 'Em Modelagem BPMN'), ('em_avaliacao', 'Em Avaliação'), ('aguardando_validacao', 'Aguardando Validação do Gestor'), ('ajustes_solicitados', 'Ajustes Solicitados'), ('aprovado', 'Aprovado'), ('publicado', 'Publicado')], default='rascunho', max_length=30, verbose_name='status')),
                ('versao_atual', models.CharField(default='1.0', max_length=20, verbose_name='versão atual')),
                ('submetido_em', models.DateTimeField(blank=True, null=True, verbose_name='submetido em')),
                ('aprovado_em', models.DateTimeField(blank=True, null=True, verbose_name='aprovado em')),
                ('criado_em', models.DateTimeField(auto_now_add=True, verbose_name='criado em')),
                ('atualizado_em', models.DateTimeField(auto_now=True, verbose_name='atualizado em')),
                ('aprovado_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='processos_aprovados', to=settings.AUTH_USER_MODEL)),
                ('criado_por', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='processos_criados', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'processo',
                'verbose_name_plural': 'processos',
                'db_table': 'processos',
                'ordering': ['-atualizado_em'],
            },
        ),
    ]
