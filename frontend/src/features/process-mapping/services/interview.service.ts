import { apiClient } from '@/services/apiClient'
import type { InterviewAnswerKey } from '../types/process.types'

export interface InterviewQuestion {
  id: InterviewAnswerKey
  title: string
  prompt: string
  required: boolean
}

export interface ApiInterviewQuestion {
  id: string
  chave: InterviewAnswerKey
  ordem: number
  titulo: string
  enunciado: string
  obrigatoria: boolean
  ativa: boolean
}

export const FALLBACK_INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  { id: 'trigger', title: 'In\u00edcio do Processo', prompt: 'O que d\u00e1 in\u00edcio ao processo?', required: true },
  { id: 'activities', title: 'Atividades', prompt: 'Quais atividades s\u00e3o executadas?', required: true },
  { id: 'areasInvolved', title: '\u00c1reas Envolvidas', prompt: 'Quais \u00e1reas participam deste processo e em que etapa atuam?', required: true },
  { id: 'sequence', title: 'Sequ\u00eancia', prompt: 'Qual \u00e9 a ordem das atividades?', required: true },
  { id: 'responsibles', title: 'Respons\u00e1veis', prompt: 'Quem executa cada atividade?', required: true },
  { id: 'approvals', title: 'Aprova\u00e7\u00f5es', prompt: 'Existe alguma etapa de aprova\u00e7\u00e3o?', required: false },
  { id: 'rules', title: 'Regras de Neg\u00f3cio', prompt: 'Existem regras obrigat\u00f3rias?', required: false },
  { id: 'exceptions', title: 'Exce\u00e7\u00f5es', prompt: 'O que acontece quando algo d\u00e1 errado?', required: false },
  { id: 'documents', title: 'Documentos', prompt: 'Quais documentos s\u00e3o utilizados?', required: false },
  { id: 'systems', title: 'Sistemas', prompt: 'Existem sistemas envolvidos?', required: false },
  { id: 'completion', title: 'Encerramento', prompt: 'Quando o processo \u00e9 considerado conclu\u00eddo?', required: false },
]

export async function fetchPerguntasEntrevista(): Promise<InterviewQuestion[]> {
  try {
    const list = await apiClient.get<ApiInterviewQuestion[]>('/api/perguntas-entrevista/')
    if (Array.isArray(list) && list.length > 0) {
      return list.map((item) => ({
        id: item.chave,
        title: item.titulo,
        prompt: item.enunciado,
        required: item.obrigatoria,
      }))
    }
  } catch {
    // Fallback gracioso se a rede falhar
  }
  return FALLBACK_INTERVIEW_QUESTIONS
}

export function getInterviewProgress(questionIndex: number, totalQuestions: number): number {
  if (totalQuestions <= 0) return 0
  return Math.round(((questionIndex + 1) / totalQuestions) * 100)
}
