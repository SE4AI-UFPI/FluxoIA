import { useState } from 'react'
import { ArrowLeft, Check, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import type {
  EditLevelRequired,
  IdentifiedProblemTag,
  ProcessFeedback,
  ProcessWizardState,
} from '../types/process.types'
import { BPMNViewer } from './BPMNViewer'
import { ProcessFichaTecnicaCards } from './ProcessFichaTecnicaCards'
import { ProcessStatus } from './ProcessStatus'
import { VersionHistory } from './VersionHistory'

const EDIT_LEVEL_OPTIONS: Array<{ value: EditLevelRequired; label: string }> = [
  { value: 'nenhuma', label: 'Pronto de primeira, sem ajustes' },
  { value: 'pequenos_ajustes', label: 'Pequenos ajustes de nomes ou textos' },
  { value: 'ajustes_moderados', label: 'Ajustes em etapas, raias ou decisões' },
  { value: 'reconstrucao', label: 'Precisou refazer grande parte do fluxo' },
]

const PROBLEM_TAG_OPTIONS: Array<{ value: IdentifiedProblemTag; label: string }> = [
  { value: 'etapas_ausentes', label: 'Etapas ausentes' },
  { value: 'raias_incorretas', label: 'Raias / setores incorretos' },
  { value: 'decisoes_incorretas', label: 'Pontos de decisão / desvios' },
  { value: 'sequencia_incorreta', label: 'Ordem / sequência das atividades' },
  { value: 'aprovacoes_ausentes', label: 'Aprovações de chefia' },
]

function ScoreButtons({
  label,
  minLabel,
  maxLabel,
  value,
  onSelect,
}: {
  label: string
  minLabel: string
  maxLabel: string
  value: number
  onSelect: (score: number) => void
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-fx-grafite">{label}</legend>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((score) => {
          const selected = value === score
          return (
            <button
              key={score}
              type="button"
              onClick={() => onSelect(score)}
              aria-pressed={selected}
              className={`flex h-10 items-center justify-center rounded-sm border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fx-azul ${
                selected
                  ? 'border-fx-azul bg-fx-azul text-white'
                  : 'border-fx-linha bg-white text-fx-grafite hover:bg-fx-nevoa/60'
              }`}
            >
              {score}
            </button>
          )
        })}
      </div>
      <div className="flex items-center justify-between text-[11px] text-fx-cinza">
        <span>1 · {minLabel}</span>
        <span>5 · {maxLabel}</span>
      </div>
    </fieldset>
  )
}

function FeedbackFields({
  feedback,
  onChange,
}: {
  feedback: ProcessFeedback
  onChange: <Key extends keyof ProcessFeedback>(key: Key, value: ProcessFeedback[Key]) => void
}) {
  function toggleProblem(tag: IdentifiedProblemTag) {
    const current = feedback.identifiedProblems ?? []
    const next = current.includes(tag)
      ? current.filter((item) => item !== tag)
      : [...current, tag]
    onChange('identifiedProblems', next)
  }

  return (
    <div className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-fx-grafite">
          O fluxo representa corretamente o processo? *
        </legend>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { value: true, label: 'Sim, representa' },
            { value: false, label: 'Não representa' },
          ].map(({ value, label }) => {
            const selected = feedback.representsProcess === value
            return (
              <label
                key={label}
                className={`flex min-h-10 cursor-pointer items-center gap-2.5 rounded-sm border px-3 text-sm font-medium transition-colors ${
                  selected
                    ? 'border-fx-azul bg-fx-azul/10 text-fx-marinho'
                    : 'border-fx-linha bg-white text-fx-grafite hover:bg-fx-nevoa/50'
                }`}
              >
                <input
                  type="radio"
                  name="represents-process"
                  checked={selected}
                  onChange={() => onChange('representsProcess', value)}
                  className="h-4 w-4 accent-fx-azul"
                />
                {label}
              </label>
            )
          })}
        </div>
      </fieldset>

      <ScoreButtons
        label="Nota de precisão do fluxo gerado pela IA (1 a 5) *"
        minLabel="Pouco fiel"
        maxLabel="Muito fiel"
        value={feedback.accuracyScore}
        onSelect={(score) => onChange('accuracyScore', score)}
      />

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-fx-grafite">
          Nível de ajuste manual necessário *
        </legend>
        <div className="space-y-1.5">
          {EDIT_LEVEL_OPTIONS.map(({ value, label }) => {
            const selected = feedback.editLevel === value
            return (
              <label
                key={value}
                className={`flex cursor-pointer items-center gap-2.5 rounded-sm border px-3 py-2 text-xs sm:text-sm transition-colors ${
                  selected
                    ? 'border-fx-azul bg-fx-azul/10 font-medium text-fx-marinho'
                    : 'border-fx-linha bg-white text-fx-grafite hover:bg-fx-nevoa/50'
                }`}
              >
                <input
                  type="radio"
                  name="edit-level"
                  checked={selected}
                  onChange={() => onChange('editLevel', value)}
                  className="h-4 w-4 accent-fx-azul"
                />
                <span>{label}</span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <ScoreButtons
        label="Clareza das perguntas da entrevista guiada (1 a 5) *"
        minLabel="Confusas"
        maxLabel="Muito claras"
        value={feedback.interviewClarityScore}
        onSelect={(score) => onChange('interviewClarityScore', score)}
      />

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-fx-grafite">
          Pontos que exigiram atenção na geração da IA (opcional)
        </legend>
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
          {PROBLEM_TAG_OPTIONS.map(({ value, label }) => {
            const checked = (feedback.identifiedProblems ?? []).includes(value)
            return (
              <label
                key={value}
                className={`flex cursor-pointer items-center gap-2.5 rounded-sm border px-3 py-2 text-xs sm:text-sm transition-colors ${
                  checked
                    ? 'border-fx-azul bg-fx-azul/10 font-medium text-fx-marinho'
                    : 'border-fx-linha bg-white text-fx-grafite hover:bg-fx-nevoa/50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleProblem(value)}
                  className="h-4 w-4 rounded accent-fx-azul"
                />
                <span>{label}</span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="feedback-generalNotes">Observações adicionais (opcional)</Label>
        <textarea
          id="feedback-generalNotes"
          value={feedback.generalNotes}
          onChange={(event) => onChange('generalNotes', event.target.value)}
          rows={3}
          placeholder="Caso deseje, detalhe ajustes específicos ou observações sobre o fluxo..."
          className="w-full resize-y rounded-sm border border-fx-linha bg-white px-3 py-2 text-sm text-fx-grafite placeholder:text-fx-cinza/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fx-azul"
        />
      </div>
    </div>
  )
}

export function FeedbackStep({
  process,
  feedback,
  onFeedbackChange,
  onBack,
  onRegenerate,
  onConfirm,
  onNewProcess,
}: {
  process: ProcessWizardState
  feedback: ProcessFeedback
  onFeedbackChange: <Key extends keyof ProcessFeedback>(key: Key, value: ProcessFeedback[Key]) => void
  onBack: () => void
  onRegenerate: () => void
  onConfirm: () => void
  onNewProcess: () => void
}) {
  const [feedbackOpen, setFeedbackOpen] = useState(true)
  const submitted = process.status === 'Aguardando Validação do Gestor'

  if (submitted) {
    return (
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-xl">Processo encaminhado para validação</CardTitle>
              <ProcessStatus status={process.status} />
            </div>
            <CardDescription>O fluxo e a avaliação da IA foram confirmados e registrados.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 border-t border-fx-linha/70 pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><p className="text-[11px] text-fx-cinza">Código do Processo</p><p className="mt-1 font-mono text-sm font-semibold text-fx-marinho">{process.code}</p></div>
            <div><p className="text-[11px] text-fx-cinza">Versão</p><p className="mt-1 text-sm font-semibold text-fx-marinho">{process.version}</p></div>
            <div><p className="text-[11px] text-fx-cinza">Data de Envio</p><p className="mt-1 text-sm font-semibold text-fx-marinho">{process.sentAt ? new Date(process.sentAt).toLocaleString('pt-BR') : 'Agora'}</p></div>
            <div><p className="text-[11px] text-fx-cinza">Nota de Precisão IA</p><p className="mt-1 text-sm font-semibold text-fx-marinho">{feedback.accuracyScore} / 5</p></div>
          </CardContent>
        </Card>
        <VersionHistory entries={process.history} />
        <Button type="button" onClick={onNewProcess}>Iniciar outro processo</Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1.5">
              <CardTitle className="text-xl">Avaliação Quantitativa e Feedback</CardTitle>
              <CardDescription>Avalie a qualidade do fluxo gerado pela IA e confirme se ele representa o processo da sua unidade.</CardDescription>
            </div>
            <Badge variant="secondary">v{process.version}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 border-t border-fx-linha/70 pt-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
          <div className="min-w-0 space-y-3">
            <h3 className="text-sm font-semibold text-fx-marinho">Fluxo BPMN · {process.info.name}</h3>
            {process.bpmnXml && <BPMNViewer xml={process.bpmnXml} filename={process.code ?? 'processo-bpmn'} />}
            <ProcessFichaTecnicaCards process={process} />
          </div>
          <details open={feedbackOpen} onToggle={(event) => setFeedbackOpen(event.currentTarget.open)} className="min-w-0 rounded-sm border border-fx-linha bg-fx-papel p-4">
            <summary className="cursor-pointer text-sm font-semibold text-fx-marinho focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fx-azul">
              Avaliação da geração por IA
            </summary>
            <div className="pt-4">
              <FeedbackFields feedback={feedback} onChange={onFeedbackChange} />
            </div>
          </details>
        </CardContent>
      </Card>

      <VersionHistory entries={process.history} />
      <div className="flex flex-col-reverse gap-2 border-t border-fx-linha/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="outline" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Voltar ao BPMN</Button>
        <div className="grid gap-2 sm:flex">
          <Button type="button" variant="outline" onClick={onRegenerate}><RotateCcw className="h-4 w-4" /> Solicitar Regeneração</Button>
          <Button type="button" onClick={onConfirm}><Check className="h-4 w-4" /> Confirmar Fluxo</Button>
        </div>
      </div>
    </div>
  )
}
