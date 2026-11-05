import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db import models


class PapelUsuario(models.TextChoices):
    ADMIN = 'admin', 'Administrador'
    SUPERVISOR = 'supervisor', 'Supervisor de Setor'
    COORDENADOR = 'coordenador', 'Coordenador'
    OPERACIONAL = 'operacional', 'Usuário Operacional'


class UserManager(BaseUserManager):
    def create_user(self, email: str, nome: str, password: str | None = None, **extra_fields):
        if not email:
            raise ValueError('O e-mail é obrigatório.')
        if not nome:
            raise ValueError('O nome é obrigatório.')

        email = self.normalize_email(email)
        extra_fields.setdefault('papel', PapelUsuario.OPERACIONAL)

        user = self.model(email=email, nome=nome.strip(), **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, nome: str, password: str | None = None, **extra_fields):
        extra_fields['papel'] = PapelUsuario.ADMIN
        extra_fields.setdefault('is_active', True)
        return self.create_user(email=email, nome=nome, password=password, **extra_fields)


class User(AbstractBaseUser):
    """
    Modelo de usuário do FluxoIA com dados funcionais e escopo RBAC.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField('e-mail', unique=True)
    nome = models.CharField('nome completo', max_length=150)
    papel = models.CharField(
        'papel no sistema',
        max_length=20,
        choices=PapelUsuario.choices,
        default=PapelUsuario.OPERACIONAL,
    )
    secretaria = models.CharField(
        'órgão ou secretaria',
        max_length=120,
        blank=True,
        default='',
        help_text='Ex.: SDU Leste, SECTI, SEMPLAN',
    )
    setor = models.CharField(
        'setor ou coordenação',
        max_length=120,
        blank=True,
        default='',
        help_text='Ex.: SDU: Protocolo, SDU: CEU - AAD',
    )
    cargo = models.CharField(
        'cargo ou função',
        max_length=120,
        blank=True,
        default='',
        help_text='Ex.: Analista, Coordenadora, Chefe de Divisão',
    )
    matricula = models.CharField(
        'matrícula funcional',
        max_length=50,
        blank=True,
        null=True,
        unique=True,
    )
    cpf = models.CharField('CPF', max_length=11, blank=True, null=True, unique=True)
    telefone = models.CharField('telefone', max_length=20, blank=True, default='')
    setores_vinculados = models.JSONField('setores vinculados', default=list, blank=True)
    permissoes = models.JSONField('permissões complementares', default=list, blank=True)

    is_active = models.BooleanField('ativo', default=True)
    criado_em = models.DateTimeField('criado em', auto_now_add=True)
    atualizado_em = models.DateTimeField('atualizado em', auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nome']

    class Meta:
        db_table = 'usuarios'
        verbose_name = 'usuário'
        verbose_name_plural = 'usuários'
        ordering = ['nome']

    def __str__(self) -> str:
        return f'{self.nome} ({self.email})'


class StatusProcesso(models.TextChoices):
    RASCUNHO = 'rascunho', 'Rascunho'
    EM_ENTREVISTA = 'em_entrevista', 'Em Entrevista'
    EM_MODELAGEM = 'em_modelagem', 'Em Modelagem BPMN'
    EM_AVALIACAO = 'em_avaliacao', 'Em Avaliação'
    AGUARDANDO_VALIDACAO = 'aguardando_validacao', 'Aguardando Validação do Gestor'
    AJUSTES_SOLICITADOS = 'ajustes_solicitados', 'Ajustes Solicitados'
    APROVADO = 'aprovado', 'Aprovado'
    PUBLICADO = 'publicado', 'Publicado'


class Processo(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    codigo = models.CharField('código', max_length=40, unique=True, null=True, blank=True)
    nome = models.CharField('nome do processo', max_length=200)
    secretaria = models.CharField('secretaria / órgão', max_length=120, blank=True, default='')
    setor = models.CharField('setor / unidade', max_length=120)
    objetivo = models.TextField('objetivo do processo')
    descricao = models.TextField('descrição geral', blank=True, default='')
    legislacao = models.TextField('legislação ou norma relacionada', blank=True, default='')
    etapa_atual = models.PositiveSmallIntegerField('etapa atual', default=1)
    status = models.CharField(
        'status',
        max_length=30,
        choices=StatusProcesso.choices,
        default=StatusProcesso.RASCUNHO,
    )
    versao_atual = models.CharField('versão atual', max_length=20, default='1.0')
    criado_por = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='processos_criados',
    )
    aprovado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='processos_aprovados',
    )
    submetido_em = models.DateTimeField('submetido em', null=True, blank=True)
    aprovado_em = models.DateTimeField('aprovado em', null=True, blank=True)
    criado_em = models.DateTimeField('criado em', auto_now_add=True)
    atualizado_em = models.DateTimeField('atualizado em', auto_now=True)

    class Meta:
        db_table = 'processos'
        verbose_name = 'processo'
        verbose_name_plural = 'processos'
        ordering = ['-atualizado_em']

    def __str__(self) -> str:
        return f'{self.codigo or "S/C"} - {self.nome}'


class EntrevistaProcesso(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    processo = models.OneToOneField(
        Processo,
        on_delete=models.CASCADE,
        related_name='entrevista',
    )
    pergunta_atual_idx = models.PositiveSmallIntegerField('índice da pergunta atual', default=0)
    respostas = models.JSONField('respostas da entrevista', default=dict, blank=True)
    atualizado_em = models.DateTimeField('atualizado em', auto_now=True)

    class Meta:
        db_table = 'entrevistas_processo'
        verbose_name = 'entrevista do processo'
        verbose_name_plural = 'entrevistas de processos'

    def __str__(self) -> str:
        return f'Entrevista - {self.processo.nome}'


class OrigemVersaoBPMN(models.TextChoices):
    IA = 'ia', 'Geração IA'
    EDICAO_MANUAL = 'edicao_manual', 'Edição Manual'
    REGENERACAO_IA = 'regeneracao_ia', 'Regeneração IA'


class VersaoFluxoBPMN(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    processo = models.ForeignKey(
        Processo,
        on_delete=models.CASCADE,
        related_name='versoes_bpmn',
    )
    numero_versao = models.CharField('número da versão', max_length=20, default='1.0')
    bpmn_xml = models.TextField('XML BPMN 2.0')
    estrutura_json = models.JSONField(
        'estrutura intermediária e rastreabilidade',
        default=dict,
        blank=True,
    )
    origem = models.CharField(
        'origem',
        max_length=20,
        choices=OrigemVersaoBPMN.choices,
        default=OrigemVersaoBPMN.IA,
    )
    motivo_alteracao = models.CharField(
        'motivo da versão',
        max_length=255,
        default='Geração inicial do fluxo BPMN',
    )
    gerado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='versoes_bpmn_geradas',
    )
    criado_em = models.DateTimeField('criado em', auto_now_add=True)

    class Meta:
        db_table = 'versoes_fluxo_bpmn'
        verbose_name = 'versão de fluxo BPMN'
        verbose_name_plural = 'versões de fluxo BPMN'
        ordering = ['criado_em']

    def __str__(self) -> str:
        return f'{self.processo.nome} - v{self.numero_versao}'


class NivelEdicaoFluxo(models.TextChoices):
    NENHUMA = 'nenhuma', 'Pronto de primeira, sem ajustes'
    PEQUENOS_AJUSTES = 'pequenos_ajustes', 'Apenas pequenos ajustes de nomes ou textos'
    AJUSTES_MODERADOS = 'ajustes_moderados', 'Precisou ajustar etapas, raias ou decisões'
    RECONSTRUCAO = 'reconstrucao', 'Precisou refazer grande parte do fluxo'


class FeedbackFluxoIA(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    processo = models.ForeignKey(
        Processo,
        on_delete=models.CASCADE,
        related_name='feedbacks_ia',
    )
    versao_bpmn = models.ForeignKey(
        VersaoFluxoBPMN,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='feedbacks',
    )
    autor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='feedbacks_ia_emitidos',
    )
    representa_processo = models.BooleanField('representa corretamente o processo')
    nota_precisao_geral = models.PositiveSmallIntegerField(
        'nota de precisão geral (1 a 5)',
        default=5,
    )
    nivel_edicao_necessario = models.CharField(
        'nível de edição necessário',
        max_length=30,
        choices=NivelEdicaoFluxo.choices,
        default=NivelEdicaoFluxo.NENHUMA,
    )
    clareza_entrevista = models.PositiveSmallIntegerField(
        'clareza da entrevista guiada (1 a 5)',
        default=5,
    )
    problemas_identificados = models.JSONField(
        'problemas identificados',
        default=list,
        blank=True,
    )
    observacoes = models.TextField('observações opcionais', blank=True, default='')
    criado_em = models.DateTimeField('criado em', auto_now_add=True)

    class Meta:
        db_table = 'feedbacks_fluxo_ia'
        verbose_name = 'feedback de fluxo IA'
        verbose_name_plural = 'feedbacks de fluxo IA'
        ordering = ['-criado_em']

    def __str__(self) -> str:
        return f'Feedback IA - {self.processo.nome} ({self.nota_precisao_geral}/5)'


class DecisaoGovernanca(models.TextChoices):
    APROVADO = 'aprovado', 'Aprovado'
    AJUSTES_SOLICITADOS = 'ajustes_solicitados', 'Ajustes Solicitados'
    REJEITADO = 'rejeitado', 'Rejeitado'


class RevisaoGovernanca(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    processo = models.ForeignKey(
        Processo,
        on_delete=models.CASCADE,
        related_name='revisoes_governanca',
    )
    versao_bpmn = models.ForeignKey(
        VersaoFluxoBPMN,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='revisoes',
    )
    revisor = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='revisoes_realizadas',
    )
    decisao = models.CharField('decisão', max_length=25, choices=DecisaoGovernanca.choices)
    parecer = models.TextField('parecer do revisor', blank=True, default='')
    criado_em = models.DateTimeField('criado em', auto_now_add=True)

    class Meta:
        db_table = 'revisoes_governanca'
        verbose_name = 'revisão de governança'
        verbose_name_plural = 'revisões de governança'
        ordering = ['-criado_em']

    def __str__(self) -> str:
        return f'Revisão ({self.decisao}) - {self.processo.nome}'


class PerguntaEntrevista(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    chave = models.CharField('chave identificadora', max_length=50, unique=True)
    ordem = models.PositiveSmallIntegerField('ordem de exibição', default=1)
    titulo = models.CharField('título', max_length=120)
    enunciado = models.TextField('enunciado da pergunta')
    obrigatoria = models.BooleanField('obrigatória', default=False)
    ativa = models.BooleanField('ativa', default=True)
    criado_em = models.DateTimeField('criado em', auto_now_add=True)
    atualizado_em = models.DateTimeField('atualizado em', auto_now=True)

    class Meta:
        db_table = 'perguntas_entrevista'
        verbose_name = 'pergunta da entrevista'
        verbose_name_plural = 'perguntas da entrevista'
        ordering = ['ordem']

    def __str__(self) -> str:
        return f'{self.ordem}. {self.titulo} ({self.chave})'


