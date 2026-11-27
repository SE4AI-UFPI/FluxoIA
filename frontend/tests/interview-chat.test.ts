import assert from 'node:assert/strict'
import test from 'node:test'
import {
  EMPTY_CONVERSATION,
  applyValidationResult,
  assistantMessage,
  buildConversationHistory,
  combineAnswer,
  keepVagueAnswer,
} from '../src/features/process-mapping/services/interview-chat.service.ts'
import type { AnswerValidationResult } from '../src/features/process-mapping/services/interview.service.ts'

function resultado(parcial: Partial<AnswerValidationResult>): AnswerValidationResult {
  return { status: 'valida', mensagem_assistente: '', mensagem_feedback: '', sugestao_melhoria: '', ...parcial }
}

function ids() {
  let n = 0
  return () => `t${++n}`
}

test('resposta válida é aceita com o reconhecimento do assistente', () => {
  const saida = applyValidationResult(
    EMPTY_CONVERSATION,
    '  O protocolo recebe o pedido ',
    resultado({ mensagem_assistente: 'Entendi, começa no protocolo.' }),
    ids(),
  )
  assert.deepEqual(saida, { aceita: true, resposta: 'O protocolo recebe o pedido', confirmacao: 'Entendi, começa no protocolo.' })
})

test('resposta vaga vira conversa e o complemento forma a resposta completa', () => {
  const novoId = ids()
  const vaga = applyValidationResult(
    EMPTY_CONVERSATION,
    'O setor faz a análise',
    resultado({ status: 'vaga', mensagem_assistente: 'Qual é o nome desse setor?' }),
    novoId,
  )
  assert.equal(vaga.aceita, false)
  if (vaga.aceita) return
  assert.deepEqual(vaga.conversa.turnos.map((t) => [t.papel, t.texto, t.status]), [
    ['operacional', 'O setor faz a análise', undefined],
    ['assistente', 'Qual é o nome desse setor?', 'vaga'],
  ])
  assert.equal(combineAnswer(vaga.conversa, 'É a Coordenação de Análise'), 'O setor faz a análise\nÉ a Coordenação de Análise')

  const aceita = applyValidationResult(vaga.conversa, 'É a Coordenação de Análise', resultado({}), novoId)
  assert.equal(aceita.aceita, true)
  if (aceita.aceita) assert.equal(aceita.resposta, 'O setor faz a análise\nÉ a Coordenação de Análise')
})

test('mensagem fora do processo e dúvida não entram na resposta', () => {
  const novoId = ids()
  const vaga = applyValidationResult(EMPTY_CONVERSATION, 'Um setor analisa', resultado({ status: 'vaga' }), novoId)
  if (vaga.aceita) throw new Error('não deveria aceitar')
  const fora = applyValidationResult(vaga.conversa, 'Vai chover hoje?', resultado({ status: 'invalida', mensagem_assistente: 'Voltando ao processo...' }), novoId)
  if (fora.aceita) throw new Error('não deveria aceitar')
  const duvida = applyValidationResult(fora.conversa, 'Como assim?', resultado({ status: 'duvida', mensagem_assistente: 'Quero saber quem analisa.' }), novoId)
  if (duvida.aceita) throw new Error('não deveria aceitar')

  assert.deepEqual(duvida.conversa.partesVagas, ['Um setor analisa'])
  assert.equal(keepVagueAnswer(duvida.conversa), 'Um setor analisa')
  assert.equal(duvida.conversa.turnos.length, 6)
})

test('histórico enviado à IA é limitado e corta textos longos', () => {
  const turnos = Array.from({ length: 12 }, (_, i) => ({
    id: `t${i}`,
    papel: i % 2 ? ('assistente' as const) : ('operacional' as const),
    texto: i === 11 ? 'x'.repeat(3000) : `fala ${i}`,
  }))
  const historico = buildConversationHistory({ turnos, partesVagas: [] })
  assert.equal(historico.length, 8)
  assert.equal(historico[0].texto, 'fala 4')
  assert.equal(historico[7].texto.length, 2000)
  assert.deepEqual(Object.keys(historico[0]).sort(), ['papel', 'texto'])
})

test('sem fala do modelo, o chat usa o motivo ou uma fala padrão', () => {
  assert.equal(assistantMessage(resultado({ status: 'vaga', sugestao_melhoria: 'Informe o setor.' })), 'Informe o setor.')
  assert.ok(assistantMessage(resultado({ status: 'invalida' })).length > 0)
  assert.equal(assistantMessage(resultado({ status: 'valida' })), '')
})
