import type { EditLevelRequired, IdentifiedProblemTag } from '../types/process.types'

export const EDIT_LEVEL_OPTIONS: Array<{ value: EditLevelRequired; label: string }> = [
  { value: 'nenhuma', label: 'Pronto de primeira, sem ajustes' },
  { value: 'pequenos_ajustes', label: 'Pequenos ajustes de nomes ou textos' },
  { value: 'ajustes_moderados', label: 'Ajustes em etapas, raias ou decisões' },
  { value: 'reconstrucao', label: 'Precisou refazer grande parte do fluxo' },
]

export const PROBLEM_TAG_OPTIONS: Array<{ value: IdentifiedProblemTag; label: string }> = [
  { value: 'etapas_ausentes', label: 'Etapas ausentes' },
  { value: 'raias_incorretas', label: 'Raias / setores incorretos' },
  { value: 'decisoes_incorretas', label: 'Pontos de decisão / desvios' },
  { value: 'sequencia_incorreta', label: 'Ordem / sequência das atividades' },
  { value: 'aprovacoes_ausentes', label: 'Aprovações de chefia' },
]

