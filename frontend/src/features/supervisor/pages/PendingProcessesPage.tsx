import * as React from 'react'
import { Inbox, Search, Send, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { ProcessoSupervisao } from '../types/supervisor.types'
import { SLAIndicator } from '../components/SLAIndicator'

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'outline' }> = {
  aguardando_validacao: { label: 'Aguardando parecer', variant: 'warning' },
  aprovado: { label: 'Homologado', variant: 'success' },
  publicado: { label: 'Publicado', variant: 'default' },
  ajustes_solicitados: { label: 'Em correção', variant: 'secondary' },
  rejeitado: { label: 'Devolvido', variant: 'outline' },
}

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

export function PendingProcessesPage({
  processos,
  onAnalisar,
  onPublicar,
  publicando = null,
  carregando = false,
  titulo = 'Processos Pendentes',
  descricao = 'Processos enviados pelos colaboradores aguardando análise da supervisão.',
}: {
  processos: ProcessoSupervisao[]
  onAnalisar: (processo: ProcessoSupervisao) => void
  onPublicar?: (processo: ProcessoSupervisao) => void
  publicando?: string | null
  carregando?: boolean
  titulo?: string
  descricao?: string
}) {
  const [busca, setBusca] = React.useState('')
  const [setor, setSetor] = React.useState('Todos os setores')

  const setores = React.useMemo(
    () => ['Todos os setores', ...new Set(processos.map((item) => item.setor).filter(Boolean))],
    [processos],
  )

  const filtrados = processos.filter((processo) => {
    const alvo = `${processo.nome} ${processo.codigo ?? ''} ${processo.criado_por_nome}`.toLowerCase()
    const combinaBusca = alvo.includes(busca.trim().toLowerCase())
    const combinaSetor = setor === 'Todos os setores' || processo.setor === setor
    return combinaBusca && combinaSetor
  })

  return (
    <Card>
      <CardHeader className="gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base">{titulo}</CardTitle>
          <p className="mt-1 text-xs text-fx-cinza">{descricao}</p>
        </div>
        <Badge variant="secondary">{filtrados.length} registro(s)</Badge>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fx-cinza" />
            <Input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por processo, código ou autor"
              aria-label="Buscar processos"
              className="pl-9"
            />
          </div>
          <select
            value={setor}
            onChange={(event) => setSetor(event.target.value)}
            aria-label="Filtrar por setor"
            className="h-10 rounded-sm border border-fx-linha bg-white px-3 text-sm text-fx-grafite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fx-azul"
          >
            {setores.map((opcao) => (
              <option key={opcao} value={opcao}>
                {opcao}
              </option>
            ))}
          </select>
        </div>

        {carregando ? (
          <p className="py-8 text-center text-sm text-fx-cinza">Carregando processos...</p>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-sm border border-dashed border-fx-linha bg-white/60 px-4 py-10 text-center">
            <Inbox className="h-6 w-6 text-fx-cinza" />
            <p className="text-sm font-medium text-fx-marinho">Nenhum processo encontrado</p>
            <p className="text-xs text-fx-cinza">Ajuste os filtros ou aguarde novos envios.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-fx-linha text-left text-[11px] uppercase tracking-wider text-fx-cinza">
                    <th className="py-2 pr-3 font-semibold">Processo</th>
                    <th className="py-2 pr-3 font-semibold">Setor</th>
                    <th className="py-2 pr-3 font-semibold">Autor</th>
                    <th className="py-2 pr-3 font-semibold">Enviado em</th>
                    <th className="py-2 pr-3 font-semibold">Status</th>
                    <th className="py-2 pr-3 font-semibold">SLA</th>
                    <th className="py-2 text-right font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((processo) => {
                    const status = STATUS_BADGE[processo.status] ?? {
                      label: processo.status,
                      variant: 'outline' as const,
                    }
                    return (
                      <tr key={processo.id} className="border-b border-fx-linha/60 last:border-0">
                        <td className="py-2.5 pr-3">
                          <p className="font-semibold text-fx-marinho">{processo.nome}</p>
                          <p className="font-mono text-[11px] text-fx-cinza">
                            {processo.codigo ?? 'Sem código'} · v{processo.versao_atual}
                          </p>
                        </td>
                        <td className="py-2.5 pr-3 text-fx-grafite">{processo.setor}</td>
                        <td className="py-2.5 pr-3 text-fx-grafite">{processo.criado_por_nome}</td>
                        <td className="py-2.5 pr-3 text-fx-cinza">{formatarData(processo.submetido_em)}</td>
                        <td className="py-2.5 pr-3">
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </td>
                        <td className="py-2.5 pr-3">
                          {processo.status === 'aguardando_validacao' ? (
                            <SLAIndicator processo={processo} />
                          ) : (
                            <span className="text-xs text-fx-cinza">—</span>
                          )}
                        </td>
                        <td className="py-2.5">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => onAnalisar(processo)}
                            >
                              <Send className="mr-1 h-3.5 w-3.5" />
                              {processo.status === 'aguardando_validacao' ? 'Analisar' : 'Detalhes'}
                            </Button>
                            {onPublicar && processo.status === 'aprovado' && (
                              <Button
                                type="button"
                                size="sm"
                                disabled={publicando === processo.id}
                                onClick={() => onPublicar(processo)}
                              >
                                <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Publicar
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <ul className="space-y-2 md:hidden">
              {filtrados.map((processo) => {
                const status = STATUS_BADGE[processo.status] ?? {
                  label: processo.status,
                  variant: 'outline' as const,
                }
                return (
                  <li key={processo.id} className="rounded-sm border border-fx-linha bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-fx-marinho">{processo.nome}</p>
                        <p className="text-[11px] text-fx-cinza">
                          {processo.setor} · {processo.criado_por_nome}
                        </p>
                      </div>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-fx-cinza">{formatarData(processo.submetido_em)}</span>
                      <Button type="button" size="sm" variant="outline" onClick={() => onAnalisar(processo)}>
                        {processo.status === 'aguardando_validacao' ? 'Analisar' : 'Detalhes'}
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}
