import type { InterviewAnswerKey, ProcessFeedback, ProcessInfo } from '../types/process.types'

export type ProcessInfoErrors = Partial<Record<keyof ProcessInfo, string>>

export function validateProcessInfo(info: ProcessInfo): ProcessInfoErrors {
  const errors: ProcessInfoErrors = {}
  if (!info.name.trim()) errors.name = 'Informe o nome do processo.'
  if (!info.sector.trim()) errors.sector = 'Selecione o setor ou unidade.'
  if (!info.objective.trim()) errors.objective = 'Descreva o objetivo principal.'
  return errors
}

export function getInterviewErrors(
  answers: Record<InterviewAnswerKey, string>,
): Partial<Record<InterviewAnswerKey, string>> {
  const required: InterviewAnswerKey[] = ['trigger', 'activities', 'areasInvolved', 'sequence', 'responsibles']
  return Object.fromEntries(
    required
      .filter((key) => !answers[key].trim())
      .map((key) => [key, 'Responda esta pergunta para continuar.']),
  )
}

export function validateFeedback(feedback: ProcessFeedback): boolean {
  return feedback.representsProcess !== null
}