import assert from 'node:assert/strict'
import test from 'node:test'
import { createBpmnPdf } from '../src/features/process-mapping/services/bpmn-pdf.service.ts'
import { extrairFichaTecnica, montarDetalhesPdf } from '../src/features/process-mapping/services/pdf-details.ts'

const options = {
  diagramImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  diagramWidth: 600, diagramHeight: 200,
  title: 'Solicitação de suporte técnico', code: 'TESTE-001',
  exportedAt: new Date('2026-11-09T12:00:00Z'),
}

test('rascunhos, pendentes, devolvidos e homologados sem aval são identificados como não aprovados', () => {
  for (const status of ['Rascunho', 'Em Entrevista', 'Em Modelagem BPMN', 'Em Avaliação', 'Aguardando Validação do Gestor', 'Ajustes Solicitados', 'Aprovado', 'Excluído', 'rascunho', 'em_entrevista', 'em_modelagem', 'em_avaliacao', 'aguardando_validacao', 'ajustes_solicitados', 'aprovado', 'excluido'] as const) {
    const pdf = createBpmnPdf({ ...options, status })
    const contents = pdf.output()
    assert.match(contents, /NÃO APROVADO/, status)
    assert.ok(contents.includes('/ca 0.16'), status)
    assert.match(contents, /TESTE-001/)
    assert.equal(pdf.getNumberOfPages(), 1)
  }
})

test('só publicados (aval final do coordenador) geram o PDF oficial', () => {
  for (const status of ['Publicado', 'publicado'] as const) {
    const contents = createBpmnPdf({ ...options, status }).output()
    assert.doesNotMatch(contents, /NÃO APROVADO/, status)
    assert.match(contents, /Status: Publicado/)
  }
})

test('homologado pela supervisão indica que aguarda o coordenador', () => {
  for (const status of ['Aprovado', 'aprovado'] as const) {
    const contents = createBpmnPdf({ ...options, status }).output()
    assert.match(contents, /Status: Homologado pela Supervis/, status)
    assert.match(contents, /aval final do coordenador/, status)
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

const ficha = extrairFichaTecnica([
  { estrutura_json: { ficha_tecnica: { observacoes_prazo: 'Versão antiga' } } },
  {
    estrutura_json: {
      ficha_tecnica: {
        observacoes_prazo: 'Pendências em até 10 dias úteis',
        informacoes_gerais: 'Atende chamados de TI',
        sistemas: ['SIPAC'],
        documentacao: ['Ofício de abertura', '  '],
        taxas: [],
      },
    },
  },
])

const details = montarDetalhesPdf({
  setor: 'STI', secretaria: 'Administração', versao: '1.2', autor: 'Autora',
  homologadoPor: 'Supervisora', homologadoEm: '2026-11-01T12:00:00Z',
  objetivo: 'Resolver chamados', ficha,
})

test('extrairFichaTecnica lê a última versão e aplica padrões aos campos vazios', () => {
  assert.equal(ficha.observacoesPrazo, 'Pendências em até 10 dias úteis')
  assert.deepEqual(ficha.documentacao, ['Ofício de abertura'])
  assert.deepEqual(ficha.taxas, ['Não se aplica / Processo sem taxas'])
  const vazia = extrairFichaTecnica([])
  assert.equal(vazia.observacoesPrazo, 'Conforme prazo regimental')
  assert.deepEqual(vazia.sistemas, ['Não informado'])
})

test('PDF com detalhes inclui informações, ficha técnica e prazos em páginas seguintes', () => {
  const pdf = createBpmnPdf({ ...options, status: 'publicado', details })
  const contents = pdf.output()
  const total = pdf.getNumberOfPages()
  assert.ok(total >= 2)
  for (const trecho of ['Informações do processo', 'Ficha Técnica', 'Prazos e regras complementares',
    'Pendências em até 10 dias úteis', 'Ofício de abertura', 'SIPAC', 'Não se aplica / Processo sem taxas',
    'Supervisora em', `Página 2 de ${total}`]) {
    assert.ok(contents.includes(trecho), trecho)
  }
  assert.doesNotMatch(contents, /NÃO APROVADO|PRÉ-VISUALIZAÇÃO/)
  assert.ok(pdf.internal.pageSize.getHeight() > pdf.internal.pageSize.getWidth(), 'detalhes em retrato')
})

test('texto longo quebra em novas páginas', () => {
  const longo = { ...details, ficha: { ...details.ficha, documentacao: Array.from({ length: 120 }, (_, i) => `Documento ${i + 1}`) } }
  const pdf = createBpmnPdf({ ...options, status: 'publicado', details: longo })
  assert.ok(pdf.getNumberOfPages() >= 4)
  assert.ok(pdf.output().includes('Documento 120'))
})

test('preview antes da publicação leva PRÉ-VISUALIZAÇÃO em todas as páginas', () => {
  const pdf = createBpmnPdf({ ...options, status: 'aprovado', details, mode: 'preview' })
  const contents = pdf.output()
  assert.doesNotMatch(contents, /NÃO APROVADO/)
  assert.match(contents, /aval do coordenador/)
  assert.equal(contents.split('PRÉ-VISUALIZAÇÃO').length - 1, pdf.getNumberOfPages())
})

test('exportação de não publicado com detalhes marca NÃO APROVADO em todas as páginas', () => {
  const pdf = createBpmnPdf({ ...options, status: 'aprovado', details })
  const marcas = pdf.output().match(/\(NÃO APROVADO\)/g) ?? []
  assert.equal(marcas.length, pdf.getNumberOfPages())
})

test('preview de processo publicado é o próprio PDF oficial', () => {
  const contents = createBpmnPdf({ ...options, status: 'publicado', details, mode: 'preview' }).output()
  assert.doesNotMatch(contents, /PRÉ-VISUALIZAÇÃO|NÃO APROVADO/)
  assert.match(contents, /Status: Publicado/)
})
