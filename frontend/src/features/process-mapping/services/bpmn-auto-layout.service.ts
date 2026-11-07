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
  atividade: { largura: 110, altura: 80 },
}

const METRICA = {
  margemExterna: 40,
  espacoHorizontal: 70,
  espacoVertical: 40,
  espacoColuna: 24,
  paddingLane: 30,
  alturaTituloPool: 30,
  alturaCabecalhoLane: 30,
  folgaLabel: 8,
  /** Faixa à esquerda reservada ao nome da lane/pool. */
  insetConteudo: 40,
}

interface NoDiagrama {
  id: string
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
  if (tipo === 'intermediateCatchEvent' || tipo === 'intermediateThrowEvent' || tipo === 'boundaryEvent') {
    return TAMANHO_PADRAO.evento
  }
  return TAMANHO_PADRAO.atividade
}

function lerBounds(shape: Element | undefined): { x: number; y: number; largura: number; altura: number } | null {
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

function gravarBounds(doc: Document, shape: Element, x: number, y: number, largura: number, altura: number) {
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

/** Camadas (colunas) do fluxo: maior caminho a partir das origens, com fallback para ciclos. */
function calcularNiveis(nos: NoDiagrama[], conexoes: Conexao[]): void {
  const porId = new Map(nos.map((no) => [no.id, no]))
  const saidas = new Map<string, string[]>()
  const entradas = new Map<string, number>()

  for (const no of nos) {
    saidas.set(no.id, [])
    entradas.set(no.id, 0)
  }
  for (const conexao of conexoes) {
    if (!porId.has(conexao.origem) || !porId.has(conexao.destino)) continue
    saidas.get(conexao.origem)?.push(conexao.destino)
    entradas.set(conexao.destino, (entradas.get(conexao.destino) ?? 0) + 1)
  }

  for (const no of nos) no.nivel = 0

  const fila = nos.filter((no) => (entradas.get(no.id) ?? 0) === 0).map((no) => no.id)
  const visitados = new Set<string>()
  let iteracoes = 0
  const limite = nos.length * 4 + 10

  while (fila.length > 0 && iteracoes < limite) {
    iteracoes += 1
    const atual = fila.shift() as string
    visitados.add(atual)
    const nivelAtual = porId.get(atual)?.nivel ?? 0
    for (const destino of saidas.get(atual) ?? []) {
      const alvo = porId.get(destino)
      if (!alvo) continue
      if (alvo.nivel <= nivelAtual) {
        alvo.nivel = nivelAtual + 1
        if (!visitados.has(destino)) fila.push(destino)
      } else if (!visitados.has(destino)) {
        fila.push(destino)
      }
    }
  }

  // Nós em ciclos/fechados ficam após o maior nível alcançado dos seus predecessores.
  for (const no of nos) {
    if (visitados.has(no.id)) continue
    const predecessores = conexoes
      .filter((conexao) => conexao.destino === no.id)
      .map((conexao) => porId.get(conexao.origem)?.nivel ?? 0)
    no.nivel = predecessores.length > 0 ? Math.max(...predecessores) + 1 : 0
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

/**
 * Move o rótulo junto com a forma, mantendo a posição relativa original
 * (rótulo interno de tarefa continua interno; rótulo externo continua externo).
 */
function moverRotulo(
  doc: Document,
  shapesPorId: Map<string, Element>,
  id: string,
  anterior: Caixa | null,
  novo: { x: number; y: number },
) {
  if (!anterior) return
  const rotulo = shapesPorId.get(`${id}_label`)
  const caixa = lerBounds(rotulo)
  if (!rotulo || !caixa) return
  gravarBounds(
    doc,
    rotulo,
    caixa.x + (novo.x - anterior.x),
    caixa.y + (novo.y - anterior.y),
    caixa.largura,
    caixa.altura,
  )
}

interface Ponto {
  x: number
  y: number
}

interface Obstaculo extends Caixa {
  id: string
}

interface ContextoRoteamento {
  obstaculos: Obstaculo[]
  xs: number[]
  ys: number[]
}

/** Margem aplicada às formas para o roteador manter distância visual. */
const FOLGA_OBSTACULO = 10
const CUSTO_CURVA = 24

function unicos(valores: number[]): number[] {
  return [...new Set(valores.map((valor) => Math.round(valor)))].sort((a, b) => a - b)
}

/** Segmento horizontal/vertical cruzando o interior do retângulo? */
function segmentoCruza(p1: Ponto, p2: Ponto, caixa: Caixa): boolean {
  const minX = Math.min(p1.x, p2.x)
  const maxX = Math.max(p1.x, p2.x)
  const minY = Math.min(p1.y, p2.y)
  const maxY = Math.max(p1.y, p2.y)
  return (
    maxX > caixa.x &&
    minX < caixa.x + caixa.largura &&
    maxY > caixa.y &&
    minY < caixa.y + caixa.altura
  )
}

function rotaBloqueada(pontos: Ponto[], obstaculos: Obstaculo[]): boolean {
  for (let i = 0; i < pontos.length - 1; i += 1) {
    for (const obstaculo of obstaculos) {
      if (segmentoCruza(pontos[i], pontos[i + 1], obstaculo)) return true
    }
  }
  return false
}

function centroY(no: NoDiagrama): number {
  return no.y + no.altura / 2
}

/**
 * Grade de roteamento: corredores livres entre colunas (x) e entre linhas (y),
 * derivados das métricas do próprio layout.
 */
function construirContextoRoteamento(nos: NoDiagrama[]): ContextoRoteamento {
  const obstaculos = nos.map((no) => ({
    id: no.id,
    x: no.x - FOLGA_OBSTACULO,
    y: no.y - FOLGA_OBSTACULO,
    largura: no.largura + FOLGA_OBSTACULO * 2,
    altura: no.altura + FOLGA_OBSTACULO * 2,
  }))

  const xs: number[] = []
  const ys: number[] = []
  for (const no of nos) {
    xs.push(no.x - METRICA.espacoHorizontal / 2)
    xs.push(no.x + no.largura + METRICA.espacoHorizontal / 2)
    ys.push(centroY(no))
    ys.push(no.y - METRICA.espacoVertical / 2)
    ys.push(no.y + no.altura + METRICA.espacoVertical / 2)
  }

  return { obstaculos, xs: unicos(xs), ys: unicos(ys) }
}

/** Rota direta: linha reta ou cotovelo simples no meio do caminho. */
function rotaDireta(inicio: Ponto, fim: Ponto): Ponto[] {
  if (Math.abs(inicio.y - fim.y) < 1) return [inicio, fim]
  const xMeio = Math.round((inicio.x + fim.x) / 2)
  return [inicio, { x: xMeio, y: inicio.y }, { x: xMeio, y: fim.y }, fim]
}

/**
 * Menor caminho ortogonal que não atravessa nenhuma forma.
 * Retorna `null` quando não há caminho na grade.
 */
function rotearConexao(
  inicio: Ponto,
  fim: Ponto,
  obstaculos: Obstaculo[],
  contexto: ContextoRoteamento,
): Ponto[] | null {
  const xs = unicos([...contexto.xs, inicio.x, fim.x])
  const ys = unicos([...contexto.ys, inicio.y, fim.y])
  if (xs.length * ys.length > 6000) return null

  const posX = new Map(xs.map((x, i) => [x, i]))
  const posY = new Map(ys.map((y, j) => [y, j]))
  const iInicio = posX.get(Math.round(inicio.x))
  const jInicio = posY.get(Math.round(inicio.y))
  const iFim = posX.get(Math.round(fim.x))
  const jFim = posY.get(Math.round(fim.y))
  if (iInicio === undefined || jInicio === undefined || iFim === undefined || jFim === undefined) {
    return null
  }

  // Estados: (i, j, direção) — direção 0 = inicial, 1 = horizontal, 2 = vertical.
  const ny = ys.length
  const totalEstados = xs.length * ny * 3
  const distancias = new Float64Array(totalEstados).fill(Number.POSITIVE_INFINITY)
  const anteriores = new Int32Array(totalEstados).fill(-1)
  const estado = (i: number, j: number, dir: number) => (i * ny + j) * 3 + dir

  type No = { custo: number; id: number }
  const fila: No[] = []
  const empurrar = (item: No) => {
    fila.push(item)
    let posicao = fila.length - 1
    while (posicao > 0) {
      const pai = (posicao - 1) >> 1
      if (fila[pai].custo <= fila[posicao].custo) break
      ;[fila[pai], fila[posicao]] = [fila[posicao], fila[pai]]
      posicao = pai
    }
  }
  const retirar = (): No | undefined => {
    if (fila.length === 0) return undefined
    const topo = fila[0]
    const ultimo = fila.pop() as No
    if (fila.length > 0) {
      fila[0] = ultimo
      let posicao = 0
      for (;;) {
        const esquerda = posicao * 2 + 1
        const direita = esquerda + 1
        let menor = posicao
        if (esquerda < fila.length && fila[esquerda].custo < fila[menor].custo) menor = esquerda
        if (direita < fila.length && fila[direita].custo < fila[menor].custo) menor = direita
        if (menor === posicao) break
        ;[fila[menor], fila[posicao]] = [fila[posicao], fila[menor]]
        posicao = menor
      }
    }
    return topo
  }

  const inicial = estado(iInicio, jInicio, 0)
  distancias[inicial] = 0
  empurrar({ custo: 0, id: inicial })

  const alvo = estado(iFim, jFim, 0)
  const alvosValidos = new Set([alvo, alvo + 1, alvo + 2])
  let final: number | null = null

  while (fila.length > 0) {
    const atual = retirar() as No
    if (atual.custo > distancias[atual.id]) continue
    if (alvosValidos.has(atual.id)) {
      final = atual.id
      break
    }

    const dir = atual.id % 3
    const base = Math.floor(atual.id / 3)
    const i = Math.floor(base / ny)
    const j = base % ny
    const ponto: Ponto = { x: xs[i], y: ys[j] }

    const vizinhos: Array<{ i: number; j: number; dir: number; peso: number }> = []
    if (i + 1 < xs.length) {
      vizinhos.push({ i: i + 1, j, dir: 1, peso: xs[i + 1] - xs[i] + (dir === 2 ? CUSTO_CURVA : 0) })
    }
    if (i - 1 >= 0) {
      vizinhos.push({ i: i - 1, j, dir: 1, peso: xs[i] - xs[i - 1] + (dir === 2 ? CUSTO_CURVA : 0) })
    }
    if (j + 1 < ny) {
      vizinhos.push({ i, j: j + 1, dir: 2, peso: ys[j + 1] - ys[j] + (dir === 1 ? CUSTO_CURVA : 0) })
    }
    if (j - 1 >= 0) {
      vizinhos.push({ i, j: j - 1, dir: 2, peso: ys[j] - ys[j - 1] + (dir === 1 ? CUSTO_CURVA : 0) })
    }

    for (const vizinho of vizinhos) {
      const destinoPonto: Ponto = { x: xs[vizinho.i], y: ys[vizinho.j] }
      if (obstaculos.some((obstaculo) => segmentoCruza(ponto, destinoPonto, obstaculo))) continue

      const proximo = estado(vizinho.i, vizinho.j, vizinho.dir)
      const custo = atual.custo + vizinho.peso
      if (custo < distancias[proximo]) {
        distancias[proximo] = custo
        anteriores[proximo] = atual.id
        empurrar({ custo, id: proximo })
      }
    }
  }

  if (final === null) return null

  const caminho: Ponto[] = []
  let atual: number = final
  while (atual !== -1) {
    const base = Math.floor(atual / 3)
    const i = Math.floor(base / ny)
    const j = base % ny
    caminho.push({ x: xs[i], y: ys[j] })
    atual = anteriores[atual]
  }
  caminho.reverse()

  // Remove pontos colineares consecutivos.
  const simplificado: Ponto[] = []
  for (const ponto of caminho) {
    const ultimo = simplificado[simplificado.length - 1]
    const penultimo = simplificado[simplificado.length - 2]
    if (ultimo && ultimo.x === ponto.x && ultimo.y === ponto.y) continue
    if (ultimo && penultimo) {
      const mesmaLinha =
        (penultimo.x === ultimo.x && ultimo.x === ponto.x) ||
        (penultimo.y === ultimo.y && ultimo.y === ponto.y)
      if (mesmaLinha) {
        simplificado[simplificado.length - 1] = ponto
        continue
      }
    }
    simplificado.push(ponto)
  }

  return simplificado.length >= 2 ? simplificado : null
}

function criarWaypoints(
  doc: Document,
  edge: Element,
  origem: NoDiagrama,
  destino: NoDiagrama,
  contexto: ContextoRoteamento,
) {
  for (const antigo of elementos(edge, 'waypoint')) {
    antigo.remove()
  }

  const avanca = destino.x > origem.x
  const inicio: Ponto = { x: origem.x + origem.largura, y: centroY(origem) }
  const fim: Ponto = avanca
    ? { x: destino.x, y: centroY(destino) }
    : { x: destino.x + destino.largura, y: centroY(destino) }

  // A própria origem/destino só bloqueia o interior — a rota pode sair/entrar pelas bordas.
  const encolhido = FOLGA_OBSTACULO + 1
  const obstaculos = contexto.obstaculos.map((obstaculo) =>
    obstaculo.id === origem.id || obstaculo.id === destino.id
      ? {
          id: obstaculo.id,
          x: obstaculo.x + encolhido,
          y: obstaculo.y + encolhido,
          largura: obstaculo.largura - encolhido * 2,
          altura: obstaculo.altura - encolhido * 2,
        }
      : obstaculo,
  )

  let pontos = rotaDireta(inicio, fim)
  if (rotaBloqueada(pontos, obstaculos)) {
    pontos = rotearConexao(inicio, fim, obstaculos, contexto) ?? pontos
  }

  for (const ponto of pontos) {
    const waypoint = criarElemento(doc, NS.di, 'di:waypoint')
    waypoint.setAttribute('x', String(Math.round(ponto.x)))
    waypoint.setAttribute('y', String(Math.round(ponto.y)))
    // Waypoints precisam vir antes de `BPMNLabel` no DI da conexão.
    const referencia = Array.from(edge.children ?? []).find((filho) => nomeLocal(filho) !== 'waypoint')
    edge.insertBefore(waypoint, referencia ?? null)
  }

  // Rótulo da conexão: mantém sobre o trecho central do novo caminho.
  const rotulo = primeiroElemento(edge, 'BPMNLabel')
  const caixaRotulo = lerBounds(rotulo)
  if (rotulo && caixaRotulo) {
    const meio = pontos[Math.floor(pontos.length / 2)]
    gravarBounds(
      doc,
      rotulo,
      meio.x - caixaRotulo.largura / 2,
      meio.y - caixaRotulo.altura - 6,
      caixaRotulo.largura,
      caixaRotulo.altura,
    )
  }
}

/**
 * Reorganiza o diagrama: fluxo principal da esquerda para a direita, uma faixa
 * por lane, colunas por profundidade e conexões ortogonais.
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
    const shape = shapesPorId.get(id)
    const bounds = lerBounds(shape)
    if (!bounds) continue
    nos.push({
      id,
      tipo,
      largura: bounds.largura || dimensoesPadrao(tipo).largura,
      altura: bounds.altura || dimensoesPadrao(tipo).altura,
      x: bounds.x,
      y: bounds.y,
      laneId: vinculosLane.get(id) ?? null,
      indiceOriginal: indice++,
      nivel: 0,
    })
  }

  if (nos.length === 0) return xml

  const conexoes: Conexao[] = elementos(doc, 'sequenceFlow').map(
    (fluxo) => ({
      id: fluxo.getAttribute('id') ?? '',
      origem: fluxo.getAttribute('sourceRef') ?? '',
      destino: fluxo.getAttribute('targetRef') ?? '',
    }),
  )

  calcularNiveis(nos, conexoes)

  // Agrupa por lane (mantendo a ordem do XML) e ordena por nível dentro da faixa.
  const ordemLanes = ordenarLanes(doc).map((lane) => lane.getAttribute('id') ?? '')
  const grupos = new Map<string, NoDiagrama[]>()
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

  const xPorNivel = new Map<number, number>()
  const xInicial = METRICA.margemExterna + METRICA.insetConteudo
  let cursorX = xInicial
  for (const nivel of niveis) {
    xPorNivel.set(nivel, cursorX)
    cursorX += (larguraPorNivel.get(nivel) ?? 0) + METRICA.espacoHorizontal
  }
  const larguraConteudo =
    cursorX - METRICA.espacoHorizontal - xInicial + METRICA.insetConteudo

  const faixas = new Map<string, { y: number; altura: number }>()
  let cursorY = METRICA.margemExterna + METRICA.alturaTituloPool + METRICA.alturaCabecalhoLane

  for (const chave of chaves) {
    const grupo = grupos.get(chave) ?? []
    const ocupacao = new Map<number, number>()
    for (const no of grupo) {
      ocupacao.set(no.nivel, (ocupacao.get(no.nivel) ?? 0) + 1)
    }
    const maxPorNivel = Math.max(1, ...ocupacao.values())
    const alturaUtil = grupo.length > 0 ? Math.max(...grupo.map((no) => no.altura)) : TAMANHO_PADRAO.atividade.altura
    // Altura da faixa: todas as linhas empilhadas + respiro superior e inferior.
    const alturaFaixa = Math.max(
      alturaUtil * maxPorNivel + METRICA.espacoVertical * maxPorNivel,
      TAMANHO_PADRAO.atividade.altura + METRICA.paddingLane,
    )
    faixas.set(chave, { y: cursorY, altura: alturaFaixa })
    cursorY += alturaFaixa
  }

  for (const chave of chaves) {
    const grupo = (grupos.get(chave) ?? []).slice().sort((a, b) => a.nivel - b.nivel || a.indiceOriginal - b.indiceOriginal)
    const faixa = faixas.get(chave)
    if (!faixa) continue
    const contadorPorNivel = new Map<number, number>()
    for (const no of grupo) {
      const alturaTotalNivel = Math.max(...grupo.filter((item) => item.nivel === no.nivel).map((item) => item.altura))
      const ocorrencia = contadorPorNivel.get(no.nivel) ?? 0
      contadorPorNivel.set(no.nivel, ocorrencia + 1)
      no.x = xPorNivel.get(no.nivel) ?? METRICA.margemExterna
      no.y =
        faixa.y +
        METRICA.espacoVertical / 2 +
        ocorrencia * (alturaTotalNivel + METRICA.espacoVertical) +
        (alturaTotalNivel - no.altura) / 2
    }
  }

  // Aplica posições e desloca os rótulos junto com suas formas.
  for (const no of nos) {
    const shape = shapesPorId.get(no.id)
    if (!shape) continue
    const anterior = lerBounds(shape)
    gravarBounds(doc, shape, no.x, no.y, no.largura, no.altura)
    moverRotulo(doc, shapesPorId, no.id, anterior, { x: no.x, y: no.y })
  }

  // Waypoints das conexões.
  const porId = new Map(nos.map((no) => [no.id, no]))
  const contextoRoteamento = construirContextoRoteamento(nos)
  const edgesPorId = new Map<string, Element>()
  for (const edge of elementos(doc, 'BPMNEdge')) {
    const id = edge.getAttribute('bpmnElement')
    if (id) edgesPorId.set(id, edge)
  }

  for (const conexao of conexoes) {
    const origemNo = porId.get(conexao.origem)
    const destinoNo = porId.get(conexao.destino)
    if (!origemNo || !destinoNo) continue

    let edge = edgesPorId.get(conexao.id)
    if (!edge) {
      edge = criarElemento(doc, NS.bpmndi, 'bpmndi:BPMNEdge')
      edge.setAttribute('id', `${conexao.id}_di`)
      edge.setAttribute('bpmnElement', conexao.id)
      plano.appendChild(edge)
      edgesPorId.set(conexao.id, edge)
    }
    criarWaypoints(doc, edge, origemNo, destinoNo, contextoRoteamento)
  }

  // Pools e lanes: envolvem o conteúdo reorganizado.
  for (const lane of ordenarLanes(doc)) {
    const laneId = lane.getAttribute('id') ?? ''
    const faixa = faixas.get(laneId)
    const shape = shapesPorId.get(laneId)
    if (!faixa || !shape) continue
    const caixaLane = {
      x: METRICA.margemExterna,
      y: faixa.y,
      largura: larguraConteudo,
      altura: faixa.altura,
    }
    const anteriorLane = lerBounds(shape)
    gravarBounds(doc, shape, caixaLane.x, caixaLane.y, caixaLane.largura, caixaLane.altura)
    moverRotulo(doc, shapesPorId, laneId, anteriorLane, caixaLane)
  }

  for (const participante of elementos(doc, 'participant')) {
    const id = participante.getAttribute('id') ?? ''
    const shape = shapesPorId.get(id)
    if (!shape) continue
    const primeiro = faixas.values().next().value as { y: number; altura: number } | undefined
    if (!primeiro) continue
    const alturaTotal = [...faixas.values()].reduce((total, faixa) => total + faixa.altura, 0)
    const caixaPool = {
      x: METRICA.margemExterna - METRICA.espacoColuna,
      y: primeiro.y - METRICA.alturaCabecalhoLane,
      largura: larguraConteudo + METRICA.espacoColuna * 2,
      altura: alturaTotal + METRICA.alturaCabecalhoLane + METRICA.alturaTituloPool / 2,
    }
    const anteriorPool = lerBounds(shape)
    gravarBounds(doc, shape, caixaPool.x, caixaPool.y, caixaPool.largura, caixaPool.altura)
    moverRotulo(doc, shapesPorId, id, anteriorPool, caixaPool)
  }

  const serializado = new XMLSerializer().serializeToString(doc)
  return serializado.startsWith('<?xml') ? serializado : `<?xml version="1.0" encoding="UTF-8"?>\n${serializado}`
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
      (forma): forma is { id: string; bounds: { x: number; y: number; largura: number; altura: number } } =>
        forma.bounds !== null && !containers.has(forma.id) && !forma.id.endsWith('_label'),
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

  const cruza = (p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number }, p4: { x: number; y: number }) => {
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
  const largura = todos.length > 0 ? Math.round(Math.max(...todos.map((b) => b.x + b.largura)) - Math.min(...todos.map((b) => b.x))) : 0
  const altura = todos.length > 0 ? Math.round(Math.max(...todos.map((b) => b.y + b.altura)) - Math.min(...todos.map((b) => b.y))) : 0

  // Conectores que atravessam o interior de alguma forma.
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
