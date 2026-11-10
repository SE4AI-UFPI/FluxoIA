import { apiClient } from '@/services/apiClient'
import type {
  IndicadoresSupervisor,
  ItemTimeline,
  ProcessoSupervisao,
  ResumoSetor,
} from '../types/supervisor.types'

export const META_SLA_DIAS = 5

const MS_POR_DIA = 86_400_000

function diasEntre(inicio: string, fim = new Date().toISOString()): number {
  const inicioMs = new Date(inicio).getTime()
  if (Number.isNaN(inicioMs)) return 0
  return Math.max(0, (new Date(fim).getTime() - inicioMs) / MS_POR_DIA)
}

function media(valores: number[]): number | null {
  if (valores.length === 0) return null
  return valores.reduce((total, valor) => total + valor, 0) / valores.length
}

/** Dias decorridos desde o envio para validação (SLA de análise). */
export function diasEmFila(processo: ProcessoSupervisao): number | null {
  if (!processo.submetido_em) return null
  return diasEntre(processo.submetido_em)
}

/** Tempo entre envio e decisão do supervisor, para processos já decididos. */
function tempoDeAnalise(processo: ProcessoSupervisao): number | null {
  if (!processo.submetido_em) return null
  const decisao = processo.revisoes_governanca?.[0]
  if (!decisao) return null
  return diasEntre(processo.submetido_em, decisao.criado_em)
}

export function calcularIndicadores(processos: ProcessoSupervisao[]): IndicadoresSupervisor {
  const pendentes = processos.filter((item) => item.status === 'aguardando_validacao')
  const aprovados = processos.filter((item) => item.status === 'aprovado')
  const publicados = processos.filter((item) => item.status === 'publicado')
  const comAjuste = processos.filter((item) => item.status === 'ajustes_solicitados')

  const revisoes = processos.flatMap((item) => item.revisoes_governanca ?? [])
  const devolvidas = revisoes.filter(
    (revisao) => revisao.decisao === 'ajustes_solicitados' || revisao.decisao === 'rejeitado',
  ).length

  const temposAnalise = processos
    .map(tempoDeAnalise)
    .filter((valor): valor is number => valor !== null)
  const fila = pendentes
    .map(diasEmFila)
    .filter((valor): valor is number => valor !== null)

  const slaMedio = media([...temposAnalise, ...fila])

  return {
    aguardandoParecer: pendentes.length,
    slaMedioDias: slaMedio,
    homologadosPeriodo: aprovados.length + publicados.length,
    taxaDevolucao: revisoes.length === 0 ? 0 : (devolvidas / revisoes.length) * 100,
    totalAnalisados: revisoes.length,
    publicados: publicados.length,
    aprovadosSemPublicacao: aprovados.length,
    processosComAjuste: comAjuste.length,
    slaForaDaMeta: pendentes.filter((item) => (diasEmFila(item) ?? 0) > META_SLA_DIAS).length,
    metaSlaDias: META_SLA_DIAS,
  }
}

export function calcularResumoSectores(processos: ProcessoSupervisao[]): ResumoSetor[] {
  const mapa = new Map<string, ProcessoSupervisao[]>()
  for (const processo of processos) {
    const chave = processo.setor || 'Não informado'
    mapa.set(chave, [...(mapa.get(chave) ?? []), processo])
  }

  return [...mapa.entries()]
    .map(([setor, itens]) => {
      const pendentes = itens.filter((item) => item.status === 'aguardando_validacao')
      const homologados = itens.filter(
        (item) => item.status === 'aprovado' || item.status === 'publicado',
      )
      const devolvidos = itens.filter((item) => item.status === 'ajustes_solicitados')
      const sla = media(
        pendentes
          .map(diasEmFila)
          .filter((valor): valor is number => valor !== null),
      )

      return {
        setor,
        pendentes: pendentes.length,
        homologados: homologados.length,
        devolvidos: devolvidos.length,
        slaMedioDias: sla,
      }
    })
    .sort((a, b) => b.pendentes - a.pendentes || a.setor.localeCompare(b.setor))
}

/** Linha do tempo de revisões e versões do processo (mais recente primeiro). */
export function montarTimeline(processo: ProcessoSupervisao): ItemTimeline[] {
  const itens: ItemTimeline[] = []

  for (const versao of processo.versoes_bpmn ?? []) {
    itens.push({
      id: `versao-${versao.id}`,
      tipo: 'envio',
      titulo: `Versão v${versao.numero_versao} registrada`,
      descricao: versao.motivo_alteracao || 'Atualização do diagrama BPMN',
      versao: versao.numero_versao,
      autor: versao.gerado_por_nome || processo.criado_por_nome,
      data: versao.criado_em,
    })
  }

  for (const revisao of processo.revisoes_governanca ?? []) {
    const tipo =
      revisao.decisao === 'aprovado'
        ? revisao.parecer.startsWith('[Publicação institucional]')
          ? 'publicacao'
          : 'aprovacao'
        : 'correcao'

    itens.push({
      id: `revisao-${revisao.id}`,
      tipo,
      titulo:
        tipo === 'publicacao'
          ? 'Publicação institucional'
          : tipo === 'aprovacao'
            ? 'Processo homologado'
            : revisao.decisao === 'ajustes_solicitados'
              ? 'Correção solicitada'
              : 'Devolvido para refazer',
      descricao: revisao.parecer || 'Sem parecer registrado',
      versao: processo.versao_atual,
      autor: revisao.revisor_nome,
      data: revisao.criado_em,
    })
  }

  if (processo.submetido_em) {
    itens.push({
      id: 'envio-validacao',
      tipo: 'envio',
      titulo: 'Enviado para validação',
      descricao: 'Fluxo e avaliação da IA confirmados pelo autor.',
      versao: processo.versao_atual,
      autor: processo.criado_por_nome,
      data: processo.submetido_em,
    })
  }

  return itens.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
}

/** Encaminha um processo homologado para a publicação institucional. */
export async function publicarProcesso(
  processoId: string,
  parecer: string,
): Promise<ProcessoSupervisao> {
  return apiClient.post<ProcessoSupervisao>(`/api/processos/${processoId}/publicar/`, { parecer })
}
