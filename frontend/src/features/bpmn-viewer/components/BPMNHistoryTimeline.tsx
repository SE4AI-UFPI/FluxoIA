import { CheckCircle2, RotateCcw, Send, ShieldCheck, Undo2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProcessoBiblioteca } from '../types/bpmnViewer.types'

interface EventoHistorico {
  id: string
  tipo: 'criacao' | 'versao' | 'correcao' | 'aprovacao' | 'publicacao'
  titulo: string
  descricao: string
  versao: string
  usuario: string
  data: string
}

const ESTILO: Record<EventoHistorico['tipo'], { icone: typeof Send; classe: string }> = {
  criacao: { icone: Send, classe: 'text-fx-azul border-fx-azul/40 bg-fx-azul/10' },
  versao: { icone: Send, classe: 'text-fx-azul border-fx-azul/40 bg-fx-azul/10' },
  correcao: { icone: RotateCcw, classe: 'text-fx-alerta border-fx-alerta/40 bg-fx-alerta/10' },
  aprovacao: { icone: CheckCircle2, classe: 'text-fx-sucesso border-fx-sucesso/40 bg-fx-sucesso/10' },
  publicacao: { icone: ShieldCheck, classe: 'text-fx-marinho border-fx-marinho/30 bg-fx-nevoa' },
}

function montarEventos(processo: ProcessoBiblioteca): EventoHistorico[] {
  const eventos: EventoHistorico[] = [
    {
      id: 'criacao',
      tipo: 'criacao',
      titulo: 'Processo criado',
      descricao: 'Cadastro inicial do processo no FluxoIA.',
      versao: '1.0.0',
      usuario: processo.autor,
      data: processo.criadoEm,
    },
  ]

  for (const versao of processo.versoes) {
    eventos.push({
      id: `versao-${versao.id}`,
      tipo: 'versao',
      titulo: `Versão v${versao.numeroVersao}`,
      descricao: versao.motivoAlteracao || 'Atualização do diagrama BPMN',
      versao: versao.numeroVersao,
      usuario: versao.autor,
      data: versao.criadoEm,
    })
  }

  for (const revisao of processo.revisoes) {
    const publicacao = revisao.parecer.startsWith('[Publicação institucional]')
    eventos.push({
      id: `revisao-${revisao.id}`,
      tipo: publicacao ? 'publicacao' : revisao.decisao === 'aprovado' ? 'aprovacao' : 'correcao',
      titulo: publicacao
        ? 'Publicado institucionalmente'
        : revisao.decisao === 'aprovado'
          ? 'Homologado pela supervisão'
          : revisao.decisao === 'ajustes_solicitados'
            ? 'Correção solicitada'
            : 'Devolvido para refazer',
      descricao: revisao.parecer || 'Sem parecer registrado',
      versao: processo.versaoAtual,
      usuario: revisao.revisor,
      data: revisao.criadoEm,
    })
  }

  return eventos.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
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

export function BPMNHistoryTimeline({ processo }: { processo: ProcessoBiblioteca }) {
  const eventos = montarEventos(processo)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">Histórico de Versões</CardTitle>
          <p className="mt-1 text-xs text-fx-cinza">
            Evolução do processo, correções, homologação e publicação.
          </p>
        </div>
        <Badge variant="outline">{eventos.length} eventos</Badge>
      </CardHeader>
      <CardContent className="pt-0">
        <ol className="relative space-y-4 border-l border-fx-linha pl-5">
          {eventos.map((evento) => {
            const { icone: Icone, classe } = ESTILO[evento.tipo]
            return (
              <li key={evento.id} className="relative">
                <span
                  className={`absolute -left-7.5 flex h-6 w-6 items-center justify-center rounded-full border ${classe}`}
                >
                  <Icone className="h-3.5 w-3.5" />
                </span>
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-fx-marinho">{evento.titulo}</p>
                    <Badge variant="secondary">v{evento.versao}</Badge>
                  </div>
                  <p className="text-xs leading-relaxed text-fx-cinza">{evento.descricao}</p>
                  <p className="text-[11px] text-fx-cinza">
                    {evento.usuario} · {formatarData(evento.data)}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      </CardContent>
    </Card>
  )
}

export { montarEventos, Undo2 }
