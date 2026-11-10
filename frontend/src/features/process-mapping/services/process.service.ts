import { apiClient } from '@/services/apiClient'
import { generateUUID } from '@/lib/utils'
import type {
  ApiProcesso,
  ProcessFeedback,
  ProcessInfo,
  ProcessStatus,
  ProcessStep,
  ProcessWizardState,
} from '../types/process.types'
import { INITIAL_PROCESS_VERSION } from './versioning.service'
import { restoreSavedFeedback } from './process-feedback.service'

export type { ApiProcesso }

const DRAFT_KEY_PREFIX = 'fluxoia_process_draft_v1'
const DRAFT_INDEX_PREFIX = 'fluxoia_process_draft_index_v1'
const COMPLETED_KEY_PREFIX = 'fluxoia_processes_v1'

function getStorageKey(prefix: string, userId: string): string {
  return `${prefix}:${userId}`
}

function getDraftKey(userId: string, draftId: string): string {
  return `${DRAFT_KEY_PREFIX}:${userId}:${draftId}`
}

function readDraftIndex(userId: string): string[] {
  try {
    const parsed = JSON.parse(
      sessionStorage.getItem(getStorageKey(DRAFT_INDEX_PREFIX, userId)) ?? '[]',
    )
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : []
  } catch {
    return []
  }
}

function writeDraftIndex(userId: string, draftIds: string[]): void {
  sessionStorage.setItem(
    getStorageKey(DRAFT_INDEX_PREFIX, userId),
    JSON.stringify([...new Set(draftIds.filter(Boolean))]),
  )
}

export function mapWizardStatusToApiStatus(status: ProcessStatus): ApiProcesso['status'] {
  switch (status) {
    case 'Rascunho':
      return 'rascunho'
    case 'Em Entrevista':
      return 'em_entrevista'
    case 'Em Modelagem BPMN':
      return 'em_modelagem'
    case 'Em Avaliação':
      return 'em_avaliacao'
    case 'Aguardando Validação do Gestor':
      return 'aguardando_validacao'
    case 'Ajustes Solicitados':
      return 'ajustes_solicitados'
    case 'Aprovado':
      return 'aprovado'
    case 'Publicado':
      return 'publicado'
    case 'Excluído':
      return 'excluido'
    default:
      return 'rascunho'
  }
}

export function mapApiStatusToWizardStatus(status: ApiProcesso['status']): ProcessStatus {
  switch (status) {
    case 'rascunho':
      return 'Rascunho'
    case 'em_entrevista':
      return 'Em Entrevista'
    case 'em_modelagem':
      return 'Em Modelagem BPMN'
    case 'em_avaliacao':
      return 'Em Avaliação'
    case 'aguardando_validacao':
      return 'Aguardando Validação do Gestor'
    case 'ajustes_solicitados':
      return 'Ajustes Solicitados'
    case 'aprovado':
      return 'Aprovado'
    case 'publicado':
      return 'Publicado'
    case 'excluido':
      return 'Excluído'
    default:
      return 'Rascunho'
  }
}

export function createInitialProcess(ownerId: string, defaultSector: string): ProcessWizardState {
  const now = new Date().toISOString()
  return {
    id: generateUUID(),
    backendId: null,
    ownerId,
    info: {
      name: '',
      sector: defaultSector,
      objective: '',
      description: '',
      legislation: '',
    },
    answers: {
      trigger: '',
      activities: '',
      areasInvolved: '',
      sequence: '',
      responsibles: '',
      approvals: '',
      rules: '',
      fees: '',
      exceptions: '',
      documents: '',
      systems: '',
      completion: '',
    },
    questionIndex: 0,
    step: 1,
    status: 'Rascunho',
    bpmnXml: null,
    version: INITIAL_PROCESS_VERSION,
    history: [],
    feedback: {
      representsProcess: null,
      accuracyScore: 5,
      editLevel: 'nenhuma',
      interviewClarityScore: 5,
      identifiedProblems: [],
      generalNotes: '',
    },
    hasSavedFeedback: false,
    code: null,
    sentAt: null,
    updatedAt: now,
  }
}

export function mapApiProcessoToWizardState(
  api: ApiProcesso,
  fallbackUserId: string,
  defaultSector: string,
): ProcessWizardState {
  const base = createInitialProcess(api.criado_por || fallbackUserId, defaultSector)
  const step = Math.min(4, Math.max(1, api.etapa_atual || 1)) as ProcessStep
  const versoes = api.versoes_bpmn ?? []
  const latestVersao = versoes[versoes.length - 1]
  const fichaTecnica = latestVersao?.estrutura_json?.ficha_tecnica ?? null
  const savedFeedback = restoreSavedFeedback(api.feedbacks_ia)

  return {
    ...base,
    id: api.id,
    backendId: api.id,
    ownerId: api.criado_por || fallbackUserId,
    info: {
      name: api.nome || '',
      sector: api.setor || defaultSector,
      objective: api.objetivo || '',
      description: api.descricao || '',
      legislation: api.legislacao || '',
    },
    answers: {
      ...base.answers,
      ...(api.entrevista?.respostas ?? {}),
    },
    questionIndex: api.entrevista?.pergunta_atual_idx ?? 0,
    step,
    status: mapApiStatusToWizardStatus(api.status),
    bpmnXml: api.bpmn_xml_atual ?? null,
    fichaTecnica,
    feedback: savedFeedback ?? base.feedback,
    hasSavedFeedback: savedFeedback !== null,
    version: api.versao_atual || INITIAL_PROCESS_VERSION,
    history: [
      ...(api.versoes_bpmn ?? []).map((versao) => ({
        id: versao.id,
        date: versao.criado_em,
        user: versao.gerado_por_nome || api.criado_por_nome || 'Sistema',
        version: versao.numero_versao,
        reason: versao.motivo_alteracao,
      })),
      ...(api.revisoes_governanca ?? []).map((revisao) => ({
        id: revisao.id,
        date: revisao.criado_em,
        user: revisao.revisor_nome || 'Supervisão',
        version: api.versao_atual || INITIAL_PROCESS_VERSION,
        reason:
          revisao.decisao === 'aprovado'
            ? `Homologado pela supervisão: ${revisao.parecer}`
            : revisao.decisao === 'ajustes_solicitados'
              ? `Correção solicitada: ${revisao.parecer}`
              : `Devolvido para refazer: ${revisao.parecer}`,
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    code: api.codigo,
    sentAt: api.submetido_em,
    updatedAt: api.atualizado_em || base.updatedAt,
  }
}

export function loadProcessDraft(
  userId: string,
  defaultSector: string,
  draftId?: string,
): ProcessWizardState {
  const initial = createInitialProcess(userId, defaultSector)
  if (draftId) {
    return readStoredDraft(draftId, userId, defaultSector) ?? initial
  }
  return listProcessDrafts(userId, defaultSector)[0] ?? initial
}

/**
 * Lista todos os rascunhos do usuário, do mais recente para o mais antigo.
 * Cada processo possui seu próprio rascunho — um usuário pode manter vários em andamento.
 */
export function listProcessDrafts(userId: string, defaultSector: string): ProcessWizardState[] {
  const drafts: ProcessWizardState[] = []

  for (const draftId of readDraftIndex(userId)) {
    const draft = readStoredDraft(draftId, userId, defaultSector)
    if (draft) drafts.push(draft)
  }

  // Migração do formato antigo (um único rascunho por usuário).
  const legacyKey = getStorageKey(DRAFT_KEY_PREFIX, userId)
  const legacyRaw = sessionStorage.getItem(legacyKey)
  if (legacyRaw) {
    const legacy = normalizeStoredDraft(legacyRaw, userId, defaultSector)
    if (legacy && !drafts.some((draft) => draft.id === legacy.id)) {
      drafts.push(legacy)
      saveProcessDraft(legacy)
    }
    sessionStorage.removeItem(legacyKey)
  }

  return drafts.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
}

function readStoredDraft(
  draftId: string,
  userId: string,
  defaultSector: string,
): ProcessWizardState | null {
  return normalizeStoredDraft(
    sessionStorage.getItem(getDraftKey(userId, draftId)),
    userId,
    defaultSector,
  )
}

function normalizeStoredDraft(
  raw: string | null,
  userId: string,
  defaultSector: string,
): ProcessWizardState | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as ProcessWizardState & {
      info?: ProcessInfo & { participants?: string[] }
      answers?: Partial<ProcessWizardState['answers']>
      feedback?: Partial<ProcessFeedback>
    }
    if (!parsed?.id || parsed.ownerId !== userId) return null
    if (parsed.status === 'Aguardando Validação do Gestor') return null

    const initial = createInitialProcess(userId, defaultSector)
    const { participants: _legacyParticipants, ...info } = parsed.info ?? {}
    return {
      ...initial,
      ...parsed,
      info: {
        ...initial.info,
        ...info,
        sector: info.sector || defaultSector,
      },
      answers: { ...initial.answers, ...(parsed.answers ?? {}) },
      feedback: {
        ...initial.feedback,
        ...(parsed.feedback ?? {}),
        identifiedProblems: Array.isArray(parsed.feedback?.identifiedProblems)
          ? parsed.feedback.identifiedProblems
          : [],
      },
    }
  } catch {
    return null
  }
}

export function saveProcessDraft(process: ProcessWizardState): ProcessWizardState {
  const updated = { ...process, updatedAt: new Date().toISOString() }
  sessionStorage.setItem(getDraftKey(process.ownerId, process.id), JSON.stringify(updated))
  writeDraftIndex(process.ownerId, [...readDraftIndex(process.ownerId), process.id])
  return updated
}

const DELETABLE_PROCESS_STATUSES: ProcessStatus[] = [
  'Rascunho',
  'Em Entrevista',
  'Em Modelagem BPMN',
  'Em Avaliação',
  'Ajustes Solicitados',
]

export function canDeleteProcess(status: ProcessStatus): boolean {
  return DELETABLE_PROCESS_STATUSES.includes(status)
}

export function discardProcessDraft(userId: string, draftId?: string): void {
  if (!draftId) {
    for (const draft of listProcessDrafts(userId, '')) {
      sessionStorage.removeItem(getDraftKey(userId, draft.id))
    }
    sessionStorage.removeItem(getStorageKey(DRAFT_KEY_PREFIX, userId))
    sessionStorage.removeItem(getStorageKey(DRAFT_INDEX_PREFIX, userId))
    return
  }

  // Um processo pode ter sido carregado da API (id do backend) e ainda manter rascunho local.
  const relacionados = listProcessDrafts(userId, '').filter(
    (draft) => draft.id === draftId || draft.backendId === draftId,
  )
  const idsParaRemover = new Set([draftId, ...relacionados.map((draft) => draft.id)])

  for (const id of idsParaRemover) {
    sessionStorage.removeItem(getDraftKey(userId, id))
  }
  writeDraftIndex(userId, readDraftIndex(userId).filter((id) => !idsParaRemover.has(id)))
}

/** Reaproveita o rascunho local existente para o mesmo processo do backend, evitando duplicatas. */
export function reuseLocalDraftId(
  userId: string,
  defaultSector: string,
  backendId: string,
): string | null {
  return (
    listProcessDrafts(userId, defaultSector).find((draft) => draft.backendId === backendId)?.id ??
    null
  )
}

export async function deleteProcessFromApi(backendId: string, motivo = ''): Promise<void> {
  await apiClient.delete(`/api/processos/${backendId}/`, { motivo })
}

function createProcessCode(sector: string): string {
  const key = 'fluxoia_process_sequence_v1'
  const nextNumber = Number(sessionStorage.getItem(key) ?? '0') + 1
  sessionStorage.setItem(key, String(nextNumber))
  const sectorCode = sector
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .slice(0, 3)
    .toUpperCase() || 'GER'
  return `BPMN-${sectorCode}-${new Date().getFullYear()}-${String(nextNumber).padStart(5, '0')}`
}

export function submitProcessForValidation(
  process: ProcessWizardState,
  ownerName: string,
): ProcessWizardState {
  const sentAt = new Date().toISOString()
  const code = process.code ?? createProcessCode(process.info.sector)
  const completed: ProcessWizardState = {
    ...process,
    code,
    status: 'Aguardando Validação do Gestor',
    sentAt,
    updatedAt: sentAt,
  }

  const completedKey = getStorageKey(COMPLETED_KEY_PREFIX, process.ownerId)
  const completedProcesses = JSON.parse(sessionStorage.getItem(completedKey) ?? '[]') as ProcessWizardState[]
  completedProcesses.unshift({ ...completed, submittedBy: ownerName })
  sessionStorage.setItem(completedKey, JSON.stringify(completedProcesses))
  sessionStorage.removeItem(getStorageKey(DRAFT_KEY_PREFIX, process.ownerId))
  return completed
}

export function listSubmittedProcesses(userId: string): ProcessWizardState[] {
  try {
    return JSON.parse(sessionStorage.getItem(getStorageKey(COMPLETED_KEY_PREFIX, userId)) ?? '[]') as ProcessWizardState[]
  } catch {
    return []
  }
}

export function hasRequiredProcessInfo(info: ProcessInfo): boolean {
  return Boolean(info.name.trim() && info.sector.trim() && info.objective.trim())
}

export async function fetchProcessosFromApi(): Promise<ApiProcesso[]> {
  const data = await apiClient.get<ApiProcesso[] | { results: ApiProcesso[] }>('/api/processos/')
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && Array.isArray(data.results)) return data.results
  return []
}

export async function fetchProcessoByIdFromApi(id: string): Promise<ApiProcesso> {
  return apiClient.get<ApiProcesso>(`/api/processos/${id}/`)
}

export async function syncProcessWithApi(
  process: ProcessWizardState,
  secretaria = '',
): Promise<ApiProcesso | null> {
  if (!hasRequiredProcessInfo(process.info)) return null

  const payload = {
    nome: process.info.name.trim(),
    secretaria,
    setor: process.info.sector.trim(),
    objetivo: process.info.objective.trim(),
    descricao: process.info.description.trim(),
    legislacao: process.info.legislation.trim(),
    etapa_atual: process.step,
    status: mapWizardStatusToApiStatus(process.status),
    entrevista: {
      pergunta_atual_idx: process.questionIndex,
      respostas: process.answers,
    },
  }

  if (process.backendId) {
    return apiClient.patch<ApiProcesso>(`/api/processos/${process.backendId}/`, payload)
  }

  return apiClient.post<ApiProcesso>('/api/processos/', payload)
}

export async function saveBpmnVersionToApi(
  backendId: string,
  payload: {
    numero_versao: string
    bpmn_xml: string
    origem?: string
    motivo_alteracao: string
  },
): Promise<unknown> {
  return apiClient.post(`/api/processos/${backendId}/versoes-bpmn/`, {
    origem: 'ia',
    ...payload,
  })
}

/**
 * Persiste apenas ajustes visuais (layout/coordenadas) do BPMN.
 * Não gera nova versão funcional: o backend mantém o número de versão vigente.
 */
export async function saveBpmnLayoutToApi(
  backendId: string,
  bpmnXml: string,
  motivoAlteracao = 'Ajuste visual de layout (sem alteração funcional)',
): Promise<ApiProcesso> {
  return apiClient.patch<ApiProcesso>(`/api/processos/${backendId}/layout-bpmn/`, {
    bpmn_xml: bpmnXml,
    motivo_alteracao: motivoAlteracao,
  })
}

export async function generateBpmnWithAiFromApi(
  backendId: string,
  respostas: Record<string, string>,
): Promise<ApiProcesso> {
  return apiClient.post<ApiProcesso>(`/api/processos/${backendId}/gerar-bpmn-ia/`, {
    respostas,
  })
}

export async function submitProcessToApi(
  backendId: string,
  feedback: ProcessFeedback,
): Promise<ApiProcesso> {
  return apiClient.post<ApiProcesso>(`/api/processos/${backendId}/submeter/`, {
    representa_processo: feedback.representsProcess ?? true,
    nota_precisao_geral: feedback.accuracyScore,
    nivel_edicao_necessario: feedback.editLevel,
    clareza_entrevista: feedback.interviewClarityScore,
    problemas_identificados: feedback.identifiedProblems,
    observacoes: feedback.generalNotes,
  })
}
