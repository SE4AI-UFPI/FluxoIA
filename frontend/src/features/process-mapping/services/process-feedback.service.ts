import type { ApiProcessFeedback, ProcessFeedback } from '../types/process.types'

/** Restore the latest saved evaluation without assuming the API's array order. */
export function restoreSavedFeedback(
  feedbacks: readonly ApiProcessFeedback[] | undefined,
): ProcessFeedback | null {
  const latest = feedbacks?.reduce<ApiProcessFeedback | undefined>((current, feedback) => {
    if (!current || Date.parse(feedback.criado_em) > Date.parse(current.criado_em)) return feedback
    return current
  }, undefined)

  if (!latest) return null

  return {
    representsProcess: latest.representa_processo,
    accuracyScore: latest.nota_precisao_geral,
    editLevel: latest.nivel_edicao_necessario,
    interviewClarityScore: latest.clareza_entrevista,
    identifiedProblems: [...latest.problemas_identificados],
    generalNotes: latest.observacoes,
  }
}
