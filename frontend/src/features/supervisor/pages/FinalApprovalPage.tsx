import * as React from 'react'
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Stamp, Undo2 } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { PAPEL_LABEL } from '@/types/auth'
import { PdfFinalButton } from '@/features/process-mapping/components/PdfFinalButton'
import { BPMNReviewPanel } from '../components/BPMNReviewPanel'
import { RevisionTimeline } from '../components/RevisionTimeline'
import { useSupervisorDashboard } from '../hooks/useSupervisorDashboard'
import {
  devolverParaSupervisao,
  PARECER_MINIMO_DEVOLUCAO,
  publicarProcesso,
} from '../services/final-approval.service'
import { PendingProcessesPage } from './PendingProcessesPage'
import type { ProcessoSupervisao } from '../types/supervisor.types'

type Aba = 'aguardando' | 'publicados'

interface Aviso {
  mensagem: string
  /** Preenchido quando o aval acabou de publicar o processo: oferece o PDF final. */
  publicadoId?: string
}

function formatarData(valor: string | null): string {
  return valor ? new Date(valor).toLocaleString('pt-BR') : '—'
}

/**
 * Etapa final da governança: o coordenador confere o que o supervisor homologou
 * e dá o aval que publica o mapeamento, ou o devolve à supervisão.
 */
export function FinalApprovalPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, logout } = useAuth()
  const { processos, carregando, erro, recarregar } = useSupervisorDashboard()

  const [aba, setAba] = React.useState<Aba>('aguardando')
  const [aviso, setAviso] = React.useState<Aviso | null>(null)

  const aguardando = React.useMemo(
    () => processos.filter((item) => item.status === 'aprovado'),
    [processos],
  )
  const publicados = React.useMemo(
    () => processos.filter((item) => item.status === 'publicado'),
    [processos],
  )

  const processoId = searchParams.get('processo')
  const selecionado = React.useMemo(
    () => processos.find((item) => item.id === processoId) ?? null,
    [processos, processoId],
  )

  // Ao abrir um processo (pela lista ou vindo do painel inicial), leva direto ao diagrama e à decisão.
  const detalheRef = React.useRef<HTMLDivElement>(null)
  const selecionadoId = selecionado?.id
  React.useEffect(() => {
    if (selecionadoId) detalheRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [selecionadoId])

  function selecionar(processo: ProcessoSupervisao) {
    setAviso(null)
    setAba(processo.status === 'publicado' ? 'publicados' : 'aguardando')
    setSearchParams({ processo: processo.id })
  }

  function concluir(resultado: Aviso) {
    setSearchParams({})
    recarregar()
    setAviso(resultado)
  }

  return (
    <div className="min-h-screen bg-fx-fundo text-fx-grafite">
      <header className="border-b border-fx-linha bg-fx-papel">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
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
            <img src="/logo/fluxoia-horizontal-cor.svg" alt="FluxoIA" className="h-8 w-auto select-none" />
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
              Coordenação
            </p>
            <h1 className="font-serif text-3xl font-semibold leading-tight text-fx-marinho">
              Aval Final & Publicação
            </h1>
            <p className="max-w-2xl text-sm text-fx-cinza">
              Processos já homologados pela supervisão. Seu aval publica o mapeamento e libera o
              PDF oficial; se algo não estiver certo, devolva à supervisão com uma justificativa.
            </p>
          </div>
          <div className="flex gap-1.5" role="tablist" aria-label="Filtro de processos">
            <Button
              type="button"
              size="sm"
              variant={aba === 'aguardando' ? 'default' : 'outline'}
              role="tab"
              aria-selected={aba === 'aguardando'}
              onClick={() => setAba('aguardando')}
            >
              Aguardando aval ({aguardando.length})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={aba === 'publicados' ? 'default' : 'outline'}
              role="tab"
              aria-selected={aba === 'publicados'}
              onClick={() => setAba('publicados')}
            >
              Publicados ({publicados.length})
            </Button>
          </div>
        </div>

        {erro && (
          <div role="alert" className="rounded-sm border border-fx-alerta/40 bg-fx-alerta/10 px-4 py-3 text-sm text-fx-alerta">
            {erro}
          </div>
        )}
        {aviso && (
          <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-sm border border-fx-sucesso/40 bg-fx-sucesso/10 px-3.5 py-3 text-sm text-fx-sucesso">
            <span className="flex min-w-0 flex-1 items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              {aviso.mensagem}
            </span>
            {aviso.publicadoId && <PdfFinalButton processoId={aviso.publicadoId} />}
          </div>
        )}

        <PendingProcessesPage
          processos={aba === 'aguardando' ? aguardando : publicados}
          onAnalisar={selecionar}
          statusAcionavel="aprovado"
          carregando={carregando}
          titulo={aba === 'aguardando' ? 'Aguardando seu aval' : 'Processos publicados'}
          descricao={
            aba === 'aguardando'
              ? 'Homologados pela supervisão nos setores que você coordena.'
              : 'Mapeamentos publicados, com PDF oficial disponível.'
          }
        />

        {!selecionado && (
          <Card>
            <CardContent className="flex items-center gap-2 py-8 text-sm text-fx-cinza">
              <AlertCircle className="h-4 w-4" />
              Selecione um processo na lista para conferir o diagrama e dar o aval final.
            </CardContent>
          </Card>
        )}

        {selecionado && (
          <div ref={detalheRef} className="scroll-mt-4 space-y-5">
            <BPMNReviewPanel processo={selecionado} onFechar={() => setSearchParams({})} />

            {selecionado.status === 'aprovado' ? (
              <DecisaoFinal key={selecionado.id} processo={selecionado} onConcluido={concluir} />
            ) : (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {selecionado.status === 'publicado' ? 'Processo publicado' : 'Sem decisão pendente'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-fx-cinza">
                  {selecionado.status === 'publicado' ? (
                    <div className="space-y-3">
                      <p>
                        Publicado por <strong>{selecionado.publicado_por_nome || '—'}</strong> em{' '}
                        {formatarData(selecionado.publicado_em)}. Homologado por{' '}
                        <strong>{selecionado.aprovado_por_nome || '—'}</strong>.
                      </p>
                      <PdfFinalButton processoId={selecionado.id} />
                    </div>
                  ) : (
                    <p>
                      Este processo não está homologado pela supervisão e não aguarda o seu aval.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <RevisionTimeline processo={selecionado} />
          </div>
        )}
      </main>
    </div>
  )
}

function DecisaoFinal({
  processo,
  onConcluido,
}: {
  processo: ProcessoSupervisao
  onConcluido: (resultado: Aviso) => void
}) {
  const [parecer, setParecer] = React.useState('')
  const [confirmandoPublicacao, setConfirmandoPublicacao] = React.useState(false)
  const [enviando, setEnviando] = React.useState<'publicar' | 'devolver' | null>(null)
  const [erro, setErro] = React.useState<string | null>(null)

  const homologacao = (processo.revisoes_governanca ?? []).find(
    (revisao) => revisao.etapa === 'supervisao' && revisao.decisao === 'aprovado',
  )

  async function executar(acao: 'publicar' | 'devolver') {
    const texto = parecer.trim()
    if (acao === 'devolver' && texto.length < PARECER_MINIMO_DEVOLUCAO) {
      setErro(
        `Explique ao supervisor o motivo da devolução (mínimo de ${PARECER_MINIMO_DEVOLUCAO} caracteres).`,
      )
      return
    }

    setEnviando(acao)
    setErro(null)
    try {
      if (acao === 'publicar') {
        await publicarProcesso(processo.id, texto)
        onConcluido({
          mensagem: `"${processo.nome}" foi publicado. O PDF final já está disponível.`,
          publicadoId: processo.id,
        })
      } else {
        await devolverParaSupervisao(processo.id, texto)
        onConcluido({ mensagem: `"${processo.nome}" voltou para a fila de homologação da supervisão.` })
      }
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : 'Não foi possível registrar a decisão.')
      setConfirmandoPublicacao(false)
    } finally {
      setEnviando(null)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Aval final</CardTitle>
        <p className="text-xs text-fx-cinza">
          Homologado por <strong>{processo.aprovado_por_nome || '—'}</strong> em{' '}
          {formatarData(processo.aprovado_em)}. Sua decisão fica registrada na auditoria.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {homologacao?.parecer && (
          <blockquote className="rounded-sm border-l-2 border-fx-sucesso bg-fx-sucesso/5 px-3 py-2 text-sm text-fx-grafite">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-fx-cinza">
              Parecer da supervisão
            </p>
            <p className="mt-1 whitespace-pre-line">{homologacao.parecer}</p>
          </blockquote>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="parecer-coordenador">Parecer do coordenador</Label>
          <textarea
            id="parecer-coordenador"
            value={parecer}
            onChange={(event) => {
              setParecer(event.target.value)
              setErro(null)
            }}
            rows={4}
            placeholder="Opcional para publicar. Obrigatório para devolver: diga ao supervisor o que precisa ser revisto."
            className="w-full resize-y rounded-sm border border-fx-linha bg-white px-3 py-2 text-sm text-fx-grafite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fx-azul"
          />
        </div>

        {erro && (
          <p role="alert" className="flex items-start gap-2 rounded-sm border border-fx-alerta/40 bg-fx-alerta/10 px-3 py-2 text-xs text-fx-alerta">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {erro}
          </p>
        )}

        {confirmandoPublicacao ? (
          <div className="space-y-2 rounded-sm border border-fx-marinho/30 bg-fx-nevoa px-3 py-3">
            <p className="text-sm text-fx-marinho">
              Depois de publicado, o mapeamento fica imutável e passa a valer como versão oficial.
              Confirma a publicação?
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" disabled={enviando !== null} onClick={() => void executar('publicar')}>
                {enviando === 'publicar' ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Stamp className="mr-1.5 h-4 w-4" />
                )}
                Confirmar publicação
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={enviando !== null}
                onClick={() => setConfirmandoPublicacao(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button type="button" disabled={enviando !== null} onClick={() => setConfirmandoPublicacao(true)}>
              <Stamp className="mr-1.5 h-4 w-4" />
              Dar aval e publicar
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={enviando !== null}
              onClick={() => void executar('devolver')}
            >
              {enviando === 'devolver' ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Undo2 className="mr-1.5 h-4 w-4" />
              )}
              Devolver à supervisão
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
