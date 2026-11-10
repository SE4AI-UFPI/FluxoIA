import assert from 'node:assert/strict'
import test from 'node:test'
import { getLatestGovernanceReview, mapApiProcessoToWizardState, resolveWizardStatus } from '../src/features/process-mapping/services/process.service'
import type { ApiProcesso } from '../src/features/process-mapping/types/process.types'

const oldReview = { id: 'old', revisor_nome: 'Supervisor', decisao: 'aprovado' as const, parecer: 'Aprovado antes', criado_em: '2026-11-08T12:00:00Z' }
const newReview = { ...oldReview, id: 'recent', decisao: 'rejeitado' as const, parecer: 'Conferir documentação', criado_em: '2026-11-09T12:00:00Z' }
const api: ApiProcesso = {
  id: 'test-process', codigo: 'TESTE', nome: 'Requerimento', secretaria: 'SECT', setor: 'Protocolo',
  objetivo: 'Conferir', descricao: '', legislacao: '', etapa_atual: 1, status: 'rascunho',
  versao_atual: '1.0', bpmn_xml_atual: null, criado_por: 'author', criado_por_nome: 'Autor',
  atualizado_em: '2026-11-09T12:00:00Z', submetido_em: null,
  revisoes_governanca: [newReview, oldReview],
  feedbacks_ia: [{ id: 'feedback', versao_bpmn: null, autor: 'author', autor_nome: 'Autor',
    representa_processo: false, nota_precisao_geral: 2, nivel_edicao_necessario: 'ajustes_moderados',
    clareza_entrevista: 3, problemas_identificados: ['etapas_ausentes'], observacoes: 'Conferir o retorno', criado_em: '2026-11-09T11:00:00Z' }],
}

test('editar e voltar etapas não regride o status de avaliação ou correção', () => {
  for (const status of ['Em Avaliação', 'Ajustes Solicitados'] as const) {
    assert.equal(resolveWizardStatus(status, 'Rascunho'), status)
    assert.equal(resolveWizardStatus(status, 'Em Entrevista'), status)
    assert.equal(resolveWizardStatus(status, 'Em Modelagem BPMN'), status)
  }
  assert.equal(resolveWizardStatus('Rascunho', 'Em Entrevista'), 'Em Entrevista')
  assert.equal(resolveWizardStatus('Em Modelagem BPMN', 'Em Avaliação'), 'Em Avaliação')
})

test('reabertura restaura simultaneamente a avaliação enviada e o parecer mais recente', () => {
  const state = mapApiProcessoToWizardState(api, 'author', 'Protocolo')
  assert.equal(state.status, 'Ajustes Solicitados')
  assert.equal(state.feedback.representsProcess, false)
  assert.equal(state.feedback.accuracyScore, 2)
  assert.equal(state.feedback.generalNotes, 'Conferir o retorno')
  assert.equal(state.hasSavedFeedback, true)
  assert.equal(state.history.at(-1)?.reason, 'Devolvido para refazer: Conferir documentação')
})

test('seleção do parecer não depende da ordem retornada pela API nem altera o array', () => {
  const reviews = [newReview, oldReview]
  assert.equal(getLatestGovernanceReview(reviews)?.id, 'recent')
  assert.equal(getLatestGovernanceReview([...reviews].reverse())?.id, 'recent')
  assert.deepEqual(reviews.map(review => review.id), ['recent', 'old'])
  assert.equal(getLatestGovernanceReview(undefined), undefined)
  assert.equal(getLatestGovernanceReview([]), undefined)
})

test('parecer antigo não desfaz o bloqueio de processos reenviados, aprovados e publicados', () => {
  for (const [status, expected] of [['aguardando_validacao', 'Aguardando Validação do Gestor'], ['aprovado', 'Aprovado'], ['publicado', 'Publicado']] as const) {
    assert.equal(mapApiProcessoToWizardState({ ...api, status }, 'author', 'Protocolo').status, expected)
  }
})

test('aprovação mais recente impede classificar um rascunho por uma rejeição antiga', () => {
  const revisoes = [{ ...newReview, criado_em: '2026-11-07T12:00:00Z' }, oldReview]
  assert.equal(mapApiProcessoToWizardState({ ...api, revisoes_governanca: revisoes }, 'author', 'Protocolo').status, 'Rascunho')
})
