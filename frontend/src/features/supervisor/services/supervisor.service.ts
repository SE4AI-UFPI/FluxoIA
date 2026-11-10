import { apiClient } from '@/services/apiClient'
import type { ProcessoStatusApi, ProcessoSupervisao } from '../types/supervisor.types'

type RespostaLista = ProcessoSupervisao[] | { results: ProcessoSupervisao[] }

function normalizarLista(dados: RespostaLista): ProcessoSupervisao[] {
  if (Array.isArray(dados)) return dados
  if (dados && Array.isArray(dados.results)) return dados.results
  return []
}

export async function fetchProcessosSupervisao(
  status?: ProcessoStatusApi,
  busca?: string,
): Promise<ProcessoSupervisao[]> {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (busca) params.set('busca', busca)
  const query = params.toString()
  const dados = await apiClient.get<RespostaLista>(
    `/api/processos/${query ? `?${query}` : ''}`,
  )
  return normalizarLista(dados)
}

export async function fetchProcessoSupervisao(id: string): Promise<ProcessoSupervisao> {
  return apiClient.get<ProcessoSupervisao>(`/api/processos/${id}/`)
}

/** Processos que aguardam parecer do supervisor. */
export function fetchPendentes(): Promise<ProcessoSupervisao[]> {
  return fetchProcessosSupervisao('aguardando_validacao')
}

/** Processos aprovados/homologados e publicados. */
export async function fetchFinalizados(): Promise<ProcessoSupervisao[]> {
  const [aprovados, publicados] = await Promise.all([
    fetchProcessosSupervisao('aprovado'),
    fetchProcessosSupervisao('publicado'),
  ])
  return [...aprovados, ...publicados]
}

/** Processos devolvidos para correção (ajustes solicitados). */
export function fetchDevolvidos(): Promise<ProcessoSupervisao[]> {
  return fetchProcessosSupervisao('ajustes_solicitados')
}
