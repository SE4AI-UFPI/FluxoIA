"""Contrato de consulta da entrevista e imutabilidade após a submissão."""

from unittest.mock import patch

import pytest
from rest_framework.test import APIClient

from core.models import (
    DecisaoGovernanca, EntrevistaProcesso, PapelUsuario, Processo,
    StatusProcesso, User, VersaoFluxoBPMN,
)
from core.serializers import ProcessoSerializer


LOCKED_STATUSES = [
    StatusProcesso.AGUARDANDO_VALIDACAO,
    StatusProcesso.APROVADO,
    StatusProcesso.PUBLICADO,
]
XML = '<definitions id="test"><process id="process" /></definitions>'


@pytest.fixture
def scenario(db):
    users = {}
    for name, role in [('author', PapelUsuario.OPERACIONAL),
                       ('colleague', PapelUsuario.OPERACIONAL),
                       ('coordinator', PapelUsuario.COORDENADOR),
                       ('supervisor', PapelUsuario.SUPERVISOR),
                       ('admin', PapelUsuario.ADMIN)]:
        users[name] = User.objects.create_user(
            email=f'{name}@example.test', nome=name, papel=role,
            secretaria='SECT', setor='Protocolo',
        )
    process = Processo.objects.create(
        nome='Consulta da entrevista', objetivo='Testar consulta',
        setor='Protocolo', criado_por=users['author'], etapa_atual=4,
        status=StatusProcesso.AGUARDANDO_VALIDACAO,
    )
    EntrevistaProcesso.objects.create(
        processo=process, pergunta_atual_idx=11,
        respostas={'trigger': 'Requerimento do cidadão.', 'fees': ''},
    )
    VersaoFluxoBPMN.objects.create(
        processo=process, numero_versao='1.0', bpmn_xml=XML,
        gerado_por=users['author'],
    )
    return APIClient(), users, process


@pytest.mark.parametrize('status', LOCKED_STATUSES)
def test_author_can_read_without_changing_process(scenario, status):
    client, users, process = scenario
    Processo.objects.filter(pk=process.pk).update(status=status)
    process.refresh_from_db()
    before = (process.status, process.etapa_atual, process.atualizado_em,
              process.entrevista.atualizado_em, process.entrevista.respostas)
    client.force_authenticate(users['author'])
    response = client.get(f'/api/processos/{process.pk}/')
    assert response.status_code == 200
    assert response.data['entrevista']['respostas'] == before[-1]
    assert response.data['entrevista']['pergunta_atual_idx'] == 11
    process.refresh_from_db()
    assert (process.status, process.etapa_atual, process.atualizado_em,
            process.entrevista.atualizado_em, process.entrevista.respostas) == before


@pytest.mark.parametrize('role', ['colleague', 'coordinator', 'supervisor', 'admin'])
def test_other_viewers_do_not_receive_interview_in_detail_or_list(scenario, role):
    client, users, process = scenario
    client.force_authenticate(users[role])
    detail = client.get(f'/api/processos/{process.pk}/')
    assert detail.status_code == 200
    assert 'entrevista' not in detail.data
    listing = client.get('/api/processos/')
    assert listing.status_code == 200
    rows = listing.data['results'] if isinstance(listing.data, dict) else listing.data
    row = next(row for row in rows if str(row['id']) == str(process.pk))
    assert 'entrevista' not in row


def test_serializer_without_request_does_not_disclose_interview(scenario):
    _, _, process = scenario
    assert 'entrevista' not in ProcessoSerializer(process).data


def test_excluded_list_hides_interview_from_non_author_admin(scenario):
    client, users, process = scenario
    Processo.objects.filter(pk=process.pk).update(status=StatusProcesso.EXCLUIDO)
    client.force_authenticate(users['admin'])
    response = client.get('/api/processos/excluidos/')
    assert response.status_code == 200
    row = next(row for row in response.data if str(row['id']) == str(process.pk))
    assert 'entrevista' not in row


@pytest.mark.parametrize('status', LOCKED_STATUSES)
@pytest.mark.parametrize('method,path,payload', [
    ('patch', '', {'nome': 'Alterado', 'entrevista': {'respostas': {'trigger': 'Alterado'}}}),
    ('put', '', {'nome': 'Alterado', 'objetivo': 'Alterado', 'setor': 'Protocolo',
                 'entrevista': {'respostas': {'trigger': 'Alterado'}}}),
    ('post', 'versoes-bpmn/', {'bpmn_xml': XML, 'numero_versao': '2.0'}),
    ('patch', 'layout-bpmn/', {'bpmn_xml': XML}),
    ('post', 'gerar-bpmn-ia/', {'respostas': {'trigger': 'Alterado'}}),
    ('post', 'submeter/', {'representa_processo': True, 'nivel_edicao_necessario': 'nenhuma'}),
])
def test_locked_process_rejects_writes(scenario, status, method, path, payload):
    client, users, process = scenario
    Processo.objects.filter(pk=process.pk).update(status=status)
    process.refresh_from_db()
    before = ProcessoSerializer(process).data
    interview = dict(process.entrevista.respostas)
    interview_updated = process.entrevista.atualizado_em
    client.force_authenticate(users['author'])
    with patch('core.views.bpmn_ai_service.gerar_fluxo_bpmn_com_ia') as generate:
        response = getattr(client, method)(
            f'/api/processos/{process.pk}/{path}', payload, format='json',
        )
    assert response.status_code == 400, response.data
    generate.assert_not_called()
    process.refresh_from_db()
    assert ProcessoSerializer(process).data == before
    assert process.entrevista.respostas == interview
    assert process.entrevista.atualizado_em == interview_updated


def test_review_and_publication_responses_hide_interview(scenario):
    client, users, process = scenario
    client.force_authenticate(users['supervisor'])
    review = client.post(f'/api/processos/{process.pk}/revisar/', {
        'decisao': DecisaoGovernanca.APROVADO, 'parecer': 'Fluxo conferido.',
    }, format='json')
    assert review.status_code == 200, review.data
    assert 'entrevista' not in review.data
    publication = client.post(f'/api/processos/{process.pk}/publicar/', {}, format='json')
    assert publication.status_code == 200, publication.data
    assert 'entrevista' not in publication.data


def test_custom_action_preserves_interview_for_author(scenario):
    client, users, process = scenario
    Processo.objects.filter(pk=process.pk).update(status=StatusProcesso.EM_MODELAGEM, etapa_atual=3)
    client.force_authenticate(users['author'])
    response = client.patch(f'/api/processos/{process.pk}/layout-bpmn/', {'bpmn_xml': XML}, format='json')
    assert response.status_code == 200, response.data
    assert response.data['entrevista']['respostas']['trigger'] == 'Requerimento do cidadão.'
