import { useState } from 'react'
import { ArrowLeft, Check, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import type { ProcessFeedback, ProcessWizardState } from '../types/process.types'
import { BPMNViewer } from './BPMNViewer'
import { ProcessStatus } from './ProcessStatus'
import { VersionHistory } from './VersionHistory'

function FeedbackFields({
  feedback,
  onChange,
}: {
  feedback: ProcessFeedback
  onChange: <Key extends keyof ProcessFeedback>(key: Key, value: ProcessFeedback[Key]) => void
}) {
  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-fx-grafite">O fluxo representa corretamente o processo? *</legend>
        <div className="flex flex-wrap gap-3">
          {[
            { value: true, label: 'Sim' },
            { value: false, label: 'Não' },
          ].map(({ value, label }) => (
            <label key={label} className="flex min-h-10 items-center gap-2 rounded-sm border border-fx-linha px-3 text-sm text-fx-grafite">
              <input
                type="radio"
                name="represents-process"
                checked={feedback.representsProcess === value}
                onChange={() => onChange('representsProcess', value)}
                className="h-4 w-4 accent-fx-azul"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      {([
        ['missingSteps', 'Existem etapas faltantes?'],
        ['missingApprovals', 'Existem aprovações ausentes?'],
        ['incorrectResponsibles', 'Existem responsáveis incorretos?'],
        ['generalNotes', 'Observações Gerais'],
      ] as const).map(([key, label]) => (
        <div key={key} className="space-y-2">
          <Label htmlFor={`feedback-${key}`}>{label}</Label>
          <textarea
            id={`feedback-${key}`}
            value={feedback[key]}
            onChange={(event) => onChange(key, event.target.value)}
            rows={key === 'generalNotes' ? 4 : 3}
            className="w-full resize-y rounded-sm border border-fx-linha bg-white px-3 py-2 text-sm text-fx-grafite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fx-azul"
          />
        </div>
      ))}
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
            <CardDescription>O fluxo foi confirmado e registrado nesta sessão.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 border-t border-fx-linha/70 pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><p className="text-[11px] text-fx-cinza">Código do Processo</p><p className="mt-1 font-mono text-sm font-semibold text-fx-marinho">{process.code}</p></div>
            <div><p className="text-[11px] text-fx-cinza">Versão</p><p className="mt-1 text-sm font-semibold text-fx-marinho">{process.version}</p></div>
            <div><p className="text-[11px] text-fx-cinza">Data de Envio</p><p className="mt-1 text-sm font-semibold text-fx-marinho">{process.sentAt ? new Date(process.sentAt).toLocaleString('pt-BR') : 'Agora'}</p></div>
            <div><p className="text-[11px] text-fx-cinza">Responsável</p><p className="mt-1 text-sm font-semibold text-fx-marinho">Gestor do setor</p></div>
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
              <CardTitle className="text-xl">Avaliação e Feedback</CardTitle>
              <CardDescription>Revise o fluxo e confirme se ele representa o processo da sua unidade.</CardDescription>
            </div>
            <Badge variant="secondary">v{process.version}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 border-t border-fx-linha/70 pt-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
          <div className="min-w-0 space-y-3">
            <h3 className="text-sm font-semibold text-fx-marinho">Fluxo BPMN · {process.info.name}</h3>
            {process.bpmnXml && <BPMNViewer xml={process.bpmnXml} filename={process.code ?? 'processo-bpmn'} />}
          </div>
          <details open={feedbackOpen} onToggle={(event) => setFeedbackOpen(event.currentTarget.open)} className="min-w-0 rounded-sm border border-fx-linha bg-fx-papel p-4">
            <summary className="cursor-pointer text-sm font-semibold text-fx-marinho focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fx-azul">
              Feedback e observações
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