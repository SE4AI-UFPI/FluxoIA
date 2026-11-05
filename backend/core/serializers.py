from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
import re
from .models import (
    DecisaoGovernanca,
    EntrevistaProcesso,
    FeedbackFluxoIA,
    NivelEdicaoFluxo,
    OrigemVersaoBPMN,
    PapelUsuario,
    PerguntaEntrevista,
    Processo,
    RevisaoGovernanca,
    StatusProcesso,
    User,
    VersaoFluxoBPMN,
)


class UserSerializer(serializers.ModelSerializer):
    """DTO de leitura e validação de usuários."""

    PERMISSOES_POR_PAPEL = {
        PapelUsuario.SUPERVISOR: {
            'visualizar_relatorios', 'exportar_dados', 'aprovar_fluxos',
            'assinar_documentos', 'gerenciar_indicadores', 'homologar_processos',
            'gerar_editar_diagramas_institucionais', 'exportar_artefatos',
            'acessar_dashboard',
        },
        PapelUsuario.COORDENADOR: {
            'exportar_dados', 'gerenciar_indicadores', 'acessar_dashboard',
            'distribuir_tarefas', 'gerenciar_equipes', 'consultar_processos',
            'responder_entrevistas_guiadas', 'gerar_editar_diagramas_institucionais',
            'exportar_artefatos',
        },
        PapelUsuario.OPERACIONAL: {
            'executar_atividades', 'atualizar_informacoes', 'consultar_processos',
            'responder_entrevistas_guiadas', 'acessar_dashboard',
        },
    }
    permissoes = serializers.ListField(
        child=serializers.CharField(max_length=40), required=False,
    )
    setores_vinculados = serializers.ListField(
        child=serializers.CharField(max_length=120), required=False,
    )
    cpf = serializers.CharField(required=False, allow_blank=True, max_length=14)

    password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=False,
        style={'input_type': 'password'},
    )

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'nome',
            'papel',
            'secretaria',
            'setor',
            'cargo',
            'matricula',
            'cpf',
            'telefone',
            'setores_vinculados',
            'permissoes',
            'is_active',
            'criado_em',
            'atualizado_em',
            'password',
        ]
        read_only_fields = ['id', 'criado_em', 'atualizado_em']

    def validate_matricula(self, value):
        return None if value == '' else value

    def validate_cpf(self, value):
        if not value:
            return None

        if not re.fullmatch(r'(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})', value):
            raise serializers.ValidationError('Informe um CPF válido.')

        digits = ''.join(character for character in value if character.isdigit())
        if len(digits) != 11 or len(set(digits)) == 1:
            raise serializers.ValidationError('Informe um CPF válido.')

        for length in (9, 10):
            total = sum(int(digit) * weight for digit, weight in zip(digits[:length], range(length + 1, 1, -1)))
            check_digit = (total * 10) % 11
            if check_digit == 10:
                check_digit = 0
            if check_digit != int(digits[length]):
                raise serializers.ValidationError('Informe um CPF válido.')

        return digits

    def validate_password(self, value):
        if value:
            validate_password(value)
        return value

    def validate(self, attrs):
        if self.instance is None and not attrs.get('password'):
            raise serializers.ValidationError({'password': 'A senha é obrigatória na criação do usuário.'})

        request = self.context.get('request')
        if (
            self.instance is not None
            and request is not None
            and getattr(request, 'user', None) is not None
            and request.user.is_authenticated
            and request.user.papel != PapelUsuario.ADMIN
        ):
            for campo_restrito in (
                'papel',
                'is_active',
                'secretaria',
                'setor',
                'setores_vinculados',
                'permissoes',
            ):
                attrs.pop(campo_restrito, None)

        papel = attrs.get('papel', self.instance.papel if self.instance else PapelUsuario.OPERACIONAL)
        setor = attrs.get('setor', self.instance.setor if self.instance else '')
        setores_vinculados = attrs.get(
            'setores_vinculados', self.instance.setores_vinculados if self.instance else [],
        )

        if papel in (PapelUsuario.SUPERVISOR, PapelUsuario.COORDENADOR, PapelUsuario.OPERACIONAL) and not setor.strip():
            raise serializers.ValidationError({'setor': 'Informe o setor de atuação deste perfil.'})

        permissoes = attrs.get('permissoes', self.instance.permissoes if self.instance else [])
        permissoes_permitidas = self.PERMISSOES_POR_PAPEL.get(papel)
        if permissoes_permitidas is not None and not set(permissoes).issubset(permissoes_permitidas):
            raise serializers.ValidationError({'permissoes': 'Há permissões incompatíveis com o perfil selecionado.'})

        if papel == PapelUsuario.ADMIN:
            if setores_vinculados:
                raise serializers.ValidationError({'setores_vinculados': 'Administradores possuem escopo institucional completo.'})
            if attrs.get('permissoes'):
                raise serializers.ValidationError({'permissoes': 'Administradores possuem acesso total.'})

        return attrs


class RegisterSerializer(serializers.ModelSerializer):
    """DTO para validação do auto-cadastro (Sign Up)."""

    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'},
    )
    papel = serializers.ChoiceField(
        choices=[
            (PapelUsuario.OPERACIONAL, 'Usuário Operacional'),
            (PapelUsuario.COORDENADOR, 'Coordenador'),
            (PapelUsuario.SUPERVISOR, 'Supervisor de Setor'),
        ],
        default=PapelUsuario.OPERACIONAL,
        required=False,
    )

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'nome',
            'password',
            'papel',
            'secretaria',
            'setor',
            'cargo',
            'matricula',
        ]
        read_only_fields = ['id']

    def validate_matricula(self, value):
        return None if value == '' else value


class ChangePasswordSerializer(serializers.Serializer):
    senha_atual = serializers.CharField(write_only=True, required=True)
    nova_senha = serializers.CharField(write_only=True, required=True, validators=[validate_password])

    def validate_senha_atual(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('A senha atual está incorreta.')
        return value


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['nome'] = user.nome
        token['papel'] = user.papel
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data


class EntrevistaProcessoSerializer(serializers.ModelSerializer):
    class Meta:
        model = EntrevistaProcesso
        fields = [
            'id',
            'pergunta_atual_idx',
            'respostas',
            'atualizado_em',
        ]
        read_only_fields = ['id', 'atualizado_em']

    def validate_respostas(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError('As respostas da entrevista devem ser um objeto JSON.')
        return value


class VersaoFluxoBPMNSerializer(serializers.ModelSerializer):
    gerado_por_nome = serializers.CharField(source='gerado_por.nome', read_only=True, default='')

    class Meta:
        model = VersaoFluxoBPMN
        fields = [
            'id',
            'numero_versao',
            'bpmn_xml',
            'estrutura_json',
            'origem',
            'motivo_alteracao',
            'gerado_por',
            'gerado_por_nome',
            'criado_em',
        ]
        read_only_fields = ['id', 'gerado_por', 'gerado_por_nome', 'criado_em']


class FeedbackFluxoIASerializer(serializers.ModelSerializer):
    PROBLEMAS_VALIDOS = {
        'etapas_ausentes',
        'raias_incorretas',
        'decisoes_incorretas',
        'sequencia_incorreta',
        'aprovacoes_ausentes',
    }
    autor_nome = serializers.CharField(source='autor.nome', read_only=True, default='')
    nota_precisao_geral = serializers.IntegerField(min_value=1, max_value=5, default=5)
    clareza_entrevista = serializers.IntegerField(min_value=1, max_value=5, default=5)
    problemas_identificados = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        default=list,
    )

    class Meta:
        model = FeedbackFluxoIA
        fields = [
            'id',
            'versao_bpmn',
            'autor',
            'autor_nome',
            'representa_processo',
            'nota_precisao_geral',
            'nivel_edicao_necessario',
            'clareza_entrevista',
            'problemas_identificados',
            'observacoes',
            'criado_em',
        ]
        read_only_fields = ['id', 'autor', 'autor_nome', 'criado_em']

    def validate_problemas_identificados(self, value):
        invalidos = set(value) - self.PROBLEMAS_VALIDOS
        if invalidos:
            raise serializers.ValidationError(
                f'Problemas inválidos: {", ".join(sorted(invalidos))}.'
            )
        return value


class RevisaoGovernancaSerializer(serializers.ModelSerializer):
    revisor_nome = serializers.CharField(source='revisor.nome', read_only=True, default='')

    class Meta:
        model = RevisaoGovernanca
        fields = [
            'id',
            'versao_bpmn',
            'revisor',
            'revisor_nome',
            'decisao',
            'parecer',
            'criado_em',
        ]
        read_only_fields = ['id', 'revisor', 'revisor_nome', 'criado_em']


class ProcessoSerializer(serializers.ModelSerializer):
    criado_por_nome = serializers.CharField(source='criado_por.nome', read_only=True, default='')
    aprovado_por_nome = serializers.CharField(source='aprovado_por.nome', read_only=True, default='')
    bpmn_xml_atual = serializers.SerializerMethodField()
    entrevista = EntrevistaProcessoSerializer(required=False)
    versoes_bpmn = VersaoFluxoBPMNSerializer(many=True, read_only=True)
    feedbacks_ia = FeedbackFluxoIASerializer(many=True, read_only=True)
    revisoes_governanca = RevisaoGovernancaSerializer(many=True, read_only=True)

    class Meta:
        model = Processo
        fields = [
            'id',
            'codigo',
            'nome',
            'secretaria',
            'setor',
            'objetivo',
            'descricao',
            'legislacao',
            'etapa_atual',
            'status',
            'versao_atual',
            'criado_por',
            'criado_por_nome',
            'aprovado_por',
            'aprovado_por_nome',
            'submetido_em',
            'aprovado_em',
            'criado_em',
            'atualizado_em',
            'bpmn_xml_atual',
            'entrevista',
            'versoes_bpmn',
            'feedbacks_ia',
            'revisoes_governanca',
        ]
        read_only_fields = [
            'id',
            'codigo',
            'criado_por',
            'criado_por_nome',
            'aprovado_por',
            'aprovado_por_nome',
            'submetido_em',
            'aprovado_em',
            'criado_em',
            'atualizado_em',
            'bpmn_xml_atual',
            'versoes_bpmn',
            'feedbacks_ia',
            'revisoes_governanca',
        ]

    def get_bpmn_xml_atual(self, obj: Processo) -> str | None:
        versoes = list(obj.versoes_bpmn.all())
        if not versoes:
            return None
        return versoes[-1].bpmn_xml


class PerguntaEntrevistaSerializer(serializers.ModelSerializer):
    """DTO para listagem das perguntas da entrevista guiada."""

    class Meta:
        model = PerguntaEntrevista
        fields = [
            'id',
            'chave',
            'ordem',
            'titulo',
            'enunciado',
            'obrigatoria',
            'ativa',
        ]
        read_only_fields = ['id', 'chave', 'ordem', 'titulo', 'enunciado', 'obrigatoria', 'ativa']


