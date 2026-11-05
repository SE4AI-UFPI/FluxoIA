import { apiClient } from '@/services/apiClient'
import type {
  ApiProcesso,
  ProcessFeedback,
  ProcessInfo,
  ProcessStatus,
  ProcessStep,
  ProcessWizardState,
} from '../types/process.types'
import { INITIAL_PROCESS_VERSION } from './versioning.service'

export type { ApiProcesso }

const DRAFT_KEY_PREFIX = 'fluxoia_process_draft_v1'
const COMPLETED_KEY_PREFIX = 'fluxoia_processes_v1'

function getStorageKey(prefix: string, userId: string): string {
  return `${prefix}:${userId}`
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
    case 'Aprovado':
      return 'aprovado'
    case 'Publicado':
      return 'publicado'
    default:
      return 'rascunho'
  }
}

export function mapApiStatusToWizardStatus(status: ApiProcesso['status']): ProcessStatus {
  switch (status) {
    case 'rascunho':
      return 'Rascunho'
    case 'em_entrevista':
    case 'ajustes_solicitados':
      return 'Em Entrevista'
    case 'em_modelagem':
      return 'Em Modelagem BPMN'
    case 'em_avaliacao':
      return 'Em Avaliação'
    case 'aguardando_validacao':
      return 'Aguardando Validação do Gestor'
    case 'aprovado':
      return 'Aprovado'
    case 'publicado':
      return 'Publicado'
    default:
      return 'Rascunho'
  }
}

export function createInitialProcess(ownerId: string, defaultSector: string): ProcessWizardState {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
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
    version: api.versao_atual || INITIAL_PROCESS_VERSION,
    history: (api.versoes_bpmn ?? []).map((versao) => ({
      id: versao.id,
      date: versao.criado_em,
      user: versao.gerado_por_nome || api.criado_por_nome || 'Sistema',
      version: versao.numero_versao,
      reason: versao.motivo_alteracao,
    })),
    code: api.codigo,
    sentAt: api.submetido_em,
    updatedAt: api.atualizado_em || base.updatedAt,
  }
}

export function loadProcessDraft(userId: string, defaultSector: string): ProcessWizardState {
  const initial = createInitialProcess(userId, defaultSector)
  try {
    const stored = sessionStorage.getItem(getStorageKey(DRAFT_KEY_PREFIX, userId))
    if (!stored) return initial
    const parsed = JSON.parse(stored) as ProcessWizardState & {
      info: ProcessInfo & { participants?: string[] }
      answers: Partial<ProcessWizardState['answers']>
      feedback?: Partial<ProcessFeedback>
    }
    if (parsed.ownerId !== userId || parsed.status === 'Aguardando Validação do Gestor') {
      return initial
    }
    const { participants: _legacyParticipants, ...info } = parsed.info
    return {
      ...initial,
      ...parsed,
      info: {
        ...initial.info,
        ...info,
        sector: info.sector || defaultSector,
      },
      answers: { ...initial.answers, ...parsed.answers },
      feedback: {
        ...initial.feedback,
        ...(parsed.feedback ?? {}),
        identifiedProblems: Array.isArray(parsed.feedback?.identifiedProblems)
          ? parsed.feedback.identifiedProblems
          : [],
      },
    }
  } catch {
    return initial
  }
}

export function saveProcessDraft(process: ProcessWizardState): ProcessWizardState {
  const updated = { ...process, updatedAt: new Date().toISOString() }
  sessionStorage.setItem(getStorageKey(DRAFT_KEY_PREFIX, process.ownerId), JSON.stringify(updated))
  return updated
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
