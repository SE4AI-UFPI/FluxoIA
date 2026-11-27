import type { FichaTecnicaPdf } from '@/features/process-mapping/services/pdf-details'

export type StatusBiblioteca =
  | 'aprovado'
  | 'publicado'
  | 'aguardando_validacao'
  | 'ajustes_solicitados'

export interface VersaoBiblioteca {
  id: string
  numeroVersao: string
  origem: string
  motivoAlteracao: string
  autor: string
  criadoEm: string
}

export interface RevisaoBiblioteca {
  id: string
  revisor: string
  etapa: 'supervisao' | 'coordenacao'
  decisao: 'aprovado' | 'ajustes_solicitados' | 'rejeitado'
  parecer: string
  criadoEm: string
}

export interface ProcessoBiblioteca {
  id: string
  codigo: string
  nome: string
  setor: string
  secretaria: string
  objetivo: string
  descricao: string
  legislacao: string
  categoria: string
  status: StatusBiblioteca
  versaoAtual: string
  autor: string
  criadoEm: string
  atualizadoEm: string
  submetidoEm: string | null
  aprovadoEm: string | null
  supervisorAprovador: string
  publicadoPor: string
  publicadoEm: string | null
  bpmnXml: string | null
  documentos: string[]
  sistemas: string[]
  prazos: string
  fichaTecnica: FichaTecnicaPdf
  versoes: VersaoBiblioteca[]
  revisoes: RevisaoBiblioteca[]
}

export interface FiltrosBiblioteca {
  busca: string
  setor: string
  status: string
  responsavel: string
  categoria: string
  periodo: string
  versao: string
  apenasFavoritos: boolean
}

export interface OpcoesFiltro {
  setores: string[]
  responsaveis: string[]
  categorias: string[]
  versoes: string[]
}

export const FILTROS_INICIAIS: FiltrosBiblioteca = {
  busca: '',
  setor: '',
  status: '',
  responsavel: '',
  categoria: '',
  periodo: '',
  versao: '',
  apenasFavoritos: false,
}

export const STATUS_BIBLIOTECA: Array<{
  valor: StatusBiblioteca
  rotulo: string
  variante: 'default' | 'secondary' | 'success' | 'warning' | 'outline'
}> = [
  { valor: 'publicado', rotulo: 'Publicado', variante: 'default' },
  { valor: 'aprovado', rotulo: 'Homologado · aguardando coordenador', variante: 'success' },
  { valor: 'aguardando_validacao', rotulo: 'Aguardando Validação', variante: 'warning' },
  { valor: 'ajustes_solicitados', rotulo: 'Correção Solicitada', variante: 'secondary' },
]
