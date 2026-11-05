import type { InterviewAnswerKey } from '../types/process.types'

export interface InterviewQuestion {
  id: InterviewAnswerKey
  title: string
  prompt: string
  required: boolean
}

export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  { id: 'trigger', title: 'Início do Processo', prompt: 'O que dá início ao processo?', required: true },
  { id: 'activities', title: 'Atividades', prompt: 'Quais atividades são executadas?', required: true },
  { id: 'areasInvolved', title: 'Áreas Envolvidas', prompt: 'Quais áreas participam deste processo e em que etapa atuam?', required: true },
  { id: 'sequence', title: 'Sequência', prompt: 'Qual é a ordem das atividades?', required: true },
  { id: 'responsibles', title: 'Responsáveis', prompt: 'Quem executa cada atividade?', required: true },
  { id: 'approvals', title: 'Aprovações', prompt: 'Existe alguma etapa de aprovação?', required: false },
  { id: 'rules', title: 'Regras de Negócio', prompt: 'Existem regras obrigatórias?', required: false },
  { id: 'exceptions', title: 'Exceções', prompt: 'O que acontece quando algo dá errado?', required: false },
  { id: 'documents', title: 'Documentos', prompt: 'Quais documentos são utilizados?', required: false },
  { id: 'systems', title: 'Sistemas', prompt: 'Existem sistemas envolvidos?', required: false },
  { id: 'completion', title: 'Encerramento', prompt: 'Quando o processo é considerado concluído?', required: false },
]

export function getInterviewProgress(questionIndex: number): number {
  return Math.round(((questionIndex + 1) / INTERVIEW_QUESTIONS.length) * 100)
}