import * as React from 'react'
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { PAPEL_LABEL } from '@/types/auth'
import { BPMNReviewPanel } from '../components/BPMNReviewPanel'
import { RevisionTimeline } from '../components/RevisionTimeline'
import {
  alternarEstadoChecklist,
  checklistCompleto,
  checklistTemNaoConformidade,
  ValidationChecklist,
  type EstadoChecklist,
} from '../components/ValidationChecklist'
import { TechnicalOpinion } from '../components/TechnicalOpinion'
import { useSupervisorDashboard } from '../hooks/useSupervisorDashboard'
import {
  aprovarProcesso,
  devolverProcesso,
  solicitarCorrecao,
} from '../services/review.service'
import { publicarProcesso } from '../services/homologation.service'
import { PendingProcessesPage } from './PendingProcessesPage'
import type { ChecklistItem, ParecerRevisaoPayload, ProcessoSupervisao } from '../types/supervisor.types'

type Aba = 'pendentes' | 'finalizados'

export function ValidationPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, logout } = useAuth()
  const { processos, pendentes, finalizados, carregando, erro, recarregar } = useSupervisorDashboard()

  const [aba, setAba] = React.useState<Aba>('pendentes')
  const [parecer, setParecer] = React.useState('')
  const [checklist, setChecklist] = React.useState<EstadoChecklist>({})
  const [enviando, setEnviando] = React.useState(false)
  const [erroAcao, setErroAcao] = React.useState<string | null>(null)
  const [aviso, setAviso] = React.useState<string | null>(null)
  const [publicando, setPublicando] = React.useState<string | null>(null)

  const processoId = searchParams.get('processo')
  const selecionado = React.useMemo(
    () => processos.find((item) => item.id === processoId) ?? null,
    [processos, processoId],
  )

  React.useEffect(() => {
    if (!processoId) {
      setChecklist({})
      return
    }
    try {
      const saved = sessionStorage.getItem(`fluxoia_checklist:${processoId}`)
      setChecklist(saved ? (JSON.parse(saved) as EstadoChecklist) : {})
    } catch {
      setChecklist({})
    }
  }, [processoId])

  function selecionar(processo: ProcessoSupervisao) {
    setParecer('')
    setErroAcao(null)
    setAviso(null)
    setAba(processo.status === 'aguardando_validacao' ? 'pendentes' : 'finalizados')
    setSearchParams({ processo: processo.id })
  }

  async function decidir(payload: ParecerRevisaoPayload) {
    if (!selecionado) return
    setEnviando(true)
    setErroAcao(null)
    setAviso(null)
    try {
      if (payload.decisao === 'aprovado') {
        await aprovarProcesso(selecionado.id, payload.parecer || 'Fluxo homologado pela supervisão.')
      } else if (payload.decisao === 'ajustes_solicitados') {
        await solicitarCorrecao(selecionado.id, payload.parecer)
      } else {
        await devolverProcesso(selecionado.id, payload.parecer)
      }
      const mensagem =
        payload.decisao === 'aprovado'
          ? 'Processo homologado com sucesso.'
          : payload.decisao === 'ajustes_solicitados'
            ? 'Correção solicitada ao autor do processo.'
            : 'Processo devolvido para reajuste completo.'
      setParecer('')
      setChecklist({})
      if (selecionado) {
        sessionStorage.removeItem(`fluxoia_checklist:${selecionado.id}`)
      }
      setSearchParams({})
      recarregar()
      setAviso(mensagem)
    } catch (causa) {
      setErroAcao(
        causa instanceof Error ? causa.message : 'Não foi possível registrar o parecer.',
      )
    } finally {
      setEnviando(false)
    }
  }

  async function publicar(processo: ProcessoSupervisao) {
    setPublicando(processo.id)
    setErroAcao(null)
    setAviso(null)
    try {
      await publicarProcesso(processo.id, 'Homologação técnica concluída; processo publicado.')
      recarregar()
      setAviso('Processo encaminhado para publicação institucional.')
    } catch (causa) {
      setErroAcao(causa instanceof Error ? causa.message : 'Não foi possível publicar o processo.')
    } finally {
      setPublicando(null)
    }
  }

  function alternarItem(item: ChecklistItem) {
    setChecklist((atual) => {
      const proximo = alternarEstadoChecklist(atual, item)
      if (processoId) {
        try {
          sessionStorage.setItem(`fluxoia_checklist:${processoId}`, JSON.stringify(proximo))
        } catch {
          // ignora falha de armazenamento
        }
      }
      return proximo
    })
  }

  const avisoConformidade = React.useMemo(() => {
    if (!checklistCompleto(checklist)) {
      return 'Conclua o checklist de conformidade BPMN e LGPD antes de homologar o processo.'
    }
    if (checklistTemNaoConformidade(checklist)) {
      return 'Há itens marcados como não conformes. Considere solicitar correção antes de homologar.'
    }
    return null
  }, [checklist])

  const podeHomologar = checklistCompleto(checklist) && !checklistTemNaoConformidade(checklist)

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
              Validação & Pareceres
            </p>
            <h1 className="font-serif text-3xl font-semibold leading-tight text-fx-marinho">
              Homologação Técnica
            </h1>
          </div>
          <div className="flex gap-1.5" role="tablist" aria-label="Filtro de processos">
            <Button
              type="button"
              size="sm"
              variant={aba === 'pendentes' ? 'default' : 'outline'}
              role="tab"
              aria-selected={aba === 'pendentes'}
              onClick={() => setAba('pendentes')}
            >
              Pendentes ({pendentes.length})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={aba === 'finalizados' ? 'default' : 'outline'}
              role="tab"
              aria-selected={aba === 'finalizados'}
              onClick={() => setAba('finalizados')}
            >
              Finalizados ({finalizados.length})
            </Button>
          </div>
        </div>

        {erro && (
          <div role="alert" className="rounded-sm border border-fx-alerta/40 bg-fx-alerta/10 px-4 py-3 text-sm text-fx-alerta">
            {erro}
          </div>
        )}
        {aviso && (
          <div role="status" className="flex items-start gap-2 rounded-sm border border-fx-sucesso/40 bg-fx-sucesso/10 px-3.5 py-3 text-sm text-fx-sucesso">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            {aviso}
          </div>
        )}

        <PendingProcessesPage
          processos={aba === 'pendentes' ? pendentes : finalizados}
          onAnalisar={selecionar}
          onPublicar={aba === 'finalizados' ? publicar : undefined}
          publicando={publicando}
          carregando={carregando}
          titulo={aba === 'pendentes' ? 'Processos Pendentes' : 'Processos Finalizados'}
          descricao={
            aba === 'pendentes'
              ? 'Processos enviados pelos colaboradores aguardando análise da supervisão.'
              : 'Processos homologados, publicados e disponíveis para consulta.'
          }
        />

        {!selecionado && (
          <Card>
            <CardContent className="flex items-center gap-2 py-8 text-sm text-fx-cinza">
              <AlertCircle className="h-4 w-4" />
              Selecione um processo na lista para registrar o parecer técnico.
            </CardContent>
          </Card>
        )}

        {selecionado && (
          <>
            {/* Diagrama em largura total */}
            <BPMNReviewPanel processo={selecionado} onFechar={() => setSearchParams({})} />

            {selecionado.status === 'aguardando_validacao' ? (
              <>
                <ValidationChecklist estados={checklist} onAlternar={alternarItem} />
                <TechnicalOpinion
                  parecer={parecer}
                  onParecerChange={setParecer}
                  onDecidir={decidir}
                  enviando={enviando}
                  erro={erroAcao}
                  desabilitado={!podeHomologar && parecer.trim().length === 0}
                  avisoConformidade={avisoConformidade}
                />
              </>
            ) : (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Processo já decidido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0 text-sm text-fx-cinza">
                  <p>
                    Este processo está com status <strong>{selecionado.status}</strong> e não
                    possui pendências de parecer.
                  </p>
                  {selecionado.status === 'aprovado' && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={publicando === selecionado.id}
                      onClick={() => void publicar(selecionado)}
                    >
                      {publicando === selecionado.id && (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      )}
                      Publicar processo
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            <RevisionTimeline processo={selecionado} />
          </>
        )}
      </main>
    </div>
  )
}
