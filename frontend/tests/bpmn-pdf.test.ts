import assert from 'node:assert/strict'
import test from 'node:test'
import { createBpmnPdf } from '../src/features/process-mapping/services/bpmn-pdf.service.ts'

const options = {
  diagramImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  diagramWidth: 600, diagramHeight: 200,
  title: 'Solicitação de suporte técnico', code: 'TESTE-001',
  exportedAt: new Date('2026-11-09T12:00:00Z'),
}

test('rascunhos, pendentes e devolvidos são identificados como não aprovados', () => {
  for (const status of ['Rascunho', 'Em Entrevista', 'Em Modelagem BPMN', 'Em Avaliação', 'Aguardando Validação do Gestor', 'Ajustes Solicitados', 'Excluído', 'rascunho', 'em_entrevista', 'em_modelagem', 'em_avaliacao', 'aguardando_validacao', 'ajustes_solicitados', 'excluido'] as const) {
    const pdf = createBpmnPdf({ ...options, status })
    const contents = pdf.output()
    assert.match(contents, /NÃO APROVADO/, status)
    assert.ok(contents.includes('/ca 0.16'), status)
    assert.match(contents, /TESTE-001/)
    assert.equal(pdf.getNumberOfPages(), 1)
  }
})

test('aprovados e publicados não recebem marca de não aprovado', () => {
  for (const status of ['Aprovado', 'Publicado', 'aprovado', 'publicado'] as const) {
    const contents = createBpmnPdf({ ...options, status }).output()
    assert.doesNotMatch(contents, /NÃO APROVADO/, status)
    assert.match(contents, /Status: (Aprovado|Publicado)/)
  }
})

test('título, código, status e data são incluídos como texto no PDF', () => {
  const pdf = createBpmnPdf({ ...options, status: 'em_modelagem' })
  const contents = pdf.output()
  assert.match(contents, /Solicitação de suporte técnico/)
  assert.match(contents, /Status: Em Modelagem BPMN/)
  assert.match(contents, /Exportado em/)
  assert.ok(pdf.internal.pageSize.getWidth() > pdf.internal.pageSize.getHeight())
})
