// Execute with Vite's SSR loader so the production aliases and JSX transform apply.
import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { ProcessInfoStep } from '../src/features/process-mapping/components/ProcessInfoStep'
import { InterviewStep } from '../src/features/process-mapping/components/InterviewStep'
import { FeedbackReadOnly } from '../src/features/process-mapping/components/FeedbackReadOnly'
import type { ProcessFeedback, InterviewAnswerKey } from '../src/features/process-mapping/types/process.types'

const fail = () => { throw new Error('Consulta não deve executar comandos de edição') }
const feedback: ProcessFeedback = {
  representsProcess: false, accuracyScore: 2, editLevel: 'ajustes_moderados',
  interviewClarityScore: 3, identifiedProblems: ['etapas_ausentes'],
  generalNotes: 'Rever o retorno.\nConferir documentos.',
}

function assertReadOnly(html: string) {
  assert.match(html, /Somente leitura/)
  assert.doesNotMatch(html, /<(?:input|textarea|select|button)\b/)
}

test('dados iniciais são texto consultável, preservando linhas e escapando HTML', () => {
  const html = renderToStaticMarkup(<ProcessInfoStep readOnly
    info={{ name: 'Processo <teste>', sector: 'SECT', objective: 'Conferir.\nEncaminhar.', description: '', legislation: '' }}
    sectors={[]} errors={{ name: 'Erro antigo' }} lastSavedAt={null}
    onChange={fail} onSave={fail} onNext={fail} />)
  assertReadOnly(html)
  assert.match(html, /Processo &lt;teste&gt;/)
  assert.match(html, /Conferir\.\nEncaminhar\./)
  assert.match(html, /Não informada\./)
  assert.doesNotMatch(html, /Erro antigo|Salvamento automático|Salvar Rascunho/)
})

test('consulta da entrevista mostra todas as perguntas sem depender da posição salva', () => {
  const html = renderToStaticMarkup(<InterviewStep readOnly questionIndex={0}
    questions={[
      { id: 'trigger', title: 'Início', prompt: 'Quem solicita?', required: true },
      { id: 'fees', title: 'Taxas', prompt: 'Há cobrança?', required: false },
      { id: 'completion', title: 'Conclusão', prompt: 'Como termina?', required: false },
    ]}
    answers={{ trigger: 'O cidadão.\nPelo protocolo.', fees: '', completion: 'Arquivamento.' } as Record<InterviewAnswerKey, string>}
    onAnswer={fail} onQuestionChange={fail} onBack={fail} onSave={fail} onFinish={fail} />)
  assertReadOnly(html)
  assert.match(html, /Quem solicita\?/)
  assert.match(html, /O cidadão\.\nPelo protocolo\./)
  assert.match(html, /Opcional/)
  assert.match(html, /Sem resposta registrada\./)
  assert.match(html, /Arquivamento\./)
  assert.equal((html.match(/>Pergunta<\/dt>/g) ?? []).length, 3)
  assert.equal((html.match(/>Resposta<\/dt>/g) ?? []).length, 3)
  assert.doesNotMatch(html, /Carregando entrevista|digitando|Finalizar Entrevista/)
})

test('avaliação salva preserva resposta negativa, notas, problemas e observações', () => {
  const html = renderToStaticMarkup(<FeedbackReadOnly feedback={feedback} hasSavedFeedback />)
  assertReadOnly(html)
  for (const text of ['Não representa', '2 / 5', '3 / 5', 'Ajustes em etapas, raias ou decisões', 'Etapas ausentes', feedback.generalNotes]) {
    assert.ok(html.includes(text), text)
  }
})

test('ausência de avaliação persistida não exibe notas iniciais como avaliação enviada', () => {
  const html = renderToStaticMarkup(<FeedbackReadOnly feedback={{ ...feedback, accuracyScore: 5 }} hasSavedFeedback={false} />)
  assertReadOnly(html)
  assert.match(html, /Não há avaliação salva disponível/)
  assert.doesNotMatch(html, /5 \/ 5|Não representa|Etapas ausentes/)
})

test('avaliação sem problemas ou comentários informa a ausência desses dados', () => {
  const html = renderToStaticMarkup(<FeedbackReadOnly feedback={{ ...feedback, identifiedProblems: [], generalNotes: ' ' }} hasSavedFeedback />)
  assert.match(html, /Nenhum problema informado/)
  assert.match(html, /Nenhuma observação registrada/)
})

test('modo padrão mantém o formulário de edição dos dados iniciais', () => {
  const html = renderToStaticMarkup(<ProcessInfoStep
    info={{ name: 'Rascunho', sector: 'SECT', objective: 'Conferir', description: '', legislation: '' }}
    sectors={['SECT']} errors={{}} lastSavedAt={null}
    onChange={fail} onSave={fail} onNext={fail} />)
  assert.match(html, /<input\b/)
  assert.match(html, /<textarea\b/)
  assert.match(html, /Salvar/)
  assert.doesNotMatch(html, /Somente leitura/)
})
