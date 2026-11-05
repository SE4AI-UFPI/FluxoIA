import { ArrowLeft, ArrowRight, Check, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  getInterviewProgress,
  INTERVIEW_QUESTIONS,
} from '../services/interview.service'
import type { InterviewAnswerKey } from '../types/process.types'

export function InterviewStep({
  answers,
  questionIndex,
  onAnswer,
  onQuestionChange,
  onBack,
  onSave,
  onFinish,
}: {
  answers: Record<InterviewAnswerKey, string>
  questionIndex: number
  onAnswer: (key: InterviewAnswerKey, value: string) => void
  onQuestionChange: (index: number) => void
  onBack: () => void
  onSave: () => void
  onFinish: () => void
}) {
  const question = INTERVIEW_QUESTIONS[questionIndex]
  const progress = getInterviewProgress(questionIndex)
  const firstQuestion = questionIndex === 0
  const lastQuestion = questionIndex === INTERVIEW_QUESTIONS.length - 1

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle className="text-xl">Entrevista Guiada</CardTitle>
            <CardDescription>Responda uma pergunta por vez. Suas respostas são salvas automaticamente nesta sessão.</CardDescription>
          </div>
          <span className="shrink-0 text-xs font-semibold text-fx-cinza">
            Pergunta {questionIndex + 1} de {INTERVIEW_QUESTIONS.length}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-fx-nevoa" aria-label={`Progresso da entrevista: ${progress}%`}>
          <div className="h-full rounded-full bg-fx-azul transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="min-h-48 rounded-sm border border-fx-linha bg-fx-nevoa/25 p-4 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-fx-cinza">{question.title}</p>
          <Label htmlFor={`answer-${question.id}`} className="mt-3 block text-base text-fx-marinho">
            {question.prompt}{question.required ? ' *' : ''}
          </Label>
          <textarea
            id={`answer-${question.id}`}
            value={answers[question.id]}
            onChange={(event) => onAnswer(question.id, event.target.value)}
            rows={5}
            placeholder="Descreva com detalhes as etapas e as informações importantes."
            className="mt-4 w-full resize-y rounded-sm border border-fx-linha bg-white px-3 py-2 text-sm text-fx-grafite placeholder:text-fx-cinza/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fx-azul"
          />
          <p className="mt-2 text-xs text-fx-cinza">
            {question.required ? 'Resposta necessária para concluir a entrevista.' : 'Pergunta opcional.'}
          </p>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-fx-linha/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid gap-2 sm:flex">
            <Button type="button" variant="outline" onClick={firstQuestion ? onBack : () => onQuestionChange(questionIndex - 1)}>
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
            <Button type="button" variant="ghost" onClick={onSave}>
              <Save className="h-4 w-4" /> Salvar Rascunho
            </Button>
          </div>
          {lastQuestion ? (
            <Button type="button" onClick={onFinish}>Finalizar Entrevista <Check className="h-4 w-4" /></Button>
          ) : (
            <Button type="button" onClick={() => onQuestionChange(questionIndex + 1)}>
              Próxima pergunta <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}