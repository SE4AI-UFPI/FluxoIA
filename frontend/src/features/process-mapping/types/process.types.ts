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
  | 'fees'
  | 'exceptions'
  | 'documents'
  | 'systems'
  | 'completion'

export interface ProcessFichaTecnica {
  legenda: string[]
  observacoes_prazo: string
  informacoes_gerais: string
  sistemas: string[]
  documentacao: string[]
  taxas: string[]
}

export interface ProcessInfo {
  name: string
  sector: string
  objective: string
  description: string
  legislation: string
}

export type EditLevelRequired =
  | 'nenhuma'
  | 'pequenos_ajustes'
  | 'ajustes_moderados'
  | 'reconstrucao'

export type IdentifiedProblemTag =
  | 'etapas_ausentes'
  | 'raias_incorretas'
  | 'decisoes_incorretas'
  | 'sequencia_incorreta'
  | 'aprovacoes_ausentes'

export interface ProcessFeedback {
  representsProcess: boolean | null
  accuracyScore: number // 1 a 5 (default 5)
  editLevel: EditLevelRequired // default 'nenhuma'
  interviewClarityScore: number // 1 a 5 (default 5)
  identifiedProblems: IdentifiedProblemTag[] // checkboxes opcionais
  generalNotes: string // observação opcional
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
  backendId?: string | null
  ownerId: string
  info: ProcessInfo
  answers: Record<InterviewAnswerKey, string>
  questionIndex: number
  step: ProcessStep
  status: ProcessStatus
  bpmnXml: string | null
  fichaTecnica?: ProcessFichaTecnica | null
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

export interface ApiProcesso {
  id: string
  codigo: string | null
  nome: string
  secretaria: string
  setor: string
  objetivo: string
  descricao: string
  legislacao: string
  etapa_atual: number
  status:
    | 'rascunho'
    | 'em_entrevista'
    | 'em_modelagem'
    | 'em_avaliacao'
    | 'aguardando_validacao'
    | 'ajustes_solicitados'
    | 'aprovado'
    | 'publicado'
  versao_atual: string
  bpmn_xml_atual: string | null
  criado_por: string
  criado_por_nome: string
  atualizado_em: string
  submetido_em: string | null
  entrevista?: {
    pergunta_atual_idx: number
    respostas: Record<string, string>
  }
  versoes_bpmn?: Array<{
    id: string
    numero_versao: string
    bpmn_xml: string
    estrutura_json?: {
      resumo_modelo?: string
      ficha_tecnica?: ProcessFichaTecnica
      raias?: Array<{ id: string; nome: string }>
      elementos?: Array<{ id: string; tipo: string; nome: string; raia_id: string; origem_entrevista?: string }>
      fluxos?: Array<{ id: string; origem: string; destino: string; condicao?: string }>
    }
    motivo_alteracao: string
    gerado_por_nome: string
    criado_em: string
  }>
}
