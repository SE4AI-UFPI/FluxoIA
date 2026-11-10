import type { InterviewQuestion } from './interview.service'
import type { InterviewAnswerKey, ProcessStatus } from '../types/process.types'

export interface InterviewExportContext {
  name: string
  code: string | null
  sector: string
  status: ProcessStatus
  version: string
  updatedAt: string
  authorName: string
}

export interface InterviewExportData {
  questions: readonly InterviewQuestion[]
  answers: Partial<Record<InterviewAnswerKey, string>>
  context: InterviewExportContext
  exportedAt?: Date
}

/** Keep user text literal in Markdown, including HTML, lists and emphasis. */
function literalMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()<>#+.!|~-]/g, '\\$&').replace(/\r\n?/g, '\n').replace(/\n/g, '  \n')
}

export function interviewExportFilename(context: InterviewExportContext): string {
  const name = (context.code || context.name).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100)
  return `${name || 'processo'}-entrevista`
}

export function createInterviewMarkdown({ questions, answers, context, exportedAt = new Date() }: InterviewExportData): string {
  const text = literalMarkdown
  const lines = [
    '# Entrevista do processo', '',
    `**Processo:** ${text(context.name)}`, '',
    `**Código:** ${text(context.code || 'Não atribuído')}`, '',
    `**Setor / Unidade:** ${text(context.sector)}`, '',
    `**Autor:** ${text(context.authorName)}`, '',
    `**Status:** ${text(context.status)}`, '',
    `**Versão:** ${text(context.version)}`, '',
    `**Última atualização:** ${text(context.updatedAt ? new Date(context.updatedAt).toLocaleString('pt-BR') : 'Não informada')}`, '',
    `**Exportado em:** ${text(exportedAt.toLocaleString('pt-BR'))}`, '',
  ]
  for (const [index, question] of questions.entries()) {
    const answer = answers[question.id]
    lines.push(
      `## ${index + 1}. ${text(question.title)}`, '',
      question.required ? 'Obrigatória' : 'Opcional', '',
      '### Pergunta', '', text(question.prompt), '',
      '### Resposta', '', text(answer?.trim() ? answer : 'Sem resposta registrada.'), '',
    )
  }
  if (questions.length === 0) lines.push('As perguntas da entrevista não estão disponíveis.', '')
  return lines.join('\n')
}
