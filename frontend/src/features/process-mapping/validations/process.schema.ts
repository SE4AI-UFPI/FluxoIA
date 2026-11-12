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
  questions?: Array<{ id: string; required: boolean }>,
): Partial<Record<InterviewAnswerKey, string>> {
  if (questions && questions.length > 0) {
    const requiredQuestions = questions.filter((q) => q.required)
    return Object.fromEntries(
      requiredQuestions
        .filter((q) => !(answers[q.id] || '').trim())
        .map((q) => [q.id, 'Responda esta pergunta para continuar.']),
    )
  }

  const required: InterviewAnswerKey[] = [
    'trigger',
    'activities',
    'areasInvolved',
    'sequence',
    'responsibles',
    'approvals',
    'completion',
  ]
  return Object.fromEntries(
    required
      .filter((key) => !(answers[key] || '').trim())
      .map((key) => [key, 'Responda esta pergunta para continuar.']),
  )
}

export function validateFeedback(feedback: ProcessFeedback): boolean {
  return (
    feedback.representsProcess !== null &&
    feedback.accuracyScore >= 1 &&
    feedback.accuracyScore <= 5 &&
    feedback.interviewClarityScore >= 1 &&
    feedback.interviewClarityScore <= 5 &&
    Boolean(feedback.editLevel)
  )
}
