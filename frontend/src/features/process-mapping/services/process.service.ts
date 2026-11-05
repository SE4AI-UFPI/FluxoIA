import type { ProcessInfo, ProcessWizardState } from '../types/process.types'
import { INITIAL_PROCESS_VERSION } from './versioning.service'

const DRAFT_KEY_PREFIX = 'fluxoia_process_draft_v1'
const COMPLETED_KEY_PREFIX = 'fluxoia_processes_v1'

function getStorageKey(prefix: string, userId: string): string {
  return `${prefix}:${userId}`
}

export function createInitialProcess(ownerId: string, defaultSector: string): ProcessWizardState {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
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
      missingSteps: '',
      missingApprovals: '',
      incorrectResponsibles: '',
      generalNotes: '',
    },
    code: null,
    sentAt: null,
    updatedAt: now,
  }
}

export function loadProcessDraft(userId: string, defaultSector: string): ProcessWizardState {
  try {
    const stored = sessionStorage.getItem(getStorageKey(DRAFT_KEY_PREFIX, userId))
    if (!stored) return createInitialProcess(userId, defaultSector)
    const parsed = JSON.parse(stored) as ProcessWizardState & {
      info: ProcessInfo & { participants?: string[] }
      answers: Partial<ProcessWizardState['answers']>
    }
    if (parsed.ownerId !== userId || parsed.status === 'Aguardando Validação do Gestor') {
      return createInitialProcess(userId, defaultSector)
    }
    const { participants: _legacyParticipants, ...info } = parsed.info
    return {
      ...createInitialProcess(userId, defaultSector),
      ...parsed,
      info: { ...createInitialProcess(userId, defaultSector).info, ...info },
      answers: { ...createInitialProcess(userId, defaultSector).answers, ...parsed.answers },
    }
  } catch {
    return createInitialProcess(userId, defaultSector)
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