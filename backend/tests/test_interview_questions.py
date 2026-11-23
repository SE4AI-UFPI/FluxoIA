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


@pytest.mark.django_db
def test_validacao_resposta_entrevista_heuristica_e_ia(operador_user):
    from unittest.mock import patch
    from core.services.bpmn_ai_service import ValidacaoRespostaIA

    client = APIClient()
    client.force_authenticate(user=operador_user)

    # 1. Ruído óbvio ("asdf") deve retornar invalida imediatamente sem chamar LLM
    res_ruido = client.post(
        "/api/perguntas-entrevista/validar-resposta/",
        {
            "chave_pergunta": "trigger",
            "titulo_pergunta": "Início do Processo",
            "enunciado_pergunta": "O que dá início ao processo?",
            "obrigatoria": True,
            "resposta": "asdf",
        },
        format="json",
    )
    assert res_ruido.status_code == status.HTTP_200_OK
    assert res_ruido.json()["status"] == "invalida"

    # 2. Resposta negativa curta ("Não há") em pergunta de taxas deve ser aprovada na hora
    res_taxa = client.post(
        "/api/perguntas-entrevista/validar-resposta/",
        {
            "chave_pergunta": "fees",
            "titulo_pergunta": "Taxas e Custos",
            "enunciado_pergunta": "Envolve cobrança de taxas?",
            "obrigatoria": False,
            "resposta": "Não há",
        },
        format="json",
    )
    assert res_taxa.status_code == status.HTTP_200_OK
    assert res_taxa.json()["status"] == "valida"

    # 3. Resposta vaga avaliada pela IA
    with patch("core.services.bpmn_ai_service.LLMClient") as mock_llm_cls:
        mock_instance = mock_llm_cls.return_value
        mock_instance.gerar_json.return_value = (
            {
                "status": "vaga",
                "mensagem_feedback": "Você citou que o setor analisa, mas não especificou qual setor.",
                "sugestao_melhoria": "Informe o nome da coordenação ou diretoria responsável.",
            },
            None,
        )
        res_vaga = client.post(
            "/api/perguntas-entrevista/validar-resposta/",
            {
                "chave_pergunta": "areasInvolved",
                "titulo_pergunta": "Áreas e Unidades Envolvidas",
                "enunciado_pergunta": "Quais áreas participam?",
                "obrigatoria": True,
                "resposta": "O setor responsável faz a análise",
                "processo_nome": "Licença de Demolição",
            },
            format="json",
        )
        assert res_vaga.status_code == status.HTTP_200_OK
        body = res_vaga.json()
        assert body["status"] == "vaga"
        assert "qual setor" in body["mensagem_feedback"]

    # 4. Verifica se os 3 logs foram gravados no banco de dados
    from core.models import LogValidacaoRespostaEntrevista

    logs = list(LogValidacaoRespostaEntrevista.objects.filter(usuario=operador_user))
    assert len(logs) == 3
    assert [lg.status for lg in logs] == ["invalida", "valida", "vaga"]
    assert [lg.origem for lg in logs] == ["heuristica_local", "heuristica_local", "ia_llm"]
    assert logs[2].processo_nome == "Licença de Demolição"


def test_compilar_bpmn_xml_gateways_sem_sobreposicao_de_rotulos():
    import uuid
    import xml.etree.ElementTree as ET
    from types import SimpleNamespace
    from core.services.bpmn_ai_service import BpmnEstruturaGerada, compilar_bpmn_xml

    est = BpmnEstruturaGerada.model_validate(
        {
            "resumo_modelo": "Fluxo com múltiplos gateways e desvios",
            "raias": [
                {"id": "Lane_1", "nome": "Requerente"},
                {"id": "Lane_2", "nome": "DPM/DAA"},
                {"id": "Lane_3", "nome": "Colegiado"},
                {"id": "Lane_4", "nome": "DAA/PREG"},
            ],
            "elementos": [
                {"id": "Start_1", "tipo": "startEvent", "nome": "Início", "raia_id": "Lane_1"},
                {"id": "Task_1", "tipo": "task", "nome": "1. Enviar pedido", "raia_id": "Lane_1"},
                {"id": "Task_2", "tipo": "task", "nome": "2. Conferir documentos", "raia_id": "Lane_2"},
                {
                    "id": "Gateway_1",
                    "tipo": "exclusiveGateway",
                    "nome": "Documentação conforme? (Sim: segue / Não: notifica)",
                    "raia_id": "Lane_2",
                },
                {"id": "Task_2_1", "tipo": "task", "nome": "2.1 Notificar pendência", "raia_id": "Lane_2"},
                {"id": "Task_2_2", "tipo": "task", "nome": "2.2 Sanear pendência", "raia_id": "Lane_1"},
                {"id": "Gateway_2", "tipo": "exclusiveGateway", "nome": "Pendência saneada?", "raia_id": "Lane_2"},
                {"id": "Task_3", "tipo": "task", "nome": "3. Analisar mérito", "raia_id": "Lane_3"},
                {"id": "Gateway_3", "tipo": "exclusiveGateway", "nome": "Parecer favorável?", "raia_id": "Lane_3"},
                {"id": "Task_4", "tipo": "task", "nome": "4. Verificar vagas", "raia_id": "Lane_4"},
                {"id": "Gateway_4", "tipo": "exclusiveGateway", "nome": "Deferido?", "raia_id": "Lane_4"},
                {"id": "Task_5", "tipo": "task", "nome": "5. Efetivar cadastro", "raia_id": "Lane_4"},
                {"id": "Task_6", "tipo": "task", "nome": "6. Indeferir e arquivar", "raia_id": "Lane_4"},
                {"id": "End_1", "tipo": "endEvent", "nome": "Concluído", "raia_id": "Lane_4"},
                {"id": "End_2", "tipo": "endEvent", "nome": "Arquivado", "raia_id": "Lane_4"},
            ],
            "fluxos": [
                {"id": "Flow_1", "origem": "Start_1", "destino": "Task_1", "condicao": ""},
                {"id": "Flow_2", "origem": "Task_1", "destino": "Task_2", "condicao": ""},
                {"id": "Flow_3", "origem": "Task_2", "destino": "Gateway_1", "condicao": ""},
                {"id": "Flow_4", "origem": "Gateway_1", "destino": "Task_3", "condicao": "Sim"},
                {"id": "Flow_5", "origem": "Gateway_1", "destino": "Task_2_1", "condicao": "Com pendência"},
                {"id": "Flow_6", "origem": "Task_2_1", "destino": "Task_2_2", "condicao": ""},
                {"id": "Flow_7", "origem": "Task_2_2", "destino": "Gateway_2", "condicao": ""},
                {"id": "Flow_8", "origem": "Gateway_2", "destino": "Task_2", "condicao": "Sim"},
                {"id": "Flow_9", "origem": "Gateway_2", "destino": "Task_6", "condicao": "Não"},
                {"id": "Flow_10", "origem": "Task_3", "destino": "Gateway_3", "condicao": ""},
                {"id": "Flow_11", "origem": "Gateway_3", "destino": "Task_4", "condicao": "Sim"},
                {"id": "Flow_12", "origem": "Gateway_3", "destino": "Task_6", "condicao": "Não"},
                {"id": "Flow_13", "origem": "Task_4", "destino": "Gateway_4", "condicao": ""},
                {"id": "Flow_14", "origem": "Gateway_4", "destino": "Task_5", "condicao": "Sim"},
                {"id": "Flow_15", "origem": "Gateway_4", "destino": "Task_6", "condicao": "Não"},
                {"id": "Flow_16", "origem": "Task_5", "destino": "End_1", "condicao": ""},
                {"id": "Flow_17", "origem": "Task_6", "destino": "End_2", "condicao": ""},
            ],
        }
    )

    proc = SimpleNamespace(id=uuid.uuid4(), nome="Processo Teste Gateways")
    xml_str = compilar_bpmn_xml(proc, est)
    ns = {
        "bpmn": "http://www.omg.org/spec/BPMN/20100524/MODEL",
        "bpmndi": "http://www.omg.org/spec/BPMN/20100524/DI",
        "dc": "http://www.omg.org/spec/DD/20100524/DC",
    }
    root = ET.fromstring(xml_str)

    # 1. Garante higienização de texto extra após '?' no nome do losango
    gws = {el.attrib["id"]: el.attrib["name"] for el in root.findall(".//bpmn:exclusiveGateway", ns)}
    assert gws["Gateway_1"] == "Documentação conforme?"

    # 2. Garante que todas as caixas de texto (BPMNLabel) de shapes e edges estão disjuntas (0 sobreposições)
    labels = []
    for shape in root.findall(".//bpmndi:BPMNShape", ns):
        el_id = shape.attrib.get("bpmnElement")
        lbl = shape.find("bpmndi:BPMNLabel/dc:Bounds", ns)
        if lbl is not None:
            b = tuple(int(float(lbl.attrib[k])) for k in ("x", "y", "width", "height"))
            labels.append((f"Shape:{el_id}", b))
    for edge in root.findall(".//bpmndi:BPMNEdge", ns):
        el_id = edge.attrib.get("bpmnElement")
        lbl = edge.find("bpmndi:BPMNLabel/dc:Bounds", ns)
        if lbl is not None:
            b = tuple(int(float(lbl.attrib[k])) for k in ("x", "y", "width", "height"))
            labels.append((f"Edge:{el_id}", b))

    for i in range(len(labels)):
        for j in range(i + 1, len(labels)):
            n1, (x1, y1, w1, h1) = labels[i]
            n2, (x2, y2, w2, h2) = labels[j]
            intersects = not (x1 + w1 <= x2 or x2 + w2 <= x1 or y1 + h1 <= y2 or y2 + h2 <= y1)
            assert not intersects, f"Sobreposição detectada entre {n1} e {n2}"




