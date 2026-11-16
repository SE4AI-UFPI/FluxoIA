from collections import defaultdict, deque
import time
from typing import Literal
from xml.sax.saxutils import escape
from pydantic import BaseModel, Field, ValidationError

from core.models import OrigemVersaoBPMN, Processo, User, VersaoFluxoBPMN
from .llm_client import LLMClient, LLMServiceError
from . import process_service


class BpmnRaiaSpec(BaseModel):
    id: str = Field(..., description='Identificador único da raia, ex: Lane_1')
    nome: str = Field(..., description='Nome do setor, área ou responsável da raia')


class BpmnElementoSpec(BaseModel):
    id: str = Field(..., description='Identificador único do elemento, ex: Start_1, Task_1, Gateway_1, End_1')
    tipo: Literal['startEvent', 'task', 'serviceTask', 'exclusiveGateway', 'endEvent']
    nome: str = Field(..., description='Rótulo curto e claro da etapa ou decisão')
    raia_id: str = Field(..., description='ID da raia (BpmnRaiaSpec.id) onde este elemento ocorre')
    origem_entrevista: str = Field(
        default='activities',
        description='Chave da pergunta da entrevista que originou este elemento (ex: trigger, activities, approvals, exceptions, completion)',
    )


class BpmnFluxoSpec(BaseModel):
    id: str = Field(..., description='Identificador único da seta, ex: Flow_1')
    origem: str = Field(..., description='ID do elemento de origem')
    destino: str = Field(..., description='ID do elemento de destino')
    condicao: str = Field(default='', description='Rótulo da condição em saídas de gateway (ex: Aprovado, Ajustes)')


class BpmnFichaTecnica(BaseModel):
    legenda: list[str] = Field(
        default_factory=list,
        description="Símbolos e regras de desvio aplicáveis ao fluxo, ex: '▲ - Caso seja notificado (Em caso de pendência)', '▼ - Caso seja autuado'",
    )
    observacoes_prazo: str = Field(
        default='',
        description="Prazos limites para sanear pendências, diligências ou encerramento (ex: 'Todas as pendências deverão ser solucionadas em até 90 dias...').",
    )
    informacoes_gerais: str = Field(
        default='',
        description='Resumo conciso do objetivo institucional do processo e fundamentação legal de referência.',
    )
    sistemas: list[str] = Field(
        default_factory=list,
        description="Sistemas ou plataformas utilizados na tramitação, ex: 'Plataforma SEI', 'Construa Fácil', 'Processo Físico', etc.",
    )
    documentacao: list[str] = Field(
        default_factory=list,
        description='Checklist dos documentos obrigatórios ou peças instrutórias necessárias para autuação e tramitação.',
    )
    taxas: list[str] = Field(
        default_factory=list,
        description="Taxas, guias ou emolumentos com códigos se houver, ou indicação de 'Não se aplica / Processo sem taxas'.",
    )


class BpmnEstruturaGerada(BaseModel):
    resumo_modelo: str = Field(default='', description='Breve explicação de como o fluxo foi organizado')
    ficha_tecnica: BpmnFichaTecnica = Field(
        default_factory=BpmnFichaTecnica,
        description='Ficha técnica institucional e quadros de rodapé complementares ao diagrama',
    )
    raias: list[BpmnRaiaSpec] = Field(min_length=1)
    elementos: list[BpmnElementoSpec] = Field(min_length=2)
    fluxos: list[BpmnFluxoSpec] = Field(min_length=1)


SYSTEM_PROMPT_BPMN = """Você é um arquiteto especialista em mapeamento de processos públicos em BPMN 2.0.
Sua tarefa é analisar os dados iniciais e as respostas da entrevista guiada de um processo público e produzir a estrutura lógica completa do diagrama BPMN 2.0 acompanhada da ficha técnica institucional (quadros de rodapé) em formato JSON estrito.

DIRETRIZES DE MODELAGEM BPMN:
1. IDENTIFICAÇÃO DO TIPO DE PROCESSO E PRIMEIRA RAIA:
   - Se for um processo de ATENDIMENTO AO CIDADÃO / EXTERNO (ex: licenças, certidões, alvarás solicitados por pessoa física ou jurídica externa): a primeira raia DEVE ser o solicitante (ex: "Requerente" ou "Cidadão").
   - Se for um processo INTERNO ENTRE UNIDADES (ex: requisições de compras, memorandos, processos de RH, pareceres entre secretarias): a primeira raia DEVE ser a própria unidade administrativa demandante (ex: "Divisão Solicitante", "Gabinete", "Coordenação de RH"), sem criar raia externa.
2. NUMERAÇÃO DAS ETAPAS:
   - Numere os nomes das tarefas sequencialmente no fluxo principal: "1. Solicitar abertura...", "2. Conferir documentação...", "3. Emitir taxa...", etc.
   - Tarefas de desvios, pendências ou diligências devem receber subnumerações claras: "2.1 Notificar pendência", "2.2 Sanear pendência", etc.
3. TRATAMENTO CONDICIONAL DE TAXAS:
   - Se a resposta de taxas indicar cobrança de guias/taxas (ex: taxa de serviço, taxa de licença): modele as etapas de emissão da guia pelo setor e de pagamento/anexação de comprovante pelo solicitante, e preencha as taxas com códigos no campo `taxas`.
   - Se for processo gratuito ou interno sem taxas: NÃO crie tarefas de pagamento e registre no campo `taxas`: ["Não se aplica / Processo sem taxas"].
4. PENDÊNCIAS, EXCEÇÕES E PRAZOS:
   - Modele gateways exclusivos para pontos de conferência/vistoria e gere o ramo de pendência/notificação e saneamento.
   - No campo `observacoes_prazo` da ficha técnica, registre claramente o prazo limite informado (ex: "Todas as pendências deverão ser solucionadas em até 90 dias. Após esse prazo, o processo será encerrado.").
5. FICHA TÉCNICA INSTITUCIONAL (QUADROS DE RODAPÉ):
   - Preencha os campos `ficha_tecnica` (`legenda`, `observacoes_prazo`, `informacoes_gerais`, `sistemas`, `documentacao`, `taxas`) para permitir a exibição da folha completa do processo.

FORMATO DE RETORNO OBRIGATÓRIO (JSON PURO):
{
  "resumo_modelo": "Explicação concisa das raias e decisões modeladas",
  "ficha_tecnica": {
    "legenda": ["▲ Caso seja notificado / Em caso de pendência", "▼ Caso seja autuado"],
    "observacoes_prazo": "Todas as pendências deverão ser solucionadas em até 90 dias. Após esse prazo, o processo será encerrado.",
    "informacoes_gerais": "Finalidade e fundamentação legal do processo.",
    "sistemas": ["Plataforma SEI"],
    "documentacao": ["Requerimento", "Documento de identificação com foto", "Comprovante de endereço"],
    "taxas": ["Taxa de Serviço (Cód.: 71130004)"]
  },
  "raias": [
    { "id": "Lane_1", "nome": "Requerente" },
    { "id": "Lane_2", "nome": "SDU: Protocolo" }
  ],
  "elementos": [
    {
      "id": "Start_1",
      "tipo": "startEvent",
      "nome": "Início da solicitação",
      "raia_id": "Lane_1",
      "origem_entrevista": "trigger"
    },
    {
      "id": "Task_1",
      "tipo": "task",
      "nome": "1. Solicitar abertura do processo",
      "raia_id": "Lane_1",
      "origem_entrevista": "trigger"
    },
    {
      "id": "Task_2",
      "tipo": "task",
      "nome": "2. Analisar documentação e conferir requisitos",
      "raia_id": "Lane_2",
      "origem_entrevista": "activities"
    },
    {
      "id": "Gateway_1",
      "tipo": "exclusiveGateway",
      "nome": "Documentação conforme?",
      "raia_id": "Lane_2",
      "origem_entrevista": "approvals"
    },
    {
      "id": "Task_2_1",
      "tipo": "task",
      "nome": "2.1 Sanear pendências apontadas",
      "raia_id": "Lane_1",
      "origem_entrevista": "exceptions"
    },
    {
      "id": "End_1",
      "tipo": "endEvent",
      "nome": "Processo concluído e emitido",
      "raia_id": "Lane_2",
      "origem_entrevista": "completion"
    }
  ],
  "fluxos": [
    { "id": "Flow_1", "origem": "Start_1", "destino": "Task_1", "condicao": "" },
    { "id": "Flow_2", "origem": "Task_1", "destino": "Task_2", "condicao": "" },
    { "id": "Flow_3", "origem": "Task_2", "destino": "Gateway_1", "condicao": "" },
    { "id": "Flow_4", "origem": "Gateway_1", "destino": "End_1", "condicao": "Sim" },
    { "id": "Flow_5", "origem": "Gateway_1", "destino": "Task_2_1", "condicao": "Com pendência" },
    { "id": "Flow_6", "origem": "Task_2_1", "destino": "Task_2", "condicao": "" }
  ]
}
"""


def montar_prompt_usuario(processo: Processo, respostas: dict[str, str]) -> str:
    from core.models import PerguntaEntrevista

    perguntas = list(PerguntaEntrevista.objects.filter(ativa=True).order_by('ordem'))
    chaves_processadas = set()
    linhas_entrevista: list[str] = []

    if perguntas:
        for idx, p in enumerate(perguntas, start=1):
            chaves_processadas.add(p.chave)
            valor = (respostas.get(p.chave) or '').strip()
            linhas_entrevista.append(
                f"{idx}. [{p.chave}] {p.titulo} ({p.enunciado}): {valor if valor else 'Não informado'}"
            )
        idx_extra = len(perguntas) + 1
        for k, v in respostas.items():
            if k not in chaves_processadas and isinstance(v, str) and v.strip():
                linhas_entrevista.append(f"{idx_extra}. [{k}]: {v.strip()}")
                idx_extra += 1
    else:
        for idx, (k, v) in enumerate(respostas.items(), start=1):
            val = (v or '').strip() if isinstance(v, str) else str(v)
            linhas_entrevista.append(f"{idx}. [{k}]: {val if val else 'Não informado'}")

    bloco_respostas = "\n".join(linhas_entrevista)

    return f"""DADOS DO PROCESSO PÚBLICO:
- Nome do Processo: {processo.nome}
- Secretaria / Órgão: {processo.secretaria or 'Não informada'}
- Setor Principal: {processo.setor}
- Objetivo: {processo.objetivo}
- Descrição Geral: {processo.descricao or 'Não informada'}
- Legislação / Normas: {processo.legislacao or 'Não informada'}

RESPOSTAS DA ENTREVISTA GUIADA (CHAVE -> RESPOSTA DO SERVIDOR):
{bloco_respostas}

Gere o JSON estruturado do fluxo BPMN 2.0 e da Ficha Técnica correspondente."""


def compilar_bpmn_xml(processo: Processo, estrutura: BpmnEstruturaGerada) -> str:
    """
    Converte a estrutura semântica validada (raias, tarefas, gateways e fluxos)
    em um XML BPMN 2.0 completo com Collaboration, LaneSet e coordenadas BPMNDI.
    Aplica rank topológico para compactar as colunas e roteamento ortogonal inteligente
    para evitar que arestas atravessem o interior de tarefas.
    """
    proc_slug = str(processo.id).replace('-', '')[:12]
    collab_id = f'Collaboration_{proc_slug}'
    participant_id = f'Participant_{proc_slug}'
    process_id = f'Process_{proc_slug}'
    laneset_id = f'LaneSet_{proc_slug}'

    raias = estrutura.raias
    raia_ids = {r.id for r in raias}
    default_raia_id = raias[0].id
    elem_map = {e.id: e for e in estrutura.elementos}
    raia_index_map = {r.id: idx for idx, r in enumerate(raias)}
    all_nodes = [e.id for e in estrutura.elementos]

    # 1. Identifica ciclos / back-edges (ex: retorno de saneamento de pendência ou diligência)
    import re

    def extrair_ordem_num(nome: str) -> list[int] | None:
        m = re.match(r'^(\d+(?:\.\d+)*)\b', (nome or '').strip())
        if not m:
            return None
        return [int(p) for p in m.group(1).split('.')]

    adj = defaultdict(list)
    for fl in estrutura.fluxos:
        if fl.origem in elem_map and fl.destino in elem_map:
            adj[fl.origem].append(fl.destino)

    visited: dict[str, int] = {}
    back_edges: set[tuple[str, str]] = set()

    def dfs_cycle(u: str) -> None:
        visited[u] = 1
        num_u = extrair_ordem_num(elem_map[u].nome)
        for v_node in adj[u]:
            num_v = extrair_ordem_num(elem_map[v_node].nome)
            if visited.get(v_node) == 1:
                back_edges.add((u, v_node))
            elif (
                num_u
                and num_v
                and (
                    num_u[0] > num_v[0]
                    or (num_u[0] == num_v[0] and len(num_u) > len(num_v))
                )
            ):
                back_edges.add((u, v_node))
            elif visited.get(v_node, 0) == 0:
                dfs_cycle(v_node)
        visited[u] = 2

    start_nodes = [e.id for e in estrutura.elementos if e.tipo == 'startEvent']
    other_nodes = [e.id for e in estrutura.elementos if e.tipo != 'startEvent']
    for node_id in start_nodes + other_nodes:
        if visited.get(node_id, 0) == 0:
            dfs_cycle(node_id)

    # 2. Ordem topológica estrita no DAG direto (excluindo back-edges)
    dag_adj = defaultdict(list)
    dag_rev_adj = defaultdict(list)
    for fl in estrutura.fluxos:
        if (fl.origem, fl.destino) not in back_edges and fl.origem in elem_map and fl.destino in elem_map:
            dag_adj[fl.origem].append(fl.destino)
            dag_rev_adj[fl.destino].append(fl.origem)

    in_degrees = {e.id: len(dag_rev_adj[e.id]) for e in estrutura.elementos}
    queue = deque([e.id for e in estrutura.elementos if in_degrees[e.id] == 0])
    topo_order: list[str] = []

    while queue:
        curr = queue.popleft()
        topo_order.append(curr)
        for neighbor in dag_adj[curr]:
            in_degrees[neighbor] -= 1
            if in_degrees[neighbor] == 0:
                queue.append(neighbor)

    for elem in estrutura.elementos:
        if elem.id not in topo_order:
            topo_order.append(elem.id)

    # 3. Alocação progressiva de colunas garantindo col(destino) > col(origem)
    lane_columns: dict[str, set[int]] = defaultdict(set)
    final_col: dict[str, int] = {}

    for nid in topo_order:
        elem = elem_map[nid]
        lane_id = elem.raia_id if elem.raia_id in raia_ids else default_raia_id
        valid_parents = [p for p in dag_rev_adj[nid] if p in final_col]
        min_col = max([final_col[p] + 1 for p in valid_parents], default=0)

        c = min_col
        while c in lane_columns[lane_id]:
            c += 1
        lane_columns[lane_id].add(c)
        final_col[nid] = c

    # 4. Cálculo das posições (x, y, width, height) com folga generosa longe das linhas das raias
    LANE_HEIGHT = 180
    POOL_X = 60
    POOL_Y = 60
    COL_START_X = 205
    COL_STEP_X = 235
    INTERNAL_CORRIDOR = 22

    total_cols = max(max(final_col.values()) + 1, 3) if final_col else 3
    POOL_WIDTH = max(890, (COL_START_X - POOL_X) + total_cols * COL_STEP_X + 90)
    POOL_HEIGHT = len(raias) * LANE_HEIGHT

    bounds_map: dict[str, tuple[int, int, int, int]] = {}
    for nid in all_nodes:
        elem = elem_map[nid]
        rid = elem.raia_id if elem.raia_id in raia_ids else default_raia_id
        lane_idx = raia_index_map[rid]
        lane_center_y = POOL_Y + lane_idx * LANE_HEIGHT + (LANE_HEIGHT // 2)

        c = final_col[nid]
        center_x = COL_START_X + c * COL_STEP_X

        if elem.tipo in ('startEvent', 'endEvent'):
            w, h = 36, 36
        elif elem.tipo == 'exclusiveGateway':
            w, h = 50, 50
        else:
            w, h = 140, 80

        x = center_x - (w // 2)
        y = lane_center_y - (h // 2)
        bounds_map[nid] = (x, y, w, h)

    # 5. Agrupamento por raia para o XML
    elementos_por_raia: dict[str, list[str]] = {r.id: [] for r in raias}
    for elem in estrutura.elementos:
        rid = elem.raia_id if elem.raia_id in raia_ids else default_raia_id
        elementos_por_raia[rid].append(elem.id)

    lanes_xml_parts: list[str] = []
    for r in raias:
        refs = ''.join(
            f'<bpmn:flowNodeRef>{escape(eid)}</bpmn:flowNodeRef>'
            for eid in elementos_por_raia.get(r.id, [])
        )
        lanes_xml_parts.append(
            f'<bpmn:lane id="{escape(r.id)}" name="{escape(r.nome)}">{refs}</bpmn:lane>'
        )

    nodes_xml_parts = [
        f'<bpmn:{elem.tipo} id="{escape(elem.id)}" name="{escape(elem.nome)}" />'
        for elem in estrutura.elementos
    ]

    flows_xml_parts: list[str] = []
    for fl in estrutura.fluxos:
        if fl.origem not in bounds_map or fl.destino not in bounds_map:
            continue
        name_attr = f' name="{escape(fl.condicao)}"' if fl.condicao.strip() else ''
        flows_xml_parts.append(
            f'<bpmn:sequenceFlow id="{escape(fl.id)}" sourceRef="{escape(fl.origem)}" targetRef="{escape(fl.destino)}"{name_attr} />'
        )

    shapes_xml_parts = [
        f'<bpmndi:BPMNShape id="{participant_id}_di" bpmnElement="{participant_id}" isHorizontal="true">'
        f'<dc:Bounds x="{POOL_X}" y="{POOL_Y}" width="{POOL_WIDTH}" height="{POOL_HEIGHT}" />'
        f'</bpmndi:BPMNShape>'
    ]

    for idx, r in enumerate(raias):
        ly = POOL_Y + idx * LANE_HEIGHT
        shapes_xml_parts.append(
            f'<bpmndi:BPMNShape id="{escape(r.id)}_di" bpmnElement="{escape(r.id)}" isHorizontal="true">'
            f'<dc:Bounds x="{POOL_X + 30}" y="{ly}" width="{POOL_WIDTH - 30}" height="{LANE_HEIGHT}" />'
            f'</bpmndi:BPMNShape>'
        )

    for elem in estrutura.elementos:
        x, y, w, h = bounds_map[elem.id]
        marker = ' isMarkerVisible="true"' if elem.tipo == 'exclusiveGateway' else ''
        shapes_xml_parts.append(
            f'<bpmndi:BPMNShape id="{escape(elem.id)}_di" bpmnElement="{escape(elem.id)}"{marker}>'
            f'<dc:Bounds x="{x}" y="{y}" width="{w}" height="{h}" />'
            f'</bpmndi:BPMNShape>'
        )

    # 6. Roteamento inteligente de Edges (sem atravessar caixas e sem sobrepor divisórias de raias)
    edges_xml_parts: list[str] = []
    for edge_idx, fl in enumerate(estrutura.fluxos):
        if fl.origem not in bounds_map or fl.destino not in bounds_map:
            continue
        u_elem = elem_map[fl.origem]
        v_elem = elem_map[fl.destino]
        sx, sy, sw, sh = bounds_map[fl.origem]
        tx, ty, tw, th = bounds_map[fl.destino]
        u_lane = u_elem.raia_id if u_elem.raia_id in raia_ids else default_raia_id
        v_lane = v_elem.raia_id if v_elem.raia_id in raia_ids else default_raia_id
        u_lane_y = POOL_Y + raia_index_map[u_lane] * LANE_HEIGHT
        v_lane_y = POOL_Y + raia_index_map[v_lane] * LANE_HEIGHT
        offset_canal = ((edge_idx % 3) - 1) * 12

        is_back = (fl.origem, fl.destino) in back_edges or tx <= sx

        if is_back:
            # Retorno de ciclo (saneamento / diligência) pelo corredor interno da raia do destino
            end_x = tx + (tw // 2)
            if ty >= sy:
                start_x = sx + sw
                start_y = sy + (sh // 2)
                turn_x = sx + sw + 24 + offset_canal
                corridor_y = v_lane_y + INTERNAL_CORRIDOR + (edge_idx % 2) * 8
                end_y = ty
                pts = [(start_x, start_y), (turn_x, start_y), (turn_x, corridor_y), (end_x, corridor_y), (end_x, end_y)]
            else:
                start_x = sx + (sw // 2)
                start_y = sy
                corridor_y = v_lane_y + LANE_HEIGHT - INTERNAL_CORRIDOR - (edge_idx % 2) * 8
                end_y = ty + th
                pts = [(start_x, start_y), (start_x, corridor_y), (end_x, corridor_y), (end_x, end_y)]
        elif u_elem.tipo == 'exclusiveGateway' and u_lane != v_lane:
            # Saída de Gateway para outra raia: usa vértice superior ou inferior do losango
            start_x = sx + (sw // 2)
            start_y = sy if ty < sy else sy + sh
            end_x = tx
            end_y = ty + (th // 2)
            pts = [(start_x, start_y), (start_x, end_y), (end_x, end_y)]
        elif u_lane == v_lane:
            start_x = sx + sw
            start_y = sy + (sh // 2)
            end_x = tx
            end_y = ty + (th // 2)

            x_min = sx + sw
            x_max = tx
            has_obstacle = False
            for oid in all_nodes:
                if oid == fl.origem or oid == fl.destino:
                    continue
                oelem = elem_map[oid]
                o_lane = oelem.raia_id if oelem.raia_id in raia_ids else default_raia_id
                if o_lane == u_lane:
                    ox, oy, ow, oh = bounds_map[oid]
                    if x_min <= ox <= x_max:
                        has_obstacle = True
                        break

            if has_obstacle:
                bypass_y = u_lane_y + LANE_HEIGHT - INTERNAL_CORRIDOR
                turn1_x = start_x + 18
                turn2_x = end_x - 18
                pts = [(start_x, start_y), (turn1_x, start_y), (turn1_x, bypass_y), (turn2_x, bypass_y), (turn2_x, end_y), (end_x, end_y)]
            else:
                pts = [(start_x, start_y), (end_x, end_y)]
        else:
            start_x = sx + sw
            start_y = sy + (sh // 2)
            end_x = tx
            end_y = ty + (th // 2)
            turn_x = max(start_x + 18, min(start_x + 34 + offset_canal, end_x - 18))
            pts = [(start_x, start_y), (turn_x, start_y), (turn_x, end_y), (end_x, end_y)]

        waypoints = ''.join(f'<di:waypoint x="{px}" y="{py}" />' for px, py in pts)
        label_xml = ''
        if fl.condicao.strip():
            p0_x, p0_y = pts[0]
            p1_x, p1_y = pts[1] if len(pts) > 1 else pts[0]
            is_vert = abs(p1_y - p0_y) > abs(p1_x - p0_x)
            lw = min(130, max(44, int(len(fl.condicao.strip()) * 6.5)))
            lh = 24
            lx = p0_x + 8 if is_vert else p0_x + 12
            ly = (p0_y - 30 if p1_y < p0_y else p0_y + 8) if is_vert else p0_y - lh - 4
            label_xml = f'<bpmndi:BPMNLabel><dc:Bounds x="{lx}" y="{ly}" width="{lw}" height="{lh}" /></bpmndi:BPMNLabel>'

        edges_xml_parts.append(
            f'<bpmndi:BPMNEdge id="{escape(fl.id)}_di" bpmnElement="{escape(fl.id)}">{waypoints}{label_xml}</bpmndi:BPMNEdge>'
        )

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_{proc_slug}" targetNamespace="https://fluxoia.gov.br/bpmn">
  <bpmn:collaboration id="{collab_id}">
    <bpmn:participant id="{participant_id}" name="{escape(processo.nome)}" processRef="{process_id}" />
  </bpmn:collaboration>
  <bpmn:process id="{process_id}" name="{escape(processo.nome)}" isExecutable="false">
    <bpmn:laneSet id="{laneset_id}">
      {''.join(lanes_xml_parts)}
    </bpmn:laneSet>
    {''.join(nodes_xml_parts)}
    {''.join(flows_xml_parts)}
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="{collab_id}">
      {''.join(shapes_xml_parts)}
      {''.join(edges_xml_parts)}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>"""


def proximo_numero_versao(versao_atual: str) -> str:
    partes = [int(p) if p.isdigit() else 0 for p in (versao_atual or '1.0.0').split('.')]
    while len(partes) < 3:
        partes.append(0)
    return f'{partes[0]}.{partes[1]}.{partes[2] + 1}'


def gerar_fluxo_bpmn_com_ia(
    *,
    processo: Processo,
    usuario: User,
    llm_client: LLMClient | None = None,
) -> VersaoFluxoBPMN:
    """
    Orquestra a geração do diagrama BPMN 2.0 via IA a partir da entrevista guiada do processo,
    valida a estrutura com Pydantic, compila o XML BPMN 2.0 com raias e persiste a nova VersaoFluxoBPMN.
    """
    entrevista = getattr(processo, 'entrevista', None)
    respostas: dict[str, str] = dict(entrevista.respostas) if entrevista else {}

    from core.models import PerguntaEntrevista

    perguntas_obrigatorias = list(PerguntaEntrevista.objects.filter(ativa=True, obrigatoria=True))
    if perguntas_obrigatorias:
        faltantes = [p.titulo for p in perguntas_obrigatorias if not (respostas.get(p.chave) or '').strip()]
        if faltantes:
            raise LLMServiceError(
                f'Responda às perguntas obrigatórias da entrevista antes de gerar o BPMN com IA: {", ".join(faltantes)}.'
            )
    else:
        trigger_val = (respostas.get('trigger') or '').strip()
        activities_val = (respostas.get('activities') or '').strip()
        if not trigger_val and not activities_val and not any(v.strip() for v in respostas.values() if isinstance(v, str)):
            raise LLMServiceError(
                'Responda às perguntas da entrevista guiada antes de gerar o BPMN com IA.'
            )

    client = llm_client or LLMClient()
    user_prompt = montar_prompt_usuario(processo, respostas)

    inicio_chamada = time.perf_counter()
    dados_json, completion_res = client.gerar_json(
        system_prompt=SYSTEM_PROMPT_BPMN,
        user_prompt=user_prompt,
        temperature=0.1,
        usuario_identificador=usuario.email,
    )
    latencia_segundos = round(time.perf_counter() - inicio_chamada, 2)

    try:
        estrutura = BpmnEstruturaGerada.model_validate(dados_json)
    except ValidationError as exc:
        raise LLMServiceError(
            f'A estrutura retornada pelo modelo de IA não atendeu ao esquema BPMN esperado: {exc}'
        ) from exc

    bpmn_xml = compilar_bpmn_xml(processo, estrutura)

    tem_versoes = processo.versoes_bpmn.exists()
    nova_versao = proximo_numero_versao(processo.versao_atual) if tem_versoes else '1.0.0'
    origem = OrigemVersaoBPMN.REGENERACAO_IA if tem_versoes else OrigemVersaoBPMN.IA
    motivo = (
        f'Regeneração via IA ({completion_res.model})'
        if tem_versoes
        else f'Geração inicial via IA ({completion_res.model})'
    )

    estrutura_salva = {
        **estrutura.model_dump(),
        'meta_ia': {
            'provider': completion_res.provider,
            'model': completion_res.model,
            'usage': completion_res.usage,
            'latencia_segundos': latencia_segundos,
        },
    }

    return process_service.registrar_versao_bpmn(
        processo=processo,
        usuario=usuario,
        dados={
            'numero_versao': nova_versao,
            'bpmn_xml': bpmn_xml,
            'estrutura_json': estrutura_salva,
            'origem': origem,
            'motivo_alteracao': motivo,
        },
    )


class ValidacaoRespostaIA(BaseModel):
    status: Literal['valida', 'vaga', 'invalida'] = Field(
        default='valida',
        description="Classificação da resposta: 'valida' (adequada), 'vaga' (faz sentido mas falta detalhe importante para o BPMN) ou 'invalida' (sem sentido, contraditória ou fora de contexto).",
    )
    mensagem_feedback: str = Field(
        default='',
        description='Explicação curta, cordial e direta sobre o motivo de a resposta estar vaga ou inválida (vazio se valida).',
    )
    sugestao_melhoria: str = Field(
        default='',
        description='Orientação prática ou exemplo curto do que acrescentar para enriquecer o mapeamento BPMN (vazio se valida).',
    )


SYSTEM_PROMPT_VALIDACAO_RESPOSTA = """Você é um analista especialista em mapeamento de processos em BPMN 2.0.
Sua tarefa é avaliar rapidamente se a resposta dada pelo usuário a uma pergunta da entrevista guiada faz sentido em relação ao TÍTULO e ao ENUNCIADO da pergunta (definidos dinamicamente pelo administrador) e ao contexto do processo.

CRITÉRIOS DE CLASSIFICAÇÃO:
1. "invalida":
   - Textos sem sentido, ruído de teclado ("asdf", "123", "..."), evasivas ("não sei", "qualquer coisa", "teste") ou respostas que fogem completamente ao que o ENUNCIADO da pergunta pediu e ao contexto do processo.
   - Respostas contraditórias ou que não respondem minimamente ao que foi perguntado.

2. "vaga":
   - A resposta aborda o tema perguntado no ENUNCIADO, mas é excessivamente genérica, superficial ou omite partes essenciais que o próprio ENUNCIADO solicitou (ex: o enunciado pede para identificar nomes específicos, etapas, critérios ou responsáveis e o usuário responde de forma indefinida sem especificá-los).
   - A resposta ignora ou contradiz elementos importantes que o próprio usuário já havia mencionado nas respostas anteriores da entrevista.

3. "valida":
   - A resposta atende de forma coerente e compreensível ao que o ENUNCIADO da pergunta solicitou, mesmo que seja concisa e direta.
   - IMPORTANTE: Se o próprio ENUNCIADO perguntar se determinado aspecto existe/ocorre no processo (ou se a pergunta estiver marcada como "Obrigatória: Não") e o usuário responder claramente que não existe ou não se aplica ao processo, classifique como "valida". Não seja excessivamente rígido nem exija perfeição acadêmica.

FORMATO DE RETORNO OBRIGATÓRIO (JSON PURO):
{
  "status": "valida" | "vaga" | "invalida",
  "mensagem_feedback": "Frase curta explicando o ponto de atenção com base no enunciado da pergunta (ou string vazia se valida)",
  "sugestao_melhoria": "Dica prática do que informar para atender ao enunciado da pergunta (ou string vazia se valida)"
}
"""

RESPOSTAS_NEGATIVAS_VALIDAS = {
    'nao',
    'não',
    'nao ha',
    'não há',
    'nao possui',
    'não possui',
    'nao tem',
    'não tem',
    'nao se aplica',
    'não se aplica',
    'n/a',
    'nenhum',
    'nenhuma',
}

PADROES_RUIDO = {
    'teste',
    'test',
    'asdf',
    'qwerty',
    'blablabla',
    'qualquer coisa',
    'nao sei',
    'não sei',
    'sei la',
    'sei lá',
}


def _registrar_log_validacao_entrevista(
    *,
    usuario: User | None,
    processo_id: str | None,
    processo_nome: str,
    chave_pergunta: str,
    titulo_pergunta: str,
    obrigatoria: bool,
    resposta_enviada: str,
    validacao: ValidacaoRespostaIA,
    origem: str,
    latencia_segundos: float = 0.0,
    tokens_totais: int = 0,
) -> None:
    try:
        from core.models import LogValidacaoRespostaEntrevista

        proc_obj = None
        if processo_id:
            proc_obj = Processo.objects.filter(pk=processo_id).first()

        LogValidacaoRespostaEntrevista.objects.create(
            usuario=usuario if (usuario and getattr(usuario, 'is_authenticated', False)) else None,
            processo=proc_obj,
            processo_nome=(proc_obj.nome if proc_obj else processo_nome)[:200],
            chave_pergunta=chave_pergunta[:50],
            titulo_pergunta=titulo_pergunta[:150],
            obrigatoria=obrigatoria,
            resposta_enviada=resposta_enviada,
            status=validacao.status,
            origem=origem,
            mensagem_feedback=validacao.mensagem_feedback,
            sugestao_melhoria=validacao.sugestao_melhoria,
            latencia_segundos=latencia_segundos,
            tokens_totais=tokens_totais,
        )
    except Exception:
        # Falha ao gravar log de telemetria nunca deve interromper o fluxo do usuário
        pass


def validar_resposta_entrevista_com_ia(
    *,
    chave_pergunta: str,
    titulo_pergunta: str,
    enunciado_pergunta: str,
    obrigatoria: bool,
    resposta: str,
    processo_id: str | None = None,
    processo_nome: str = '',
    processo_setor: str = '',
    processo_objetivo: str = '',
    respostas_anteriores: dict[str, str] | None = None,
    usuario: User | None = None,
    usuario_email: str | None = None,
    llm_client: LLMClient | None = None,
) -> ValidacaoRespostaIA:
    """
    Avalia a pertinência e suficiência de uma resposta individual da entrevista guiada.
    Combina heurística determinística rápida (0ms) com avaliação semântica via LLM
    e persiste o log de avaliação no banco de dados.
    """
    import re

    texto = (resposta or '').strip()
    email_id = usuario_email or (getattr(usuario, 'email', None) if usuario else None)

    # 1. Caso vazio
    if not texto:
        if not obrigatoria:
            res = ValidacaoRespostaIA(status='valida')
        else:
            res = ValidacaoRespostaIA(
                status='invalida',
                mensagem_feedback='Esta pergunta é obrigatória para estruturar o diagrama BPMN.',
                sugestao_melhoria=f'Por favor, responda ao que é solicitado em "{titulo_pergunta}".',
            )
        _registrar_log_validacao_entrevista(
            usuario=usuario,
            processo_id=processo_id,
            processo_nome=processo_nome,
            chave_pergunta=chave_pergunta,
            titulo_pergunta=titulo_pergunta,
            obrigatoria=obrigatoria,
            resposta_enviada=texto,
            validacao=res,
            origem='heuristica_local',
        )
        return res

    texto_norm = texto.lower().strip(' .,!?;:-')

    # 2. Qualquer pergunta configurada pelo Admin como NÃO obrigatória (obrigatoria=False)
    # que receba uma resposta negativa ("Não há / Não se aplica") é aprovada imediatamente.
    if not obrigatoria and texto_norm in RESPOSTAS_NEGATIVAS_VALIDAS:
        res = ValidacaoRespostaIA(status='valida')
        _registrar_log_validacao_entrevista(
            usuario=usuario,
            processo_id=processo_id,
            processo_nome=processo_nome,
            chave_pergunta=chave_pergunta,
            titulo_pergunta=titulo_pergunta,
            obrigatoria=obrigatoria,
            resposta_enviada=texto,
            validacao=res,
            origem='heuristica_local',
        )
        return res

    # 3. Filtro rápido anti-ruído (evita gastar chamada de IA com lixo óbvio)
    somente_alfa = re.sub(r'[^a-zA-ZÀ-ÿ]', '', texto_norm)
    if (
        texto_norm in PADROES_RUIDO
        or len(somente_alfa) < 3
        or len(set(somente_alfa)) <= 1
    ):
        res = ValidacaoRespostaIA(
            status='invalida',
            mensagem_feedback='A resposta informada é muito curta ou não contém informações válidas para o mapeamento.',
            sugestao_melhoria=f'Descreva com suas palavras como ocorre a etapa de "{titulo_pergunta}" no processo.',
        )
        _registrar_log_validacao_entrevista(
            usuario=usuario,
            processo_id=processo_id,
            processo_nome=processo_nome,
            chave_pergunta=chave_pergunta,
            titulo_pergunta=titulo_pergunta,
            obrigatoria=obrigatoria,
            resposta_enviada=texto,
            validacao=res,
            origem='heuristica_local',
        )
        return res

    # 4. Chamada semântica ao modelo de IA
    historico_linhas = []
    for k, v in (respostas_anteriores or {}).items():
        if k != chave_pergunta and isinstance(v, str) and v.strip():
            historico_linhas.append(f'- [{k}]: {v.strip()}')
    bloco_historico = '\n'.join(historico_linhas) if historico_linhas else 'Nenhuma resposta anterior registrada.'

    user_prompt = f"""CONTEXTO DO PROCESSO:
- Nome: {processo_nome or 'Não informado'}
- Setor Principal: {processo_setor or 'Não informado'}
- Objetivo: {processo_objetivo or 'Não informado'}

RESPOSTAS ANTERIORES JÁ PREENCHIDAS PELO USUÁRIO:
{bloco_historico}

PERGUNTA ATUAL DA ENTREVISTA:
- Chave: {chave_pergunta}
- Título: {titulo_pergunta}
- Obrigatória: {'Sim' if obrigatoria else 'Não'}
- Enunciado: {enunciado_pergunta}

RESPOSTA ENVIADA PELO USUÁRIO:
"{texto}"

Avalie a resposta e retorne o JSON estrito com status ("valida", "vaga" ou "invalida"), mensagem_feedback e sugestao_melhoria."""

    client = llm_client or LLMClient()
    inicio = time.perf_counter()
    try:
        dados_json, completion_res = client.gerar_json(
            system_prompt=SYSTEM_PROMPT_VALIDACAO_RESPOSTA,
            user_prompt=user_prompt,
            temperature=0.0,
            usuario_identificador=email_id,
        )
        latencia = round(time.perf_counter() - inicio, 2)
        usage = getattr(completion_res, 'usage', None) or {}
        tot_tokens = int(usage.get('total_tokens') or 0)

        validacao = ValidacaoRespostaIA.model_validate(dados_json)
        if validacao.status == 'valida':
            validacao.mensagem_feedback = ''
            validacao.sugestao_melhoria = ''

        _registrar_log_validacao_entrevista(
            usuario=usuario,
            processo_id=processo_id,
            processo_nome=processo_nome,
            chave_pergunta=chave_pergunta,
            titulo_pergunta=titulo_pergunta,
            obrigatoria=obrigatoria,
            resposta_enviada=texto,
            validacao=validacao,
            origem='ia_llm',
            latencia_segundos=latencia,
            tokens_totais=tot_tokens,
        )
        return validacao
    except Exception:
        # Fallback resiliente: se a API de IA falhar ou atrasar, não bloqueia o usuário
        latencia = round(time.perf_counter() - inicio, 2)
        res_fallback = ValidacaoRespostaIA(status='valida')
        _registrar_log_validacao_entrevista(
            usuario=usuario,
            processo_id=processo_id,
            processo_nome=processo_nome,
            chave_pergunta=chave_pergunta,
            titulo_pergunta=titulo_pergunta,
            obrigatoria=obrigatoria,
            resposta_enviada=texto,
            validacao=res_fallback,
            origem='fallback_erro_ia',
            latencia_segundos=latencia,
        )
        return res_fallback

