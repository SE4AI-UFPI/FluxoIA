export type ProcessStep = 1 | 2 | 3 | 4

export type ProcessStatus =
  | 'Rascunho'
  | 'Em Entrevista'
  | 'Em Modelagem BPMN'
  | 'Em Avaliação'
  | 'Aguardando Validação do Gestor'
  | 'Ajustes Solicitados'
  | 'Aprovado'
  | 'Publicado'
  | 'Excluído'

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

/** Avaliação já persistida, retornada pelo serializer do processo. */
export interface ApiProcessFeedback {
  id: string
  versao_bpmn: string | null
  autor: string
  autor_nome: string
  representa_processo: boolean
  nota_precisao_geral: number
  nivel_edicao_necessario: EditLevelRequired
  clareza_entrevista: number
  problemas_identificados: IdentifiedProblemTag[]
  observacoes: string
  criado_em: string
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
  hasSavedFeedback: boolean
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
    | 'excluido'
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
  feedbacks_ia?: ApiProcessFeedback[]
  revisoes_governanca?: Array<{
    id: string
    revisor_nome: string
    decisao: 'aprovado' | 'ajustes_solicitados' | 'rejeitado'
    parecer: string
    criado_em: string
  }>
  exclusao?: {
    id: string
    processo_codigo: string | null
    usuario_nome: string
    usuario_email: string
    numero_versao: string
    motivo: string
    criado_em: string
  } | null
}
