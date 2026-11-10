import type { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { InterviewQuestion } from '../services/interview.service'
import type { InterviewAnswerKey, ProcessInfo } from '../types/process.types'
import type { InterviewExportContext } from '../services/interview-export.service'
import { InterviewExportButtons } from './InterviewExportButtons'

export function ReadOnlyDetails({ entries }: { entries: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="space-y-5">
      {entries.map(({ label, value }) => (
        <div key={label} className="min-w-0 space-y-1.5">
          <dt className="text-sm font-semibold text-fx-marinho">{label}</dt>
          <dd className="whitespace-pre-wrap text-sm leading-relaxed text-fx-grafite [overflow-wrap:anywhere]">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function ProcessInfoReadOnly({ info }: { info: ProcessInfo }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Identificação do Processo</CardTitle>
        <CardDescription>Somente leitura · Dados registrados no mapeamento.</CardDescription>
      </CardHeader>
      <CardContent>
        <ReadOnlyDetails entries={[
          { label: 'Nome do Processo', value: info.name.trim() ? info.name : 'Não informado.' },
          { label: 'Setor / Unidade', value: info.sector.trim() ? info.sector : 'Não informado.' },
          { label: 'Objetivo do Processo', value: info.objective.trim() ? info.objective : 'Não informado.' },
          { label: 'Descrição Geral', value: info.description.trim() ? info.description : 'Não informada.' },
          { label: 'Legislação ou Norma Relacionada', value: info.legislation.trim() ? info.legislation : 'Não informada.' },
        ]} />
      </CardContent>
    </Card>
  )
}

export function InterviewReadOnly({ questions, answers, exportContext }: {
  questions: InterviewQuestion[]
  answers: Record<InterviewAnswerKey, string>
  exportContext?: InterviewExportContext
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Entrevista guiada</CardTitle>
        <CardDescription>Somente leitura · Perguntas e respostas registradas no mapeamento.</CardDescription>
        {exportContext && <InterviewExportButtons data={{ questions, answers, context: exportContext }} />}
      </CardHeader>
      <CardContent>
        {questions.length === 0 ? (
          <p role="status" className="text-sm text-fx-grafite">As perguntas da entrevista não estão disponíveis.</p>
        ) : (
          <ol className="divide-y divide-fx-linha">
            {questions.map((question, index) => (
              <li key={question.id} className="min-w-0 py-5 first:pt-0 last:pb-0">
                <h3 className="text-base font-semibold text-fx-marinho [overflow-wrap:anywhere]">
                  {index + 1}. {question.title}
                </h3>
                <p className="mt-1 text-xs text-fx-cinza">{question.required ? 'Obrigatória' : 'Opcional'}</p>
                <dl className="mt-4 space-y-4">
                  <div className="space-y-1.5">
                    <dt className="text-sm font-semibold text-fx-marinho">Pergunta</dt>
                    <dd className="max-w-prose text-sm leading-relaxed text-fx-grafite [overflow-wrap:anywhere]">{question.prompt}</dd>
                  </div>
                  <div className="space-y-1.5 rounded-sm bg-fx-nevoa/40 p-4">
                    <dt className="text-sm font-semibold text-fx-marinho">Resposta</dt>
                    <dd className="max-w-prose whitespace-pre-wrap text-sm leading-relaxed text-fx-marinho [overflow-wrap:anywhere]">
                      {answers[question.id]?.trim() ? answers[question.id] : 'Sem resposta registrada.'}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
