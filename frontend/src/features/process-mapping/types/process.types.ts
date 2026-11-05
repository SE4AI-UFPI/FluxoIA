export type ProcessStep = 1 | 2 | 3 | 4

export type ProcessStatus =
  | 'Rascunho'
  | 'Em Entrevista'
  | 'Em Modelagem BPMN'
  | 'Em Avaliação'
  | 'Aguardando Validação do Gestor'
  | 'Aprovado'
  | 'Publicado'

export type InterviewAnswerKey =
  | 'trigger'
  | 'activities'
  | 'areasInvolved'
  | 'sequence'
  | 'responsibles'
  | 'approvals'
  | 'rules'
  | 'exceptions'
  | 'documents'
  | 'systems'
  | 'completion'

export interface ProcessInfo {
  name: string
  sector: string
  objective: string
  description: string
  legislation: string
}

export interface ProcessFeedback {
  representsProcess: boolean | null
  missingSteps: string
  missingApprovals: string
  incorrectResponsibles: string
  generalNotes: string
}

export interface ProcessHistoryEntry {
  id: string
  date: string
  user: string
  version: string
  reason: string
}

export interface ProcessWizardState {
  id: string
  ownerId: string
  info: ProcessInfo
  answers: Record<InterviewAnswerKey, string>
  questionIndex: number
  step: ProcessStep
  status: ProcessStatus
  bpmnXml: string | null
  version: string
  history: ProcessHistoryEntry[]
  feedback: ProcessFeedback
  code: string | null
  sentAt: string | null
  updatedAt: string
  submittedBy?: string
}

export interface ProcessAuditSummary {
  code: string
  version: string
  status: ProcessStatus
  sentAt: string
  ownerName: string
  name: string
  sector: string
}