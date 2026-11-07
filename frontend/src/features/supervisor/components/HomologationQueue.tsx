import { ArrowRight, Inbox } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProcessoSupervisao } from '../types/supervisor.types'
import { SLAIndicator } from './SLAIndicator'

function formatarData(valor: string | null): string {
  if (!valor) return '—'
  return new Date(valor).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function HomologationQueue({
  processos,
  onAnalisar,
  limite = 5,
}: {
  processos: ProcessoSupervisao[]
  onAnalisar: (processo: ProcessoSupervisao) => void
  limite?: number
}) {
  const itens = processos.slice(0, limite)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">Fila de Homologação</CardTitle>
          <p className="mt-1 text-xs text-fx-cinza">
            Processos enviados pelos colaboradores aguardando parecer técnico.
          </p>
        </div>
        <Badge variant="secondary">{processos.length} na fila</Badge>
      </CardHeader>
      <CardContent className="pt-0">
        {itens.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-sm border border-dashed border-fx-linha bg-white/60 px-4 py-10 text-center">
            <Inbox className="h-6 w-6 text-fx-cinza" />
            <p className="text-sm font-medium text-fx-marinho">Nenhum processo aguardando parecer</p>
            <p className="text-xs text-fx-cinza">A fila está em dia na sua área de supervisão.</p>
          </div>
        ) : (
          <ul className="divide-y divide-fx-linha/70">
            {itens.map((processo) => (
              <li key={processo.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-semibold text-fx-marinho">
                    {processo.nome}
                  </p>
                  <p className="truncate text-xs text-fx-cinza">
                    {processo.codigo ?? 'Sem código'} · {processo.setor} · v{processo.versao_atual}
                  </p>
                  <p className="text-[11px] text-fx-cinza">
                    Enviado em {formatarData(processo.submetido_em)} por {processo.criado_por_nome}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <SLAIndicator processo={processo} />
                  <Button type="button" size="sm" variant="outline" onClick={() => onAnalisar(processo)}>
                    Analisar <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
