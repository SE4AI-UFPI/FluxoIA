import assert from 'node:assert/strict'
import test from 'node:test'
import { restoreSavedFeedback } from '../src/features/process-mapping/services/process-feedback.service.ts'
import type { ApiProcessFeedback } from '../src/features/process-mapping/types/process.types.ts'

const saved: ApiProcessFeedback = {
  id: 'feedback-1',
  versao_bpmn: 'version-1',
  autor: 'author-1',
  autor_nome: 'Pessoa de teste',
  representa_processo: false,
  nota_precisao_geral: 2,
  nivel_edicao_necessario: 'ajustes_moderados',
  clareza_entrevista: 1,
  problemas_identificados: ['etapas_ausentes', 'sequencia_incorreta'],
  observacoes: 'Ajustar o retorno para conferência.\nPreservar este comentário.',
  criado_em: '2026-11-09T12:00:00Z',
}

test('ausência de avaliação não é transformada em uma avaliação de nota 5', () => {
  assert.equal(restoreSavedFeedback(undefined), null)
  assert.equal(restoreSavedFeedback([]), null)
})

test('restaura todos os campos e preserva uma resposta negativa', () => {
  assert.deepEqual(restoreSavedFeedback([saved]), {
    representsProcess: false,
    accuracyScore: 2,
    editLevel: 'ajustes_moderados',
    interviewClarityScore: 1,
    identifiedProblems: ['etapas_ausentes', 'sequencia_incorreta'],
    generalNotes: saved.observacoes,
  })
})

test('seleciona a avaliação mais recente em ambas as ordens de retorno da API', () => {
  const recent = { ...saved, id: 'feedback-2', nota_precisao_geral: 4, criado_em: '2026-11-09T13:00:00Z' }
  const feedbacks = [recent, saved]
  assert.equal(restoreSavedFeedback(feedbacks)?.accuracyScore, 4)
  assert.equal(restoreSavedFeedback([saved, recent])?.accuracyScore, 4)
  assert.deepEqual(feedbacks.map(item => item.id), ['feedback-2', 'feedback-1'])
})

test('compara instantes com fuso horário, não apenas o texto da data', () => {
  const recent = { ...saved, id: 'feedback-2', nota_precisao_geral: 3, criado_em: '2026-11-09T10:30:00-03:00' }
  assert.equal(restoreSavedFeedback([saved, recent])?.accuracyScore, 3)
})

test('alterar o resultado restaurado não modifica os problemas da resposta da API', () => {
  const restored = restoreSavedFeedback([saved])!
  restored.identifiedProblems.push('raias_incorretas')
  assert.deepEqual(saved.problemas_identificados, ['etapas_ausentes', 'sequencia_incorreta'])
})
