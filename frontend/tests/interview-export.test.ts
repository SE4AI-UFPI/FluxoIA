import assert from 'node:assert/strict'
import test from 'node:test'
import { createInterviewMarkdown, interviewExportFilename } from '../src/features/process-mapping/services/interview-export.service.ts'
import { createInterviewPdf } from '../src/features/process-mapping/services/interview-pdf.service.ts'
import type { InterviewExportData } from '../src/features/process-mapping/services/interview-export.service.ts'

export const sample: InterviewExportData = {
  context: {
    name: 'Recebimento de requerimentos', code: 'BPMN-TESTE-001', sector: 'SECT - Protocolo',
    status: 'Aguardando Validação do Gestor', version: '1.0', updatedAt: '2026-11-09T12:00:00Z', authorName: 'Servidor de teste',
  },
  exportedAt: new Date('2026-11-09T13:00:00Z'),
  questions: [
    { id: 'trigger', title: 'Início do Processo', prompt: 'O que dá início ao processo?', required: true },
    { id: 'fees', title: 'Taxas e Custos', prompt: 'Há cobrança de taxas?', required: false },
  ],
  answers: { trigger: 'O cidadão apresenta o requerimento.\nA equipe confere a documentação.', fees: '' },
}

test('Markdown inclui identificação, perguntas, respostas e ausência de resposta opcional', () => {
  const md = createInterviewMarkdown(sample)
  for (const expected of ['# Entrevista do processo', 'BPMN\\-TESTE\\-001', 'Servidor de teste',
    'Aguardando Validação do Gestor', '## 1. Início do Processo', '## 2. Taxas e Custos',
    '### Pergunta', '### Resposta', 'Obrigatória', 'Opcional', 'Sem resposta registrada.']) {
    // Literal prose escapes Markdown punctuation, including the placeholder's period.
    assert.ok(md.includes(expected === 'Sem resposta registrada.' ? 'Sem resposta registrada\\.' : expected), expected)
  }
  assert.match(md, /requerimento\\\.  \nA equipe confere/)
  assert.ok(md.indexOf('Início do Processo') < md.indexOf('Taxas e Custos'))
})

test('Markdown mantém conteúdo do usuário como texto literal, sem HTML ou links ativos', () => {
  const md = createInterviewMarkdown({ ...sample, answers: { trigger: '# Título\r\n<script>alert(1)</script>\n[link](https://example.test)\n**texto**' } })
  assert.ok(md.includes('\\# Título  \n\\<script\\>'))
  assert.ok(md.includes('\\[link\\]\\(https://example\\.test\\)'))
  assert.ok(md.includes('\\*\\*texto\\*\\*'))
  assert.doesNotMatch(md, /<script>|\r/)
})

test('nome do arquivo não contém caminhos ou caracteres inválidos e tem alternativa sem código', () => {
  assert.equal(interviewExportFilename(sample.context), 'BPMN-TESTE-001-entrevista')
  assert.equal(interviewExportFilename({ ...sample.context, code: null, name: 'Solicitação / ../ Teste' }), 'Solicitacao-Teste-entrevista')
  assert.equal(interviewExportFilename({ ...sample.context, code: null, name: '' }), 'processo-entrevista')
})

test('PDF inclui texto selecionável com acentos, identificação e rótulos de pergunta e resposta', () => {
  const pdf = createInterviewPdf(sample)
  const content = pdf.output()
  for (const expected of ['BPMN-TESTE-001', 'Servidor de teste', 'Aguardando Validação do Gestor',
    'Pergunta', 'Resposta', 'O cidadão apresenta o requerimento.', 'Sem resposta registrada.', 'Página 1 de 1']) {
    assert.ok(content.includes(expected), expected)
  }
  assert.equal(pdf.getNumberOfPages(), 1)
})

test('PDF pagina respostas extensas sem perder a última linha nem a pergunta seguinte', () => {
  const long = Array.from({ length: 180 }, (_, index) => `Linha ${index}: Conferir documentos e encaminhar o processo.`).join('\n')
  const pdf = createInterviewPdf({ ...sample, answers: { trigger: `${long}\nFIM DA RESPOSTA EXTENSA` } })
  const content = pdf.output()
  assert.ok(pdf.getNumberOfPages() >= 4)
  assert.ok(content.includes('FIM DA RESPOSTA EXTENSA'))
  assert.ok(content.includes('Taxas e Custos'))
  for (let page = 1; page <= pdf.getNumberOfPages(); page++) {
    assert.ok(content.includes(`Página ${page} de ${pdf.getNumberOfPages()}`))
  }
})

test('exportar não modifica as perguntas, respostas ou metadados do processo', () => {
  const before = JSON.stringify(sample)
  createInterviewMarkdown(sample)
  createInterviewPdf(sample)
  assert.equal(JSON.stringify(sample), before)
})
