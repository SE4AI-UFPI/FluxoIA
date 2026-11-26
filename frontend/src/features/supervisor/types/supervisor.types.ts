export type ProcessoStatusApi =
  | 'rascunho'
  | 'em_entrevista'
  | 'em_modelagem'
  | 'em_avaliacao'
  | 'aguardando_validacao'
  | 'ajustes_solicitados'
  | 'aprovado'
  | 'publicado'
  | 'excluido'

export type DecisaoRevisao = 'aprovado' | 'ajustes_solicitados' | 'rejeitado'

/** supervisao = homologação técnica; coordenacao = aval final que publica. */
export type EtapaGovernanca = 'supervisao' | 'coordenacao'

export interface RevisaoGovernanca {
  id: string
  versao_bpmn: string | null
  revisor_nome: string
  etapa: EtapaGovernanca
  decisao: DecisaoRevisao
  parecer: string
  criado_em: string
}

export interface VersaoBpmnResumo {
  id: string
  numero_versao: string
  origem: string
  motivo_alteracao: string
  gerado_por_nome: string
  criado_em: string
}

export interface ProcessoSupervisao {
  id: string
  codigo: string | null
  nome: string
  setor: string
  secretaria: string
  objetivo: string
  status: ProcessoStatusApi
  etapa_atual: number
  versao_atual: string
  submetido_em: string | null
  aprovado_em: string | null
  atualizado_em: string
  criado_em: string
  criado_por_nome: string
  aprovado_por_nome: string
  publicado_por_nome: string
  publicado_em: string | null
  bpmn_xml_atual: string | null
  revisoes_governanca: RevisaoGovernanca[]
  versoes_bpmn: VersaoBpmnResumo[]
}

export interface IndicadoresSupervisor {
  aguardandoParecer: number
  slaMedioDias: number | null
  homologadosPeriodo: number
  taxaDevolucao: number
  totalAnalisados: number
  publicados: number
  aprovadosSemPublicacao: number
  processosComAjuste: number
  slaForaDaMeta: number
  metaSlaDias: number
}

export interface ResumoSetor {
  setor: string
  pendentes: number
  homologados: number
  devolvidos: number
  slaMedioDias: number | null
}

export interface ItemTimeline {
  id: string
  tipo: 'envio' | 'correcao' | 'reenvio' | 'aprovacao' | 'publicacao' | 'devolucao_coordenacao'
  titulo: string
  descricao: string
  versao: string
  autor: string
  data: string
}

export interface ParecerRevisaoPayload {
  decisao: DecisaoRevisao
  parecer: string
}

export interface ChecklistItem {
  id: string
  grupo: 'BPMN' | 'LGPD'
  titulo: string
  descricao: string
}
