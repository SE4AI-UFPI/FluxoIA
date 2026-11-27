/** Open /tests/interview-chat.html on the Vite dev server. The validation API is simulated. */
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { InterviewStep } from '../src/features/process-mapping/components/InterviewStep'
import type { AnswerValidationResult } from '../src/features/process-mapping/services/interview.service'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const questions = [
  { id: 'trigger', title: 'Início do Processo', prompt: 'O que dá início ao processo?', required: true },
  { id: 'activities', title: 'Atividades Principais', prompt: 'Quais são as atividades?', required: true },
]

type Body = { resposta: string; historico_conversa: Array<{ papel: string; texto: string }> }
let bodies: Body[] = []
let replies: Array<AnswerValidationResult | Promise<AnswerValidationResult>> = []
window.fetch = (async (_path: RequestInfo | URL, init?: RequestInit) => {
  bodies.push(JSON.parse(String(init?.body)))
  const next = await replies.shift()
  return new Response(JSON.stringify(next), { status: 200 })
}) as typeof fetch

const answered: Array<[string, string]> = []
function Harness() {
  const [answers, setAnswers] = React.useState<Record<string, string>>({})
  const [index, setIndex] = React.useState(0)
  return (
    <InterviewStep
      questions={questions}
      answers={answers}
      questionIndex={index}
      onAnswer={(key, value) => {
        answered.push([key, value])
        setAnswers((prev) => ({ ...prev, [key]: value }))
      }}
      onQuestionChange={setIndex}
      onBack={() => {}}
      onSave={() => {}}
      onFinish={() => {}}
      processContext={{ name: 'Licença de Demolição', sector: 'Protocolo', objective: 'Licenciar demolições' }}
    />
  )
}

const result = (parcial: Partial<AnswerValidationResult>): AnswerValidationResult => ({
  status: 'valida', mensagem_assistente: '', mensagem_feedback: '', sugestao_melhoria: '', ...parcial,
})
function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}
const wait = (ms: number) => act(async () => { await new Promise((resolve) => setTimeout(resolve, ms)) })
const feed = () => document.getElementById('test-root')!.textContent ?? ''
const textarea = () => document.querySelector<HTMLTextAreaElement>('#test-root textarea')!

async function send(text: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(textarea(), text)
    textarea().dispatchEvent(new Event('input', { bubbles: true }))
  })
  const button = [...document.querySelectorAll<HTMLButtonElement>('#test-root button')].find((b) => b.textContent?.includes('Enviar'))
  expect(button, 'botão Enviar não encontrado')
  await act(async () => button.click())
  await wait(20)
}

let root: Root | undefined
const results: string[] = []
async function test(name: string, run: () => Promise<void>) {
  bodies = []
  replies = []
  answered.length = 0
  root = createRoot(document.getElementById('test-root')!)
  await act(async () => root!.render(<Harness />))
  await wait(500) // efeito "digitando" antes da primeira pergunta
  try { await run(); results.push(`PASSOU: ${name}`) }
  catch (error) { results.push(`FALHOU: ${name}: ${String(error)}`) }
  finally { await act(async () => root!.unmount()) }
  document.getElementById('results')!.textContent = results.join('\n')
}

async function main() {
  await test('Mensagem fora do processo vira réplica no chat, sem painel de aviso', async () => {
    const fala = 'Que bom! Voltando ao processo: o que dá início a ele?'
    replies.push(result({ status: 'invalida', mensagem_assistente: fala }))
    await send('Fui à praia no fim de semana')
    expect(feed().includes('Fui à praia no fim de semana'), 'tentativa não aparece no chat')
    expect(feed().includes(fala), 'réplica do assistente não aparece no chat')
    expect(!document.querySelector('#test-root [role="alert"]'), 'painel de aviso ainda é exibido')
    expect(answered.length === 0, 'mensagem fora do processo foi gravada como resposta')
    expect(textarea().value === '', 'campo não foi limpo após o envio')
    expect(document.body.textContent?.includes(fala), 'réplica não foi anunciada')
  })

  await test('Resposta vaga recebe pedido de detalhe e o complemento forma a resposta', async () => {
    replies.push(result({ status: 'vaga', mensagem_assistente: 'Certo! E qual setor recebe esse pedido?' }))
    await send('O cidadão faz o pedido')
    expect(feed().includes('qual setor recebe esse pedido'), 'pedido de detalhe não aparece')
    expect(textarea().placeholder.startsWith('Complemente'), 'campo não sugere complementar')

    replies.push(result({ mensagem_assistente: 'Entendi, começa no protocolo.' }))
    await send('No protocolo da SDU')
    expect(bodies[1].resposta === 'O cidadão faz o pedido\nNo protocolo da SDU', `resposta avaliada: ${bodies[1].resposta}`)
    expect(bodies[1].historico_conversa.length === 2, 'histórico da conversa não foi enviado')
    expect(answered[0]?.[1] === 'O cidadão faz o pedido\nNo protocolo da SDU', `resposta gravada: ${answered[0]?.[1]}`)
    expect(feed().includes('Entendi, começa no protocolo.'), 'reconhecimento não aparece')
    expect(!feed().includes('qual setor recebe esse pedido'), 'conversa não foi consolidada após aceitar')
  })

  await test('Operacional pode manter a resposta vaga e seguir', async () => {
    replies.push(result({ status: 'vaga', mensagem_assistente: 'Pode dizer qual setor?' }))
    await send('Um setor recebe')
    const keep = [...document.querySelectorAll<HTMLButtonElement>('#test-root button')].find((b) => b.textContent?.includes('manter minha resposta'))
    expect(keep, 'opção de manter a resposta não aparece')
    await act(async () => keep.click())
    await wait(20)
    expect(answered[0]?.[0] === 'trigger' && answered[0][1] === 'Um setor recebe', 'resposta vaga não foi mantida')
  })

  await test('Dúvida é respondida e não vira resposta; enquanto analisa, o assistente "digita"', async () => {
    let resolve!: (value: AnswerValidationResult) => void
    replies.push(new Promise((r) => { resolve = r }))
    await send('Como assim início?')
    expect(feed().includes('Como assim início?'), 'mensagem pendente não aparece')
    expect(document.body.textContent?.includes('Assistente analisando sua resposta'), 'indicador de digitação ausente')
    await act(async () => resolve(result({ status: 'duvida', mensagem_assistente: 'Quero saber o que faz o processo começar.' })))
    await wait(20)
    expect(feed().includes('Quero saber o que faz o processo começar.'), 'explicação não aparece')
    expect(answered.length === 0, 'dúvida foi gravada como resposta')
  })

  document.getElementById('results')!.textContent = `${results.join('\n')}\n\n${results.filter((r) => r.startsWith('PASSOU')).length}/${results.length} testes passaram.`
}

void main()
