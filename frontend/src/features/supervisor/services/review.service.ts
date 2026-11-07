import { apiClient } from '@/services/apiClient'
import type {
  DecisaoRevisao,
  ParecerRevisaoPayload,
  ProcessoSupervisao,
} from '../types/supervisor.types'

/**
 * Registra o parecer técnico e aplica a decisão de governança.
 * Regras do backend: aprovado | ajustes_solicitados | rejeitado.
 */
export async function registrarParecer(
  processoId: string,
  payload: ParecerRevisaoPayload,
): Promise<ProcessoSupervisao> {
  return apiClient.post<ProcessoSupervisao>(`/api/processos/${processoId}/revisar/`, {
    decisao: payload.decisao,
    parecer: payload.parecer,
  })
}

export function aprovarProcesso(processoId: string, parecer: string) {
  return registrarParecer(processoId, { decisao: 'aprovado', parecer })
}

export function solicitarCorrecao(processoId: string, parecer: string) {
  return registrarParecer(processoId, { decisao: 'ajustes_solicitados', parecer })
}

export function devolverProcesso(processoId: string, parecer: string) {
  return registrarParecer(processoId, { decisao: 'rejeitado', parecer })
}

export const DECISAO_LABEL: Record<DecisaoRevisao, string> = {
  aprovado: 'Aprovado / homologado',
  ajustes_solicitados: 'Correção solicitada',
  rejeitado: 'Devolvido para refazer',
}
