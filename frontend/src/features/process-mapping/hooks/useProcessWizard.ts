import * as React from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import type { Usuario } from '@/types/auth'
import {
  createInitialProcess,
  fetchProcessoByIdFromApi,
  generateBpmnWithAiFromApi,
  hasRequiredProcessInfo,
  loadProcessDraft,
  mapApiProcessoToWizardState,
  reuseLocalDraftId,
  saveBpmnVersionToApi,
  saveBpmnLayoutToApi,
  saveProcessDraft,
  submitProcessForValidation,
  submitProcessToApi,
  syncProcessWithApi,
} from '../services/process.service'
import {
  canEditBpmnLayout,
  diagramaPrecisaLayout,
  gerarLayoutAutomatico,
  MOTIVO_BLOQUEIO_EDICAO,
} from '../services/bpmn-layout.service'
import type {
  InterviewAnswerKey,
  ProcessFeedback,
  ProcessInfo,
  ProcessStep,
  ProcessWizardState,
} from '../types/process.types'
import { SETORES_INSTITUCIONAIS } from '@/constants/institutionalSectors'
import { useVersionControl } from './useVersionControl'

function isProcessStarted(state: ProcessWizardState): boolean {
  return (
    Boolean(state.backendId) ||
    state.step > 1 ||
    Boolean(state.info.name.trim() && state.info.objective.trim()) ||
    Object.values(state.answers).some((val) => Boolean(val?.trim()))
  )
}

export function useProcessWizard(user: Usuario) {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const processoQueryId = searchParams.get('processo')
  // ?novo=1 (dashboard) e a rota /processos/novo (menu) sempre iniciam um novo mapeamento,
  // sem retomar o rascunho de outro processo em andamento.
  const startFresh = searchParams.get('novo') === '1' || (
    location.pathname === '/processos/novo' && !processoQueryId
  )

  const allowedSectors = React.useMemo(() => {
    const userSectors = [...new Set([user.setor, ...(user.setores_vinculados ?? [])].filter(Boolean))]
    if (user.papel === 'admin' || userSectors.length === 0) {
      return [...new Set([...userSectors, ...SETORES_INSTITUCIONAIS])]
    }
    return userSectors
  }, [user.papel, user.setor, user.setores_vinculados])

  const defaultSector = allowedSectors[0] ?? SETORES_INSTITUCIONAIS[0]

  const [process, setProcess] = React.useState<ProcessWizardState>(() =>
    startFresh || processoQueryId ? createInitialProcess(user.id, defaultSector) : loadProcessDraft(user.id, defaultSector),
  )
  const [lastSavedAt, setLastSavedAt] = React.useState<string | null>(() =>
    !startFresh && isProcessStarted(process) ? process.updatedAt : null,
  )
  const [isGeneratingBpmn, setIsGeneratingBpmn] = React.useState(false)
  const [aiGenerationError, setAiGenerationError] = React.useState<string | null>(null)
  const [isSavingLayout, setIsSavingLayout] = React.useState(false)
  const [layoutError, setLayoutError] = React.useState<string | null>(null)
  const [submissionError, setSubmissionError] = React.useState<string | null>(null)
  const [consultationStep, setConsultationStep] = React.useState<ProcessStep | null>(null)
  const [loadResult, setLoadResult] = React.useState<{ key: string; error: string | null } | null>(null)
  const [loadAttempt, setLoadAttempt] = React.useState(0)
  const loadKey = `${user.id}:${processoQueryId}:${loadAttempt}`
  const isLoadingProcess = Boolean(processoQueryId && loadResult?.key !== loadKey)
  const loadError = processoQueryId && loadResult?.key === loadKey ? loadResult.error : null
  const isReadOnly = !canEditBpmnLayout(process.status) || process.ownerId !== user.id
  const canMutate = Boolean(user.id) && !isReadOnly && !isLoadingProcess && !loadError
  const viewedStep = isReadOnly ? consultationStep ?? process.step : process.step
  const versionControl = useVersionControl()

  /**
   * Aplica o auto layout ao diagrama gerado e persiste o resultado.
   *
   * Nenhuma falha aqui pode interromper a geração: se o layout ou o salvamento
   * falharem, o estado recebido é devolvido (com o XML organizado quando possível).
   */
  const aplicarLayoutAutomatico = React.useCallback(async function aplicarLayoutAutomatico(
    estado: ProcessWizardState,
    backendId: string,
    opcoes: { somenteSeNecessario?: boolean } = {},
  ): Promise<ProcessWizardState> {
    if (!estado.bpmnXml) return estado
    if (!canEditBpmnLayout(estado.status)) return estado

    // Evita reescrever diagramas que já estão corretos (idempotência).
    if (opcoes.somenteSeNecessario && !diagramaPrecisaLayout(estado.bpmnXml)) return estado

    let organizado: string
    try {
      organizado = await gerarLayoutAutomatico(estado.bpmnXml)
    } catch {
      return estado
    }
    if (!organizado || organizado === estado.bpmnXml) return estado

    try {
      const atualizado = await saveBpmnLayoutToApi(backendId, organizado)
      const remapeado = mapApiProcessoToWizardState(atualizado, user.id, defaultSector)
      return { ...remapeado, bpmnXml: organizado }
    } catch {
      // Persistência best-effort: o diagrama organizado segue no rascunho local.
      return { ...estado, bpmnXml: organizado }
    }
  }, [user.id, defaultSector])

  React.useEffect(() => {
    if (searchParams.get('novo') !== '1') return
    const next = new URLSearchParams(searchParams)
    next.delete('novo')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  React.useEffect(() => {
    if (processoQueryId || !process.bpmnXml || !canMutate) return
    if (!diagramaPrecisaLayout(process.bpmnXml)) return
    let active = true
    void gerarLayoutAutomatico(process.bpmnXml)
      .then((organizado) => {
        if (!active || !organizado || organizado === process.bpmnXml) return
        setProcess((current) => ({ ...current, bpmnXml: organizado }))
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [processoQueryId, process.id, process.bpmnXml, canMutate])

  React.useEffect(() => {
    if (!processoQueryId || !user.id) return
    const cancellation = new AbortController()

    fetchProcessoByIdFromApi(processoQueryId)
      .then((apiProcesso) => {
        if (cancellation.signal.aborted) return
        const mapped = mapApiProcessoToWizardState(apiProcesso, user.id, defaultSector)
        const editable = canEditBpmnLayout(mapped.status) && mapped.ownerId === user.id
        const localDraftId = editable ? reuseLocalDraftId(user.id, defaultSector, apiProcesso.id) : null
        if (localDraftId) mapped.id = localDraftId
        setProcess(mapped)
        setConsultationStep(null)
        setLoadResult({ key: loadKey, error: null })
        if (editable) saveProcessDraft(mapped)
        setLastSavedAt(mapped.updatedAt)

        // Reorganiza automaticamente o DI ao abrir em modo best-effort.
        if (!editable) return
        void aplicarLayoutAutomatico(mapped, apiProcesso.id)
          .then((normalizado) => {
            if (cancellation.signal.aborted || normalizado === mapped) return
            setProcess(normalizado)
            saveProcessDraft(normalizado)
            setLastSavedAt(normalizado.updatedAt)
          })
          .catch(() => undefined)
      })
      .catch((error) => {
        if (cancellation.signal.aborted) return
        setLoadResult({
          key: loadKey,
          error: error instanceof Error ? error.message : 'Não foi possível carregar o processo.',
        })
      })

    return () => {
      cancellation.abort()
    }
  }, [processoQueryId, user.id, defaultSector, loadKey, aplicarLayoutAutomatico])

  React.useEffect(() => {
    if (!canMutate) return
    if (!isProcessStarted(process)) return
    const timeout = window.setTimeout(() => {
      const saved = saveProcessDraft(process)
      setLastSavedAt(saved.updatedAt)
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [process, canMutate])

  async function persistToBackend(snapshot: ProcessWizardState): Promise<string | null> {
    if (!canMutate || !canEditBpmnLayout(snapshot.status)) return null
    if (!hasRequiredProcessInfo(snapshot.info)) return snapshot.backendId ?? null
    try {
      const synced = await syncProcessWithApi(snapshot, user.secretaria)
      if (synced?.id) {
        setProcess((current) => ({
          ...current,
          backendId: synced.id,
          code: synced.codigo ?? current.code,
        }))
        return synced.id
      }
    } catch {
      // Mantém funcionamento via sessionStorage se a API não estiver acessível
    }
    return snapshot.backendId ?? null
  }

  function updateInfo<Key extends keyof ProcessInfo>(key: Key, value: ProcessInfo[Key]) {
    if (!canMutate) return
    setProcess((current) => ({
      ...current,
      info: { ...current.info, [key]: value },
      status: current.step === 1 ? 'Rascunho' : current.status,
    }))
  }

  function updateAnswer(key: InterviewAnswerKey, value: string) {
    if (!canMutate) return
    setProcess((current) => ({
      ...current,
      answers: { ...current.answers, [key]: value },
      status: 'Em Entrevista',
    }))
  }

  function updateQuestionIndex(questionIndex: number) {
    if (!canMutate) return
    setProcess((current) => ({ ...current, questionIndex }))
  }

  function updateFeedback<Key extends keyof ProcessFeedback>(key: Key, value: ProcessFeedback[Key]) {
    if (!canMutate) return
    setProcess((current) => ({ ...current, feedback: { ...current.feedback, [key]: value } }))
  }

  function setStep(step: ProcessStep, status: ProcessWizardState['status']) {
    if (!canMutate) return
    const nextState: ProcessWizardState = { ...process, step, status }
    setProcess(nextState)
    void persistToBackend(nextState)
  }

  function saveDraft() {
    if (!canMutate) return
    const saved = saveProcessDraft(process)
    setLastSavedAt(saved.updatedAt)
    void persistToBackend(saved)
  }

  async function generateBpmn() {
    if (!canMutate) return
    setIsGeneratingBpmn(true)
    setAiGenerationError(null)

    try {
      const backendId = (await persistToBackend(process)) ?? process.backendId
      if (!backendId) {
        throw new Error('Não foi possível sincronizar o processo com o servidor para iniciar a geração por IA.')
      }

      const apiProcesso = await generateBpmnWithAiFromApi(backendId, process.answers)
      const mapped = mapApiProcessoToWizardState(apiProcesso, user.id, defaultSector)

      // Etapa de Auto Layout: reorganiza apenas o DI do diagrama recém-gerado.
      // Roda em modo best-effort — se falhar, o XML original da IA é mantido.
      const estadoComLayout = await aplicarLayoutAutomatico(mapped, backendId)

      const nextState: ProcessWizardState = {
        ...estadoComLayout,
        step: 3,
        status: 'Em Modelagem BPMN',
      }
      setProcess(nextState)
      saveProcessDraft(nextState)
      setLastSavedAt(nextState.updatedAt)
    } catch (error) {
      setAiGenerationError(
        error instanceof Error
          ? error.message
          : 'Não foi possível gerar o diagrama BPMN com a IA. Verifique a configuração do provedor no backend.',
      )
    } finally {
      setIsGeneratingBpmn(false)
    }
  }

  async function saveBpmnLayout(xml: string) {
    if (!canMutate) {
      setLayoutError(MOTIVO_BLOQUEIO_EDICAO)
      throw new Error(MOTIVO_BLOQUEIO_EDICAO)
    }

    setIsSavingLayout(true)
    setLayoutError(null)
    try {
      const backendId = process.backendId ?? (await persistToBackend(process))
      if (backendId) {
        await saveBpmnLayoutToApi(backendId, xml)
      }

      const historyEntry = versionControl.createHistoryEntry({
        user: user.nome,
        version: process.version,
        reason: 'Ajuste visual de layout (sem alteração funcional)',
      })
      const nextState: ProcessWizardState = {
        ...process,
        backendId: backendId ?? process.backendId,
        bpmnXml: xml,
        history: [...process.history, historyEntry],
      }
      const saved = saveProcessDraft(nextState)
      setProcess(saved)
      setLastSavedAt(saved.updatedAt)
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar os ajustes de layout do diagrama.'
      setLayoutError(mensagem)
      throw new Error(mensagem)
    } finally {
      setIsSavingLayout(false)
    }
  }

  function requestRegeneration() {
    if (!canMutate) return
    const reason = process.feedback.generalNotes.trim() || 'Ajustes solicitados durante a avaliação'
    const historyEntry = versionControl.createHistoryEntry({
      user: user.nome,
      version: process.version,
      reason: `Solicitada regeneração: ${reason}`,
    })
    const nextState: ProcessWizardState = {
      ...process,
      step: 2,
      questionIndex: 0,
      status: 'Em Entrevista',
      history: [...process.history, historyEntry],
    }
    setProcess(nextState)
    void persistToBackend(nextState)
  }

  function submitForValidation() {
    if (!canMutate) return
    setConsultationStep(null)
    const submittedAt = new Date().toISOString()
    const historyEntry = versionControl.createHistoryEntry({
      user: user.nome,
      version: process.version,
      reason: 'Fluxo confirmado e enviado para validação do gestor',
    })
    const submitted = submitProcessForValidation(
      { ...process, history: [...process.history, historyEntry] },
      user.nome,
    )
    setProcess({ ...submitted, sentAt: submittedAt })

    void (async () => {
      try {
        const backendId =
          process.backendId ?? (await persistToBackend({ ...process, status: 'Em Avaliação', step: 4 }))
        if (!backendId) {
          throw new Error('Não foi possível sincronizar o processo com o servidor para envio.')
        }

        // Após correção solicitada o processo está em "Ajustes Solicitados":
        // é necessário retorná-lo para "Em Avaliação" antes de submeter.
        if (process.status !== 'Em Avaliação') {
          await syncProcessWithApi(
            { ...process, status: 'Em Avaliação', step: 4 },
            user.secretaria,
          )
        }

        if (process.bpmnXml && process.history.length === 0) {
          await saveBpmnVersionToApi(backendId, {
            numero_versao: process.version,
            bpmn_xml: process.bpmnXml,
            origem: 'ia',
            motivo_alteracao: 'Versão consolidada para submissão',
          }).catch(() => null)
        }
        const apiSubmitted = await submitProcessToApi(backendId, process.feedback)
        const submittedState = mapApiProcessoToWizardState(apiSubmitted, user.id, defaultSector)
        setSubmissionError(null)
        setProcess((current) => ({
          ...current,
          backendId: apiSubmitted.id,
          code: apiSubmitted.codigo ?? current.code,
          sentAt: apiSubmitted.submetido_em ?? current.sentAt,
          feedback: submittedState.hasSavedFeedback ? submittedState.feedback : current.feedback,
          hasSavedFeedback: submittedState.hasSavedFeedback,
        }))
      } catch (error) {
        setSubmissionError(
          error instanceof Error
            ? error.message
            : 'Não foi possível enviar o processo para validação.',
        )
        // Reverte o estado otimista: o processo continua em avaliação no servidor.
        setProcess((current) => ({ ...current, status: 'Em Avaliação', step: 4 }))
      }
    })()
  }

  function startNewProcess() {
    if (processoQueryId) {
      setSearchParams({})
    }
    setAiGenerationError(null)
    setConsultationStep(null)
    setSubmissionError(null)
    setLayoutError(null)
    const fresh = createInitialProcess(user.id, defaultSector)
    setProcess(fresh)
    setLastSavedAt(null)
  }

  return {
    process,
    viewedStep,
    isReadOnly,
    isLoadingProcess,
    loadError,
    retryLoad: () => setLoadAttempt(attempt => attempt + 1),
    selectConsultationStep: (step: ProcessStep) => {
      if (isReadOnly && !isLoadingProcess && !loadError) setConsultationStep(step)
    },
    allowedSectors,
    lastSavedAt,
    isGeneratingBpmn,
    aiGenerationError,
    isSavingLayout,
    layoutError,
    submissionError,
    updateInfo,
    updateAnswer,
    updateQuestionIndex,
    updateFeedback,
    setStep,
    saveDraft,
    generateBpmn,
    saveBpmnLayout,
    requestRegeneration,
    submitForValidation,
    startNewProcess,
  }
}
