from django.db import migrations, models


def migrate_legacy_roles(apps, schema_editor):
    User = apps.get_model('core', 'User')
    User.objects.filter(papel='servidor').update(papel='operacional')
    User.objects.filter(papel='validador').update(papel='supervisor')


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='email',
            field=models.EmailField(max_length=254, unique=True, verbose_name='e-mail'),
        ),
        migrations.RunPython(migrate_legacy_roles, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='user',
            name='papel',
            field=models.CharField(
                choices=[
                    ('admin', 'Administrador'),
                    ('supervisor', 'Supervisor de Setor'),
                    ('coordenador', 'Coordenador'),
                    ('operacional', 'Usuário Operacional'),
                ],
                default='operacional',
                max_length=20,
                verbose_name='papel no sistema',
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='cpf',
            field=models.CharField(blank=True, max_length=11, null=True, unique=True, verbose_name='CPF'),
        ),
        migrations.AddField(
            model_name='user',
            name='telefone',
            field=models.CharField(blank=True, default='', max_length=20, verbose_name='telefone'),
        ),
        migrations.AddField(
            model_name='user',
            name='setores_vinculados',
            field=models.JSONField(blank=True, default=list, verbose_name='setores vinculados'),
        ),
        migrations.AddField(
            model_name='user',
            name='permissoes',
            field=models.JSONField(blank=True, default=list, verbose_name='permissões complementares'),
        ),
    ]
