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
  {
    id: 'trigger',
    title: 'In\u00edcio do Processo',
    prompt:
      'O que d\u00e1 in\u00edcio ao processo? Quem \u00e9 o solicitante inicial (\u00e9 um requerente externo como cidad\u00e3o/empresa, ou \u00e9 uma unidade interna da Secretaria/\u00f3rg\u00e3o)?',
    required: true,
  },
  {
    id: 'activities',
    title: 'Atividades Principais',
    prompt:
      'Quais atividades principais s\u00e3o executadas ao longo do processo, desde o recebimento at\u00e9 a conclus\u00e3o final?',
    required: true,
  },
  {
    id: 'areasInvolved',
    title: '\u00c1reas e Unidades Envolvidas',
    prompt: 'Quais \u00e1reas, diretorias ou unidades participam deste processo e em qual momento cada uma atua?',
    required: true,
  },
  {
    id: 'sequence',
    title: 'Sequ\u00eancia da Tramita\u00e7\u00e3o',
    prompt: 'Qual \u00e9 a ordem sequencial em que as atividades tramitam entre os setores?',
    required: true,
  },
  {
    id: 'responsibles',
    title: 'Respons\u00e1veis por Etapa',
    prompt:
      'Quem \u00e9 o respons\u00e1vel por executar cada etapa (ex: solicitante/requerente, atendente do protocolo, analista t\u00e9cnico, fiscal, coordena\u00e7\u00e3o ou comiss\u00e3o)?',
    required: true,
  },
  {
    id: 'approvals',
    title: 'Aprova\u00e7\u00f5es e Vistorias',
    prompt:
      'Existe alguma etapa formal de aprova\u00e7\u00e3o, visto, vistoria t\u00e9cnica, despacho de chefia ou parecer jur\u00eddico?',
    required: false,
  },
  {
    id: 'rules',
    title: 'Regras de Neg\u00f3cio',
    prompt:
      'Existem regras de neg\u00f3cio, exig\u00eancias legais ou crit\u00e9rios regimentais obrigat\u00f3rios para o deferimento?',
    required: false,
  },
  {
    id: 'fees',
    title: 'Taxas e Custos',
    prompt:
      'Este processo envolve cobran\u00e7a de taxas p\u00fablicas, emolumentos ou guias de recolhimento? Se sim, quais s\u00e3o e em que momento s\u00e3o emitidas/pagas? Se for gratuito ou processo interno, basta indicar que n\u00e3o h\u00e1 taxas.',
    required: false,
  },
  {
    id: 'exceptions',
    title: 'Pend\u00eancias, Exce\u00e7\u00f5es e Prazos',
    prompt:
      'O que acontece em caso de inconformidade, pend\u00eancia de documentos ou autua\u00e7\u00e3o/multa? H\u00e1 prazo limite (ex: 30 ou 90 dias) para saneamento antes do cancelamento/encerramento do processo?',
    required: false,
  },
  {
    id: 'documents',
    title: 'Documenta\u00e7\u00e3o e Anexos',
    prompt:
      'Quais documentos, formul\u00e1rios, certid\u00f5es ou pe\u00e7as instrut\u00f3rias s\u00e3o exigidos para autuar ou instruir o processo (incluindo exig\u00eancias condicionais, se houver)?',
    required: false,
  },
  {
    id: 'systems',
    title: 'Sistemas Utilizados',
    prompt:
      'Quais sistemas e plataformas s\u00e3o utilizados durante a tramita\u00e7\u00e3o (ex: Plataforma SEI, Construa F\u00e1cil, Processo F\u00edsico, ou outros)?',
    required: false,
  },
  {
    id: 'completion',
    title: 'Encerramento e Entrega',
    prompt:
      'Quando o processo \u00e9 considerado conclu\u00eddo e o que \u00e9 entregue ou registrado ao final (ex: emiss\u00e3o de certid\u00e3o/licen\u00e7a, deferimento, publica\u00e7\u00e3o ou arquivamento)?',
    required: false,
  },
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
