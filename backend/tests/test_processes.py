import pytest
from rest_framework.test import APIClient
from core.models import (
    DecisaoGovernanca,
    ExclusaoProcesso,
    NivelEdicaoFluxo,
    OrigemVersaoBPMN,
    PapelUsuario,
    Processo,
    StatusProcesso,
    User,
    VersaoFluxoBPMN,
)


SAMPLE_BPMN_XML = """<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Definitions_1">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" name="Início" />
  </bpmn:process>
</bpmn:definitions>"""


@pytest.mark.django_db
class TestProcessDomainAndGovernance:
    def setup_method(self):
        self.client = APIClient()
        self.operacional = User.objects.create_user(
            email='operacional@sdu.pi.gov.br',
            nome='Carlos Operacional',
            password='Password@123',
            papel=PapelUsuario.OPERACIONAL,
            secretaria='SDU Leste',
            setor='SDU: Protocolo',
        )
        self.supervisor = User.objects.create_user(
            email='supervisor@sdu.pi.gov.br',
            nome='Fernanda Supervisora',
            password='Password@123',
            papel=PapelUsuario.SUPERVISOR,
            secretaria='SDU Leste',
            setor='SDU: Protocolo',
            setores_vinculados=['SDU: Protocolo', 'SDU: CEU - AAD'],
        )

    def test_create_process_and_update_guided_interview(self):
        self.client.force_authenticate(user=self.operacional)

        # 1. Criação do processo
        res = self.client.post(
            '/api/processos/',
            {
                'nome': 'Abertura de Processo Administrativo no Protocolo',
                'setor': 'SDU: Protocolo',
                'objetivo': 'Padronizar o recebimento e autuação de requerimentos externos.',
                'descricao': 'Fluxo completo desde a triagem documental até o encaminhamento.',
                'legislacao': 'Lei Municipal nº 4.500/2021',
            },
            format='json',
        )
        assert res.status_code == 201, res.data
        proc_id = res.data['id']
        assert res.data['codigo'].startswith('BPMN-SDU-')
        assert res.data['status'] == StatusProcesso.RASCUNHO
        assert res.data['secretaria'] == 'SDU Leste'
        assert res.data['entrevista']['pergunta_atual_idx'] == 0
        assert res.data['entrevista']['respostas']['trigger'] == ''

        # 2. Atualização da entrevista guiada via PATCH
        patch_res = self.client.patch(
            f'/api/processos/{proc_id}/',
            {
                'status': StatusProcesso.EM_ENTREVISTA,
                'etapa_atual': 2,
                'entrevista': {
                    'pergunta_atual_idx': 4,
                    'respostas': {
                        'trigger': 'Protocolo de requerimento pelo cidadão no balcão ou SEI.',
                        'activities': 'Conferir documentos, autuar no SEI, encaminhar ao setor.',
                        'systems': 'SEI, Portal do Cidadão',
                    },
                },
            },
            format='json',
        )
        assert patch_res.status_code == 200, patch_res.data
        assert patch_res.data['status'] == StatusProcesso.EM_ENTREVISTA
        assert patch_res.data['etapa_atual'] == 2
        assert patch_res.data['entrevista']['pergunta_atual_idx'] == 4
        assert (
            patch_res.data['entrevista']['respostas']['trigger']
            == 'Protocolo de requerimento pelo cidadão no balcão ou SEI.'
        )
        assert patch_res.data['entrevista']['respostas']['systems'] == 'SEI, Portal do Cidadão'
        assert patch_res.data['entrevista']['respostas']['completion'] == ''

    def test_register_bpmn_versions_and_submit_with_quantitative_feedback(self):
        self.client.force_authenticate(user=self.operacional)

        create_res = self.client.post(
            '/api/processos/',
            {
                'nome': 'Emissão de Alvará de Construção Simplificado',
                'setor': 'SDU: Protocolo',
                'objetivo': 'Emitir alvará para obras residenciais unifamiliares.',
            },
            format='json',
        )
        proc_id = create_res.data['id']

        # 1. Registra versão 1.0 gerada por IA
        v1_res = self.client.post(
            f'/api/processos/{proc_id}/versoes-bpmn/',
            {
                'numero_versao': '1.0',
                'bpmn_xml': SAMPLE_BPMN_XML,
                'origem': OrigemVersaoBPMN.IA,
                'motivo_alteracao': 'Geração inicial do fluxo BPMN pela IA',
                'estrutura_json': {'lanes': ['Protocolo', 'Análise Técnica']},
            },
            format='json',
        )
        assert v1_res.status_code == 201, v1_res.data
        assert v1_res.data['status'] == StatusProcesso.EM_MODELAGEM
        assert v1_res.data['etapa_atual'] == 3
        assert v1_res.data['versao_atual'] == '1.0'
        assert v1_res.data['bpmn_xml_atual'] == SAMPLE_BPMN_XML
        assert len(v1_res.data['versoes_bpmn']) == 1

        evaluation_res = self.client.patch(
            f'/api/processos/{proc_id}/',
            {'status': StatusProcesso.EM_AVALIACAO, 'etapa_atual': 4},
            format='json',
        )
        assert evaluation_res.status_code == 200, evaluation_res.data

        # 2. Validação de nota fora do intervalo 1..5
        bad_submit = self.client.post(
            f'/api/processos/{proc_id}/submeter/',
            {
                'representa_processo': True,
                'nota_precisao_geral': 6,
                'nivel_edicao_necessario': NivelEdicaoFluxo.PEQUENOS_AJUSTES,
                'clareza_entrevista': 5,
            },
            format='json',
        )
        assert bad_submit.status_code == 400

        # 3. Submissão válida com feedback estruturado da IA
        sub_res = self.client.post(
            f'/api/processos/{proc_id}/submeter/',
            {
                'representa_processo': True,
                'nota_precisao_geral': 4,
                'nivel_edicao_necessario': NivelEdicaoFluxo.PEQUENOS_AJUSTES,
                'clareza_entrevista': 5,
                'problemas_identificados': ['raias_incorretas', 'aprovacoes_ausentes'],
                'observacoes': 'Apenas ajustei o nome da raia de vistoria.',
            },
            format='json',
        )
        assert sub_res.status_code == 200, sub_res.data
        assert sub_res.data['status'] == StatusProcesso.AGUARDANDO_VALIDACAO
        assert sub_res.data['etapa_atual'] == 4
        assert sub_res.data['submetido_em'] is not None
        assert len(sub_res.data['feedbacks_ia']) == 1
        fb = sub_res.data['feedbacks_ia'][0]
        assert fb['nota_precisao_geral'] == 4
        assert fb['nivel_edicao_necessario'] == NivelEdicaoFluxo.PEQUENOS_AJUSTES
        assert fb['problemas_identificados'] == ['raias_incorretas', 'aprovacoes_ausentes']

        invalid_status_change = self.client.patch(
            f'/api/processos/{proc_id}/',
            {'status': StatusProcesso.PUBLICADO, 'etapa_atual': 4},
            format='json',
        )
        assert invalid_status_change.status_code == 400

    def test_governance_review_permissions_and_status_transitions(self):
        self.client.force_authenticate(user=self.operacional)
        create_res = self.client.post(
            '/api/processos/',
            {
                'nome': 'Análise de Defesa de Auto de Infração',
                'setor': 'SDU: Protocolo',
                'objetivo': 'Julgar defesas administrativas de autuações.',
            },
            format='json',
        )
        proc_id = create_res.data['id']

        # Usuário operacional NÃO pode revisar processo (403)
        forbidden_res = self.client.post(
            f'/api/processos/{proc_id}/revisar/',
            {
                'decisao': DecisaoGovernanca.APROVADO,
                'parecer': 'Tentativa de auto-aprovação.',
            },
            format='json',
        )
        assert forbidden_res.status_code == 403

        interview_res = self.client.patch(
            f'/api/processos/{proc_id}/',
            {'status': StatusProcesso.EM_ENTREVISTA, 'etapa_atual': 2},
            format='json',
        )
        assert interview_res.status_code == 200, interview_res.data
        modeling_res = self.client.patch(
            f'/api/processos/{proc_id}/',
            {'status': StatusProcesso.EM_MODELAGEM, 'etapa_atual': 3},
            format='json',
        )
        assert modeling_res.status_code == 200, modeling_res.data
        version_res = self.client.post(
            f'/api/processos/{proc_id}/versoes-bpmn/',
            {'bpmn_xml': SAMPLE_BPMN_XML, 'origem': OrigemVersaoBPMN.IA},
            format='json',
        )
        assert version_res.status_code == 201, version_res.data
        evaluation_res = self.client.patch(
            f'/api/processos/{proc_id}/',
            {'status': StatusProcesso.EM_AVALIACAO, 'etapa_atual': 4},
            format='json',
        )
        assert evaluation_res.status_code == 200, evaluation_res.data
        submitted_res = self.client.post(
            f'/api/processos/{proc_id}/submeter/',
            {
                'representa_processo': True,
                'nivel_edicao_necessario': NivelEdicaoFluxo.NENHUMA,
            },
            format='json',
        )
        assert submitted_res.status_code == 200, submitted_res.data

        # Supervisor solicita ajustes
        self.client.force_authenticate(user=self.supervisor)
        ajustes_res = self.client.post(
            f'/api/processos/{proc_id}/revisar/',
            {
                'decisao': DecisaoGovernanca.AJUSTES_SOLICITADOS,
                'parecer': 'Detalhar prazo legal de 15 dias no gateway de tempestividade.',
            },
            format='json',
        )
        assert ajustes_res.status_code == 200, ajustes_res.data
        assert ajustes_res.data['status'] == StatusProcesso.AJUSTES_SOLICITADOS
        assert len(ajustes_res.data['revisoes_governanca']) == 1
        assert ajustes_res.data['revisoes_governanca'][0]['revisor_nome'] == 'Fernanda Supervisora'

        # Usuário operacional corrige e reenvia o fluxo
        self.client.force_authenticate(user=self.operacional)
        modeling_after_adjustments = self.client.patch(
            f'/api/processos/{proc_id}/',
            {'status': StatusProcesso.EM_MODELAGEM, 'etapa_atual': 3},
            format='json',
        )
        assert modeling_after_adjustments.status_code == 200, modeling_after_adjustments.data
        corrected_version = self.client.post(
            f'/api/processos/{proc_id}/versoes-bpmn/',
            {
                'numero_versao': '1.1',
                'bpmn_xml': SAMPLE_BPMN_XML,
                'origem': OrigemVersaoBPMN.EDICAO_MANUAL,
                'motivo_alteracao': 'Correção solicitada pela governança.',
            },
            format='json',
        )
        assert corrected_version.status_code == 201, corrected_version.data
        evaluation_after_adjustments = self.client.patch(
            f'/api/processos/{proc_id}/',
            {'status': StatusProcesso.EM_AVALIACAO, 'etapa_atual': 4},
            format='json',
        )
        assert evaluation_after_adjustments.status_code == 200, evaluation_after_adjustments.data
        resubmitted = self.client.post(
            f'/api/processos/{proc_id}/submeter/',
            {
                'representa_processo': True,
                'nivel_edicao_necessario': NivelEdicaoFluxo.PEQUENOS_AJUSTES,
            },
            format='json',
        )
        assert resubmitted.status_code == 200, resubmitted.data

        # Supervisor aprova a versão reenviada
        self.client.force_authenticate(user=self.supervisor)
        aprovado_res = self.client.post(
            f'/api/processos/{proc_id}/revisar/',
            {
                'decisao': DecisaoGovernanca.APROVADO,
                'parecer': 'Fluxo homologado conforme norma.',
            },
            format='json',
        )
        assert aprovado_res.status_code == 200, aprovado_res.data
        assert aprovado_res.data['status'] == StatusProcesso.APROVADO
        assert str(aprovado_res.data['aprovado_por']) == str(self.supervisor.id)
        assert aprovado_res.data['aprovado_em'] is not None
        assert len(aprovado_res.data['revisoes_governanca']) == 2

    def test_generate_bpmn_via_ai_gateway(self, monkeypatch):
        from core.services.llm_client import LLMClient, LLMCompletionResult

        def fake_gerar_json(self_client, *, system_prompt, user_prompt, temperature=0.1, usuario_identificador=None):
            estrutura_mock = {
                'resumo_modelo': 'Fluxo dividido entre Protocolo e Licenciamento com decisão de conformidade.',
                'raias': [
                    {'id': 'Lane_Protocolo', 'nome': 'SDU: Protocolo'},
                    {'id': 'Lane_Licenciamento', 'nome': 'SDU: Licenciamento'},
                ],
                'elementos': [
                    {
                        'id': 'Start_1',
                        'tipo': 'startEvent',
                        'nome': 'Requerimento recebido',
                        'raia_id': 'Lane_Protocolo',
                        'origem_entrevista': 'trigger',
                    },
                    {
                        'id': 'Task_1',
                        'tipo': 'task',
                        'nome': 'Conferir documentação inicial',
                        'raia_id': 'Lane_Protocolo',
                        'origem_entrevista': 'activities',
                    },
                    {
                        'id': 'Gateway_1',
                        'tipo': 'exclusiveGateway',
                        'nome': 'Documentação completa?',
                        'raia_id': 'Lane_Licenciamento',
                        'origem_entrevista': 'approvals',
                    },
                    {
                        'id': 'Task_2',
                        'tipo': 'serviceTask',
                        'nome': 'Emitir alvará no SEI',
                        'raia_id': 'Lane_Licenciamento',
                        'origem_entrevista': 'systems',
                    },
                    {
                        'id': 'End_1',
                        'tipo': 'endEvent',
                        'nome': 'Alvará expedido',
                        'raia_id': 'Lane_Licenciamento',
                        'origem_entrevista': 'completion',
                    },
                ],
                'fluxos': [
                    {'id': 'Flow_1', 'origem': 'Start_1', 'destino': 'Task_1', 'condicao': ''},
                    {'id': 'Flow_2', 'origem': 'Task_1', 'destino': 'Gateway_1', 'condicao': ''},
                    {'id': 'Flow_3', 'origem': 'Gateway_1', 'destino': 'Task_2', 'condicao': 'Sim'},
                    {'id': 'Flow_4', 'origem': 'Task_2', 'destino': 'End_1', 'condicao': ''},
                ],
            }
            return estrutura_mock, LLMCompletionResult(
                content='{}',
                model='gemini/gemini-2.0-flash',
                provider='litellm',
                usage={'prompt_tokens': 210, 'completion_tokens': 140, 'total_tokens': 350},
            )

        monkeypatch.setattr(LLMClient, 'gerar_json', fake_gerar_json)

        self.client.force_authenticate(user=self.operacional)
        create_res = self.client.post(
            '/api/processos/',
            {
                'nome': 'Emissão de Alvará de Construção',
                'setor': 'SDU: Protocolo',
                'objetivo': 'Emitir alvará após análise técnica.',
            },
            format='json',
        )
        proc_id = create_res.data['id']

        ai_res = self.client.post(
            f'/api/processos/{proc_id}/gerar-bpmn-ia/',
            {
                'respostas': {
                    'trigger': 'Entrada de requerimento no protocolo',
                    'activities': 'Conferir documentação; Analisar projeto; Emitir alvará no SEI',
                    'areasInvolved': 'SDU: Protocolo e SDU: Licenciamento',
                    'approvals': 'Verificação de conformidade documental',
                    'completion': 'Alvará expedido ao requerente',
                }
            },
            format='json',
        )
        assert ai_res.status_code == 201, ai_res.data
        assert ai_res.data['status'] == StatusProcesso.EM_MODELAGEM
        assert ai_res.data['versao_atual'] == '1.0.0'
        assert '<bpmn:laneSet' in ai_res.data['bpmn_xml_atual']
        assert '<bpmn:exclusiveGateway id="Gateway_1"' in ai_res.data['bpmn_xml_atual']
        assert len(ai_res.data['versoes_bpmn']) == 1
        assert ai_res.data['versoes_bpmn'][0]['estrutura_json']['meta_ia']['provider'] == 'litellm'

    def test_owner_can_soft_delete_draft_and_admin_can_audit_it(self):
        self.client.force_authenticate(user=self.operacional)
        created = self.client.post(
            '/api/processos/',
            {
                'nome': 'Rascunho para exclusão',
                'setor': 'SDU: Protocolo',
                'objetivo': 'Validar exclusão lógica e trilha de auditoria.',
            },
            format='json',
        )
        process_id = created.data['id']

        deleted = self.client.delete(
            f'/api/processos/{process_id}/',
            {'motivo': 'Processo duplicado'},
            format='json',
        )

        assert deleted.status_code == 204
        process = Processo.objects.get(id=process_id)
        assert process.status == StatusProcesso.EXCLUIDO
        assert hasattr(process, 'entrevista')

        exclusion = ExclusaoProcesso.objects.get(processo=process)
        assert exclusion.usuario == self.operacional
        assert exclusion.usuario_nome == self.operacional.nome
        assert exclusion.usuario_email == self.operacional.email
        assert exclusion.numero_versao == process.versao_atual
        assert exclusion.motivo == 'Processo duplicado'

        assert self.client.get('/api/processos/').data == []
        assert self.client.get(f'/api/processos/{process_id}/').status_code == 404
        assert self.client.get('/api/processos/excluidos/').status_code == 403

        admin = User.objects.create_superuser(
            email='auditoria@secti.pi.gov.br',
            nome='Admin Auditoria',
            password='AuditPassword@123',
        )
        self.client.force_authenticate(user=admin)
        audit_response = self.client.get('/api/processos/excluidos/')
        assert audit_response.status_code == 200
        assert audit_response.data[0]['id'] == str(process_id)
        assert audit_response.data[0]['exclusao']['motivo'] == 'Processo duplicado'

    @pytest.mark.parametrize(
        'status_bloqueado',
        [
            StatusProcesso.AGUARDANDO_VALIDACAO,
            StatusProcesso.APROVADO,
            StatusProcesso.PUBLICADO,
        ],
    )
    def test_cannot_delete_submitted_approved_or_published_process(self, status_bloqueado):
        process = Processo.objects.create(
            nome='Processo protegido',
            setor='SDU: Protocolo',
            objetivo='Não pode ser excluído neste estado.',
            criado_por=self.operacional,
            status=status_bloqueado,
        )
        self.client.force_authenticate(user=self.operacional)

        response = self.client.delete(f'/api/processos/{process.id}/', format='json')

        assert response.status_code == 400
        process.refresh_from_db()
        assert process.status == status_bloqueado
        assert not ExclusaoProcesso.objects.filter(processo=process).exists()

    def test_creator_only_can_update_or_delete_a_process_in_shared_sector(self):
        process = Processo.objects.create(
            nome='Processo de outro operador',
            setor='SDU: Protocolo',
            objetivo='Pertence a outro usuário do mesmo setor.',
            criado_por=self.operacional,
        )
        outro_operacional = User.objects.create_user(
            email='outro.operacional@sdu.pi.gov.br',
            nome='Outro Operacional',
            password='Password@123',
            papel=PapelUsuario.OPERACIONAL,
            secretaria='SDU Leste',
            setor='SDU: Protocolo',
        )
        self.client.force_authenticate(user=outro_operacional)

        update_response = self.client.patch(
            f'/api/processos/{process.id}/',
            {'nome': 'Alterado por outro usuário'},
            format='json',
        )
        delete_response = self.client.delete(f'/api/processos/{process.id}/', format='json')

        assert update_response.status_code == 403
        assert delete_response.status_code == 403
        process.refresh_from_db()
        assert process.nome == 'Processo de outro operador'
        assert process.status == StatusProcesso.RASCUNHO

    def test_generic_patch_cannot_approve_or_publish_process(self):
        process = Processo.objects.create(
            nome='Processo em rascunho',
            setor='SDU: Protocolo',
            objetivo='Status deve avançar pelo fluxo controlado.',
            criado_por=self.operacional,
        )
        self.client.force_authenticate(user=self.operacional)

        response = self.client.patch(
            f'/api/processos/{process.id}/',
            {'status': StatusProcesso.PUBLICADO, 'etapa_atual': 4},
            format='json',
        )

        assert response.status_code == 400
        process.refresh_from_db()
        assert process.status == StatusProcesso.RASCUNHO

    def test_rejected_process_returns_to_editable_and_deletable_state(self):
        self.client.force_authenticate(user=self.operacional)
        created = self.client.post(
            '/api/processos/',
            {
                'nome': 'Processo rejeitado para correção',
                'setor': 'SDU: Protocolo',
                'objetivo': 'Validar retorno após rejeição.',
            },
            format='json',
        )
        process_id = created.data['id']
        assert self.client.patch(
            f'/api/processos/{process_id}/',
            {'status': StatusProcesso.EM_ENTREVISTA, 'etapa_atual': 2},
            format='json',
        ).status_code == 200
        assert self.client.patch(
            f'/api/processos/{process_id}/',
            {'status': StatusProcesso.EM_MODELAGEM, 'etapa_atual': 3},
            format='json',
        ).status_code == 200
        assert self.client.post(
            f'/api/processos/{process_id}/versoes-bpmn/',
            {'bpmn_xml': SAMPLE_BPMN_XML, 'origem': OrigemVersaoBPMN.IA},
            format='json',
        ).status_code == 201
        assert self.client.patch(
            f'/api/processos/{process_id}/',
            {'status': StatusProcesso.EM_AVALIACAO, 'etapa_atual': 4},
            format='json',
        ).status_code == 200
        assert self.client.post(
            f'/api/processos/{process_id}/submeter/',
            {
                'representa_processo': True,
                'nivel_edicao_necessario': NivelEdicaoFluxo.PEQUENOS_AJUSTES,
            },
            format='json',
        ).status_code == 200

        self.client.force_authenticate(user=self.supervisor)
        rejected = self.client.post(
            f'/api/processos/{process_id}/revisar/',
            {'decisao': DecisaoGovernanca.REJEITADO, 'parecer': 'Retornar para ajustes.'},
            format='json',
        )
        assert rejected.status_code == 200
        assert rejected.data['status'] == StatusProcesso.RASCUNHO
        assert rejected.data['etapa_atual'] == 1

        self.client.force_authenticate(user=self.operacional)
        edited = self.client.patch(
            f'/api/processos/{process_id}/',
            {'nome': 'Processo rejeitado corrigido', 'etapa_atual': 1},
            format='json',
        )
        assert edited.status_code == 200, edited.data
        deleted = self.client.delete(f'/api/processos/{process_id}/', format='json')
        assert deleted.status_code == 204
        assert Processo.objects.get(id=process_id).status == StatusProcesso.EXCLUIDO


@pytest.mark.django_db
class TestSeedIdempotencyAndAiGuards:
    """Garante que o seed não sobrescreve dados existentes e que a IA não altera o workflow."""

    def test_seed_db_preserves_existing_users_and_credentials(self, monkeypatch):
        from django.core.management import call_command

        existente = User.objects.create_user(
            email='admin@secti.pi.gov.br',
            nome='Admin Legado',
            password='SenhaLegada@123',
            papel=PapelUsuario.OPERACIONAL,
            setor='Setor Legado',
            is_active=False,
        )

        monkeypatch.setenv('SEED_USER_PASSWORD', 'SenhaSeed@123')
        call_command('seed_db', verbosity=0)
        call_command('seed_db', verbosity=0)

        existente.refresh_from_db()
        assert existente.nome == 'Admin Legado'
        assert existente.papel == PapelUsuario.OPERACIONAL
        assert existente.setor == 'Setor Legado'
        assert existente.is_active is False
        assert existente.check_password('SenhaLegada@123')
        assert User.objects.filter(email='admin@secti.pi.gov.br').count() == 1

    def test_ai_generation_blocked_after_process_is_submitted(self):
        operacional = User.objects.create_user(
            email='operacional.ia@sdu.pi.gov.br',
            nome='Operacional IA',
            password='Password@123',
            papel=PapelUsuario.OPERACIONAL,
            setor='SDU: Protocolo',
        )
        processo = Processo.objects.create(
            codigo='BPMN-SDU-2026-00099',
            nome='Processo já submetido',
            setor='SDU: Protocolo',
            objetivo='Validar bloqueio da geração por IA após o envio.',
            status=StatusProcesso.AGUARDANDO_VALIDACAO,
            etapa_atual=4,
            criado_por=operacional,
        )

        client = APIClient()
        client.force_authenticate(user=operacional)
        res = client.post(
            f'/api/processos/{processo.id}/gerar-bpmn-ia/',
            {'respostas': {'trigger': 'evento indevido'}},
            format='json',
        )

        assert res.status_code == 400
        assert 'antes do envio para validação' in res.data['detail']
        processo.refresh_from_db()
        assert processo.status == StatusProcesso.AGUARDANDO_VALIDACAO
        assert VersaoFluxoBPMN.objects.filter(processo=processo).count() == 0


@pytest.mark.django_db
class TestAjusteLayoutBPMN:
    """Ajustes visuais persistem o XML sem gerar nova versão funcional."""

    def setup_method(self):
        self.client = APIClient()
        self.operacional = User.objects.create_user(
            email='operacional.layout@sdu.pi.gov.br',
            nome='Operacional Layout',
            password='Password@123',
            papel=PapelUsuario.OPERACIONAL,
            setor='SDU: Protocolo',
        )
        self.outro = User.objects.create_user(
            email='outro.layout@sdu.pi.gov.br',
            nome='Outro Operacional',
            password='Password@123',
            papel=PapelUsuario.OPERACIONAL,
            setor='SEAD: Gestão',
        )
        self.processo = Processo.objects.create(
            codigo='BPMN-SDU-2026-00088',
            nome='Processo com layout ajustado',
            setor='SDU: Protocolo',
            objetivo='Validar persistência de ajustes visuais.',
            status=StatusProcesso.EM_MODELAGEM,
            etapa_atual=3,
            versao_atual='1.0.0',
            criado_por=self.operacional,
        )
        self.versao = VersaoFluxoBPMN.objects.create(
            processo=self.processo,
            numero_versao='1.0.0',
            bpmn_xml=SAMPLE_BPMN_XML,
            origem=OrigemVersaoBPMN.IA,
            motivo_alteracao='Geração inicial do fluxo BPMN',
            gerado_por=self.operacional,
        )

    def test_layout_adjustment_keeps_functional_version(self):
        self.client.force_authenticate(user=self.operacional)
        xml_ajustado = SAMPLE_BPMN_XML.replace('StartEvent_1', 'StartEvent_Ajustado')

        res = self.client.patch(
            f'/api/processos/{self.processo.id}/layout-bpmn/',
            {'bpmn_xml': xml_ajustado, 'motivo_alteracao': 'Reposicionamento de tarefas'},
            format='json',
        )

        assert res.status_code == 200, res.data
        assert res.data['versao_atual'] == '1.0.0'
        assert res.data['bpmn_xml_atual'] == xml_ajustado

        self.processo.refresh_from_db()
        assert self.processo.versao_atual == '1.0.0'
        assert self.processo.status == StatusProcesso.EM_MODELAGEM

        versoes = VersaoFluxoBPMN.objects.filter(processo=self.processo).order_by('criado_em')
        assert versoes.count() == 2
        ultima = versoes.last()
        assert ultima.numero_versao == '1.0.0'
        assert ultima.origem == OrigemVersaoBPMN.EDICAO_MANUAL
        assert ultima.motivo_alteracao == 'Reposicionamento de tarefas'
        assert ultima.gerado_por == self.operacional
        assert ultima.bpmn_xml == xml_ajustado

    def test_layout_adjustment_blocked_after_submission(self):
        self.processo.status = StatusProcesso.AGUARDANDO_VALIDACAO
        self.processo.etapa_atual = 4
        self.processo.save(update_fields=['status', 'etapa_atual'])

        self.client.force_authenticate(user=self.operacional)
        res = self.client.patch(
            f'/api/processos/{self.processo.id}/layout-bpmn/',
            {'bpmn_xml': SAMPLE_BPMN_XML},
            format='json',
        )

        assert res.status_code == 400
        assert VersaoFluxoBPMN.objects.filter(processo=self.processo).count() == 1

    def test_layout_adjustment_requires_ownership(self):
        self.client.force_authenticate(user=self.outro)
        res = self.client.patch(
            f'/api/processos/{self.processo.id}/layout-bpmn/',
            {'bpmn_xml': SAMPLE_BPMN_XML},
            format='json',
        )

        assert res.status_code in (403, 404)
        assert VersaoFluxoBPMN.objects.filter(processo=self.processo).count() == 1


@pytest.mark.django_db
class TestPublicacaoSupervisor:
    """Publicação institucional é a última etapa da supervisão."""

    def setup_method(self):
        self.client = APIClient()
        self.supervisor = User.objects.create_user(
            email='supervisor.pub@sdu.pi.gov.br',
            nome='Supervisora Publicação',
            password='Password@123',
            papel=PapelUsuario.SUPERVISOR,
            setor='SDU: Protocolo',
        )
        self.operacional = User.objects.create_user(
            email='operacional.pub@sdu.pi.gov.br',
            nome='Operacional Publicação',
            password='Password@123',
            papel=PapelUsuario.OPERACIONAL,
            setor='SDU: Protocolo',
        )
        self.processo = Processo.objects.create(
            codigo='BPMN-SDU-2026-00077',
            nome='Processo homologado',
            setor='SDU: Protocolo',
            objetivo='Validar publicação institucional.',
            status=StatusProcesso.APROVADO,
            etapa_atual=4,
            criado_por=self.operacional,
            aprovado_por=self.supervisor,
        )

    def test_supervisor_publishes_approved_process(self):
        self.client.force_authenticate(user=self.supervisor)

        res = self.client.post(
            f'/api/processos/{self.processo.id}/publicar/',
            {'parecer': 'Homologação concluída.'},
            format='json',
        )

        assert res.status_code == 200, res.data
        assert res.data['status'] == StatusProcesso.PUBLICADO

        self.processo.refresh_from_db()
        assert self.processo.status == StatusProcesso.PUBLICADO

        revisao = self.processo.revisoes_governanca.first()
        assert revisao.revisor == self.supervisor
        assert revisao.parecer.startswith('[Publicação institucional]')

    def test_cannot_publish_process_not_approved(self):
        self.processo.status = StatusProcesso.AGUARDANDO_VALIDACAO
        self.processo.save(update_fields=['status'])

        self.client.force_authenticate(user=self.supervisor)
        res = self.client.post(f'/api/processos/{self.processo.id}/publicar/', {}, format='json')

        assert res.status_code == 400
        self.processo.refresh_from_db()
        assert self.processo.status == StatusProcesso.AGUARDANDO_VALIDACAO

    def test_operacional_cannot_publish(self):
        self.client.force_authenticate(user=self.operacional)
        res = self.client.post(f'/api/processos/{self.processo.id}/publicar/', {}, format='json')

        assert res.status_code == 403
        self.processo.refresh_from_db()
        assert self.processo.status == StatusProcesso.APROVADO
