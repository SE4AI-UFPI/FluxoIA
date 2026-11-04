import { ArrowLeft, ArrowRight, Network, WandSparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BPMNViewer } from './BPMNViewer'
import { ProcessStatus } from './ProcessStatus'
import { VersionHistory } from './VersionHistory'
import type { ProcessWizardState } from '../types/process.types'

export function BPMNGenerationStep({
  process,
  lastSavedAt,
  onGenerate,
  onBack,
  onContinue,
  onSave,
}: {
  process: ProcessWizardState
  lastSavedAt: string | null
  onGenerate: () => void
  onBack: () => void
  onContinue: () => void
  onSave: () => void
}) {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle className="text-xl">Geração do Fluxo BPMN</CardTitle>
            <CardDescription>Consolide as respostas da entrevista em um diagrama inicial do processo.</CardDescription>
          </div>
          <ProcessStatus status={process.status} />
        </CardHeader>
        <CardContent className="grid gap-3 border-t border-fx-linha/70 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><p className="text-[11px] text-fx-cinza">Nome do Processo</p><p className="mt-1 text-sm font-semibold text-fx-marinho">{process.info.name}</p></div>
          <div><p className="text-[11px] text-fx-cinza">Setor</p><p className="mt-1 text-sm font-semibold text-fx-marinho">{process.info.sector}</p></div>
          <div><p className="text-[11px] text-fx-cinza">Gerado em</p><p className="mt-1 text-sm font-semibold text-fx-marinho">{process.bpmnXml ? new Date(process.updatedAt).toLocaleString('pt-BR') : 'Aguardando geração'}</p></div>
          <div><p className="text-[11px] text-fx-cinza">Versão Atual</p><p className="mt-1 text-sm font-semibold text-fx-marinho">v{process.version}</p></div>
        </CardContent>
      </Card>

      {process.bpmnXml ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-fx-azul" />
                <CardTitle className="text-base">Diagrama BPMN</CardTitle>
              </div>
              <Badge variant="secondary">Versão {process.version}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <BPMNViewer xml={process.bpmnXml} filename={process.code ?? 'processo-bpmn'} />
            <div className="flex flex-col-reverse gap-2 border-t border-fx-linha/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-fx-cinza" aria-live="polite">
                {lastSavedAt ? `Rascunho salvo às ${new Date(lastSavedAt).toLocaleTimeString('pt-BR')}` : 'Salvamento automático ativo'}
              </span>
              <div className="grid gap-2 sm:flex">
                <Button type="button" variant="outline" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Voltar</Button>
                <Button type="button" variant="outline" onClick={onSave}>Salvar Rascunho</Button>
                <Button type="button" variant="outline" onClick={onGenerate}>
                  <WandSparkles className="h-4 w-4" /> Gerar Nova Versão
                </Button>
                <Button type="button" onClick={onContinue}>Avaliar Fluxo <ArrowRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-fx-nevoa text-fx-azul"><WandSparkles className="h-5 w-5" /></span>
            <div className="max-w-lg space-y-1.5">
              <h3 className="text-base font-semibold text-fx-marinho">Pronto para gerar o fluxo</h3>
              <p className="text-sm leading-relaxed text-fx-cinza">As respostas serão organizadas em um fluxo BPMN inicial. Revise o diagrama antes de encaminhá-lo ao gestor.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Voltar à Entrevista</Button>
              <Button type="button" onClick={onGenerate}><WandSparkles className="h-4 w-4" /> Gerar Fluxo BPMN</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <VersionHistory entries={process.history} />
    </div>
  )
}