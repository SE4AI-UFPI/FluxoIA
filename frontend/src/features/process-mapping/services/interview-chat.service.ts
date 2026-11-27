import type {
  AnswerValidationResult,
  AnswerValidationStatus,
  ConversationTurnPayload,
} from './interview.service'

/** Uma fala da conversa de uma pergunta que ainda não teve resposta aceita. */
export interface ChatTurn {
  id: string
  papel: 'operacional' | 'assistente'
  texto: string
  status?: Exclude<AnswerValidationStatus, 'valida'>
}

/** Conversa em andamento de uma pergunta: as falas e os trechos já enviados que a IA achou vagos. */
export interface QuestionConversation {
  turnos: ChatTurn[]
  partesVagas: string[]
}

export const EMPTY_CONVERSATION: QuestionConversation = { turnos: [], partesVagas: [] }

/** Quantas falas anteriores vão para a IA como contexto (o backend aceita até 20). */
export const HISTORY_LIMIT = 8
const HISTORY_TEXT_LIMIT = 2000

const FALLBACK_MESSAGES: Record<Exclude<AnswerValidationStatus, 'valida'>, string> = {
  vaga: 'Entendi a ideia geral, mas preciso de um pouco mais de detalhe. Pode complementar?',
  invalida: 'Acho que essa mensagem não tem relação com a pergunta. Pode me contar sobre esta etapa do processo?',
  duvida: 'Claro! Pode me contar, com suas palavras, como essa etapa acontece no seu processo?',
}

/**
 * Texto que será avaliado e, se aceito, gravado como resposta: os trechos vagos
 * anteriores somados ao complemento que o operacional acabou de enviar.
 */
export function combineAnswer(conversation: QuestionConversation, novoTexto: string): string {
  return [...conversation.partesVagas, novoTexto.trim()].filter(Boolean).join('\n')
}

export function buildConversationHistory(
  conversation: QuestionConversation,
  limit = HISTORY_LIMIT,
): ConversationTurnPayload[] {
  return conversation.turnos.slice(-limit).map((turno) => ({
    papel: turno.papel,
    texto: turno.texto.slice(0, HISTORY_TEXT_LIMIT),
  }))
}

export function assistantMessage(result: AnswerValidationResult): string {
  const fala = result.mensagem_assistente?.trim()
  if (fala) return fala
  if (result.status === 'valida') return ''
  const detalhe = [result.mensagem_feedback, result.sugestao_melhoria].map((t) => t?.trim()).filter(Boolean)
  return detalhe.length > 0 ? detalhe.join(' ') : FALLBACK_MESSAGES[result.status]
}

export type ConversationOutcome =
  | { aceita: true; resposta: string; confirmacao: string }
  | { aceita: false; conversa: QuestionConversation; fala: string }

/**
 * Aplica o resultado da IA à conversa da pergunta. Mensagens vagas acumulam o
 * trecho enviado para que o complemento seguinte forme a resposta completa;
 * mensagens fora do processo ou dúvidas não entram na resposta.
 */
export function applyValidationResult(
  conversation: QuestionConversation,
  textoEnviado: string,
  result: AnswerValidationResult,
  nextId: () => string,
): ConversationOutcome {
  const fala = assistantMessage(result)
  if (result.status === 'valida') {
    return { aceita: true, resposta: combineAnswer(conversation, textoEnviado), confirmacao: fala }
  }

  const texto = textoEnviado.trim()
  return {
    aceita: false,
    fala,
    conversa: {
      turnos: [
        ...conversation.turnos,
        { id: nextId(), papel: 'operacional', texto },
        { id: nextId(), papel: 'assistente', texto: fala, status: result.status },
      ],
      partesVagas: result.status === 'vaga' ? [...conversation.partesVagas, texto] : conversation.partesVagas,
    },
  }
}

/** Resposta gravada quando o operacional decide manter o que já disse apesar de a IA achá-la vaga. */
export function keepVagueAnswer(conversation: QuestionConversation): string {
  return conversation.partesVagas.join('\n')
}
