import { Download, Eye, History, Info, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { STATUS_BIBLIOTECA, type ProcessoBiblioteca } from '../types/bpmnViewer.types'

function formatarData(valor: string | null): string {
  if (!valor) return '—'
  return new Date(valor).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function statusInfo(status: ProcessoBiblioteca['status']) {
  return (
    STATUS_BIBLIOTECA.find((item) => item.valor === status) ?? {
      valor: status,
      rotulo: status,
      variante: 'outline' as const,
    }
  )
}

export function BPMNProcessList({
  processos,
  favoritos,
  carregando,
  onVisualizar,
  onHistorico,
  onDetalhes,
  onDownload,
  onFavoritar,
}: {
  processos: ProcessoBiblioteca[]
  favoritos: string[]
  carregando: boolean
  onVisualizar: (processo: ProcessoBiblioteca) => void
  onHistorico: (processo: ProcessoBiblioteca) => void
  onDetalhes: (processo: ProcessoBiblioteca) => void
  onDownload: (processo: ProcessoBiblioteca) => void
  onFavoritar: (processo: ProcessoBiblioteca) => void
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Biblioteca de Processos</CardTitle>
        <p className="text-xs text-fx-cinza">
          Processos homologados, publicados e em acompanhamento disponíveis para consulta.
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {carregando ? (
          <p className="py-10 text-center text-sm text-fx-cinza">Carregando processos...</p>
        ) : processos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-sm border border-dashed border-fx-linha bg-white/60 px-4 py-12 text-center">
            <Info className="h-6 w-6 text-fx-cinza" />
            <p className="text-sm font-medium text-fx-marinho">Nenhum processo encontrado</p>
            <p className="text-xs text-fx-cinza">Ajuste a busca ou os filtros para ampliar o resultado.</p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-fx-linha text-left text-[11px] uppercase tracking-wider text-fx-cinza">
                    <th className="py-2 pr-3 font-semibold">Código</th>
                    <th className="py-2 pr-3 font-semibold">Processo</th>
                    <th className="py-2 pr-3 font-semibold">Setor</th>
                    <th className="py-2 pr-3 font-semibold">Responsável</th>
                    <th className="py-2 pr-3 font-semibold">Versão</th>
                    <th className="py-2 pr-3 font-semibold">Status</th>
                    <th className="py-2 pr-3 font-semibold">Atualização</th>
                    <th className="py-2 text-right font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {processos.map((processo) => {
                    const status = statusInfo(processo.status)
                    const favorito = favoritos.includes(processo.id)
                    return (
                      <tr key={processo.id} className="border-b border-fx-linha/60 last:border-0">
                        <td className="py-2.5 pr-3 font-mono text-[11px] text-fx-cinza">
                          {processo.codigo}
                        </td>
                        <td className="py-2.5 pr-3">
                          <button
                            type="button"
                            onClick={() => onVisualizar(processo)}
                            className="text-left font-semibold text-fx-marinho hover:underline"
                          >
                            {processo.nome}
                          </button>
                          <p className="text-[11px] text-fx-cinza">{processo.categoria}</p>
                        </td>
                        <td className="py-2.5 pr-3 text-fx-grafite">{processo.setor}</td>
                        <td className="py-2.5 pr-3 text-fx-grafite">{processo.autor}</td>
                        <td className="py-2.5 pr-3">
                          <Badge variant="secondary">v{processo.versaoAtual}</Badge>
                        </td>
                        <td className="py-2.5 pr-3">
                          <Badge variant={status.variante}>{status.rotulo}</Badge>
                        </td>
                        <td className="py-2.5 pr-3 text-fx-cinza">
                          {formatarData(processo.atualizadoEm)}
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              aria-label={`Favoritar ${processo.nome}`}
                              title={favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                              onClick={() => onFavoritar(processo)}
                            >
                              <Star className={`h-4 w-4 ${favorito ? 'fill-fx-azul text-fx-azul' : 'text-fx-cinza'}`} />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => onVisualizar(processo)}
                            >
                              <Eye className="mr-1 h-3.5 w-3.5" /> BPMN
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              aria-label={`Histórico de ${processo.nome}`}
                              title="Histórico de versões"
                              onClick={() => onHistorico(processo)}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              aria-label={`Detalhes de ${processo.nome}`}
                              title="Detalhes"
                              onClick={() => onDetalhes(processo)}
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              aria-label={`Baixar ${processo.nome}`}
                              title="Download do XML BPMN"
                              onClick={() => onDownload(processo)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / tablet */}
            <ul className="space-y-2 lg:hidden">
              {processos.map((processo) => {
                const status = statusInfo(processo.status)
                const favorito = favoritos.includes(processo.id)
                return (
                  <li key={processo.id} className="rounded-sm border border-fx-linha bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-fx-marinho">{processo.nome}</p>
                        <p className="text-[11px] text-fx-cinza">
                          {processo.codigo} · {processo.setor}
                        </p>
                        <p className="text-[11px] text-fx-cinza">
                          {processo.autor} · v{processo.versaoAtual} · {formatarData(processo.atualizadoEm)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={status.variante}>{status.rotulo}</Badge>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          aria-label={`Favoritar ${processo.nome}`}
                          onClick={() => onFavoritar(processo)}
                        >
                          <Star className={`h-4 w-4 ${favorito ? 'fill-fx-azul text-fx-azul' : 'text-fx-cinza'}`} />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Button type="button" size="sm" variant="outline" onClick={() => onVisualizar(processo)}>
                        <Eye className="mr-1 h-3.5 w-3.5" /> BPMN
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => onHistorico(processo)}>
                        <History className="mr-1 h-3.5 w-3.5" /> Histórico
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => onDetalhes(processo)}>
                        <Info className="mr-1 h-3.5 w-3.5" /> Detalhes
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => onDownload(processo)}>
                        <Download className="mr-1 h-3.5 w-3.5" /> Baixar
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
