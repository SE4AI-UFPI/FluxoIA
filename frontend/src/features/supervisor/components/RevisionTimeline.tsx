import { CheckCircle2, RotateCcw, Send, ShieldCheck, Undo2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { montarTimeline } from '../services/homologation.service'
import type { ItemTimeline, ProcessoSupervisao } from '../types/supervisor.types'

const ESTILO: Record<ItemTimeline['tipo'], { icone: typeof Send; classe: string }> = {
  envio: { icone: Send, classe: 'text-fx-azul border-fx-azul/40 bg-fx-azul/10' },
  reenvio: { icone: Send, classe: 'text-fx-azul border-fx-azul/40 bg-fx-azul/10' },
  correcao: { icone: RotateCcw, classe: 'text-fx-alerta border-fx-alerta/40 bg-fx-alerta/10' },
  aprovacao: { icone: CheckCircle2, classe: 'text-fx-sucesso border-fx-sucesso/40 bg-fx-sucesso/10' },
  publicacao: { icone: ShieldCheck, classe: 'text-fx-marinho border-fx-marinho/30 bg-fx-nevoa' },
}

function formatarData(valor: string): string {
  return new Date(valor).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function RevisionTimeline({ processo }: { processo: ProcessoSupervisao }) {
  const itens = montarTimeline(processo)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">Histórico de Revisões</CardTitle>
        <Badge variant="outline">{itens.length} eventos</Badge>
      </CardHeader>
      <CardContent className="pt-0">
        {itens.length === 0 ? (
          <p className="text-sm text-fx-cinza">Nenhum evento registrado para este processo.</p>
        ) : (
          <ol className="relative space-y-4 border-l border-fx-linha pl-5">
            {itens.map((item) => {
              const { icone: Icone, classe } = ESTILO[item.tipo]
              return (
                <li key={item.id} className="relative">
                  <span
                    className={`absolute -left-7.5 flex h-6 w-6 items-center justify-center rounded-full border ${classe}`}
                  >
                    <Icone className="h-3.5 w-3.5" />
                  </span>
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-fx-marinho">{item.titulo}</p>
                      <Badge variant="secondary">v{item.versao}</Badge>
                    </div>
                    <p className="text-xs leading-relaxed text-fx-cinza">{item.descricao}</p>
                    <p className="text-[11px] text-fx-cinza">
                      {item.autor} · {formatarData(item.data)}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}

export function TimelineExemplo() {
  const etapas = [
    'v1.0.0 · Processo enviado',
    'Correção solicitada',
    'v1.0.1 · Processo corrigido',
    'Reenviado para validação',
    'Homologado',
  ]

  return (
    <p className="flex flex-wrap items-center gap-1 text-[11px] text-fx-cinza">
      {etapas.map((etapa, indice) => (
        <span key={etapa} className="flex items-center gap-1">
          {indice > 0 && <Undo2 className="h-3 w-3 rotate-90 text-fx-linha" aria-hidden="true" />}
          {etapa}
        </span>
      ))}
    </p>
  )
}
