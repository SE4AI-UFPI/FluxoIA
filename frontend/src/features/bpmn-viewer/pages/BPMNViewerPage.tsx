import * as React from 'react'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  RefreshCw,
  Star,
  X,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { PAPEL_LABEL } from '@/types/auth'
import { BPMNDownloads } from '../components/BPMNDownloads'
import { BPMNHistoryTimeline } from '../components/BPMNHistoryTimeline'
import { BPMNFilters } from '../components/BPMNFilters'
import { BPMNProcessList } from '../components/BPMNProcessList'
import { BPMNTechnicalSheet } from '../components/BPMNTechnicalSheet'
import { useBPMNViewer } from '../hooks/useBPMNViewer'
import { STATUS_BIBLIOTECA, type ProcessoBiblioteca } from '../types/bpmnViewer.types'

// bpmn-js carregado apenas quando o usuário abre um fluxo (code splitting).
const BPMNViewer = React.lazy(() => import('../components/BPMNViewer'))

function baixarXml(processo: ProcessoBiblioteca) {
  if (!processo.bpmnXml) return
  const url = URL.createObjectURL(new Blob([processo.bpmnXml], { type: 'application/xml' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${processo.codigo}.bpmn`
  link.click()
  URL.revokeObjectURL(url)
}

export function BPMNViewerPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, logout } = useAuth()
  const biblioteca = useBPMNViewer(user?.id ?? '')

  const fichaRef = React.useRef<HTMLDivElement>(null)
  const historicoRef = React.useRef<HTMLDivElement>(null)
  const visualizadorRef = React.useRef<HTMLDivElement>(null)
  const [painelAberto, setPainelAberto] = React.useState(true)

  const processoQuery = searchParams.get('processo')

  React.useEffect(() => {
    if (!biblioteca.processos.length) return
    if (processoQuery && biblioteca.processos.some((item) => item.id === processoQuery)) {
      biblioteca.selecionar(processoQuery)
      window.requestAnimationFrame(() =>
        visualizadorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      )
    } else if (!biblioteca.selecionado) {
      const primeiroComDiagrama =
        biblioteca.processos.find((item) => Boolean(item.bpmnXml)) ?? biblioteca.processos[0]
      if (primeiroComDiagrama) {
        biblioteca.selecionar(primeiroComDiagrama.id)
      }
    }
  }, [biblioteca.processos, processoQuery])

  const selecionado = biblioteca.selecionado
  const statusSelecionado =
    STATUS_BIBLIOTECA.find((item) => item.valor === selecionado?.status) ?? null

  function irPara(ref: React.RefObject<HTMLDivElement | null>) {
    window.requestAnimationFrame(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  function abrir(processo: ProcessoBiblioteca, destino: 'bpmn' | 'historico' | 'detalhes') {
    biblioteca.selecionar(processo.id)
    irPara(destino === 'historico' ? historicoRef : destino === 'detalhes' ? fichaRef : visualizadorRef)
  }

  return (
    <div className="min-h-screen bg-fx-fundo text-fx-grafite">
      <header className="border-b border-fx-linha bg-fx-papel">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              aria-label="Voltar ao painel"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <img
              src="/logo/fluxoia-horizontal-cor.svg"
              alt="FluxoIA"
              className="h-8 w-auto select-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden flex-col items-end sm:flex">
              <span className="text-sm font-semibold text-fx-marinho">{user?.nome}</span>
              <span className="text-xs text-fx-cinza">{user?.email}</span>
            </div>
            {user && <Badge variant="secondary">{PAPEL_LABEL[user.papel]}</Badge>}
            <Button variant="outline" size="sm" onClick={logout}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-fx-cinza">
              Biblioteca institucional
            </p>
            <h1 className="font-serif text-3xl font-semibold leading-tight text-fx-marinho">
              Visualizador BPMN
            </h1>
            <p className="text-sm text-fx-cinza">
              Consulte processos, fluxos BPMN e versões publicadas.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void biblioteca.recarregar()} disabled={biblioteca.carregando}>
            {biblioteca.carregando ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-4 w-4" />
            )}
            Atualizar
          </Button>
        </div>

        {biblioteca.erro && (
          <div role="alert" className="rounded-sm border border-fx-alerta/40 bg-fx-alerta/10 px-4 py-3 text-sm text-fx-alerta">
            {biblioteca.erro}
          </div>
        )}

        <BPMNFilters
          filtros={biblioteca.filtros}
          opcoes={biblioteca.opcoes}
          totalFiltrado={biblioteca.filtrados.length}
          totalGeral={biblioteca.processos.length}
          favoritosCount={biblioteca.favoritos.length}
          onChange={biblioteca.atualizarFiltro}
          onLimpar={biblioteca.limparFiltros}
        />

        <BPMNProcessList
          processos={biblioteca.filtrados}
          favoritos={biblioteca.favoritos}
          carregando={biblioteca.carregando}
          onVisualizar={(processo) => abrir(processo, 'bpmn')}
          onHistorico={(processo) => abrir(processo, 'historico')}
          onDetalhes={(processo) => abrir(processo, 'detalhes')}
          onDownload={baixarXml}
          onFavoritar={(processo) => biblioteca.alternarFavorito(processo.id)}
        />

        {!selecionado ? (
          <Card>
            <CardContent className="py-8 text-sm text-fx-cinza">
              Selecione um processo na biblioteca para visualizar o fluxo BPMN, a ficha técnica e o
              histórico de versões.
            </CardContent>
          </Card>
        ) : (
          <div ref={visualizadorRef} className="space-y-4">
            <Card>
              <CardHeader className="gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-lg">{selecionado.nome}</CardTitle>
                    {statusSelecionado && (
                      <Badge variant={statusSelecionado.variante}>{statusSelecionado.rotulo}</Badge>
                    )}
                    <Badge variant="secondary">v{selecionado.versaoAtual}</Badge>
                  </div>
                  <p className="text-xs text-fx-cinza">
                    {selecionado.codigo} · {selecionado.setor} · {selecionado.autor} · Publicação:{' '}
                    {selecionado.aprovadoEm
                      ? new Date(selecionado.aprovadoEm).toLocaleDateString('pt-BR')
                      : 'não publicada'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => biblioteca.alternarFavorito(selecionado.id)}
                  >
                    <Star
                      className={`mr-1.5 h-4 w-4 ${biblioteca.favoritos.includes(selecionado.id) ? 'fill-fx-azul text-fx-azul' : ''}`}
                    />
                    {biblioteca.favoritos.includes(selecionado.id) ? 'Favorito' : 'Favoritar'}
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Fechar visualização" onClick={() => biblioteca.selecionar(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {selecionado.bpmnXml ? (
                  <React.Suspense
                    fallback={
                      <div className="flex h-80 items-center justify-center gap-2 rounded-sm border border-fx-linha bg-white text-sm text-fx-cinza">
                        <Loader2 className="h-4 w-4 animate-spin" /> Carregando visualizador BPMN...
                      </div>
                    }
                  >
                    <BPMNViewer xml={selecionado.bpmnXml} nomeArquivo={selecionado.codigo} />
                  </React.Suspense>
                ) : (
                  <p className="rounded-sm border border-fx-linha bg-fx-nevoa/30 px-3 py-6 text-sm text-fx-cinza">
                    Este processo ainda não possui diagrama BPMN registrado.
                  </p>
                )}
              </CardContent>
            </Card>

            <div ref={fichaRef}>
              <BPMNTechnicalSheet processo={selecionado} />
            </div>

            <div className={`grid gap-4 ${painelAberto ? 'lg:grid-cols-[minmax(0,1fr)_340px]' : ''}`}>
              <div className="space-y-4">
                <BPMNDownloads processo={selecionado} />
              </div>
              <aside className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-fx-cinza">
                    Painel de consulta
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="hidden lg:inline-flex"
                    aria-expanded={painelAberto}
                    onClick={() => setPainelAberto((atual) => !atual)}
                  >
                    {painelAberto ? (
                      <ChevronRight className="mr-1 h-3.5 w-3.5" />
                    ) : (
                      <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                    )}
                    {painelAberto ? 'Recolher' : 'Expandir'}
                  </Button>
                </div>
                {painelAberto && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Processos Relacionados</CardTitle>
                      <p className="text-[11px] text-fx-cinza">
                        Mesmo setor ou mesma categoria de processo.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-0">
                      {biblioteca.relacionados.length === 0 ? (
                        <p className="text-xs text-fx-cinza">Nenhum processo relacionado.</p>
                      ) : (
                        biblioteca.relacionados.map((relacionado) => (
                          <button
                            key={relacionado.id}
                            type="button"
                            onClick={() => {
                              biblioteca.selecionar(relacionado.id)
                              irPara(visualizadorRef)
                            }}
                            className="flex w-full items-start justify-between gap-2 rounded-sm border border-fx-linha bg-white px-3 py-2 text-left transition-colors hover:bg-fx-nevoa/40"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-fx-marinho">
                                {relacionado.nome}
                              </span>
                              <span className="block text-[11px] text-fx-cinza">
                                {relacionado.setor} · v{relacionado.versaoAtual}
                              </span>
                            </span>
                            <Download className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fx-cinza" />
                          </button>
                        ))
                      )}
                    </CardContent>
                  </Card>
                )}
              </aside>
            </div>

            <div ref={historicoRef}>
              <BPMNHistoryTimeline processo={selecionado} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
