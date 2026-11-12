import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, ArrowRight, Check, Save, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { PAPEL_LABEL, type Usuario } from '@/types/auth'
import { BPMNGenerationStep } from '../components/BPMNGenerationStep'
import { ProcessDeletionDialog } from '../components/ProcessDeletionDialog'
import { FeedbackStep } from '../components/FeedbackStep'
import { InterviewStep } from '../components/InterviewStep'
import { ProcessInfoStep } from '../components/ProcessInfoStep'
import { ProcessStatus } from '../components/ProcessStatus'
import { ProcessWizard } from '../components/ProcessWizard'
import { useProcessWizard } from '../hooks/useProcessWizard'
import {
  canDeleteProcess,
  deleteProcessFromApi,
  discardProcessDraft,
} from '../services/process.service'
import {
  fetchPerguntasEntrevista,
  FALLBACK_INTERVIEW_QUESTIONS,
  type InterviewQuestion,
} from '../services/interview.service'
import type { InterviewAnswerKey, ProcessStep } from '../types/process.types'
import { getInterviewErrors, validateFeedback, validateProcessInfo } from '../validations/process.schema'

const EMPTY_USER: Usuario = {
  id: '',
  email: '',
  nome: '',
  papel: 'operacional',
  secretaria: '',
  setor: '',
  cargo: '',
  matricula: null,
  cpf: null,
  telefone: '',
  setores_vinculados: [],
  permissoes: [],
  is_active: false,
  criado_em: '',
  atualizado_em: '',
}

export function ProcessMappingPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [infoErrors, setInfoErrors] = React.useState<ReturnType<typeof validateProcessInfo>>({})
  const [pageError, setPageError] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [deleteReason, setDeleteReason] = React.useState('')
  const [deleteError, setDeleteError] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [questions, setQuestions] = React.useState<InterviewQuestion[]>(FALLBACK_INTERVIEW_QUESTIONS)
  const wizard = useProcessWizard(user ?? EMPTY_USER)
  const stepContentRef = React.useRef<HTMLElement>(null)
  const focusStepRef = React.useRef(false)

  React.useLayoutEffect(() => {
    if (!focusStepRef.current) return
    focusStepRef.current = false
    stepContentRef.current?.focus({ preventScroll: true })
  }, [wizard.viewedStep])

  React.useEffect(() => {
    let active = true
    fetchPerguntasEntrevista().then((data) => {
      if (active && data.length > 0) {
        setQuestions(data)
      }
    })
    return () => {
      active = false
    }
  }, [])

  if (!user) return null

  if (wizard.isLoadingProcess || wizard.loadError) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-8 text-fx-grafite">
        <h1 className="font-serif text-2xl font-semibold text-fx-marinho">Mapeamento de Processos</h1>
        {wizard.isLoadingProcess ? (
          <p role="status">Carregando processo…</p>
        ) : (
          <div role="alert" className="space-y-2">
            <p className="font-semibold">Não foi possível abrir o processo.</p>
            <p>{wizard.loadError}</p>
            <p>Confira sua conexão e se você tem acesso a este processo.</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate('/')}>Voltar ao painel</Button>
          {wizard.loadError && <Button onClick={wizard.retryLoad}>Tentar novamente</Button>}
        </div>
      </main>
    )
  }

  const { process } = wizard

  function saveDraft() {
    if (!process.info.name.trim()) {
      setPageError('Informe ao menos o nome do processo antes de salvar um rascunho.')
      setNotice(null)
      return
    }
    wizard.saveDraft()
    setPageError(null)
    setNotice('Rascunho salvo nesta sessão.')
  }

  function continueToInterview() {
    const errors = validateProcessInfo(process.info)
    setInfoErrors(errors)
    setPageError(null)
    setNotice(null)
    if (Object.keys(errors).length > 0) return
    wizard.setStep(2, 'Em Entrevista')
  }

  function finishInterview() {
    const errors = getInterviewErrors(process.answers, questions)
    const firstMissingKey = Object.keys(errors)[0] as InterviewAnswerKey | undefined
    if (firstMissingKey) {
      const questionIndex = questions.findIndex(({ id }) => id === firstMissingKey)
      wizard.updateQuestionIndex(Math.max(0, questionIndex))
      setPageError('Responda às perguntas obrigatórias para finalizar a entrevista.')
      return
    }
    setPageError(null)
    wizard.setStep(3, 'Em Modelagem BPMN')
  }

  function continueToFeedback() {
    if (!process.bpmnXml) {
      setPageError('Gere o fluxo BPMN antes de iniciar a avaliação.')
      return
    }
    setPageError(null)
    wizard.setStep(4, 'Em Avaliação')
  }

  function confirmFlow() {
    if (!validateFeedback(process.feedback)) {
      setPageError('Informe se o fluxo representa corretamente o processo.')
      return
    }
    wizard.submitForValidation()
    setPageError(null)
  }

  async function confirmDeleteProcess() {
    if (!user) return
    if (!canDeleteProcess(process.status)) {
      setDeleteError('Este processo não pode ser excluído neste status.')
      return
    }

    setIsDeleting(true)
    setDeleteError(null)
    try {
      if (process.backendId) {
        await deleteProcessFromApi(process.backendId, deleteReason)
      }
      discardProcessDraft(user.id, process.id)
      setDeleteDialogOpen(false)
      navigate('/', { replace: true })
    } catch (deleteError) {
      setDeleteError(deleteError instanceof Error ? deleteError.message : 'Não foi possível excluir o processo.')
    } finally {
      setIsDeleting(false)
    }
  }

  function changeStep(step: ProcessStep, status: Parameters<typeof wizard.setStep>[1]) {
    wizard.setStep(step, status)
    setPageError(null)
  }

  const isLocked = wizard.isReadOnly

  function handleSelectWizardStep(targetStep: ProcessStep) {
    if (isLocked) {
      focusStepRef.current = true
      wizard.selectConsultationStep(targetStep)
      setPageError(null)
      setNotice(null)
      return
    }
    if (targetStep === 1) {
      changeStep(1, process.status === 'Ajustes Solicitados' ? 'Ajustes Solicitados' : 'Rascunho')
      return
    }
    const errors = validateProcessInfo(process.info)
    setInfoErrors(errors)
    if (Object.keys(errors).length > 0) {
      setPageError('Preencha os dados iniciais obrigatórios antes de avançar.')
      return
    }
    if (targetStep === 2) {
      changeStep(2, process.status === 'Ajustes Solicitados' ? 'Ajustes Solicitados' : 'Em Entrevista')
      return
    }
    if (targetStep === 3) {
      finishInterview()
      return
    }
    if (targetStep === 4) {
      continueToFeedback()
    }
  }

  const latestAdjustmentNote = (() => {
    if (isLocked) return null
    for (let idx = process.history.length - 1; idx >= 0; idx -= 1) {
      const entry = process.history[idx]
      if (
        entry.reason.startsWith('Fluxo confirmado e enviado para validação') ||
        entry.reason.startsWith('Homologado pela supervisão:')
      ) {
        return null
      }
      const isCorrecao = entry.reason.startsWith('Correção solicitada:')
      const isDevolvido = entry.reason.startsWith('Devolvido para refazer:')
      if (isCorrecao || isDevolvido) {
        const rawText = entry.reason
          .replace(/^(Correção solicitada|Devolvido para refazer):\s*/i, '')
          .trim()
        const matchNaoConformes = rawText.match(/^\[Não conformidades:\s*([^\]]+)\]\s*(.*)$/is)
        const nonCompliances = matchNaoConformes
          ? matchNaoConformes[1]
              .split('|')
              .map((item) => item.trim())
              .filter(Boolean)
          : []
        const cleanNote = matchNaoConformes ? matchNaoConformes[2].trim() : rawText

        return {
          type: isDevolvido ? ('rejeitado' as const) : ('ajustes_solicitados' as const),
          reviewer: entry.user,
          date: new Date(entry.date).toLocaleString('pt-BR'),
          version: entry.version,
          nonCompliances,
          note: cleanNote,
        }
      }
    }
    return null
  })()

  return (
    <div className="min-h-screen bg-fx-fundo text-fx-grafite">
      <header className="border-b border-fx-linha bg-fx-papel">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label="Voltar ao painel" title="Voltar ao painel" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <img src="/logo/fluxoia-horizontal-cor.svg" alt="FluxoIA" className="h-7 w-auto select-none sm:h-8" />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden min-w-0 flex-col items-end sm:flex">
              <span className="max-w-48 truncate text-sm font-semibold text-fx-marinho">{user.nome}</span>
              <span className="max-w-48 truncate text-xs text-fx-cinza">{user.email}</span>
            </div>
            <Badge variant="secondary" className="hidden sm:inline-flex">{PAPEL_LABEL[user.papel]}</Badge>
            <Button variant="outline" size="sm" onClick={logout}>Sair</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-fx-cinza">Mapeamento de Processos</p>
            <h1 className="font-serif text-3xl font-semibold leading-tight text-fx-marinho">
              {process.info.name.trim() || 'Novo Processo'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ProcessStatus status={process.status} />
            {!isLocked && canDeleteProcess(process.status) && Boolean(process.backendId || wizard.lastSavedAt) && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  setDeleteError(null)
                  setDeleteDialogOpen(true)
                }}
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Excluir Processo</span>
                <span className="sm:hidden">Excluir</span>
              </Button>
            )}
            {!isLocked && (
              <Button type="button" variant="outline" size="sm" onClick={saveDraft}>
                <Save className="h-4 w-4" /> <span className="hidden sm:inline">Salvar Rascunho</span>
              </Button>
            )}
          </div>
        </div>

        <ProcessWizard
          currentStep={wizard.viewedStep}
          completedThrough={isLocked ? process.step : undefined}
          onSelectStep={handleSelectWizardStep}
        />

        {isLocked && (
          <p className="text-sm leading-relaxed text-fx-marinho">
            Somente leitura. Selecione uma etapa para consultar os dados registrados. O processo permanece com o status “{process.status}”.
          </p>
        )}

        {latestAdjustmentNote && (
          <div
            role="region"
            aria-label="Parecer da supervisão para correção"
            className="flex flex-col gap-3.5 rounded-sm border border-amber-500/50 bg-amber-50/95 px-4 py-4 text-sm text-amber-950 shadow-xs"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-amber-950">
                      {latestAdjustmentNote.type === 'rejeitado'
                        ? `Processo devolvido para refazer por ${latestAdjustmentNote.reviewer}`
                        : `Correção solicitada por ${latestAdjustmentNote.reviewer}`}
                    </p>
                    <span className="rounded bg-amber-200/70 px-1.5 py-0.5 text-[11px] font-medium text-amber-900">
                      v{latestAdjustmentNote.version} · {latestAdjustmentNote.date}
                    </span>
                  </div>

                  {latestAdjustmentNote.nonCompliances.length > 0 && (
                    <div className="space-y-1.5 rounded-sm border border-amber-400/50 bg-white/75 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-900">
                        Itens não conformes apontados no checklist ({latestAdjustmentNote.nonCompliances.length})
                      </p>
                      <ul className="list-disc space-y-0.5 pl-4 text-xs text-amber-950">
                        {latestAdjustmentNote.nonCompliances.map((item) => (
                          <li key={item} className="font-medium">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {latestAdjustmentNote.note && (
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                        Parecer Técnico do Supervisor
                      </p>
                      <p className="whitespace-pre-line text-xs leading-relaxed text-amber-950">
                        {latestAdjustmentNote.note}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {process.step !== 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => changeStep(2, process.status)}
                  >
                    Revisar Entrevista
                  </Button>
                )}
                {process.step !== 3 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => changeStep(3, process.status)}
                  >
                    Ir ao Diagrama BPMN
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {pageError && (
          <div role="alert" className="flex items-start gap-2 rounded-sm border border-fx-alerta/40 bg-fx-alerta/10 px-3.5 py-3 text-sm text-fx-alerta">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{pageError}</span>
          </div>
        )}
        {notice && (
          <div role="status" className="flex items-start gap-2 rounded-sm border border-fx-sucesso/40 bg-fx-sucesso/10 px-3.5 py-3 text-sm text-fx-sucesso">
            <Check className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        <section ref={stepContentRef} tabIndex={-1} aria-label="Conteúdo da etapa selecionada" className="space-y-5 focus-visible:outline-2 focus-visible:outline-fx-azul">
        {wizard.viewedStep === 1 && (
          <ProcessInfoStep
            readOnly={isLocked}
            info={process.info}
            sectors={wizard.allowedSectors}
            errors={infoErrors}
            lastSavedAt={wizard.lastSavedAt}
            onChange={(key, value) => wizard.updateInfo(key, value)}
            onSave={saveDraft}
            onNext={continueToInterview}
          />
        )}
        {wizard.viewedStep === 2 && (process.ownerId !== user.id ? (
          <p className="rounded-sm border border-fx-linha bg-fx-papel p-5 text-sm text-fx-grafite">A entrevista só pode ser consultada pelo autor do mapeamento.</p>
        ) : (
          <InterviewStep
            readOnly={isLocked}
            exportContext={{
              name: process.info.name,
              code: process.code,
              sector: process.info.sector,
              status: process.status,
              version: process.version,
              updatedAt: process.updatedAt,
              authorName: user.nome,
            }}
            questions={questions}
            answers={process.answers}
            questionIndex={process.questionIndex}
            onAnswer={wizard.updateAnswer}
            onQuestionChange={wizard.updateQuestionIndex}
            onBack={() => changeStep(1, 'Rascunho')}
            onSave={saveDraft}
            onFinish={finishInterview}
          />
        ))}
        {wizard.viewedStep === 3 && (
          <BPMNGenerationStep
            readOnly={isLocked}
            process={process}
            lastSavedAt={wizard.lastSavedAt}
            isGenerating={wizard.isGeneratingBpmn}
            generationError={wizard.aiGenerationError}
            isSavingLayout={wizard.isSavingLayout}
            layoutError={wizard.layoutError}
            onGenerate={wizard.generateBpmn}
            onBack={() => changeStep(2, 'Em Entrevista')}
            onContinue={continueToFeedback}
            onSave={saveDraft}
            onSaveLayout={wizard.saveBpmnLayout}
          />
        )}
        {wizard.viewedStep === 4 && (
          <FeedbackStep
            readOnly={isLocked}
            process={process}
            feedback={process.feedback}
            onFeedbackChange={wizard.updateFeedback}
            onBack={() => changeStep(3, 'Em Modelagem BPMN')}
            onConfirm={confirmFlow}
            onNewProcess={() => {
              wizard.startNewProcess()
              setPageError(null)
              setNotice(null)
            }}
            onSaveLayout={wizard.saveBpmnLayout}
            isSavingLayout={wizard.isSavingLayout}
            layoutError={wizard.layoutError}
            submissionError={wizard.submissionError}
          />
        )}
        </section>

        {isLocked && (
          <div className="flex flex-wrap justify-between gap-3">
            <Button variant="outline" disabled={wizard.viewedStep === 1} onClick={() => handleSelectWizardStep((wizard.viewedStep - 1) as ProcessStep)}>
              <ArrowLeft className="h-4 w-4" /> Etapa anterior
            </Button>
            <Button variant="outline" disabled={wizard.viewedStep === 4} onClick={() => handleSelectWizardStep((wizard.viewedStep + 1) as ProcessStep)}>
              Próxima etapa <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-fx-linha/70 pt-3 text-xs text-fx-cinza">
          <span>UFPI · FÁBRICA DE IA DO PIAUÍ · SECTI</span>
          <span>{isLocked ? 'Consulta sem alteração dos dados registrados' : 'Rascunhos armazenados nesta sessão do navegador'}</span>
        </footer>
      </main>
      <ProcessDeletionDialog
        open={deleteDialogOpen}
        reason={deleteReason}
        error={deleteError}
        isSubmitting={isDeleting}
        onReasonChange={setDeleteReason}
        onCancel={() => {
          setDeleteDialogOpen(false)
          setDeleteError(null)
        }}
        onConfirm={() => void confirmDeleteProcess()}
      />
    </div>
  )
}
