import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProcessFeedback } from '../types/process.types'
import { EDIT_LEVEL_OPTIONS, PROBLEM_TAG_OPTIONS } from '../services/process-feedback.options'
import { ReadOnlyDetails } from './ProcessReadOnly'

export function FeedbackReadOnly({ feedback, hasSavedFeedback }: {
  feedback: ProcessFeedback
  hasSavedFeedback: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Avaliação enviada</CardTitle>
        <CardDescription>Somente leitura · Avaliação da geração do fluxo pela IA.</CardDescription>
      </CardHeader>
      <CardContent>
        {hasSavedFeedback ? (
          <ReadOnlyDetails entries={[
            { label: 'O fluxo representa corretamente o processo?', value: feedback.representsProcess === null ? 'Não informado.' : feedback.representsProcess ? 'Sim, representa' : 'Não representa' },
            { label: 'Precisão geral do fluxo', value: `${feedback.accuracyScore} / 5` },
            { label: 'Nível de edição necessário', value: EDIT_LEVEL_OPTIONS.find(option => option.value === feedback.editLevel)?.label ?? 'Não informado.' },
            { label: 'Clareza da entrevista', value: `${feedback.interviewClarityScore} / 5` },
            { label: 'Problemas identificados', value: feedback.identifiedProblems.length > 0
              ? feedback.identifiedProblems.map(tag => PROBLEM_TAG_OPTIONS.find(option => option.value === tag)?.label ?? tag).join('\n')
              : 'Nenhum problema informado.' },
            { label: 'Observações adicionais', value: feedback.generalNotes.trim() ? feedback.generalNotes : 'Nenhuma observação registrada.' },
          ]} />
        ) : (
          <p className="text-sm leading-relaxed text-fx-grafite">Não há avaliação salva disponível para este processo.</p>
        )}
      </CardContent>
    </Card>
  )
}

