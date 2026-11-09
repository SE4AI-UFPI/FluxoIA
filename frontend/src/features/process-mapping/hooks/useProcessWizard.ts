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
  resolveWizardStatus,
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
    startFresh ? createInitialProcess(user.id, defaultSector) : loadProcessDraft(user.id, defaultSector),
  )
  const [lastSavedAt, setLastSavedAt] = React.useState<string | null>(() =>
    !startFresh && isProcessStarted(process) ? process.updatedAt : null,
  )
  const [isGeneratingBpmn, setIsGeneratingBpmn] = React.useState(false)
  const [aiGenerationError, setAiGenerationError] = React.useState<string | null>(null)
  const [isSavingLayout, setIsSavingLayout] = React.useState(false)
  const [layoutError, setLayoutError] = React.useState<string | null>(null)
  const [submissionError, setSubmissionError] = React.useState<string | null>(null)
  const versionControl = useVersionControl()

  React.useEffect(() => {
    if (searchParams.get('novo') !== '1') return
    const next = new URLSearchParams(searchParams)
    next.delete('novo')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  React.useEffect(() => {
    if (!process.info.sector && defaultSector) {
      setProcess((current) => ({
        ...current,
        info: { ...current.info, sector: defaultSector },
      }))
    }
  }, [defaultSector, process.info.sector])

  React.useEffect(() => {
    if (processoQueryId || !process.bpmnXml) return
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
  }, [processoQueryId, process.id])

  React.useEffect(() => {
    if (!processoQueryId || !user.id) return
    let active = true

    fetchProcessoByIdFromApi(processoQueryId)
      .then((apiProcesso) => {
        if (!active) return
        const mapped = mapApiProcessoToWizardState(apiProcesso, user.id, defaultSector)
        const localDraftId = reuseLocalDraftId(user.id, defaultSector, apiProcesso.id)
        if (localDraftId) mapped.id = localDraftId
        setProcess(mapped)
        saveProcessDraft(mapped)
        setLastSavedAt(mapped.updatedAt)

        // Reorganiza automaticamente o DI apenas se houver colisão/sobreposição,
        // preservando ajustes manuais feitos pelo usuário em "Editar Layout".
        void aplicarLayoutAutomatico(mapped, apiProcesso.id, { somenteSeNecessario: true })
          .then((normalizado) => {
            if (!active || normalizado === mapped) return
            setProcess(normalizado)
            saveProcessDraft(normalizado)
            setLastSavedAt(normalizado.updatedAt)
          })
          .catch(() => undefined)
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
    if (!isProcessStarted(process)) return
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
      status: resolveWizardStatus(current.status, 'Rascunho'),
    }))
  }

  function updateAnswer(key: InterviewAnswerKey, value: string) {
    setProcess((current) => ({
      ...current,
      answers: { ...current.answers, [key]: value },
      status: resolveWizardStatus(current.status, 'Em Entrevista'),
    }))
  }

  function updateQuestionIndex(questionIndex: number) {
    setProcess((current) => ({ ...current, questionIndex }))
  }

  function updateFeedback<Key extends keyof ProcessFeedback>(key: Key, value: ProcessFeedback[Key]) {
    setProcess((current) => ({ ...current, feedback: { ...current.feedback, [key]: value } }))
  }

  function setStep(step: ProcessStep, status: ProcessWizardState['status']) {
    const nextStatus = resolveWizardStatus(process.status, status)
    const nextState: ProcessWizardState = { ...process, step, status: nextStatus }
    setProcess(nextState)
    void persistToBackend(nextState)
  }

  function saveDraft() {
    const saved = saveProcessDraft(process)
    setLastSavedAt(saved.updatedAt)
    void persistToBackend(saved)
  }

  /**
   * Aplica o auto layout ao diagrama gerado e persiste o resultado.
   *
   * Nenhuma falha aqui pode interromper a geração: se o layout ou o salvamento
   * falharem, o estado recebido é devolvido (com o XML organizado quando possível).
   */
  async function aplicarLayoutAutomatico(
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

      // Etapa de Auto Layout: reorganiza apenas o DI do diagrama recém-gerado.
      // Roda em modo best-effort — se falhar, o XML original da IA é mantido.
      const estadoComLayout = await aplicarLayoutAutomatico(mapped, backendId)

      const nextState: ProcessWizardState = {
        ...estadoComLayout,
        step: 3,
        status: resolveWizardStatus(process.status, 'Em Modelagem BPMN'),
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
    if (!canEditBpmnLayout(process.status)) {
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
      status: resolveWizardStatus(process.status, 'Em Entrevista'),
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
        setSubmissionError(null)
        setProcess((current) => ({
          ...current,
          backendId: apiSubmitted.id,
          code: apiSubmitted.codigo ?? current.code,
          sentAt: apiSubmitted.submetido_em ?? current.sentAt,
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
    const fresh = createInitialProcess(user.id, defaultSector)
    setProcess(fresh)
    setLastSavedAt(null)
  }

  return {
    process,
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
