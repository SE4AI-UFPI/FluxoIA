import * as React from 'react'
import type { Usuario } from '@/types/auth'
import { generateProcessBpmn } from '../services/bpmn.service'
import {
  createInitialProcess,
  loadProcessDraft,
  saveProcessDraft,
  submitProcessForValidation,
} from '../services/process.service'
import type {
  InterviewAnswerKey,
  ProcessFeedback,
  ProcessInfo,
  ProcessStep,
  ProcessWizardState,
} from '../types/process.types'
import { useVersionControl } from './useVersionControl'

export function useProcessWizard(user: Usuario) {
  const allowedSectors = React.useMemo(
    () => [...new Set([user.setor, ...user.setores_vinculados].filter(Boolean))],
    [user.setor, user.setores_vinculados],
  )
  const [process, setProcess] = React.useState<ProcessWizardState>(() =>
    loadProcessDraft(user.id, allowedSectors[0] ?? ''),
  )
  const [lastSavedAt, setLastSavedAt] = React.useState<string | null>(null)
  const versionControl = useVersionControl()

  React.useEffect(() => {
    if (process.status === 'Aguardando Validação do Gestor') return
    const timeout = window.setTimeout(() => {
      const saved = saveProcessDraft(process)
      setLastSavedAt(saved.updatedAt)
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [process])

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
    setProcess((current) => ({ ...current, step, status }))
  }

  function saveDraft() {
    const saved = saveProcessDraft(process)
    setLastSavedAt(saved.updatedAt)
  }

  function generateBpmn() {
    const version = process.bpmnXml
      ? versionControl.nextCorrectionVersion(process.version)
      : versionControl.initialVersion
    const reason = process.bpmnXml ? 'Nova versão gerada após solicitação de ajustes' : 'Geração inicial do fluxo BPMN'
    const bpmnXml = generateProcessBpmn(process.info, process.answers)
    const historyEntry = versionControl.createHistoryEntry({ user: user.nome, version, reason })
    setProcess((current) => ({
      ...current,
      bpmnXml,
      version,
      step: 3,
      status: 'Em Modelagem BPMN',
      updatedAt: new Date().toISOString(),
      history: [...current.history, historyEntry],
    }))
  }

  function requestRegeneration() {
    const reason = process.feedback.generalNotes.trim() || 'Ajustes solicitados durante a avaliação'
    const historyEntry = versionControl.createHistoryEntry({
      user: user.nome,
      version: process.version,
      reason: `Solicitada regeneração: ${reason}`,
    })
    setProcess((current) => ({
      ...current,
      step: 2,
      questionIndex: 0,
      status: 'Em Entrevista',
      history: [...current.history, historyEntry],
    }))
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
  }

  function startNewProcess() {
    const fresh = createInitialProcess(user.id, allowedSectors[0] ?? '')
    setProcess(fresh)
    saveProcessDraft(fresh)
  }

  return {
    process,
    allowedSectors,
    lastSavedAt,
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