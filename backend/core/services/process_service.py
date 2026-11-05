import re
from django.db import transaction
from django.db.models import Q, QuerySet
from django.utils import timezone

from core.models import (
    DecisaoGovernanca,
    EntrevistaProcesso,
    FeedbackFluxoIA,
    OrigemVersaoBPMN,
    PapelUsuario,
    Processo,
    RevisaoGovernanca,
    StatusProcesso,
    User,
    VersaoFluxoBPMN,
)

RESPOSTAS_PADRAO: dict[str, str] = {
    'trigger': '',
    'activities': '',
    'areasInvolved': '',
    'sequence': '',
    'responsibles': '',
    'approvals': '',
    'rules': '',
    'exceptions': '',
    'documents': '',
    'systems': '',
    'completion': '',
}


def gerar_codigo_processo(setor: str) -> str:
    """Gera código único no formato BPMN-{SIGLA_SETOR}-{ANO}-{SEQUENCIAL:05d}."""
    partes = re.findall(r'[A-Za-z0-9]+', (setor or '').upper())
    sigla = partes[0][:6] if partes else 'GERAL'
    ano = timezone.now().year
    prefixo = f'BPMN-{sigla}-{ano}-'

    sequencial = Processo.objects.filter(codigo__startswith=prefixo).count() + 1
    codigo = f'{prefixo}{sequencial:05d}'
    while Processo.objects.filter(codigo=codigo).exists():
        sequencial += 1
        codigo = f'{prefixo}{sequencial:05d}'
    return codigo


def listar_processos(
    *,
    usuario: User,
    status: str | None = None,
    setor: str | None = None,
    busca: str | None = None,
) -> QuerySet[Processo]:
    """Lista processos aplicando regras de visibilidade RBAC e filtros."""
    qs = Processo.objects.select_related('criado_por', 'aprovado_por', 'entrevista').prefetch_related(
        'versoes_bpmn__gerado_por',
        'feedbacks_ia__autor',
        'revisoes_governanca__revisor',
    )

    if usuario.papel == PapelUsuario.ADMIN:
        pass
    elif usuario.papel == PapelUsuario.SUPERVISOR:
        setores_escopo = [s for s in [usuario.setor, *(usuario.setores_vinculados or [])] if s]
        filtro_supervisor = Q(criado_por=usuario)
        if setores_escopo:
            filtro_supervisor |= Q(setor__in=setores_escopo)
        qs = qs.filter(filtro_supervisor)
    else:
        filtro_usuario = Q(criado_por=usuario)
        if usuario.setor:
            filtro_usuario |= Q(setor=usuario.setor)
        qs = qs.filter(filtro_usuario)

    if status:
        qs = qs.filter(status=status)

    if setor:
        qs = qs.filter(setor__icontains=setor)

    if busca:
        qs = qs.filter(Q(nome__icontains=busca) | Q(codigo__icontains=busca))

    return qs.distinct()


@transaction.atomic
def criar_processo(*, usuario: User, dados: dict) -> Processo:
    """Cria um Processo com código institucional e inicializa sua EntrevistaProcesso."""
    dados_limpos = dict(dados)
    dados_entrevista = dados_limpos.pop('entrevista', None) or {}

    secretaria = dados_limpos.get('secretaria') or usuario.secretaria or ''
    dados_limpos['secretaria'] = secretaria
    dados_limpos.setdefault('codigo', gerar_codigo_processo(dados_limpos['setor']))

    processo = Processo.objects.create(criado_por=usuario, **dados_limpos)

    respostas_iniciais = {**RESPOSTAS_PADRAO, **(dados_entrevista.get('respostas') or {})}
    pergunta_idx = dados_entrevista.get('pergunta_atual_idx', 0)

    EntrevistaProcesso.objects.create(
        processo=processo,
        pergunta_atual_idx=pergunta_idx,
        respostas=respostas_iniciais,
    )
    return processo


@transaction.atomic
def atualizar_processo(*, processo: Processo, dados: dict) -> Processo:
    """Atualiza os dados do Processo e, opcionalmente, o progresso da EntrevistaProcesso."""
    dados_limpos = dict(dados)
    dados_entrevista = dados_limpos.pop('entrevista', None)

    for campo, valor in dados_limpos.items():
        setattr(processo, campo, valor)
    processo.save()

    if dados_entrevista is not None:
        entrevista, _ = EntrevistaProcesso.objects.get_or_create(
            processo=processo,
            defaults={'respostas': dict(RESPOSTAS_PADRAO)},
        )
        if 'pergunta_atual_idx' in dados_entrevista:
            entrevista.pergunta_atual_idx = dados_entrevista['pergunta_atual_idx']
        if 'respostas' in dados_entrevista and isinstance(dados_entrevista['respostas'], dict):
            entrevista.respostas = {
                **RESPOSTAS_PADRAO,
                **(entrevista.respostas or {}),
                **dados_entrevista['respostas'],
            }
        entrevista.save()
        processo.entrevista = entrevista

    return processo


@transaction.atomic
def registrar_versao_bpmn(*, processo: Processo, usuario: User, dados: dict) -> VersaoFluxoBPMN:
    """Registra uma nova versão do fluxo BPMN e sincroniza metadados no Processo."""
    numero_versao = dados.get('numero_versao') or processo.versao_atual or '1.0'
    versao = VersaoFluxoBPMN.objects.create(
        processo=processo,
        numero_versao=numero_versao,
        bpmn_xml=dados['bpmn_xml'],
        estrutura_json=dados.get('estrutura_json') or {},
        origem=dados.get('origem') or OrigemVersaoBPMN.IA,
        motivo_alteracao=dados.get('motivo_alteracao') or 'Geração inicial do fluxo BPMN',
        gerado_por=usuario,
    )

    processo.versao_atual = versao.numero_versao
    if processo.etapa_atual < 3:
        processo.etapa_atual = 3
    if processo.status in (
        StatusProcesso.RASCUNHO,
        StatusProcesso.EM_ENTREVISTA,
        StatusProcesso.AJUSTES_SOLICITADOS,
    ):
        processo.status = StatusProcesso.EM_MODELAGEM
    processo.save()

    return versao


@transaction.atomic
def submeter_processo(*, processo: Processo, usuario: User, dados_feedback: dict) -> Processo:
    """Registra o feedback quantitativo da IA e submete o processo para validação do gestor."""
    ultima_versao = processo.versoes_bpmn.order_by('-criado_em').first()

    FeedbackFluxoIA.objects.create(
        processo=processo,
        versao_bpmn=dados_feedback.get('versao_bpmn') or ultima_versao,
        autor=usuario,
        representa_processo=dados_feedback['representa_processo'],
        nota_precisao_geral=dados_feedback.get('nota_precisao_geral', 5),
        nivel_edicao_necessario=dados_feedback['nivel_edicao_necessario'],
        clareza_entrevista=dados_feedback.get('clareza_entrevista', 5),
        problemas_identificados=dados_feedback.get('problemas_identificados') or [],
        observacoes=dados_feedback.get('observacoes') or '',
    )

    if not processo.codigo:
        processo.codigo = gerar_codigo_processo(processo.setor)

    processo.status = StatusProcesso.AGUARDANDO_VALIDACAO
    processo.etapa_atual = 4
    processo.submetido_em = timezone.now()
    processo.save()

    return processo


@transaction.atomic
def revisar_processo_governanca(
    *,
    processo: Processo,
    revisor: User,
    dados_revisao: dict,
) -> RevisaoGovernanca:
    """Registra parecer de governança do supervisor/admin e atualiza o status do Processo."""
    ultima_versao = processo.versoes_bpmn.order_by('-criado_em').first()
    decisao = dados_revisao['decisao']

    revisao = RevisaoGovernanca.objects.create(
        processo=processo,
        versao_bpmn=dados_revisao.get('versao_bpmn') or ultima_versao,
        revisor=revisor,
        decisao=decisao,
        parecer=dados_revisao.get('parecer') or '',
    )

    if decisao == DecisaoGovernanca.APROVADO:
        processo.status = StatusProcesso.APROVADO
        processo.aprovado_por = revisor
        processo.aprovado_em = timezone.now()
    elif decisao == DecisaoGovernanca.AJUSTES_SOLICITADOS:
        processo.status = StatusProcesso.AJUSTES_SOLICITADOS
    elif decisao == DecisaoGovernanca.REJEITADO:
        processo.status = StatusProcesso.RASCUNHO

    processo.save()
    return revisao
