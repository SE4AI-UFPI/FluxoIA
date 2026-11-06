import * as React from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Usuario } from '@/types/auth'
import {
  createInitialProcess,
  fetchProcessoByIdFromApi,
  generateBpmnWithAiFromApi,
  hasRequiredProcessInfo,
  loadProcessDraft,
  mapApiProcessoToWizardState,
  saveBpmnVersionToApi,
  saveProcessDraft,
  submitProcessForValidation,
  submitProcessToApi,
  syncProcessWithApi,
} from '../services/process.service'
import type {
  InterviewAnswerKey,
  ProcessFeedback,
  ProcessInfo,
  ProcessStep,
  ProcessWizardState,
} from '../types/process.types'
import { useVersionControl } from './useVersionControl'

const DEFAULT_INSTITUTIONAL_SECTORS = [
  'SDU: Protocolo',
  'SDU: Licenciamento',
  'SDU: CEU - DAP',
  'SECTI: Governança Digital',
  'SEAD: Gestão de Processos',
]

export function useProcessWizard(user: Usuario) {
  const [searchParams, setSearchParams] = useSearchParams()
  const processoQueryId = searchParams.get('processo')

  const allowedSectors = React.useMemo(() => {
    const userSectors = [...new Set([user.setor, ...(user.setores_vinculados ?? [])].filter(Boolean))]
    if (user.papel === 'admin' || userSectors.length < 2) {
      return [...new Set([...userSectors, ...DEFAULT_INSTITUTIONAL_SECTORS])]
    }
    return userSectors
  }, [user.papel, user.setor, user.setores_vinculados])

  const defaultSector = allowedSectors[0] ?? DEFAULT_INSTITUTIONAL_SECTORS[0]

  const [process, setProcess] = React.useState<ProcessWizardState>(() =>
    loadProcessDraft(user.id, defaultSector),
  )
  const [lastSavedAt, setLastSavedAt] = React.useState<string | null>(null)
  const [isGeneratingBpmn, setIsGeneratingBpmn] = React.useState(false)
  const [aiGenerationError, setAiGenerationError] = React.useState<string | null>(null)
  const versionControl = useVersionControl()

  React.useEffect(() => {
    if (!process.info.sector && defaultSector) {
      setProcess((current) => ({
        ...current,
        info: { ...current.info, sector: defaultSector },
      }))
    }
  }, [defaultSector, process.info.sector])

  React.useEffect(() => {
    if (!processoQueryId || !user.id) return
    let active = true

    fetchProcessoByIdFromApi(processoQueryId)
      .then((apiProcesso) => {
        if (!active) return
        const mapped = mapApiProcessoToWizardState(apiProcesso, user.id, defaultSector)
        setProcess(mapped)
        saveProcessDraft(mapped)
        setLastSavedAt(mapped.updatedAt)
      })
      .catch(() => {
        // Fallback silencioso para o rascunho da sessão
      })

    return () => {
      active = false
    }
  }, [processoQueryId, user.id, defaultSector])

  React.useEffect(() => {
    if (!user.id || process.status === 'Aguardando Validação do Gestor') return
    const timeout = window.setTimeout(() => {
      const saved = saveProcessDraft(process)
      setLastSavedAt(saved.updatedAt)
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [process, user.id])

  async function persistToBackend(snapshot: ProcessWizardState): Promise<string | null> {
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
    setProcess((current) => ({
      ...current,
      info: { ...current.info, [key]: value },
      status: current.step === 1 ? 'Rascunho' : current.status,
    }))
  }

  function updateAnswer(key: InterviewAnswerKey, value: string) {
    setProcess((current) => ({
      ...current,
      answers: { ...current.answers, [key]: value },
      status: 'Em Entrevista',
    }))
  }

  function updateQuestionIndex(questionIndex: number) {
    setProcess((current) => ({ ...current, questionIndex }))
  }

  function updateFeedback<Key extends keyof ProcessFeedback>(key: Key, value: ProcessFeedback[Key]) {
    setProcess((current) => ({ ...current, feedback: { ...current.feedback, [key]: value } }))
  }

  function setStep(step: ProcessStep, status: ProcessWizardState['status']) {
    const nextState: ProcessWizardState = { ...process, step, status }
    setProcess(nextState)
    void persistToBackend(nextState)
  }

  function saveDraft() {
    const saved = saveProcessDraft(process)
    setLastSavedAt(saved.updatedAt)
    void persistToBackend(saved)
  }

  async function generateBpmn() {
    setIsGeneratingBpmn(true)
    setAiGenerationError(null)

    try {
      const backendId = (await persistToBackend(process)) ?? process.backendId
      if (!backendId) {
        throw new Error('Não foi possível sincronizar o processo com o servidor para iniciar a geração por IA.')
      }

      const apiProcesso = await generateBpmnWithAiFromApi(backendId, process.answers)
      const mapped = mapApiProcessoToWizardState(apiProcesso, user.id, defaultSector)
      const nextState: ProcessWizardState = {
        ...mapped,
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

  function requestRegeneration() {
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
        const backendId = (await persistToBackend(process)) ?? process.backendId
        if (!backendId) return
        if (process.bpmnXml && process.history.length === 0) {
          await saveBpmnVersionToApi(backendId, {
            numero_versao: process.version,
            bpmn_xml: process.bpmnXml,
            origem: 'ia',
            motivo_alteracao: 'Versão consolidada para submissão',
          }).catch(() => null)
        }
        const apiSubmitted = await submitProcessToApi(backendId, process.feedback)
        setProcess((current) => ({
          ...current,
          backendId: apiSubmitted.id,
          code: apiSubmitted.codigo ?? current.code,
          sentAt: apiSubmitted.submetido_em ?? current.sentAt,
        }))
      } catch {
        // Mantém submissão local na sessão se a API falhar
      }
    })()
  }

  function startNewProcess() {
    if (processoQueryId) {
      setSearchParams({})
    }
    setAiGenerationError(null)
    const fresh = createInitialProcess(user.id, defaultSector)
    setProcess(fresh)
    saveProcessDraft(fresh)
  }

  return {
    process,
    allowedSectors,
    lastSavedAt,
    isGeneratingBpmn,
    aiGenerationError,
    updateInfo,
    updateAnswer,
    updateQuestionIndex,
    updateFeedback,
    setStep,
    saveDraft,
    generateBpmn,
    requestRegeneration,
    submitForValidation,
    startNewProcess,
  }
}
