import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Check, Save, Trash2 } from 'lucide-react'
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

  const { process } = wizard

  function saveDraft() {
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
    const errors = getInterviewErrors(process.answers)
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
            <h1 className="font-serif text-3xl font-semibold leading-tight text-fx-marinho">Novo Processo</h1>
          </div>
          <div className="flex items-center gap-2">
            <ProcessStatus status={process.status} />
            {canDeleteProcess(process.status) && (
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
            {process.status !== 'Aguardando Validação do Gestor' && (
              <Button type="button" variant="outline" size="sm" onClick={saveDraft}>
                <Save className="h-4 w-4" /> <span className="hidden sm:inline">Salvar Rascunho</span>
              </Button>
            )}
          </div>
        </div>

        <ProcessWizard currentStep={process.step} />

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

        {process.step === 1 && (
          <ProcessInfoStep
            info={process.info}
            sectors={wizard.allowedSectors}
            errors={infoErrors}
            lastSavedAt={wizard.lastSavedAt}
            onChange={(key, value) => wizard.updateInfo(key, value)}
            onSave={saveDraft}
            onNext={continueToInterview}
          />
        )}
        {process.step === 2 && (
          <InterviewStep
            questions={questions}
            answers={process.answers}
            questionIndex={process.questionIndex}
            onAnswer={wizard.updateAnswer}
            onQuestionChange={wizard.updateQuestionIndex}
            onBack={() => changeStep(1, 'Rascunho')}
            onSave={saveDraft}
            onFinish={finishInterview}
          />
        )}
        {process.step === 3 && (
          <BPMNGenerationStep
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
        {process.step === 4 && (
          <FeedbackStep
            process={process}
            feedback={process.feedback}
            onFeedbackChange={wizard.updateFeedback}
            onBack={() => changeStep(3, 'Em Modelagem BPMN')}
            onRegenerate={() => {
              wizard.requestRegeneration()
              setPageError(null)
            }}
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

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-fx-linha/70 pt-3 text-xs text-fx-cinza">
          <span>UFPI · FÁBRICA DE IA DO PIAUÍ · SECTI</span>
          <span>Rascunhos armazenados nesta sessão do navegador</span>
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