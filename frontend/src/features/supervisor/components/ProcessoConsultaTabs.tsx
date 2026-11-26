import * as React from 'react'
import { ChevronDown, ChevronUp, ClipboardList, Lock, MessagesSquare, Workflow } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  InterviewReadOnly,
  ProcessInfoReadOnly,
} from '@/features/process-mapping/components/ProcessReadOnly'
import {
  FALLBACK_INTERVIEW_QUESTIONS,
  fetchPerguntasEntrevista,
  type InterviewQuestion,
} from '@/features/process-mapping/services/interview.service'
import { mapApiStatusToWizardStatus } from '@/features/process-mapping/services/process.service'
import type { InterviewAnswerKey } from '@/features/process-mapping/types/process.types'
import type { ProcessoSupervisao } from '../types/supervisor.types'
import { BPMNReviewPanel } from './BPMNReviewPanel'

type Aba = 'dados' | 'entrevista' | 'bpmn'

const ABAS: Array<{ id: Aba; rotulo: string; Icone: typeof Workflow }> = [
  { id: 'dados', rotulo: '1. Dados iniciais', Icone: ClipboardList },
  { id: 'entrevista', rotulo: '2. Entrevista', Icone: MessagesSquare },
  { id: 'bpmn', rotulo: '3. Fluxo BPMN', Icone: Workflow },
]

// Altura de reserva do cartão do BPMN (canvas de 60vh + cabeçalho e barra de ferramentas),
// usada até a primeira medição real.
const ALTURA_BPMN_PADRAO = 'calc(max(60vh, 25rem) + 11rem)'

// As perguntas mudam raramente; uma busca por sessão basta para todas as consultas.
let perguntasCache: Promise<InterviewQuestion[]> | null = null
function carregarPerguntas(): Promise<InterviewQuestion[]> {
  perguntasCache ??= fetchPerguntasEntrevista()
  return perguntasCache
}

/**
 * Consulta do processo inteiro na governança: dados iniciais, entrevista e o fluxo BPMN,
 * na mesma ordem das etapas do mapeamento.
 */
export function ProcessoConsultaTabs({
  processo,
  onFechar,
}: {
  processo: ProcessoSupervisao
  onFechar?: () => void
}) {
  const [aba, setAba] = React.useState<Aba>('bpmn')
  const [perguntas, setPerguntas] = React.useState<InterviewQuestion[]>(FALLBACK_INTERVIEW_QUESTIONS)
  const idBase = React.useId()

  // Mede o cartão do BPMN para que a entrevista recolhida ocupe o mesmo espaço.
  const [alturaBpmn, setAlturaBpmn] = React.useState<number | null>(null)
  const bpmnRef = React.useRef<HTMLDivElement>(null)
  React.useLayoutEffect(() => {
    const elemento = bpmnRef.current
    if (!elemento) return
    const observar = () => {
      if (elemento.offsetHeight > 0) setAlturaBpmn(elemento.offsetHeight)
    }
    observar()
    const observer = new ResizeObserver(observar)
    observer.observe(elemento)
    return () => observer.disconnect()
  }, [aba])

  React.useEffect(() => {
    let ativo = true
    void carregarPerguntas().then((lista) => {
      if (ativo && lista.length > 0) setPerguntas(lista)
    })
    return () => {
      ativo = false
    }
  }, [])

  function aoTeclar(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const atual = ABAS.findIndex((item) => item.id === aba)
    const passo = event.key === 'ArrowRight' ? 1 : -1
    const proxima = ABAS[(atual + passo + ABAS.length) % ABAS.length]
    setAba(proxima.id)
    document.getElementById(`${idBase}-tab-${proxima.id}`)?.focus()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-2 border-b border-fx-linha">
        <div
          role="tablist"
          aria-label="Etapas do mapeamento"
          onKeyDown={aoTeclar}
          className="flex min-w-0 gap-1 overflow-x-auto"
        >
          {ABAS.map(({ id, rotulo, Icone }) => {
            const ativa = aba === id
            return (
              <button
                key={id}
                id={`${idBase}-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={ativa}
                aria-controls={`${idBase}-painel-${id}`}
                tabIndex={ativa ? 0 : -1}
                onClick={() => setAba(id)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fx-azul',
                  ativa
                    ? 'border-fx-azul text-fx-marinho'
                    : 'border-transparent text-fx-cinza hover:border-fx-linha hover:text-fx-marinho',
                )}
              >
                <Icone className="h-4 w-4" />
                {rotulo}
              </button>
            )
          })}
        </div>
        {onFechar && (
          <Button type="button" size="sm" variant="ghost" className="mb-1 shrink-0" onClick={onFechar}>
            Fechar
          </Button>
        )}
      </div>

      <div
        id={`${idBase}-painel-${aba}`}
        role="tabpanel"
        aria-labelledby={`${idBase}-tab-${aba}`}
      >
        {aba === 'dados' && (
          <ProcessInfoReadOnly
            info={{
              name: processo.nome,
              sector: processo.setor,
              objective: processo.objetivo,
              description: processo.descricao ?? '',
              legislation: processo.legislacao ?? '',
            }}
          />
        )}

        {aba === 'entrevista' &&
          (processo.entrevista ? (
            <EntrevistaRecolhivel alturaMaxima={alturaBpmn ? `${alturaBpmn}px` : ALTURA_BPMN_PADRAO}>
              <InterviewReadOnly
                questions={perguntas}
                answers={processo.entrevista.respostas as Record<InterviewAnswerKey, string>}
                exportContext={{
                  name: processo.nome,
                  code: processo.codigo,
                  sector: processo.setor,
                  status: mapApiStatusToWizardStatus(processo.status),
                  version: processo.versao_atual,
                  updatedAt: processo.atualizado_em,
                  authorName: processo.criado_por_nome,
                }}
              />
            </EntrevistaRecolhivel>
          ) : (
            <Card>
              <CardContent className="flex items-start gap-2 py-6 text-sm text-fx-cinza">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                A entrevista só pode ser consultada pelo autor, pelo supervisor e pelo coordenador do
                setor.
              </CardContent>
            </Card>
          ))}

        {aba === 'bpmn' && (
          <div ref={bpmnRef}>
            <BPMNReviewPanel processo={processo} />
          </div>
        )}
      </div>
    </div>
  )
}

/** Mostra a entrevista na altura do cartão do BPMN; o restante abre sob demanda. */
function EntrevistaRecolhivel({
  alturaMaxima,
  children,
}: {
  alturaMaxima: string
  children: React.ReactNode
}) {
  const [expandida, setExpandida] = React.useState(false)
  const [excede, setExcede] = React.useState(false)
  const conteudoRef = React.useRef<HTMLDivElement>(null)
  const idConteudo = React.useId()

  React.useLayoutEffect(() => {
    const elemento = conteudoRef.current
    if (!elemento) return
    const medir = () => {
      // Com a entrevista recolhida, scrollHeight > clientHeight indica conteúdo escondido.
      if (!expandida) setExcede(elemento.scrollHeight > elemento.clientHeight + 1)
    }
    medir()
    const observer = new ResizeObserver(medir)
    observer.observe(elemento)
    return () => observer.disconnect()
  }, [expandida, alturaMaxima])

  function recolher() {
    setExpandida(false)
    conteudoRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  return (
    <div className="relative">
      <div
        id={idConteudo}
        ref={conteudoRef}
        className="overflow-hidden"
        style={expandida ? undefined : { maxHeight: alturaMaxima }}
      >
        {children}
      </div>

      {excede && !expandida && (
        <div className="pointer-events-none absolute inset-x-px bottom-px flex h-28 items-end justify-center rounded-b-md bg-linear-to-t from-fx-papel via-fx-papel/90 to-transparent pb-4">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="pointer-events-auto bg-fx-papel"
            aria-expanded={false}
            aria-controls={idConteudo}
            onClick={() => setExpandida(true)}
          >
            <ChevronDown className="mr-1.5 h-4 w-4" />
            Ver entrevista completa
          </Button>
        </div>
      )}

      {expandida && (
        <div className="mt-3 flex justify-center">
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-expanded
            aria-controls={idConteudo}
            onClick={recolher}
          >
            <ChevronUp className="mr-1.5 h-4 w-4" />
            Recolher entrevista
          </Button>
        </div>
      )}
    </div>
  )
}
