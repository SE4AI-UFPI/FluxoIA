import { apiClient } from '@/services/apiClient'
import type { ProcessoSupervisao } from '../types/supervisor.types'

/** Tamanho mínimo da justificativa ao devolver um processo à supervisão (igual ao backend). */
export const PARECER_MINIMO_DEVOLUCAO = 15

/** Aval final do coordenador: publica um processo já homologado pelo supervisor. */
export function publicarProcesso(processoId: string, parecer: string): Promise<ProcessoSupervisao> {
  return apiClient.post<ProcessoSupervisao>(`/api/processos/${processoId}/publicar/`, { parecer })
}

/** Coordenador recusa o aval final e devolve o processo para nova análise do supervisor. */
export function devolverParaSupervisao(
  processoId: string,
  parecer: string,
): Promise<ProcessoSupervisao> {
  return apiClient.post<ProcessoSupervisao>(`/api/processos/${processoId}/devolver-supervisao/`, {
    parecer,
  })
}

/** Última devolução feita pelo coordenador, se for o evento mais recente de governança. */
export function devolucaoPendenteDoCoordenador(processo: ProcessoSupervisao) {
  const ultima = [...(processo.revisoes_governanca ?? [])].sort(
    (a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime(),
  )[0]
  if (!ultima || ultima.etapa !== 'coordenacao' || ultima.decisao === 'aprovado') return null
  return ultima
}
