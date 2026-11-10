/**
 * Auto layout de diagramas BPMN 2.0 — atua SOMENTE no DI (posições/tamanhos das
 * formas, waypoints das conexões e bounds de pools/lanes).
 *
 * A semântica do processo (elementos, conexões, atributos funcionais) não é
 * alterada: o XML resultante mantém o mesmo `bpmn:process` e os mesmos ids.
 */

const NS = {
  bpmndi: 'http://www.omg.org/spec/BPMN/20100524/DI',
  dc: 'http://www.omg.org/spec/DD/20100524/DC',
  di: 'http://www.omg.org/spec/DD/20100524/DI',
} as const

const TIPOS_NO = new Set([
  'startEvent',
  'endEvent',
  'task',
  'userTask',
  'serviceTask',
  'manualTask',
  'sendTask',
  'receiveTask',
  'scriptTask',
  'businessRuleTask',
  'callActivity',
  'subProcess',
  'exclusiveGateway',
  'parallelGateway',
  'inclusiveGateway',
  'eventBasedGateway',
  'complexGateway',
  'intermediateCatchEvent',
  'intermediateThrowEvent',
  'boundaryEvent',
])

const TIPOS_GATEWAY = new Set([
  'exclusiveGateway',
  'parallelGateway',
  'inclusiveGateway',
  'eventBasedGateway',
  'complexGateway',
])

const TIPOS_CONTAINER = new Set(['participant', 'lane', 'subProcess'])

const TAMANHO_PADRAO: Record<string, { largura: number; altura: number }> = {
  evento: { largura: 36, altura: 36 },
  gateway: { largura: 50, altura: 50 },
  atividade: { largura: 140, altura: 80 },
}

const METRICA = {
  margemExterna: 60,
  espacoHorizontal: 95,
  espacoVertical: 56,
  paddingLane: 100,
  larguraHeaderPool: 30,
  larguraHeaderLane: 30,
  /** Espaço horizontal após o cabeçalho da raia antes da primeira coluna. */
  insetConteudo: 95,
  margemDireitaPool: 60,
  /** Margem interna segura dentro da raia para corredores horizontais (longe da borda da raia). */
  corredorInternoRaia: 22,
}

interface NoDiagrama {
  id: string
  nome: string
  tipo: string
  largura: number
  altura: number
  x: number
  y: number
  laneId: string | null
  indiceOriginal: number
  nivel: number
}

interface Conexao {
  id: string
  origem: string
  destino: string
  nome: string
}

interface Caixa {
  x: number
  y: number
  largura: number
  altura: number
}

export interface MetricasLayout {
  nos: number
  conexoes: number
  sobreposicoes: number
  cruzamentos: number
  conectoresSobreFormas: number
  distanciaMinima: number | null
  largura: number
  altura: number
}

/** Nome do elemento sem prefixo de namespace. */
function nomeLocal(elemento: Element): string {
  return (elemento.localName || elemento.nodeName || '').split(':').pop() ?? ''
}

/** Descendentes com o nome local informado, independente do prefixo usado. */
function elementos(raiz: Document | Element, nome: string): Element[] {
  const base = raiz.nodeType === 9 ? (raiz as Document).documentElement : (raiz as Element)
  if (!base) return []

  const encontrados: Element[] = []
  const visitar = (elemento: Element) => {
    if (nome === '*' || nomeLocal(elemento) === nome) encontrados.push(elemento)
    for (const filho of Array.from(elemento.children ?? [])) visitar(filho)
  }
  visitar(base)
  return encontrados
}

function primeiroElemento(raiz: Document | Element, nome: string): Element | undefined {
  return elementos(raiz, nome)[0]
}

function criarElemento(doc: Document, ns: string, nome: string): Element {
  return doc.createElementNS(ns, nome)
}

function dimensoesPadrao(tipo: string): { largura: number; altura: number } {
  if (tipo === 'startEvent' || tipo === 'endEvent') return TAMANHO_PADRAO.evento
  if (TIPOS_GATEWAY.has(tipo)) return TAMANHO_PADRAO.gateway
  if (
    tipo === 'intermediateCatchEvent' ||
    tipo === 'intermediateThrowEvent' ||
    tipo === 'boundaryEvent'
  ) {
    return TAMANHO_PADRAO.evento
  }
  return TAMANHO_PADRAO.atividade
}

function lerBounds(
  shape: Element | undefined,
): { x: number; y: number; largura: number; altura: number } | null {
  if (!shape) return null
  const bounds = primeiroElemento(shape, 'Bounds')
  if (!bounds) return null
  return {
    x: Number(bounds.getAttribute('x') ?? 0),
    y: Number(bounds.getAttribute('y') ?? 0),
    largura: Number(bounds.getAttribute('width') ?? 0),
    altura: Number(bounds.getAttribute('height') ?? 0),
  }
}

function gravarBounds(
  doc: Document,
  shape: Element,
  x: number,
  y: number,
  largura: number,
  altura: number,
) {
  let bounds = primeiroElemento(shape, 'Bounds')
  if (!bounds) {
    bounds = criarElemento(doc, NS.dc, 'dc:Bounds')
    shape.appendChild(bounds)
  }
  bounds.setAttribute('x', String(Math.round(x)))
  bounds.setAttribute('y', String(Math.round(y)))
  bounds.setAttribute('width', String(Math.round(largura)))
  bounds.setAttribute('height', String(Math.round(altura)))
}

/**
 * Extrai chave numérica do rótulo da tarefa (ex.: "1. Protocolar" -> [1], "2.1 Complementar" -> [2, 1])
 * para auxiliar na desambiguação de ciclos (ex.: 2.1 retornando para 2).
 */
function extrairOrdemNumerica(nome: string): number[] | null {
  const match = nome.trim().match(/^(\d+(?:\.\d+)*)\b/)
  if (!match) return null
  return match[1].split('.').map((parte) => Number(parte))
}

/**
 * Identifica arestas de retorno (back-edges / loops de retrabalho) via DFS a partir
 * dos eventos de início, garantindo que ciclos (ex.: 2.1 -> 2) NUNCA empurrem a
 * etapa anterior para a direita do gateway ou da etapa de retrabalho.
 */
function detectarBackEdges(nos: NoDiagrama[], conexoes: Conexao[]): Set<string> {
  const porId = new Map(nos.map((no) => [no.id, no]))
  const adj = new Map<string, Conexao[]>()
  for (const no of nos) adj.set(no.id, [])
  for (const c of conexoes) {
    if (porId.has(c.origem) && porId.has(c.destino)) {
      adj.get(c.origem)?.push(c)
    }
  }

  // Prioriza na DFS os ramos principais antes de sub-ramos (ex: 2 antes de 2.1)
  for (const lista of adj.values()) {
    lista.sort((a, b) => {
      const noA = porId.get(a.destino)
      const noB = porId.get(b.destino)
      return (noA?.indiceOriginal ?? 0) - (noB?.indiceOriginal ?? 0)
    })
  }

  const estadoVisita = new Map<string, number>() // 0 = não visitado, 1 = na pilha, 2 = finalizado
  const ordemDescoberta = new Map<string, number>()
  let relogio = 0
  const backEdges = new Set<string>()

  const visitar = (u: string) => {
    estadoVisita.set(u, 1)
    ordemDescoberta.set(u, relogio++)
    const noOrigem = porId.get(u)
    const numOrigem = noOrigem ? extrairOrdemNumerica(noOrigem.nome) : null

    for (const conexao of adj.get(u) ?? []) {
      const v = conexao.destino
      const st = estadoVisita.get(v) ?? 0
      const noDestino = porId.get(v)
      const numDestino = noDestino ? extrairOrdemNumerica(noDestino.nome) : null

      // Se v já está na pilha de recursão, é um ciclo direto (back-edge)
      if (st === 1) {
        backEdges.add(conexao.id)
        continue
      }

      // Se a tarefa de origem é uma sub-etapa (ex: 2.1) ou etapa posterior voltando para etapa anterior (ex: 2.1 -> 2 ou 4 -> 2)
      if (
        numOrigem &&
        numDestino &&
        numOrigem[0] !== undefined &&
        numDestino[0] !== undefined &&
        (numOrigem[0] > numDestino[0] ||
          (numOrigem[0] === numDestino[0] && numOrigem.length > numDestino.length))
      ) {
        backEdges.add(conexao.id)
        continue
      }

      if (st === 0) {
        visitar(v)
      }
    }
    estadoVisita.set(u, 2)
  }

  // Inicia pelos startEvents e depois pelos demais nós na ordem original
  const raizes = [
    ...nos.filter((n) => n.tipo === 'startEvent'),
    ...nos.filter((n) => n.tipo !== 'startEvent'),
  ]
  for (const no of raizes) {
    if ((estadoVisita.get(no.id) ?? 0) === 0) {
      visitar(no.id)
    }
  }

  return backEdges
}

/**
 * Calcula a coluna (nível) estritamente da esquerda para a direita sobre o DAG
 * (ignorando back-edges) e evita colisões de múltiplos nós na mesma raia e mesma coluna.
 */
function calcularNiveis(nos: NoDiagrama[], conexoes: Conexao[], backEdges: Set<string>): void {
  const porId = new Map(nos.map((no) => [no.id, no]))
  const dagSaidas = new Map<string, string[]>()
  const dagEntradas = new Map<string, string[]>()

  for (const no of nos) {
    dagSaidas.set(no.id, [])
    dagEntradas.set(no.id, [])
    no.nivel = 0
  }

  for (const c of conexoes) {
    if (backEdges.has(c.id)) continue
    if (!porId.has(c.origem) || !porId.has(c.destino)) continue
    dagSaidas.get(c.origem)?.push(c.destino)
    dagEntradas.get(c.destino)?.push(c.origem)
  }

  // Ordenação topológica de Kahn sobre o DAG
  const grauEntrada = new Map<string, number>()
  for (const no of nos) {
    grauEntrada.set(no.id, dagEntradas.get(no.id)?.length ?? 0)
  }

  const fila: string[] = nos
    .filter((no) => (grauEntrada.get(no.id) ?? 0) === 0)
    .sort((a, b) => a.indiceOriginal - b.indiceOriginal)
    .map((no) => no.id)

  const ordemTopo: string[] = []
  while (fila.length > 0) {
    const u = fila.shift() as string
    ordemTopo.push(u)
    for (const v of dagSaidas.get(u) ?? []) {
      const novoGrau = (grauEntrada.get(v) ?? 1) - 1
      grauEntrada.set(v, novoGrau)
      if (novoGrau === 0) {
        fila.push(v)
      }
    }
  }

  for (const no of nos) {
    if (!ordemTopo.includes(no.id)) {
      ordemTopo.push(no.id)
    }
  }

  // Alocação de colunas sem permitir dois elementos na mesma (raia, coluna)
  const colunasOcupadasPorRaia = new Map<string, Set<number>>()
  for (const id of ordemTopo) {
    const no = porId.get(id)
    if (!no) continue
    const pais = dagEntradas.get(id) ?? []
    let colMin = 0
    for (const paiId of pais) {
      const pai = porId.get(paiId)
      if (pai) {
        colMin = Math.max(colMin, pai.nivel + 1)
      }
    }

    const chaveRaia = no.laneId ?? '__sem_lane__'
    if (!colunasOcupadasPorRaia.has(chaveRaia)) {
      colunasOcupadasPorRaia.set(chaveRaia, new Set())
    }
    const ocupadas = colunasOcupadasPorRaia.get(chaveRaia)!
    let col = colMin
    while (ocupadas.has(col)) {
      col += 1
    }
    ocupadas.add(col)
    no.nivel = col
  }
}

function ordenarLanes(doc: Document): Element[] {
  return elementos(doc, 'lane')
}

function mapaFlowNodesPorLane(doc: Document): Map<string, string | null> {
  const vinculos = new Map<string, string | null>()
  for (const lane of ordenarLanes(doc)) {
    const laneId = lane.getAttribute('id') ?? ''
    for (const referencia of elementos(lane, 'flowNodeRef')) {
      const id = referencia.textContent?.trim()
      if (id) vinculos.set(id, laneId)
    }
  }
  return vinculos
}

interface Ponto {
  x: number
  y: number
}

function centroX(no: NoDiagrama): number {
  return Math.round(no.x + no.largura / 2)
}

function centroY(no: NoDiagrama): number {
  return Math.round(no.y + no.altura / 2)
}

/** Segmento horizontal/vertical cruzando o interior estrito do retângulo? */
function segmentoCruza(p1: Ponto, p2: Ponto, caixa: Caixa): boolean {
  const minX = Math.min(p1.x, p2.x)
  const maxX = Math.max(p1.x, p2.x)
  const minY = Math.min(p1.y, p2.y)
  const maxY = Math.max(p1.y, p2.y)
  return (
    maxX > caixa.x + 2 &&
    minX < caixa.x + caixa.largura - 2 &&
    maxY > caixa.y + 2 &&
    minY < caixa.y + caixa.altura - 2
  )
}

/** Remove pontos duplicados ou colineares consecutivos. */
function simplificarPontos(pontos: Ponto[]): Ponto[] {
  const simplificado: Ponto[] = []
  for (const p of pontos) {
    const pRound = { x: Math.round(p.x), y: Math.round(p.y) }
    const ultimo = simplificado[simplificado.length - 1]
    const penultimo = simplificado[simplificado.length - 2]
    if (ultimo && ultimo.x === pRound.x && ultimo.y === pRound.y) continue
    if (ultimo && penultimo) {
      const mesmaLinha =
        (penultimo.x === ultimo.x && ultimo.x === pRound.x) ||
        (penultimo.y === ultimo.y && ultimo.y === pRound.y)
      if (mesmaLinha) {
        simplificado[simplificado.length - 1] = pRound
        continue
      }
    }
    simplificado.push(pRound)
  }
  return simplificado
}

/**
 * Calcula waypoints ortogonais limpos para uma conexão:
 * - Nunca usa as linhas divisórias das raias (`faixa.y` / `faixa.y + altura`) como corredor;
 * - Usa as portas superior/inferior dos Gateways para desvios entre raias;
 * - Faz o retorno de ciclos (back-edges) pelos corredores internos livres das raias;
 * - Desloca canais verticais entre si para que linhas diferentes nunca se sobreponham.
 */
function criarWaypoints(
  doc: Document,
  edge: Element,
  conexao: Conexao,
  origem: NoDiagrama,
  destino: NoDiagrama,
  todosNos: NoDiagrama[],
  faixas: Map<string, { y: number; altura: number }>,
  isBackEdge: boolean,
  indiceCanal: number,
) {
  for (const antigo of elementos(edge, 'waypoint')) {
    antigo.remove()
  }

  const mesmaRaia = (origem.laneId ?? '') === (destino.laneId ?? '')
  const faixaOrigem = faixas.get(origem.laneId ?? '__sem_lane__')
  const faixaDestino = faixas.get(destino.laneId ?? '__sem_lane__')
  const offsetCanal = ((indiceCanal % 3) - 1) * 12 // -12, 0, +12 para separar linhas paralelas

  let pontos: Ponto[] = []

  if (isBackEdge || destino.x <= origem.x) {
    // RETORNO DE CICLO / RETRABALHO (ex.: 2.1 Complementar -> 2. Realizar triagem)
    // Usa o corredor interno da raia (22px longe da linha divisória da raia)
    const destinoAcima = centroY(destino) < centroY(origem)
    const destinoAbaixo = centroY(destino) > centroY(origem)

    if (mesmaRaia && faixaOrigem) {
      // Mesma raia: sai pelo topo, passa pelo corredor superior interno da raia e entra pelo topo do destino
      const yCorredor = faixaOrigem.y + METRICA.corredorInternoRaia + (indiceCanal % 2) * 8
      pontos = [
        { x: centroX(origem), y: origem.y },
        { x: centroX(origem), y: yCorredor },
        { x: centroX(destino), y: yCorredor },
        { x: centroX(destino), y: destino.y },
      ]
    } else if (destinoAbaixo && faixaDestino) {
      // Origem está em raia acima do destino (ex: Requerente na Raia 1 devolvendo para Protocolo na Raia 2):
      // Sai pela direita (ou base) da origem, desce até o corredor superior interno da raia do destino e entra pelo topo do destino
      const yCorredor = faixaDestino.y + METRICA.corredorInternoRaia + (indiceCanal % 2) * 8
      const xSaida = origem.x + origem.largura + 24 + offsetCanal
      // Verifica se podemos descer direto pela base da origem sem cruzar ninguém
      const baseX = centroX(origem)
      const cruzaDescidaDireta = todosNos.some(
        (n) =>
          n.id !== origem.id &&
          n.id !== destino.id &&
          segmentoCruza(
            { x: baseX, y: origem.y + origem.altura },
            { x: baseX, y: yCorredor },
            n,
          ),
      )
      if (!cruzaDescidaDireta && baseX > destino.x + destino.largura + 10) {
        pontos = [
          { x: baseX, y: origem.y + origem.altura },
          { x: baseX, y: yCorredor },
          { x: centroX(destino), y: yCorredor },
          { x: centroX(destino), y: destino.y },
        ]
      } else {
        pontos = [
          { x: origem.x + origem.largura, y: centroY(origem) },
          { x: xSaida, y: centroY(origem) },
          { x: xSaida, y: yCorredor },
          { x: centroX(destino), y: yCorredor },
          { x: centroX(destino), y: destino.y },
        ]
      }
    } else if (destinoAcima && faixaDestino) {
      // Origem está em raia abaixo do destino: sobe até o corredor inferior interno da raia do destino e entra pela base do destino
      const yCorredor =
        faixaDestino.y + faixaDestino.altura - METRICA.corredorInternoRaia - (indiceCanal % 2) * 8
      const topoX = centroX(origem)
      pontos = [
        { x: topoX, y: origem.y },
        { x: topoX, y: yCorredor },
        { x: centroX(destino), y: yCorredor },
        { x: centroX(destino), y: destino.y + destino.altura },
      ]
    } else {
      const yCorredor = Math.min(origem.y, destino.y) - 24
      pontos = [
        { x: centroX(origem), y: origem.y },
        { x: centroX(origem), y: yCorredor },
        { x: centroX(destino), y: yCorredor },
        { x: centroX(destino), y: destino.y },
      ]
    }
  } else if (TIPOS_GATEWAY.has(origem.tipo) && !mesmaRaia) {
    // SAÍDA DE GATEWAY PARA OUTRA RAIA:
    // Sai pelo vértice SUPERIOR (se destino está acima) ou INFERIOR (se destino está abaixo) do losango!
    const vaiParaCima = centroY(destino) < centroY(origem)
    const pInicio: Ponto = vaiParaCima
      ? { x: centroX(origem), y: origem.y }
      : { x: centroX(origem), y: origem.y + origem.altura }
    const pFim: Ponto = { x: destino.x, y: centroY(destino) }

    // Verifica se o trecho horizontal em y = pFim.y de x = pInicio.x até pFim.x cruza algum nó na raia destino
    const obstaculoNoCaminho = todosNos.some(
      (n) =>
        n.id !== origem.id &&
        n.id !== destino.id &&
        segmentoCruza({ x: pInicio.x, y: pFim.y }, pFim, n),
    )

    if (!obstaculoNoCaminho) {
      pontos = [pInicio, { x: pInicio.x, y: pFim.y }, pFim]
    } else {
      // Contorna pelo corredor interno da raia destino e desce/sobe antes da tarefa destino
      const yCorredor = faixaDestino
        ? vaiParaCima
          ? faixaDestino.y + faixaDestino.altura - METRICA.corredorInternoRaia
          : faixaDestino.y + METRICA.corredorInternoRaia
        : pFim.y - 28
      const xEntrada = destino.x - 24 + offsetCanal
      pontos = [
        pInicio,
        { x: pInicio.x, y: yCorredor },
        { x: xEntrada, y: yCorredor },
        { x: xEntrada, y: pFim.y },
        pFim,
      ]
    }
  } else if (mesmaRaia) {
    // MESMA RAIA AVANÇANDO PARA A DIREITA
    const pInicio: Ponto = { x: origem.x + origem.largura, y: centroY(origem) }
    const pFim: Ponto = { x: destino.x, y: centroY(destino) }

    const obstaculoMesmaRaia = todosNos.some(
      (n) =>
        n.id !== origem.id &&
        n.id !== destino.id &&
        segmentoCruza(pInicio, pFim, n),
    )

    if (!obstaculoMesmaRaia) {
      if (Math.abs(pInicio.y - pFim.y) <= 2) {
        pontos = [pInicio, { x: pFim.x, y: pInicio.y }]
      } else {
        const xMeio = Math.round((pInicio.x + pFim.x) / 2) + offsetCanal
        pontos = [pInicio, { x: xMeio, y: pInicio.y }, { x: xMeio, y: pFim.y }, pFim]
      }
    } else {
      // Se salta sobre outro elemento na mesma raia, passa pelo corredor inferior interno da raia
      const yCorredor = faixaOrigem
        ? faixaOrigem.y + faixaOrigem.altura - METRICA.corredorInternoRaia
        : Math.max(origem.y + origem.altura, destino.y + destino.altura) + 22
      const xSaida = pInicio.x + 20
      const xEntrada = pFim.x - 20
      pontos = [
        pInicio,
        { x: xSaida, y: pInicio.y },
        { x: xSaida, y: yCorredor },
        { x: xEntrada, y: yCorredor },
        { x: xEntrada, y: pFim.y },
        pFim,
      ]
    }
  } else {
    // ENTRE RAIAS DIFERENTES (TAREFA -> TAREFA) AVANÇANDO PARA A DIREITA
    const pInicio: Ponto = { x: origem.x + origem.largura, y: centroY(origem) }
    const pFim: Ponto = { x: destino.x, y: centroY(destino) }
    const xCanalPadrao = pInicio.x + 32 + offsetCanal
    const xCanal = Math.min(Math.max(pInicio.x + 18, xCanalPadrao), pFim.x - 18)

    const rotaCotovelo: Ponto[] = [
      pInicio,
      { x: xCanal, y: pInicio.y },
      { x: xCanal, y: pFim.y },
      pFim,
    ]

    const cruzaObstaculo = todosNos.some(
      (n) =>
        n.id !== origem.id &&
        n.id !== destino.id &&
        (segmentoCruza(rotaCotovelo[1], rotaCotovelo[2], n) ||
          segmentoCruza(rotaCotovelo[2], rotaCotovelo[3], n)),
    )

    if (!cruzaObstaculo) {
      pontos = rotaCotovelo
    } else {
      // Usa o canal imediatamente antes da coluna de destino
      const xAntesDestino = pFim.x - 26 + offsetCanal
      pontos = [
        pInicio,
        { x: xAntesDestino, y: pInicio.y },
        { x: xAntesDestino, y: pFim.y },
        pFim,
      ]
    }
  }

  const pontosLimpos = simplificarPontos(pontos)

  for (const ponto of pontosLimpos) {
    const waypoint = criarElemento(doc, NS.di, 'di:waypoint')
    waypoint.setAttribute('x', String(ponto.x))
    waypoint.setAttribute('y', String(ponto.y))
    const referencia = Array.from(edge.children ?? []).find(
      (filho) => nomeLocal(filho) !== 'waypoint',
    )
    edge.insertBefore(waypoint, referencia ?? null)
  }

  // Posiciona o rótulo da condição (ex.: "Sim", "Não") próximo à saída do gateway,
  // fora do traço da linha e longe das divisórias das raias.
  let rotulo = primeiroElemento(edge, 'BPMNLabel')
  if (conexao.nome.trim()) {
    if (!rotulo) {
      rotulo = criarElemento(doc, NS.bpmndi, 'bpmndi:BPMNLabel')
      edge.appendChild(rotulo)
    }
    const p0 = pontosLimpos[0]
    const p1 = pontosLimpos[1] ?? p0
    const vertical = Math.abs(p1.y - p0.y) > Math.abs(p1.x - p0.x)
    const larguraLabel = Math.min(130, Math.max(44, conexao.nome.trim().length * 6.5))
    const alturaLabel = 24
    const labelX = vertical ? p0.x + 8 : p0.x + 12
    const labelY = vertical
      ? p1.y < p0.y
        ? p0.y - 30
        : p0.y + 8
      : p0.y - alturaLabel - 4
    gravarBounds(doc, rotulo, labelX, labelY, larguraLabel, alturaLabel)
  }
}

/**
 * Reorganiza o diagrama: fluxo principal estritamente da esquerda para a direita,
 * uma faixa por lane, colunas por profundidade DAG (sem inversão por ciclos)
 * e conexões ortogonais sem tocar nas linhas divisórias das raias.
 */
export function organizarDiagrama(xml: string): string {
  if (typeof DOMParser === 'undefined') return xml

  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'application/xml')
  if (elementos(doc, 'parsererror').length > 0) return xml

  const plano = primeiroElemento(doc, 'BPMNPlane')
  if (!plano) return xml

  const vinculosLane = mapaFlowNodesPorLane(doc)
  const shapesPorId = new Map<string, Element>()
  for (const shape of elementos(doc, 'BPMNShape')) {
    const id = shape.getAttribute('bpmnElement')
    if (id) shapesPorId.set(id, shape)
  }

  const nos: NoDiagrama[] = []
  let indice = 0
  for (const elemento of elementos(doc, '*')) {
    const tipo = nomeLocal(elemento)
    if (!TIPOS_NO.has(tipo)) continue
    const id = elemento.getAttribute('id') ?? ''
    const nome = elemento.getAttribute('name') ?? ''
    const shape = shapesPorId.get(id)
    const bounds = lerBounds(shape)
    const padrao = dimensoesPadrao(tipo)
    nos.push({
      id,
      nome,
      tipo,
      largura: TIPOS_GATEWAY.has(tipo) || tipo.endsWith('Event') ? padrao.largura : Math.max(bounds?.largura ?? 0, padrao.largura),
      altura: TIPOS_GATEWAY.has(tipo) || tipo.endsWith('Event') ? padrao.altura : Math.max(bounds?.altura ?? 0, padrao.altura),
      x: bounds?.x ?? 0,
      y: bounds?.y ?? 0,
      laneId: vinculosLane.get(id) ?? null,
      indiceOriginal: indice++,
      nivel: 0,
    })
  }

  if (nos.length === 0) return xml

  const conexoes: Conexao[] = elementos(doc, 'sequenceFlow').map((fluxo) => ({
    id: fluxo.getAttribute('id') ?? '',
    origem: fluxo.getAttribute('sourceRef') ?? '',
    destino: fluxo.getAttribute('targetRef') ?? '',
    nome: fluxo.getAttribute('name') ?? '',
  }))

  const backEdges = detectarBackEdges(nos, conexoes)
  calcularNiveis(nos, conexoes, backEdges)

  // Agrupa por lane (mantendo a ordem de todas as lanes declaradas no XML)
  const ordemLanes = ordenarLanes(doc).map((lane) => lane.getAttribute('id') ?? '')
  const grupos = new Map<string, NoDiagrama[]>()
  for (const laneId of ordemLanes) {
    if (laneId) grupos.set(laneId, [])
  }
  for (const no of nos) {
    const chave = no.laneId ?? '__sem_lane__'
    if (!grupos.has(chave)) grupos.set(chave, [])
    grupos.get(chave)?.push(no)
  }

  const chaves = [...grupos.keys()].sort((a, b) => {
    if (a === b) return 0
    if (a === '__sem_lane__') return 1
    if (b === '__sem_lane__') return -1
    return ordemLanes.indexOf(a) - ordemLanes.indexOf(b)
  })

  const niveis = [...new Set(nos.map((no) => no.nivel))].sort((a, b) => a - b)
  const larguraPorNivel = new Map<number, number>()
  for (const nivel of niveis) {
    const larguras = nos.filter((no) => no.nivel === nivel).map((no) => no.largura)
    larguraPorNivel.set(nivel, Math.max(...larguras, TAMANHO_PADRAO.atividade.largura))
  }

  const poolX = METRICA.margemExterna
  const laneX = poolX + METRICA.larguraHeaderPool
  const xInicial = laneX + METRICA.insetConteudo

  const xCentroPorNivel = new Map<number, number>()
  let cursorX = xInicial
  for (const nivel of niveis) {
    const largNivel = larguraPorNivel.get(nivel) ?? TAMANHO_PADRAO.atividade.largura
    xCentroPorNivel.set(nivel, cursorX + Math.round(largNivel / 2))
    cursorX += largNivel + METRICA.espacoHorizontal
  }

  const larguraFinalConteudo = Math.max(
    860,
    cursorX - METRICA.espacoHorizontal + METRICA.margemDireitaPool - laneX,
  )
  const larguraFinalPool = larguraFinalConteudo + METRICA.larguraHeaderPool

  const faixas = new Map<string, { y: number; altura: number }>()
  let cursorY = METRICA.margemExterna

  for (const chave of chaves) {
    const grupo = grupos.get(chave) ?? []
    const alturaUtil =
      grupo.length > 0
        ? Math.max(...grupo.map((no) => no.altura))
        : TAMANHO_PADRAO.atividade.altura
    // Garante no mínimo 180px de altura por raia para que haja folga limpa acima e abaixo das caixas
    const alturaFaixa = Math.max(180, alturaUtil + METRICA.paddingLane)
    faixas.set(chave, { y: cursorY, altura: alturaFaixa })
    cursorY += alturaFaixa
  }

  for (const chave of chaves) {
    const grupo = grupos.get(chave) ?? []
    const faixa = faixas.get(chave)
    if (!faixa) continue
    const centroFaixaY = faixa.y + Math.round(faixa.altura / 2)

    for (const no of grupo) {
      const centroColX = xCentroPorNivel.get(no.nivel) ?? xInicial
      no.x = Math.round(centroColX - no.largura / 2)
      no.y = Math.round(centroFaixaY - no.altura / 2)
    }
  }

  // Aplica posições nas formas e posiciona rótulos externos de Eventos/Gateways abaixo da forma
  for (const no of nos) {
    const shape = shapesPorId.get(no.id)
    if (!shape) continue
    gravarBounds(doc, shape, no.x, no.y, no.largura, no.altura)

    // Se houver BPMNLabel interno no shape de Gateway/Evento, posiciona logo abaixo sem cruzar a linha da raia
    const labelInterno = primeiroElemento(shape, 'BPMNLabel')
    if (labelInterno && (TIPOS_GATEWAY.has(no.tipo) || no.tipo.endsWith('Event'))) {
      gravarBounds(doc, labelInterno, no.x - 28, no.y + no.altura + 4, no.largura + 56, 28)
    }
  }

  // Waypoints das conexões
  const porId = new Map(nos.map((no) => [no.id, no]))
  const edgesPorId = new Map<string, Element>()
  for (const edge of elementos(doc, 'BPMNEdge')) {
    const id = edge.getAttribute('bpmnElement')
    if (id) edgesPorId.set(id, edge)
  }

  conexoes.forEach((conexao, idx) => {
    const origemNo = porId.get(conexao.origem)
    const destinoNo = porId.get(conexao.destino)
    if (!origemNo || !destinoNo) return

    let edge = edgesPorId.get(conexao.id)
    if (!edge) {
      edge = criarElemento(doc, NS.bpmndi, 'bpmndi:BPMNEdge')
      edge.setAttribute('id', `${conexao.id}_di`)
      edge.setAttribute('bpmnElement', conexao.id)
      plano.appendChild(edge)
      edgesPorId.set(conexao.id, edge)
    }
    criarWaypoints(
      doc,
      edge,
      conexao,
      origemNo,
      destinoNo,
      nos,
      faixas,
      backEdges.has(conexao.id),
      idx,
    )
  })

  // Lanes: começam exatamente em poolX + 30 e somam a altura exata da Pool
  for (const lane of ordenarLanes(doc)) {
    const laneId = lane.getAttribute('id') ?? ''
    const faixa = faixas.get(laneId)
    const shape = shapesPorId.get(laneId)
    if (!faixa || !shape) continue
    shape.setAttribute('isHorizontal', 'true')
    gravarBounds(doc, shape, laneX, faixa.y, larguraFinalConteudo, faixa.altura)
    const labelLane = primeiroElemento(shape, 'BPMNLabel')
    if (labelLane) labelLane.remove()
  }

  // Pool (participant): envolve exatamente todas as lanes de primeiraFaixa.y até a soma das alturas
  for (const participante of elementos(doc, 'participant')) {
    const id = participante.getAttribute('id') ?? ''
    const shape = shapesPorId.get(id)
    if (!shape) continue
    const listaFaixas = [...faixas.values()]
    const primeiro = listaFaixas[0]
    if (!primeiro) continue
    const alturaTotal = listaFaixas.reduce((total, faixa) => total + faixa.altura, 0)
    shape.setAttribute('isHorizontal', 'true')
    gravarBounds(doc, shape, poolX, primeiro.y, larguraFinalPool, alturaTotal)
    const labelPool = primeiroElemento(shape, 'BPMNLabel')
    if (labelPool) labelPool.remove()
  }

  const serializado = new XMLSerializer().serializeToString(doc)
  return serializado.startsWith('<?xml')
    ? serializado
    : `<?xml version="1.0" encoding="UTF-8"?>\n${serializado}`
}

/** Métricas de qualidade visual usadas na validação do layout. */
export function medirLayout(xml: string): MetricasLayout | null {
  if (typeof DOMParser === 'undefined') return null
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (elementos(doc, 'parsererror').length > 0) return null

  const containers = new Set(
    elementos(doc, '*')
      .filter((elemento) => TIPOS_CONTAINER.has(nomeLocal(elemento)))
      .map((elemento) => elemento.getAttribute('id') ?? ''),
  )

  const formas = elementos(doc, 'BPMNShape')
    .map((shape) => ({ id: shape.getAttribute('bpmnElement') ?? '', bounds: lerBounds(shape) }))
    .filter(
      (
        forma,
      ): forma is {
        id: string
        bounds: { x: number; y: number; largura: number; altura: number }
      } => forma.bounds !== null && !containers.has(forma.id) && !forma.id.endsWith('_label'),
    )

  let sobreposicoes = 0
  let distanciaMinima = Infinity
  for (let i = 0; i < formas.length; i += 1) {
    for (let j = i + 1; j < formas.length; j += 1) {
      const a = formas[i].bounds
      const b = formas[j].bounds
      const larguraComum = Math.min(a.x + a.largura, b.x + b.largura) - Math.max(a.x, b.x)
      const alturaComum = Math.min(a.y + a.altura, b.y + b.altura) - Math.max(a.y, b.y)
      if (larguraComum > 0 && alturaComum > 0) {
        sobreposicoes += 1
      } else {
        const dx = Math.max(0, Math.max(a.x - (b.x + b.largura), b.x - (a.x + a.largura)))
        const dy = Math.max(0, Math.max(a.y - (b.y + b.altura), b.y - (a.y + a.altura)))
        distanciaMinima = Math.min(distanciaMinima, Math.max(dx, dy))
      }
    }
  }

  const edges = elementos(doc, 'BPMNEdge').map((edge) =>
    elementos(edge, 'waypoint').map((ponto) => ({
      x: Number(ponto.getAttribute('x') ?? 0),
      y: Number(ponto.getAttribute('y') ?? 0),
    })),
  )

  const cruza = (
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number },
    p4: { x: number; y: number },
  ) => {
    const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x)
    if (Math.abs(d) < 1e-9) return false
    const ua = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d
    const ub = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d
    return ua > 0.001 && ua < 0.999 && ub > 0.001 && ub < 0.999
  }

  let cruzamentos = 0
  for (let i = 0; i < edges.length; i += 1) {
    for (let j = i + 1; j < edges.length; j += 1) {
      for (let k = 0; k < edges[i].length - 1; k += 1) {
        for (let l = 0; l < edges[j].length - 1; l += 1) {
          if (cruza(edges[i][k], edges[i][k + 1], edges[j][l], edges[j][l + 1])) cruzamentos += 1
        }
      }
    }
  }

  const todos = formas.map((forma) => forma.bounds)
  const largura =
    todos.length > 0
      ? Math.round(Math.max(...todos.map((b) => b.x + b.largura)) - Math.min(...todos.map((b) => b.x)))
      : 0
  const altura =
    todos.length > 0
      ? Math.round(Math.max(...todos.map((b) => b.y + b.altura)) - Math.min(...todos.map((b) => b.y)))
      : 0

  let conectoresSobreFormas = 0
  for (const aresta of edges) {
    let cruzaAlguma = false
    for (let k = 0; k < aresta.length - 1 && !cruzaAlguma; k += 1) {
      for (const caixa of todos) {
        if (segmentoCruza(aresta[k], aresta[k + 1], caixa)) {
          cruzaAlguma = true
          break
        }
      }
    }
    if (cruzaAlguma) conectoresSobreFormas += 1
  }

  return {
    nos: formas.length,
    conexoes: edges.length,
    sobreposicoes,
    cruzamentos,
    conectoresSobreFormas,
    distanciaMinima: Number.isFinite(distanciaMinima) ? Number(distanciaMinima.toFixed(1)) : null,
    largura,
    altura,
  }
}
