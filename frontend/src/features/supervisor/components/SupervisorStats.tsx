import { AlertTriangle, CheckCircle2, Clock, RotateCcw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { IndicadoresSupervisor } from '../types/supervisor.types'

function formatarDias(valor: number | null): string {
  if (valor === null) return '—'
  if (valor < 1) return '< 1 dia'
  return `${valor.toFixed(1).replace('.', ',')} dias`
}

export function SupervisorStats({ indicadores }: { indicadores: IndicadoresSupervisor }) {
  const cards = [
    {
      titulo: 'Aguardando Parecer',
      valor: String(indicadores.aguardandoParecer),
      detalhe:
        indicadores.slaForaDaMeta > 0
          ? `${indicadores.slaForaDaMeta} acima da meta de ${indicadores.metaSlaDias} dias`
          : 'Todos dentro da meta de SLA',
      icone: Clock,
      destaque: indicadores.aguardandoParecer > 0,
    },
    {
      titulo: 'SLA Médio de Análise',
      valor: formatarDias(indicadores.slaMedioDias),
      detalhe: `Meta institucional: ${indicadores.metaSlaDias} dias`,
      icone: AlertTriangle,
      destaque:
        indicadores.slaMedioDias !== null && indicadores.slaMedioDias > indicadores.metaSlaDias,
    },
    {
      titulo: 'Processos Homologados',
      valor: String(indicadores.homologadosPeriodo),
      detalhe: `${indicadores.publicados} publicados · ${indicadores.aprovadosSemPublicacao} aguardando publicação`,
      icone: CheckCircle2,
      destaque: false,
    },
    {
      titulo: 'Taxa de Devolução',
      valor: `${indicadores.taxaDevolucao.toFixed(1).replace('.', ',')}%`,
      detalhe: `${indicadores.totalAnalisados} pareceres registrados`,
      icone: RotateCcw,
      destaque: indicadores.taxaDevolucao > 30,
    },
  ]

  return (
    <section aria-label="Indicadores da supervisão" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ titulo, valor, detalhe, icone: Icone, destaque }) => (
        <Card key={titulo}>
          <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="font-sans text-xs font-semibold uppercase tracking-wider text-fx-cinza">
              {titulo}
            </CardTitle>
            <Icone className={`h-4 w-4 ${destaque ? 'text-fx-alerta' : 'text-fx-azul'}`} />
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-semibold text-fx-marinho">{valor}</p>
            <p className={`mt-1 text-xs ${destaque ? 'text-fx-alerta' : 'text-fx-cinza'}`}>
              {detalhe}
            </p>
          </CardContent>
        </Card>
      ))}
    </section>
  )
}
