export type ProcessoStatus =
  | 'Rascunho'
  | 'Em Entrevista'
  | 'Em Modelagem'
  | 'Em Revisão'
  | 'Ajustes Solicitados'
  | 'Aguardando Aprovação'
  | 'Aprovado'
  | 'Publicado'

export interface ProcessoResumo {
  id: string
  codigo: string
  nome: string
  setor: string
  ultimaAtualizacao: string
  status: ProcessoStatus
}

export const PROCESSOS_DEMONSTRACAO: ProcessoResumo[] = [
  {
    id: 'aquisicao-ti',
    codigo: 'BPMN-TI-2024-089',
    nome: 'Aquisição de Bens e Serviços de TI',
    setor: 'Tecnologia',
    ultimaAtualizacao: 'Há 2 horas',
    status: 'Em Revisão',
  },
  {
    id: 'diarias-passagens',
    codigo: 'BPMN-FIN-2024-112',
    nome: 'Solicitação de Diárias e Passagens',
    setor: 'Financeiro',
    ultimaAtualizacao: 'Ontem, 16:40',
    status: 'Aguardando Aprovação',
  },
  {
    id: 'licenca-capacitacao',
    codigo: 'BPMN-RH-2024-041',
    nome: 'Concessão de Licença Capacitação',
    setor: 'RH',
    ultimaAtualizacao: '14/10/2024',
    status: 'Aprovado',
  },
  {
    id: 'contratacao-servicos',
    codigo: 'BPMN-ADM-2024-018',
    nome: 'Processo de Contratação de Serviços',
    setor: 'Administrativo',
    ultimaAtualizacao: '12/10/2024',
    status: 'Publicado',
  },
  {
    id: 'recurso-administrativo',
    codigo: 'BPMN-JUR-2024-077',
    nome: 'Análise de Recurso Administrativo',
    setor: 'Jurídico',
    ultimaAtualizacao: '10/10/2024',
    status: 'Em Entrevista',
  },
  {
    id: 'descarte-patrimonio',
    codigo: 'BPMN-ADM-2024-015',
    nome: 'Descarte de Bens Patrimoniais Inservíveis',
    setor: 'Administrativo',
    ultimaAtualizacao: '08/10/2024',
    status: 'Em Modelagem',
  },
]

export const STATUS_PROCESSO: ProcessoStatus[] = [
  'Rascunho',
  'Em Entrevista',
  'Em Modelagem',
  'Em Revisão',
  'Ajustes Solicitados',
  'Aguardando Aprovação',
  'Aprovado',
  'Publicado',
]

export const SETORES_PROCESSO = [
  'Financeiro',
  'RH',
  'Jurídico',
  'Tecnologia',
  'Administrativo',
]