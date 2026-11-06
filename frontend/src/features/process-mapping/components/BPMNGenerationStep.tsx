import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bot,
  Loader2,
  Network,
  Save,
  Sparkles,
  WandSparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BPMNViewer } from './BPMNViewer'
import { ProcessFichaTecnicaCards } from './ProcessFichaTecnicaCards'
import { ProcessStatus } from './ProcessStatus'
import { VersionHistory } from './VersionHistory'
import type { ProcessWizardState } from '../types/process.types'

export function BPMNGenerationStep({
  process,
  lastSavedAt,
  isGenerating = false,
  generationError = null,
  onGenerate,
  onBack,
  onContinue,
  onSave,
}: {
  process: ProcessWizardState
  lastSavedAt: string | null
  isGenerating?: boolean
  generationError?: string | null
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
            <CardTitle className="text-xl">Modelagem e Geração do Fluxo BPMN (IA)</CardTitle>
            <CardDescription>
              Geração assistida por Inteligência Artificial com divisão automática de raias e decisões BPMN 2.0.
            </CardDescription>
          </div>
          <ProcessStatus status={process.status} />
        </CardHeader>
        <CardContent className="grid gap-3 border-t border-fx-linha/70 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-[11px] text-fx-cinza">Nome do Processo</p>
            <p className="mt-1 text-sm font-semibold text-fx-marinho">{process.info.name}</p>
          </div>
          <div>
            <p className="text-[11px] text-fx-cinza">Setor / Unidade</p>
            <p className="mt-1 text-sm font-semibold text-fx-marinho">{process.info.sector}</p>
          </div>
          <div>
            <p className="text-[11px] text-fx-cinza">Última Atualização</p>
            <p className="mt-1 text-sm font-semibold text-fx-marinho">
              {process.bpmnXml ? new Date(process.updatedAt).toLocaleString('pt-BR') : 'Aguardando geração pela IA'}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-fx-cinza">Versão Atual</p>
            <p className="mt-1 text-sm font-semibold text-fx-marinho">v{process.version}</p>
          </div>
        </CardContent>
      </Card>

      {generationError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-sm border border-fx-alerta/40 bg-fx-alerta/10 px-4 py-3 text-sm text-fx-alerta"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold">Falha ao comunicar com o motor de IA</p>
            <p className="text-xs leading-relaxed">{generationError}</p>
          </div>
        </div>
      )}

      {process.bpmnXml ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-fx-azul" />
                <CardTitle className="text-base">Diagrama BPMN 2.0 Gerado</CardTitle>
              </div>
              <Badge variant="secondary">Versão {process.version}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <BPMNViewer xml={process.bpmnXml} filename={process.code ?? 'processo-bpmn'} />
            <ProcessFichaTecnicaCards process={process} />
            <div className="flex flex-col-reverse gap-2 border-t border-fx-linha/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-fx-cinza" aria-live="polite">
                {lastSavedAt ? `Sincronizado às ${new Date(lastSavedAt).toLocaleTimeString('pt-BR')}` : 'Sincronizado com o banco'}
              </span>
              <div className="grid gap-2 sm:flex">
                <Button type="button" variant="outline" onClick={onBack} disabled={isGenerating}>
                  <ArrowLeft className="h-4 w-4" /> Voltar à Entrevista
                </Button>
                <Button type="button" variant="outline" onClick={onSave} disabled={isGenerating}>
                  <Save className="h-4 w-4" /> Salvar Rascunho
                </Button>
                <Button type="button" variant="outline" onClick={onGenerate} disabled={isGenerating}>
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
                  {isGenerating ? 'Regenerando com IA...' : 'Regenerar com IA'}
                </Button>
                <Button type="button" onClick={onContinue} disabled={isGenerating}>
                  Avaliar Fluxo <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-fx-azul/40 bg-fx-nevoa/20">
          <CardContent className="flex flex-col items-center gap-5 py-12 px-4 text-center max-w-2xl mx-auto">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-fx-azul/10 text-fx-azul shadow-xs">
              {isGenerating ? <Loader2 className="h-8 w-8 animate-spin" /> : <Bot className="h-8 w-8" />}
            </div>

            <div className="space-y-2">
              <Badge variant="secondary" className="text-xs px-2.5 py-0.5 font-medium">
                Gateway IA · LiteLLM / DeepSeek / OpenAI / Local
              </Badge>
              <h3 className="text-xl font-semibold text-fx-marinho">
                {isGenerating ? 'Analisando respostas e desenhando o fluxo BPMN...' : 'Pronto para gerar o diagrama BPMN com IA'}
              </h3>
              <p className="text-sm leading-relaxed text-fx-cinza">
                {isGenerating
                  ? 'O modelo de linguagem está estruturando as raias por setor, tarefas, pontos de decisão e coordenadas BPMN 2.0.'
                  : 'O assistente usará as respostas da entrevista guiada para inferir as raias departamentais, tarefas sequenciais e gateways de decisão.'}
              </p>
            </div>

            <div className="w-full rounded-lg border border-fx-linha bg-white p-4 text-left text-xs space-y-2 text-fx-grafite">
              <p className="font-semibold text-fx-marinho flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-fx-azul" />
                Estrutura gerada pelo motor de IA:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-fx-cinza">
                <li>Divisão automática das <strong>áreas envolvidas</strong> em raias horizontais (swimlanes).</li>
                <li>Modelagem de <strong>tarefas manuais</strong>, <strong>tarefas de sistema</strong> e <strong>gateways exclusivos</strong>.</li>
                <li>Rastreabilidade vinculando cada bloco à resposta original da entrevista.</li>
              </ul>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onBack} disabled={isGenerating}>
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar à Entrevista
              </Button>
              <Button type="button" onClick={onGenerate} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Gerando Fluxo BPMN...
                  </>
                ) : (
                  <>
                    <WandSparkles className="h-4 w-4 mr-1.5" /> Gerar Fluxo BPMN com IA
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <VersionHistory entries={process.history} />
    </div>
  )
}
