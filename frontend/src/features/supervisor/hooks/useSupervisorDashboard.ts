import * as React from 'react'
import { fetchProcessosSupervisao } from '../services/supervisor.service'
import { calcularIndicadores, calcularResumoSectores } from '../services/homologation.service'
import type {
  IndicadoresSupervisor,
  ProcessoSupervisao,
  ResumoSetor,
} from '../types/supervisor.types'

interface EstadoSupervisor {
  processos: ProcessoSupervisao[]
  pendentes: ProcessoSupervisao[]
  finalizados: ProcessoSupervisao[]
  indicadores: IndicadoresSupervisor
  porSetor: ResumoSetor[]
  carregando: boolean
  erro: string | null
  recarregar: () => void
}

const INDICADORES_VAZIOS: IndicadoresSupervisor = {
  aguardandoParecer: 0,
  slaMedioDias: null,
  homologadosPeriodo: 0,
  taxaDevolucao: 0,
  totalAnalisados: 0,
  publicados: 0,
  aprovadosSemPublicacao: 0,
  processosComAjuste: 0,
  slaForaDaMeta: 0,
  metaSlaDias: 5,
}

export function useSupervisorDashboard(): EstadoSupervisor {
  const [processos, setProcessos] = React.useState<ProcessoSupervisao[]>([])
  const [carregando, setCarregando] = React.useState(true)
  const [erro, setErro] = React.useState<string | null>(null)
  const [versao, setVersao] = React.useState(0)

  React.useEffect(() => {
    let ativo = true
    setCarregando(true)
    setErro(null)

    fetchProcessosSupervisao()
      .then((dados) => {
        if (!ativo) return
        setProcessos(dados)
      })
      .catch((causa: unknown) => {
        if (!ativo) return
        setErro(
          causa instanceof Error
            ? causa.message
            : 'Não foi possível carregar os processos da supervisão.',
        )
        setProcessos([])
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })

    return () => {
      ativo = false
    }
  }, [versao])

  const pendentes = React.useMemo(
    () => processos.filter((item) => item.status === 'aguardando_validacao'),
    [processos],
  )
  const finalizados = React.useMemo(
    () =>
      processos.filter((item) => item.status === 'aprovado' || item.status === 'publicado'),
    [processos],
  )
  const indicadores = React.useMemo(
    () => (processos.length === 0 ? INDICADORES_VAZIOS : calcularIndicadores(processos)),
    [processos],
  )
  const porSetor = React.useMemo(() => calcularResumoSectores(processos), [processos])

  return {
    processos,
    pendentes,
    finalizados,
    indicadores,
    porSetor,
    carregando,
    erro,
    recarregar: () => setVersao((atual) => atual + 1),
  }
}
