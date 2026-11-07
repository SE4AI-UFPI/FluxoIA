import type { ProcessStatus } from '../types/process.types'
import { organizarDiagrama } from './bpmn-auto-layout.service'

/**
 * Estados em que o autor ainda pode ajustar o diagrama (Fase 10).
 * Após o envio para validação o layout fica congelado.
 */
export const STATUS_PERMITIDOS_EDICAO_VISUAL: ProcessStatus[] = [
  'Rascunho',
  'Em Entrevista',
  'Em Modelagem BPMN',
  'Em Avaliação',
  'Ajustes Solicitados',
]

export function canEditBpmnLayout(status: ProcessStatus): boolean {
  return STATUS_PERMITIDOS_EDICAO_VISUAL.includes(status)
}

export const MOTIVO_BLOQUEIO_EDICAO =
  'O layout do diagrama não pode ser alterado após o envio para validação.'

export const MOTIVO_BLOQUEIO_MOBILE =
  'A edição visual de diagramas BPMN está disponível apenas para telas maiores.'

/**
 * Comandos que alteram a **lógica** do processo (Fase 6) e por isso são bloqueados
 * no modo edição. Tudo o que é apenas posicionamento (ex.: `elements.move`) passa.
 */
const COMANDOS_FUNCIONAIS_BLOQUEADOS = new Set([
  'elements.delete',
  'elements.create',
  'elements.paste',
  'elements.copy',
  'elements.cut',
  'elements.replace',
  'shape.create',
  'shape.append',
  'shape.replace',
  'shape.toggleCollapse',
  'connection.create',
  'connection.reconnect',
  'connection.start',
  'connection.updateWaypoints',
  'bendpoint.move',
  'element.updateProperties',
  'element.updateId',
  'element.updateLabel',
  'element.updateSemanticParent',
  'label.create',
  'label.update',
])

export function comandoFuncionalBloqueado(comando: string): boolean {
  return COMANDOS_FUNCIONAIS_BLOQUEADOS.has(comando)
}

/** Eventos que iniciam alterações estruturais no diagrama (bloqueados no modo edição). */
export const EVENTOS_ESTRUTURAIS_BLOQUEADOS = [
  'element.dblclick',
  'bendpoint.move.start',
  'connection.move.start',
  'connection.move',
] as const

/**
 * Recalcula o layout visual preservando a semântica BPMN.
 *
 * Usa o organizador próprio do FluxoIA: ele reescreve apenas o DI (posições das
 * formas, waypoints das conexões e bounds de pool/lane). A biblioteca
 * `bpmn-auto-layout` foi avaliada e descartada — no nosso XML ela removia todas
 * as `BPMNEdge` (diagrama sem conectores) e empilhava o fluxo na vertical.
 */
export async function gerarLayoutAutomatico(bpmnXml: string): Promise<string> {
  return organizarDiagrama(bpmnXml)
}
