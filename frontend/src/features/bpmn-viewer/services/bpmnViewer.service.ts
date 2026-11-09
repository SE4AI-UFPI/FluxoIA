import { apiClient } from '@/services/apiClient'
import type {
  ProcessoBiblioteca,
  RevisaoBiblioteca,
  StatusBiblioteca,
  VersaoBiblioteca,
} from '../types/bpmnViewer.types'

interface ApiProcesso {
  id: string
  codigo: string | null
  nome: string
  setor: string
  secretaria?: string
  objetivo: string
  descricao?: string
  legislacao?: string
  status: string
  versao_atual: string
  criado_por_nome?: string
  aprovado_por_nome?: string
  criado_em: string
  atualizado_em: string
  submetido_em: string | null
  aprovado_em: string | null
  bpmn_xml_atual: string | null
  entrevista?: { respostas?: Record<string, string> }
  versoes_bpmn?: Array<{
    id: string
    numero_versao: string
    origem: string
    motivo_alteracao: string
    gerado_por_nome: string
    criado_em: string
    estrutura_json?: {
      ficha_tecnica?: {
        observacoes_prazo?: string
        informacoes_gerais?: string
      }
    }
  }>
  revisoes_governanca?: Array<{
    id: string
    revisor_nome: string
    decisao: 'aprovado' | 'ajustes_solicitados' | 'rejeitado'
    parecer: string
    criado_em: string
  }>
}

const STATUS_VISIVEIS: StatusBiblioteca[] = [
  'publicado',
  'aprovado',
  'aguardando_validacao',
  'ajustes_solicitados',
]

const REGRAS_CATEGORIA: Array<{ categoria: string; termos: RegExp }> = [
  { categoria: 'Protocolo', termos: /protocol|requeriment|atendimento ao cidad/i },
  { categoria: 'Licenciamento e Obras', termos: /licenciament|obra|reforma|constru/i },
  { categoria: 'Compras e Contratos', termos: /licita|compras|contrat|dispensa|aquisic/i },
  { categoria: 'Ouvidoria', termos: /ouvidoria|manifesta|den[úu]ncia|reclama/i },
  { categoria: 'Gestão de Pessoas', termos: /pessoal|servidor|rh|capacita|est[áa]gio/i },
  { categoria: 'Tributação e Fiscalização', termos: /tribut|fiscal|taxa|imposto|autua/i },
  { categoria: 'Saúde', termos: /sa[úu]de|sanit[áa]ri|vigil[âa]ncia/i },
  { categoria: 'Educação', termos: /educa|escola|ensino|matr[íi]cula/i },
]

/** Categoria derivada de termos do processo (o modelo não possui campo próprio). */
export function derivarCategoria(nome: string, setor: string, objetivo = ''): string {
  const alvo = `${nome} ${setor} ${objetivo}`.toLowerCase()
  const regra = REGRAS_CATEGORIA.find(({ termos }) => termos.test(alvo))
  return regra?.categoria ?? 'Processos Institucionais'
}

function dividirLista(valor: string | undefined): string[] {
  if (!valor) return []
  return valor
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function mapearVersoes(api: ApiProcesso): VersaoBiblioteca[] {
  return (api.versoes_bpmn ?? []).map((versao) => ({
    id: versao.id,
    numeroVersao: versao.numero_versao,
    origem: versao.origem,
    motivoAlteracao: versao.motivo_alteracao,
    autor: versao.gerado_por_nome || api.criado_por_nome || 'Sistema',
    criadoEm: versao.criado_em,
  }))
}

function mapearRevisoes(api: ApiProcesso): RevisaoBiblioteca[] {
  return (api.revisoes_governanca ?? []).map((revisao) => ({
    id: revisao.id,
    revisor: revisao.revisor_nome || 'Supervisão',
    decisao: revisao.decisao,
    parecer: revisao.parecer,
    criadoEm: revisao.criado_em,
  }))
}

export function mapearProcesso(api: ApiProcesso): ProcessoBiblioteca | null {
  if (!STATUS_VISIVEIS.includes(api.status as StatusBiblioteca)) return null

  const respostas = api.entrevista?.respostas ?? {}
  const versoes = api.versoes_bpmn ?? []
  const ultimaVersao = versoes[versoes.length - 1]
  const fichaPrazo = ultimaVersao?.estrutura_json?.ficha_tecnica?.observacoes_prazo?.trim()
  const entrevistaPrazo =
    respostas.exceptions?.toLowerCase().includes('prazo') ||
    respostas.rules?.toLowerCase().includes('prazo')
      ? respostas.exceptions || respostas.rules
      : respostas.rules || respostas.exceptions || ''
  const prazos = fichaPrazo || entrevistaPrazo || 'Conforme prazo regimental'

  return {
    id: api.id,
    codigo: api.codigo ?? 'Sem código',
    nome: api.nome,
    setor: api.setor || 'Não informado',
    secretaria: api.secretaria ?? '',
    objetivo: api.objetivo,
    descricao: api.descricao ?? '',
    legislacao: api.legislacao ?? '',
    categoria: derivarCategoria(api.nome, api.setor ?? '', api.objetivo),
    status: api.status as StatusBiblioteca,
    versaoAtual: api.versao_atual,
    autor: api.criado_por_nome || 'Não informado',
    criadoEm: api.criado_em,
    atualizadoEm: api.atualizado_em,
    submetidoEm: api.submetido_em,
    aprovadoEm: api.aprovado_em,
    supervisorAprovador: api.aprovado_por_nome || '',
    bpmnXml: api.bpmn_xml_atual,
    documentos: dividirLista(respostas.documents),
    sistemas: dividirLista(respostas.systems),
    prazos,
    versoes: mapearVersoes(api),
    revisoes: mapearRevisoes(api),
  }
}

/** Processos visíveis para o usuário (RBAC aplicado no backend). */
export async function fetchBiblioteca(): Promise<ProcessoBiblioteca[]> {
  const dados = await apiClient.get<ApiProcesso[] | { results: ApiProcesso[] }>('/api/processos/')
  const lista = Array.isArray(dados) ? dados : Array.isArray(dados?.results) ? dados.results : []
  return lista
    .map(mapearProcesso)
    .filter((processo): processo is ProcessoBiblioteca => processo !== null)
    .sort((a, b) => new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime())
}

/** Processos relacionados: mesmo setor ou mesma categoria. */
export function processosRelacionados(
  atual: ProcessoBiblioteca,
  todos: ProcessoBiblioteca[],
  limite = 4,
): ProcessoBiblioteca[] {
  return todos
    .filter((processo) => processo.id !== atual.id)
    .filter(
      (processo) =>
        processo.setor === atual.setor || processo.categoria === atual.categoria,
    )
    .slice(0, limite)
}
