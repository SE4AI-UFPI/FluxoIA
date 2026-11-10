"""Regression of the combined generation, correction, consultation and publication flow."""
import pytest
from rest_framework.test import APIClient

from core.models import DecisaoGovernanca, PapelUsuario, Processo, StatusProcesso, User
from core.services.llm_client import LLMClient, LLMCompletionResult


@pytest.mark.django_db
@pytest.mark.parametrize('decision', [DecisaoGovernanca.AJUSTES_SOLICITADOS, DecisaoGovernanca.REJEITADO])
def test_mapping_correction_and_publication_cycle(monkeypatch, decision):
    author = User.objects.create_user(email='author@example.test', nome='Autor', setor='Protocolo', papel=PapelUsuario.OPERACIONAL)
    supervisor = User.objects.create_user(email='supervisor@example.test', nome='Supervisor', setor='Protocolo', papel=PapelUsuario.SUPERVISOR)
    calls = []

    def generate(self, **kwargs):
        calls.append(kwargs)
        return {
            'resumo_modelo': 'Receber, conferir e concluir o requerimento.',
            'raias': [{'id': 'Lane_1', 'nome': 'Protocolo'}],
            'elementos': [
                {'id': 'Start_1', 'tipo': 'startEvent', 'nome': 'Pedido recebido', 'raia_id': 'Lane_1', 'origem_entrevista': 'trigger'},
                {'id': 'Task_1', 'tipo': 'task', 'nome': 'Conferir documentos', 'raia_id': 'Lane_1', 'origem_entrevista': 'activities'},
                {'id': 'End_1', 'tipo': 'endEvent', 'nome': 'Concluído', 'raia_id': 'Lane_1', 'origem_entrevista': 'completion'},
            ],
            'fluxos': [
                {'id': 'Flow_1', 'origem': 'Start_1', 'destino': 'Task_1', 'condicao': ''},
                {'id': 'Flow_2', 'origem': 'Task_1', 'destino': 'End_1', 'condicao': ''},
            ],
        }, LLMCompletionResult(content='{}', model='test-model', provider='test', usage={})

    monkeypatch.setattr(LLMClient, 'gerar_json', generate)
    client = APIClient()
    client.force_authenticate(author)
    created = client.post('/api/processos/', {
        'nome': 'Requerimento de teste', 'setor': 'Protocolo', 'objetivo': 'Conferir documentos e concluir o pedido.',
    }, format='json')
    assert created.status_code == 201, created.data
    url = f'/api/processos/{created.data["id"]}/'
    answers = {'trigger': 'O cidadão protocola o pedido.', 'activities': 'Conferir e encaminhar.',
               'areasInvolved': 'Protocolo', 'sequence': 'Receber, conferir e concluir.',
               'responsibles': 'Atendente', 'approvals': 'Coordenação', 'completion': 'Pedido concluído.'}
    interviewed = client.patch(url, {'status': StatusProcesso.EM_ENTREVISTA, 'etapa_atual': 2,
                                   'entrevista': {'respostas': answers}}, format='json')
    assert interviewed.status_code == 200, interviewed.data
    generated = client.post(f'{url}gerar-bpmn-ia/', {}, format='json')
    assert generated.status_code == 201, generated.data
    assert generated.data['status'] == StatusProcesso.EM_MODELAGEM
    assert '<bpmn:task' in generated.data['bpmn_xml_atual']
    evaluated = client.patch(url, {'status': StatusProcesso.EM_AVALIACAO, 'etapa_atual': 4}, format='json')
    assert evaluated.status_code == 200, evaluated.data
    feedback = {'representa_processo': True, 'nota_precisao_geral': 4, 'nivel_edicao_necessario': 'pequenos_ajustes',
                'clareza_entrevista': 5, 'observacoes': 'Fluxo conferido pelo autor.'}
    submitted = client.post(f'{url}submeter/', feedback, format='json')
    assert submitted.status_code == 200, submitted.data
    assert submitted.data['entrevista']['respostas']['trigger'] == answers['trigger']
    client.force_authenticate(supervisor)
    reviewed = client.post(f'{url}revisar/', {'decisao': decision,
        'parecer': '[Não conformidades: Documentação] Detalhar a conferência.'}, format='json')
    assert reviewed.status_code == 200, reviewed.data
    assert 'entrevista' not in reviewed.data
    assert reviewed.data['status'] == (StatusProcesso.RASCUNHO if decision == DecisaoGovernanca.REJEITADO else StatusProcesso.AJUSTES_SOLICITADOS)

    client.force_authenticate(author)
    corrected = client.patch(url, {'status': StatusProcesso.AJUSTES_SOLICITADOS, 'etapa_atual': 2,
        'entrevista': {'respostas': {'activities': 'Conferir formulário e comprovante; concluir.'}}}, format='json')
    assert corrected.status_code == 200, corrected.data
    assert corrected.data['feedbacks_ia'][0]['nota_precisao_geral'] == 4
    regenerated = client.post(f'{url}gerar-bpmn-ia/', {}, format='json')
    assert regenerated.status_code == 201, regenerated.data
    assert regenerated.data['status'] == StatusProcesso.AJUSTES_SOLICITADOS
    assert len(calls) == 2
    # Going back to interview must preserve the status and the generated layout.
    returned = client.patch(url, {'status': StatusProcesso.AJUSTES_SOLICITADOS, 'etapa_atual': 2}, format='json')
    assert returned.status_code == 200, returned.data
    assert returned.data['bpmn_xml_atual'] == regenerated.data['bpmn_xml_atual']
    resubmitted = client.post(f'{url}submeter/', feedback, format='json')
    assert resubmitted.status_code == 200, resubmitted.data
    assert len(resubmitted.data['feedbacks_ia']) == 2
    client.force_authenticate(supervisor)
    approved = client.post(f'{url}revisar/', {'decisao': DecisaoGovernanca.APROVADO, 'parecer': 'Correção atendida.'}, format='json')
    assert approved.status_code == 200, approved.data
    assert approved.data['status'] == StatusProcesso.APROVADO
    client.force_authenticate(author)
    process = Processo.objects.get(pk=created.data['id'])
    before = process.atualizado_em
    consulted = client.get(url)
    assert consulted.status_code == 200
    assert consulted.data['entrevista']['respostas']['activities'].startswith('Conferir formulário')
    assert any(review['parecer'] == 'Correção atendida.' and review['decisao'] == DecisaoGovernanca.APROVADO
               for review in consulted.data['revisoes_governanca'])
    assert client.patch(url, {'etapa_atual': 1}, format='json').status_code == 400
    process.refresh_from_db()
    assert process.atualizado_em == before
    client.force_authenticate(supervisor)
    published = client.post(f'{url}publicar/', {}, format='json')
    assert published.status_code == 200, published.data
    assert published.data['status'] == StatusProcesso.PUBLICADO
    assert 'entrevista' not in published.data
