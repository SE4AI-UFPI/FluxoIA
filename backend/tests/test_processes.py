import pytest
from rest_framework.test import APIClient
from core.models import (
    DecisaoGovernanca,
    NivelEdicaoFluxo,
    OrigemVersaoBPMN,
    PapelUsuario,
    StatusProcesso,
    User,
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

        # Supervisor aprova versão final
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
