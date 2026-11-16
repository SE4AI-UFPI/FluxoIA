import pytest
from rest_framework import status
from rest_framework.test import APIClient

from core.models import PapelUsuario, PerguntaEntrevista, User


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        email="admin_perguntas@secti.pi.gov.br",
        nome="Admin Perguntas",
        papel=PapelUsuario.ADMIN,
        password="password123",
    )


@pytest.fixture
def operador_user(db):
    return User.objects.create_user(
        email="operador_perguntas@secti.pi.gov.br",
        nome="Operador Perguntas",
        papel=PapelUsuario.OPERACIONAL,
        password="password123",
    )


@pytest.fixture
def perguntas_iniciais(db):
    p1 = PerguntaEntrevista.objects.create(
        chave="trigger",
        ordem=1,
        titulo="Início do Processo",
        enunciado="O que inicia o processo?",
        obrigatoria=True,
        ativa=True,
    )
    p2 = PerguntaEntrevista.objects.create(
        chave="activities",
        ordem=2,
        titulo="Atividades Principais",
        enunciado="Quais as atividades?",
        obrigatoria=True,
        ativa=True,
    )
    p3 = PerguntaEntrevista.objects.create(
        chave="fees_antiga",
        ordem=3,
        titulo="Taxas Antigas",
        enunciado="Havia taxas?",
        obrigatoria=False,
        ativa=False,
    )
    return [p1, p2, p3]


@pytest.mark.django_db
def test_list_perguntas_ativas_para_usuario_comum(operador_user, perguntas_iniciais):
    client = APIClient()
    client.force_authenticate(user=operador_user)

    res = client.get("/api/perguntas-entrevista/")
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert len(data) == 2
    chaves = [p["chave"] for p in data]
    assert "fees_antiga" not in chaves


@pytest.mark.django_db
def test_list_todas_perguntas_para_admin(admin_user, perguntas_iniciais):
    client = APIClient()
    client.force_authenticate(user=admin_user)

    res = client.get("/api/perguntas-entrevista/?todas=true")
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert len(data) == 3


@pytest.mark.django_db
def test_operador_nao_pode_criar_pergunta(operador_user):
    client = APIClient()
    client.force_authenticate(user=operador_user)

    res = client.post(
        "/api/perguntas-entrevista/",
        {"titulo": "Nova Pergunta", "enunciado": "Detalhes"},
        format="json",
    )
    assert res.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_admin_cria_pergunta_com_sucesso(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)

    res = client.post(
        "/api/perguntas-entrevista/",
        {
            "titulo": "Sistemas Legados",
            "enunciado": "Quais sistemas legados são usados?",
            "obrigatoria": False,
        },
        format="json",
    )
    assert res.status_code == status.HTTP_201_CREATED
    data = res.json()
    assert data["chave"] == "sistemas_legados"
    assert data["ordem"] >= 1
    assert data["ativa"] is True


@pytest.mark.django_db
def test_admin_reordena_perguntas(admin_user, perguntas_iniciais):
    client = APIClient()
    client.force_authenticate(user=admin_user)

    p1, p2, p3 = perguntas_iniciais
    res = client.post(
        "/api/perguntas-entrevista/reordenar/",
        {"ordem_ids": [str(p2.id), str(p1.id), str(p3.id)]},
        format="json",
    )
    assert res.status_code == status.HTTP_200_OK
    p1.refresh_from_db()
    p2.refresh_from_db()
    assert p2.ordem == 1
    assert p1.ordem == 2


@pytest.mark.django_db
def test_admin_soft_delete_pergunta(admin_user, perguntas_iniciais):
    client = APIClient()
    client.force_authenticate(user=admin_user)

    p1 = perguntas_iniciais[0]
    res = client.delete(f"/api/perguntas-entrevista/{p1.id}/")
    assert res.status_code == status.HTTP_200_OK
    p1.refresh_from_db()
    assert p1.ativa is False


@pytest.mark.django_db
def test_metricas_piloto_e_latencia_meta_ia(operador_user, perguntas_iniciais):
    from io import StringIO
    from django.core.management import call_command
    from core.models import EntrevistaProcesso, FeedbackFluxoIA, Processo, StatusProcesso
    from core.services.bpmn_ai_service import gerar_fluxo_bpmn_com_ia
    from core.services.llm_client import LLMCompletionResult

    processo = Processo.objects.create(
        codigo="BPMN-PILOTO-001",
        nome="Processo de Teste Piloto",
        secretaria="SECTI",
        setor="SDU: Protocolo",
        objetivo="Testar extração de métricas",
        status=StatusProcesso.EM_MODELAGEM,
        criado_por=operador_user,
    )
    EntrevistaProcesso.objects.create(
        processo=processo,
        respostas={"trigger": "Requerimento inicial", "activities": "Triagem e análise"},
    )

    class FakeLLMClient:
        def gerar_json(self, **kwargs):
            return (
                {
                    "resumo_modelo": "Fluxo simples",
                    "raias": [{"id": "Lane_1", "nome": "SDU: Protocolo"}],
                    "elementos": [
                        {"id": "Start_1", "tipo": "startEvent", "nome": "Início", "raia_id": "Lane_1"},
                        {"id": "Task_1", "tipo": "task", "nome": "1. Analisar", "raia_id": "Lane_1"},
                        {"id": "End_1", "tipo": "endEvent", "nome": "Fim", "raia_id": "Lane_1"},
                    ],
                    "fluxos": [
                        {"id": "Flow_1", "origem": "Start_1", "destino": "Task_1"},
                        {"id": "Flow_2", "origem": "Task_1", "destino": "End_1"},
                    ],
                },
                LLMCompletionResult(
                    content="{}",
                    model="deepseek-chat",
                    provider="openai_compatible",
                    usage={"total_tokens": 1500},
                ),
            )

    versao = gerar_fluxo_bpmn_com_ia(
        processo=processo,
        usuario=operador_user,
        llm_client=FakeLLMClient(),
    )
    meta_ia = versao.estrutura_json.get("meta_ia", {})
    assert "latencia_segundos" in meta_ia
    assert isinstance(meta_ia["latencia_segundos"], float)

    FeedbackFluxoIA.objects.create(
        processo=processo,
        versao_bpmn=versao,
        autor=operador_user,
        representa_processo=True,
        nota_precisao_geral=5,
        clareza_entrevista=4,
    )

    out = StringIO()
    call_command("metricas_piloto", stdout=out)
    output_text = out.getvalue()
    assert "RELATÓRIO DE MÉTRICAS DO PILOTO CONTROLADO" in output_text
    assert "[SISTEMA]  Latência de geração IA" in output_text
    assert "BPMN-PILOTO-001" in output_text

