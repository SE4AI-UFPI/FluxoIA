/** Open /tests/wizard-consultation.html on the Vite dev server. No real API or storage is used. */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { useProcessWizard } from '../src/features/process-mapping/hooks/useProcessWizard'
import type { ApiProcesso } from '../src/features/process-mapping/types/process.types'
import type { Usuario } from '../src/types/auth'

const user: Usuario = {
  id: 'test-author', nome: 'Autor de teste', email: 'autor@example.test', papel: 'operacional',
  secretaria: 'SECT', setor: 'Protocolo', cargo: '', matricula: null, cpf: null, telefone: '',
  setores_vinculados: [], permissoes: [], is_active: true, criado_em: '', atualizado_em: '',
}
const fixture = (status: ApiProcesso['status']): ApiProcesso => ({
  id: 'test-process', codigo: 'BPMN-TESTE', nome: 'Processo de teste', secretaria: 'SECT',
  setor: 'Protocolo', objetivo: 'Conferir requerimentos', descricao: '', legislacao: '',
  etapa_atual: status === 'rascunho' ? 1 : 4, status, versao_atual: '1.0',
  bpmn_xml_atual: ['aguardando_validacao', 'aprovado', 'publicado'].includes(status)
    ? '<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"><process id="test" /></definitions>' : null,
  criado_por: user.id, criado_por_nome: user.nome, atualizado_em: '2026-11-09T12:00:00Z',
  submetido_em: '2026-11-09T12:00:00Z',
  entrevista: { pergunta_atual_idx: 11, respostas: { trigger: 'O cidadão solicita.', fees: '' } },
})

const originalFetch = window.fetch
const localDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')!
const sessionDescriptor = Object.getOwnPropertyDescriptor(window, 'sessionStorage')!
let storageWrites = 0
function memoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() { return values.size }, key: index => [...values.keys()][index] ?? null,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { storageWrites++; values.set(key, value) },
    removeItem: key => { storageWrites++; values.delete(key) },
    clear: () => { storageWrites++; values.clear() },
  }
}
Object.defineProperty(window, 'localStorage', { configurable: true, value: memoryStorage() })
Object.defineProperty(window, 'sessionStorage', { configurable: true, value: memoryStorage() })
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let wizard: ReturnType<typeof useProcessWizard>
let navigate: ReturnType<typeof useNavigate>
let root: Root | undefined
let requests: Array<{ method: string; path: string }> = []
let reply: (path: string, init?: RequestInit) => Promise<Response>
window.fetch = (async (path, init) => {
  requests.push({ method: init?.method ?? 'GET', path: String(path) })
  return reply(String(path), init)
}) as typeof fetch

function Probe() {
  wizard = useProcessWizard(user)
  navigate = useNavigate()
  return <output>{wizard.isLoadingProcess ? 'Carregando' : wizard.loadError ?? `${wizard.process.backendId}: etapa ${wizard.viewedStep}`}</output>
}
function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}
const response = (data: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(data), { status }))
const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 350)) })
async function mount() {
  requests = []
  storageWrites = 0
  root = createRoot(document.getElementById('test-root')!)
  await act(async () => { root!.render(<MemoryRouter initialEntries={['/processos/novo?processo=test-process']}><Probe /></MemoryRouter>) })
  await settle()
}
async function unmount() {
  if (root) await act(async () => root!.unmount())
  root = undefined
}

const results: string[] = []
async function test(name: string, run: () => Promise<void>) {
  try { await run(); results.push(`PASSOU: ${name}`) }
  catch (error) { results.push(`FALHOU: ${name}: ${String(error)}`) }
  finally { await unmount() }
  document.getElementById('results')!.textContent = results.join('\n')
}

try {
  for (const status of ['aguardando_validacao', 'aprovado', 'publicado'] as const) {
    await test(`Consulta e comandos bloqueados: ${status}`, async () => {
      reply = () => response(fixture(status))
      await mount()
      const before = JSON.stringify(wizard.process)
      expect(wizard.isReadOnly, 'Processo deveria estar em somente leitura')
      for (const step of [1, 2, 3, 4, 2, 1] as const) {
        await act(async () => wizard.selectConsultationStep(step))
        expect(wizard.viewedStep === step, 'A consulta não mudou de etapa')
      }
      await act(async () => {
        wizard.updateInfo('name', 'Alterado')
        wizard.updateAnswer('trigger', 'Alterado')
        wizard.updateQuestionIndex(0)
        wizard.updateFeedback('accuracyScore', 1)
        wizard.setStep(2, 'Em Entrevista')
        wizard.saveDraft()
        wizard.requestRegeneration()
        wizard.submitForValidation()
        await wizard.generateBpmn()
        await wizard.saveBpmnLayout('<definitions />').catch(() => undefined)
      })
      await settle()
      expect(JSON.stringify(wizard.process) === before, 'Consulta alterou os dados persistidos')
      expect(requests.length === 1 && requests[0].method === 'GET', 'Consulta disparou escrita ou nova leitura')
      expect(storageWrites === 0, 'Consulta disparou salvamento local')
      await unmount()
      await mount()
      expect(wizard.viewedStep === 4, 'Etapa de consulta foi persistida após reabrir')
      expect(JSON.stringify(wizard.process) === before, 'Reabertura alterou os dados')
      expect(storageWrites === 0, 'Reabertura salvou um rascunho')
    })
  }

  for (const status of ['rascunho', 'ajustes_solicitados'] as const) {
    await test(`Edição preservada: ${status}`, async () => {
      reply = () => response(fixture(status))
      await mount()
      expect(!wizard.isReadOnly, 'Processo editável foi bloqueado')
      await act(async () => {
        wizard.updateInfo('name', 'Nome revisado')
        wizard.updateAnswer('trigger', 'Resposta revisada')
      })
      await settle()
      expect(wizard.process.info.name === 'Nome revisado', 'Dados iniciais não foram editados')
      expect(wizard.process.answers.trigger === 'Resposta revisada', 'Resposta não foi editada')
      expect(storageWrites > 0, 'Autosave de processo editável deixou de funcionar')
      await act(async () => wizard.setStep(2, 'Em Entrevista'))
      expect(wizard.viewedStep === 2 && wizard.process.step === 2, 'Navegação editável não persistiu a etapa')
      expect(requests.some(request => request.method === 'PATCH'), 'Navegação editável não sincronizou')
    })
  }

  await test('Falha de leitura bloqueia alterações e permite tentar novamente', async () => {
    reply = () => response({ detail: 'Processo indisponível' }, 403)
    await mount()
    expect(wizard.loadError === 'Processo indisponível', 'Falha foi escondida')
    expect(wizard.process.backendId === null, 'Rascunho estranho substituiu o processo')
    await act(async () => { wizard.saveDraft(); wizard.updateAnswer('trigger', 'Alterado'); wizard.setStep(2, 'Em Entrevista') })
    expect(requests.length === 1 && storageWrites === 0, 'Falha de carregamento permitiu escrita')
    reply = () => response(fixture('publicado'))
    await act(async () => wizard.retryLoad())
    await settle()
    expect(!wizard.loadError && !wizard.isLoadingProcess, 'Nova tentativa não carregou')
    expect(wizard.process.backendId === 'test-process', 'Processo esperado não foi aberto')
  })

  await test('Consulta de processo de outro autor não salva entrevista ausente como rascunho', async () => {
    reply = () => response({ ...fixture('rascunho'), criado_por: 'other-author', entrevista: undefined })
    await mount()
    expect(wizard.isReadOnly, 'Consulta de outro autor permitiu edição')
    await act(async () => { wizard.saveDraft(); wizard.updateAnswer('trigger', 'Alterado') })
    await settle()
    expect(requests.length === 1 && storageWrites === 0, 'Entrevista indisponível disparou escrita')
  })

  await test('Troca de URL ignora resposta antiga e bloqueia alterações durante a espera', async () => {
    const pending = new Map<string, (value: Response) => void>()
    reply = path => new Promise(resolve => pending.set(path, resolve))
    await mount()
    expect(wizard.isLoadingProcess, 'Não indicou carregamento inicial')
    await act(async () => navigate('/processos/novo?processo=second'))
    expect(wizard.isLoadingProcess, 'Troca de URL não bloqueou a consulta antiga')
    await act(async () => { wizard.saveDraft(); wizard.updateInfo('name', 'Alterado') })
    await act(async () => pending.get('/api/processos/second/')!(new Response(JSON.stringify({ ...fixture('aprovado'), id: 'second' }))))
    await act(async () => pending.get('/api/processos/test-process/')!(new Response(JSON.stringify(fixture('rascunho')))))
    await settle()
    expect(wizard.process.backendId === 'second', 'Resposta antiga substituiu o processo da URL atual')
    expect(requests.every(request => request.method === 'GET') && storageWrites === 0, 'Houve escrita durante carregamento')
  })
} finally {
  window.fetch = originalFetch
  Object.defineProperty(window, 'localStorage', localDescriptor)
  Object.defineProperty(window, 'sessionStorage', sessionDescriptor)
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false })
  document.getElementById('results')!.textContent = `${results.join('\n')}\n\n${results.filter(result => result.startsWith('PASSOU')).length}/${results.length} testes passaram.`
}
