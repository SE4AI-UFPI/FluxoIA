import * as React from 'react'
import {
  ArrowLeft,
  Check,
  Edit2,
  Loader2,
  Save,
  Send,
  SkipForward,
  User,
  X,
} from 'lucide-react'
import { FluxoBotIcon } from '@/components/icons/FluxoBotIcon'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { type InterviewQuestion, validarRespostaEntrevista } from '../services/interview.service'
import {
  type ChatTurn,
  type QuestionConversation,
  EMPTY_CONVERSATION,
  applyValidationResult,
  buildConversationHistory,
  combineAnswer,
  keepVagueAnswer,
} from '../services/interview-chat.service'
import type { InterviewAnswerKey } from '../types/process.types'
import { InterviewReadOnly } from './ProcessReadOnly'
import type { InterviewExportContext } from '../services/interview-export.service'
import { InterviewExportButtons } from './InterviewExportButtons'

type InterviewStepProps = {
  questions: InterviewQuestion[]
  answers: Record<InterviewAnswerKey, string>
  questionIndex: number
  onAnswer: (key: InterviewAnswerKey, value: string) => void
  onQuestionChange: (index: number) => void
  onBack: () => void
  onSave: () => void
  onFinish: () => void
  readOnly?: boolean
  exportContext?: InterviewExportContext
  processContext?: {
    id?: string
    name: string
    sector: string
    objective: string
  }
}

export function InterviewStep(props: InterviewStepProps) {
  if (props.readOnly) return <InterviewReadOnly questions={props.questions} answers={props.answers} exportContext={props.exportContext} />
  return <EditableInterviewStep {...props} />
}

function EditableInterviewStep({
  exportContext,
  processContext,
  questions,
  answers,
  questionIndex,
  onAnswer,
  onQuestionChange,
  onBack,
  onSave,
  onFinish,
}: InterviewStepProps) {
  const currentQuestions = questions.length > 0 ? questions : []
  
  const [inputText, setInputText] = React.useState('')
  const [editingKey, setEditingKey] = React.useState<InterviewAnswerKey | null>(null)
  const [revealedQuestionId, setRevealedQuestionId] = React.useState<InterviewAnswerKey | null>(null)
  const [isValidating, setIsValidating] = React.useState(false)
  // Conversa das perguntas ainda sem resposta aceita (tentativas e réplicas do assistente).
  const [conversations, setConversations] = React.useState<Partial<Record<InterviewAnswerKey, QuestionConversation>>>({})
  // Reconhecimento do assistente exibido logo após a resposta aceita.
  const [acknowledgements, setAcknowledgements] = React.useState<Partial<Record<InterviewAnswerKey, string>>>({})
  // Mensagem enviada que aguarda a análise da IA (aparece no chat com o "digitando").
  const [pendingMessage, setPendingMessage] = React.useState<{ key: InterviewAnswerKey; text: string } | null>(null)
  const [assistantAnnouncement, setAssistantAnnouncement] = React.useState('')
  const turnIdRef = React.useRef(0)

  const chatContainerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLTextAreaElement>(null)
  const finishButtonRef = React.useRef<HTMLButtonElement>(null)
  const focusAfterAnswerRef = React.useRef(false)

  React.useLayoutEffect(() => {
    if (!focusAfterAnswerRef.current) return
    focusAfterAnswerRef.current = false
    const nextControl = finishButtonRef.current ?? inputRef.current
    nextControl?.focus({ preventScroll: true })
  })

  // Determina qual é a pergunta atual na fila
  const currentQuestionIndex = Math.min(Math.max(0, questionIndex), Math.max(0, currentQuestions.length - 1))
  const currentQuestion = currentQuestions[currentQuestionIndex]
  const currentQuestionId = currentQuestion?.id
  const hasCurrentAnswer = Boolean(currentQuestionId && answers[currentQuestionId]?.trim())
  const isTyping = Boolean(
    currentQuestionId && !hasCurrentAnswer && revealedQuestionId !== currentQuestionId,
  )

  React.useEffect(() => {
    if (!currentQuestionId || hasCurrentAnswer) return

    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450
    const timeout = window.setTimeout(() => setRevealedQuestionId(currentQuestionId), delay)
    return () => window.clearTimeout(timeout)
  }, [currentQuestionId, hasCurrentAnswer])

  // Iniciar edição de uma pergunta
  function startEditing(key: InterviewAnswerKey) {
    setEditingKey(key)
    setInputText(answers[key] ?? '')
    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 50)
  }

  function cancelEditing() {
    if (editingKey) setConversation(editingKey, null)
    setEditingKey(null)
    setInputText(answers[currentQuestion?.id] ?? '')
  }

  // Sincroniza o texto do input quando muda de pergunta no fluxo normal
  React.useEffect(() => {
    if (!editingKey && currentQuestion) {
      setInputText(answers[currentQuestion.id] ?? '')
    }
  }, [currentQuestionIndex, currentQuestion, editingKey])

  // Scroll suave para o fim do feed quando surgem novas mensagens
  React.useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [currentQuestionIndex, answers, isTyping, conversations, acknowledgements, pendingMessage])

  if (!currentQuestion) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-fx-cinza">
          Carregando entrevista guiada...
        </CardContent>
      </Card>
    )
  }

  // Estatísticas de preenchimento
  const answeredCount = currentQuestions.filter((q) => Boolean(answers[q.id]?.trim())).length
  const requiredQuestions = currentQuestions.filter((q) => q.required)
  const requiredAnsweredCount = requiredQuestions.filter((q) => Boolean(answers[q.id]?.trim())).length
  const allRequiredAnswered = requiredQuestions.length > 0 && requiredAnsweredCount === requiredQuestions.length
  const lastQuestion = currentQuestions[currentQuestions.length - 1]
  const isAtLastQuestion = currentQuestionIndex === currentQuestions.length - 1
  const isLastQuestionAnswered = Boolean(lastQuestion && answers[lastQuestion.id]?.trim())
  const isInterviewComplete = isAtLastQuestion && isLastQuestionAnswered && allRequiredAnswered
  const progressPercent = Math.round((answeredCount / Math.max(1, currentQuestions.length)) * 100)

  function setConversation(key: InterviewAnswerKey, conversation: QuestionConversation | null) {
    setConversations((prev) => {
      const next = { ...prev }
      if (conversation) next[key] = conversation
      else delete next[key]
      return next
    })
  }

  function commitAnswer(targetKey: InterviewAnswerKey, textValue: string, acknowledgement = '') {
    focusAfterAnswerRef.current = true
    setConversation(targetKey, null)
    setAcknowledgements((prev) => {
      const next = { ...prev }
      if (acknowledgement) next[targetKey] = acknowledgement
      else delete next[targetKey]
      return next
    })
    if (acknowledgement) setAssistantAnnouncement(acknowledgement)
    onAnswer(targetKey, textValue)

    if (editingKey) {
      setEditingKey(null)
      setInputText('')
    } else {
      if (currentQuestionIndex < currentQuestions.length - 1) {
        onQuestionChange(currentQuestionIndex + 1)
      }
      setInputText('')
    }
  }

  // Envio da mensagem: a IA classifica e responde no próprio chat, sempre reconduzindo à pergunta.
  async function handleSend() {
    if ((isTyping && !editingKey) || isValidating) return
    const targetKey = editingKey || currentQuestion.id
    const targetQuestion = currentQuestions.find((q) => q.id === targetKey) || currentQuestion
    const trimmed = inputText.trim()
    const conversation = conversations[targetKey] ?? EMPTY_CONVERSATION

    if (!trimmed && targetQuestion.required) {
      return
    }

    if (!trimmed && !targetQuestion.required) {
      commitAnswer(targetKey, '')
      return
    }

    setIsValidating(true)
    setPendingMessage({ key: targetKey, text: trimmed })
    setInputText('')

    const result = await validarRespostaEntrevista({
      chave_pergunta: targetQuestion.id,
      titulo_pergunta: targetQuestion.title,
      enunciado_pergunta: targetQuestion.prompt,
      obrigatoria: targetQuestion.required,
      resposta: combineAnswer(conversation, trimmed),
      processo_id: processContext?.id || '',
      processo_nome: processContext?.name || exportContext?.name || '',
      processo_setor: processContext?.sector || exportContext?.sector || '',
      processo_objetivo: processContext?.objective || '',
      respostas_anteriores: answers,
      historico_conversa: buildConversationHistory(conversation),
    })

    setIsValidating(false)
    setPendingMessage(null)

    const outcome = applyValidationResult(conversation, trimmed, result, () => `turno-${++turnIdRef.current}`)
    if (outcome.aceita) {
      commitAnswer(targetKey, outcome.resposta, outcome.confirmacao)
      return
    }

    setConversation(targetKey, outcome.conversa)
    setAssistantAnnouncement(outcome.fala)
    setTimeout(() => inputRef.current?.focus(), 30)
  }

  function keepVagueAnswerAndContinue(key: InterviewAnswerKey) {
    const conversation = conversations[key]
    if (!conversation || isValidating) return
    commitAnswer(key, keepVagueAnswer(conversation))
  }

  function handleSkip() {
    if (isTyping || isValidating || currentQuestion.required) return
    focusAfterAnswerRef.current = true
    if (!answers[currentQuestion.id]) {
      onAnswer(currentQuestion.id, '')
    }
    if (currentQuestionIndex < currentQuestions.length - 1) {
      onQuestionChange(currentQuestionIndex + 1)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSend()
    }
  }

  // Lista de mensagens até a pergunta atual
  const visibleQuestions = currentQuestions.slice(0, currentQuestionIndex + (isTyping ? 0 : 1))

  return (
    <Card className="flex flex-col border-fx-linha bg-fx-papel shadow-sm overflow-hidden">
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {isInterviewComplete
          ? 'Entrevista concluída. Você pode finalizar ou editar as respostas.'
          : isTyping
            ? 'Assistente preparando a próxima pergunta'
            : `Pergunta ${currentQuestionIndex + 1} de ${currentQuestions.length}. ${currentQuestion.title}. ${currentQuestion.prompt}`}
      </p>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {assistantAnnouncement}
      </p>
      {/* Cabeçalho do Chat com Progresso */}
      <CardHeader className="border-b border-fx-linha/70 pb-4 bg-fx-fundo/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fx-azul/10 text-fx-azul">
              <FluxoBotIcon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg text-fx-marinho">Assistente FluxoIA · Entrevista Guiada</CardTitle>
              <CardDescription className="text-xs text-fx-cinza">
                Responda em formato de conversa contínua. As mensagens formam o roteiro do seu processo.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs font-medium">
              {answeredCount} de {currentQuestions.length} respondidas
            </Badge>
            <div className="w-24 h-2 rounded-full bg-fx-nevoa overflow-hidden">
              <div
                className="h-full bg-fx-azul transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
        {exportContext && <InterviewExportButtons data={{ questions, answers, context: exportContext }} />}
      </CardHeader>

      {/* Feed Contínuo do Chat */}
      <CardContent className="p-0">
        <div
          ref={chatContainerRef}
          className="h-[460px] overflow-y-auto p-4 sm:p-6 space-y-5 bg-gradient-to-b from-fx-fundo/20 to-white"
        >
          {/* Mensagem de Boas-vindas do Assistente */}
          <div className="flex items-start gap-3 max-w-[85%]">
            <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-fx-marinho text-white shadow-xs">
              <FluxoBotIcon className="h-4 w-4" />
            </div>
            <div className="rounded-2xl rounded-tl-xs border border-fx-linha bg-white p-4 text-sm text-fx-grafite shadow-xs leading-relaxed">
              <p className="font-semibold text-fx-marinho mb-1">Olá! Vamos mapear este processo juntos.</p>
              <p className="text-fx-cinza text-xs">
                Farei uma sequência de perguntas para entender o fluxo do início ao fim. Você pode digitar com calma e editar qualquer resposta clicando no botão de lápis.
              </p>
            </div>
          </div>

          {/* Histórico das Perguntas e Respostas */}
          {visibleQuestions.map((q, idx) => {
            const hasAnswer = Boolean(answers[q.id]?.trim())
            const isBeingEdited = editingKey === q.id

            return (
              <div key={q.id} className="space-y-3.5">
                {/* Mensagem da IA com a Pergunta */}
                <div className="flex items-start gap-3 max-w-[85%]">
                  <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-fx-azul text-white shadow-xs">
                    <FluxoBotIcon className="h-4 w-4" />
                  </div>
                  <div className="rounded-2xl rounded-tl-xs border border-fx-linha bg-white p-4 text-sm text-fx-grafite shadow-xs space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-fx-azul">
                        Passo {idx + 1} · {q.title}
                      </span>
                      {q.required ? (
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4">Obrigatória</Badge>
                      ) : (
                        <span className="text-[10px] text-fx-cinza">Opcional</span>
                      )}
                    </div>
                    <p className="font-semibold text-fx-marinho text-sm sm:text-base leading-snug">
                      {q.prompt}
                    </p>
                  </div>
                </div>

                {/* Resposta do Servidor (se já respondeu) */}
                {hasAnswer && (
                  <div className="flex items-start justify-end gap-2.5 pl-6 sm:pl-10">
                    {/* Botão de Editar Sempre Visível */}
                    <button
                      type="button"
                      onClick={() => startEditing(q.id)}
                      className={`mt-1 flex h-7 items-center gap-1 rounded-sm border px-2 text-xs transition-colors ${
                        isBeingEdited
                          ? 'border-fx-azul bg-fx-azul text-white font-medium'
                          : 'border-fx-linha bg-white text-fx-cinza hover:border-fx-azul hover:text-fx-azul hover:bg-fx-nevoa/40'
                      }`}
                      title="Editar esta resposta"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span className="hidden sm:inline">{isBeingEdited ? 'Editando' : 'Editar'}</span>
                    </button>

                    <div
                      className={`relative rounded-2xl rounded-tr-xs px-4 py-3 text-sm shadow-xs max-w-[85%] cursor-pointer transition-all ${
                        isBeingEdited
                          ? 'bg-fx-azul/90 text-white ring-2 ring-fx-azul ring-offset-2'
                          : 'bg-fx-azul text-white hover:bg-fx-azul/95'
                      }`}
                      onClick={() => startEditing(q.id)}
                      title="Clique para editar"
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{answers[q.id]}</p>
                    </div>

                    <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-fx-nevoa text-fx-marinho border border-fx-linha shadow-xs">
                      <User className="h-4 w-4" />
                    </div>
                  </div>
                )}

                {/* Reconhecimento do assistente após a resposta aceita */}
                {hasAnswer && acknowledgements[q.id] && (
                  <AssistantBubble>{acknowledgements[q.id]}</AssistantBubble>
                )}

                {/* Conversa em andamento: tentativas e réplicas humanizadas do assistente */}
                {(conversations[q.id]?.turnos ?? []).map((turn, turnIdx, turns) => (
                  <ConversationTurnBubble
                    key={turn.id}
                    turn={turn}
                    canKeepVagueAnswer={
                      turn.status === 'vaga' && turnIdx === turns.length - 1 && !isValidating
                    }
                    onKeepVagueAnswer={() => keepVagueAnswerAndContinue(q.id)}
                  />
                ))}

                {pendingMessage?.key === q.id && (
                  <>
                    <OperatorAttemptBubble text={pendingMessage.text} />
                    <TypingBubble label="Assistente analisando sua resposta" />
                  </>
                )}
              </div>
            )
          })}
          {isTyping && <TypingBubble label="Assistente preparando a próxima pergunta" />}
        </div>

        {/* Barra de Entrada (Input de Chat) */}
        <div className="border-t border-fx-linha bg-white p-3 sm:p-4">
          {isInterviewComplete && !editingKey ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-sm border border-fx-sucesso/40 bg-fx-sucesso/10 px-3.5 py-2.5 text-xs text-fx-marinho">
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-fx-sucesso" />
                <span>
                  <strong>Entrevista concluída!</strong> Todas as perguntas foram percorridas. Para alterar alguma resposta, clique em <strong>Editar</strong> na mensagem desejada acima.
                </span>
              </span>
            </div>
          ) : (
            <>
              {editingKey ? (
                <div className="mb-2 flex items-center justify-between text-xs text-fx-azul bg-fx-nevoa/60 border border-fx-azul/30 px-3 py-1.5 rounded-sm">
                  <span className="flex items-center gap-1.5">
                    <Edit2 className="h-3.5 w-3.5 text-fx-azul" />
                    Editando resposta de: <strong>{currentQuestions.find(q => q.id === editingKey)?.title}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    className="flex items-center gap-1 text-fx-cinza hover:text-fx-marinho font-semibold"
                  >
                    <X className="h-3 w-3" />
                    Cancelar edição
                  </button>
                </div>
              ) : (
                <div className="mb-2 flex items-center justify-between text-xs text-fx-cinza">
                  <span>
                    {isTyping ? 'Preparando a próxima pergunta...' : (
                      <>Respondendo: <strong>{currentQuestion.title}</strong> ({currentQuestionIndex + 1} de {currentQuestions.length})</>
                    )}
                  </span>
                  <span className="text-[11px] hidden sm:inline">Pressione <strong>Enter</strong> para enviar, <strong>Shift+Enter</strong> para quebrar linha</span>
                </div>
              )}

              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  rows={2}
                  readOnly={(isTyping && !editingKey) || isValidating}
                  aria-label={editingKey ? 'Editar resposta' : 'Sua resposta'}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    (conversations[editingKey || currentQuestion.id]?.partesVagas.length ?? 0) > 0
                      ? 'Complemente sua resposta com o detalhe pedido...'
                      : editingKey
                      ? "Atualize sua resposta e clique em Salvar Alteração..."
                      : currentQuestion.required
                      ? "Digite sua resposta detalhada e clique em Enviar..."
                      : "Digite sua resposta (ou clique em Pular se não se aplicar)..."
                  }
                  className={`flex-1 resize-none rounded-lg border px-3.5 py-2.5 text-sm text-fx-grafite placeholder:text-fx-cinza/60 focus-visible:outline-none focus-visible:ring-2 ${
                    editingKey
                      ? 'border-fx-azul bg-white focus-visible:ring-fx-azul ring-1 ring-fx-azul/40'
                      : 'border-fx-linha bg-fx-papel focus-visible:ring-fx-azul'
                  }`}
                />

                {!editingKey && !currentQuestion.required && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSkip}
                    disabled={isTyping || isValidating}
                    className="h-10 text-xs text-fx-cinza hover:text-fx-marinho"
                    title="Pular pergunta opcional"
                  >
                    <SkipForward className="h-4 w-4 mr-1" />
                    Pular
                  </Button>
                )}

                <Button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={
                    (isTyping && !editingKey) ||
                    isValidating ||
                    Boolean(
                      currentQuestions.find((q) => q.id === (editingKey || currentQuestion.id))
                        ?.required && !inputText.trim(),
                    )
                  }
                  className="h-10 px-4"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      {editingKey ? <Check className="h-4 w-4 mr-1.5" /> : <Send className="h-4 w-4 mr-1.5" />}
                      {editingKey ? 'Salvar Alteração' : 'Enviar'}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Barra de Ações Inferior (Navegação do Wizard) */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-fx-linha/70 bg-fx-fundo/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar aos Dados Iniciais
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onSave}>
              <Save className="h-4 w-4 mr-1" /> Salvar Rascunho
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {isInterviewComplete ? (
              <Button ref={finishButtonRef} type="button" onClick={onFinish} className="bg-fx-sucesso hover:bg-fx-sucesso/90 text-white">
                Finalizar Entrevista e Gerar BPMN <Check className="h-4 w-4 ml-1.5" />
              </Button>
            ) : (
              <span className="text-xs text-fx-cinza">
                {!allRequiredAnswered
                  ? `Responda às ${requiredQuestions.length - requiredAnsweredCount} perguntas obrigatórias restantes para concluir a entrevista.`
                  : `Conclua ou pule as etapas até o Passo ${currentQuestions.length} para finalizar a entrevista.`}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AssistantBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 max-w-[85%]">
      <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-fx-azul text-white shadow-xs" aria-hidden="true">
        <FluxoBotIcon className="h-4 w-4" />
      </div>
      <div className="rounded-2xl rounded-tl-xs border border-fx-linha bg-white px-4 py-3 text-sm text-fx-grafite shadow-xs leading-relaxed space-y-2">
        {children}
      </div>
    </div>
  )
}

function OperatorAttemptBubble({ text }: { text: string }) {
  return (
    <div className="flex items-start justify-end gap-2.5 pl-6 sm:pl-10">
      <div className="rounded-2xl rounded-tr-xs border border-fx-linha bg-fx-nevoa px-4 py-3 text-sm text-fx-marinho shadow-xs max-w-[85%]">
        <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
      </div>
      <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-fx-nevoa text-fx-marinho border border-fx-linha shadow-xs" aria-hidden="true">
        <User className="h-4 w-4" />
      </div>
    </div>
  )
}

function ConversationTurnBubble({
  turn,
  canKeepVagueAnswer,
  onKeepVagueAnswer,
}: {
  turn: ChatTurn
  canKeepVagueAnswer: boolean
  onKeepVagueAnswer: () => void
}) {
  if (turn.papel === 'operacional') return <OperatorAttemptBubble text={turn.texto} />
  return (
    <AssistantBubble>
      <p className="whitespace-pre-wrap">{turn.texto}</p>
      {canKeepVagueAnswer && (
        <button
          type="button"
          onClick={onKeepVagueAnswer}
          className="text-xs font-medium text-fx-azul underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fx-azul rounded-xs"
        >
          Prefiro manter minha resposta e seguir
        </button>
      )}
    </AssistantBubble>
  )
}

function TypingBubble({ label }: { label: string }) {
  return (
    <div className="flex max-w-[85%] items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fx-azul text-white shadow-xs" aria-hidden="true">
        <FluxoBotIcon className="h-4 w-4" />
      </div>
      <div className="rounded-2xl rounded-tl-xs border border-fx-linha bg-white px-4 py-3.5 shadow-xs">
        <span className="sr-only">{label}</span>
        <span className="flex items-center gap-1.5" aria-hidden="true">
          {[0, 120, 240].map((delay) => (
            <span
              key={delay}
              className="h-2 w-2 rounded-full bg-fx-azul motion-safe:animate-pulse"
              style={{ animationDelay: `${delay}ms`, animationDuration: '900ms' }}
            />
          ))}
        </span>
      </div>
    </div>
  )
}
