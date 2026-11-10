import * as React from 'react'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bot,
  ChevronDown,
  ClipboardCheck,
  Loader2,
  Save,
  Sparkles,
  WandSparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BPMNEditor } from './BPMNEditor'
import { ProcessFichaTecnicaCards } from './ProcessFichaTecnicaCards'
import { ProcessStatus } from './ProcessStatus'
import { VersionHistory } from './VersionHistory'
import type { ProcessWizardState } from '../types/process.types'

export function BPMNGenerationStep({
  process,
  readOnly = false,
  lastSavedAt,
  isGenerating = false,
  generationError = null,
  isSavingLayout = false,
  layoutError = null,
  onGenerate,
  onBack,
  onContinue,
  onSave,
  onSaveLayout,
}: {
  process: ProcessWizardState
  readOnly?: boolean
  lastSavedAt: string | null
  isGenerating?: boolean
  generationError?: string | null
  isSavingLayout?: boolean
  layoutError?: string | null
  onGenerate: () => void
  onBack: () => void
  onContinue: () => void
  onSave: () => void
  onSaveLayout: (xml: string) => Promise<void> | void
}) {
  const [fichaAberta, setFichaAberta] = React.useState(false)

  return (
    <div className="space-y-5">
      {/* Ficha técnica do processo — topo, recolhível para ampliar a área do diagrama */}
      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle className="text-xl">Ficha Técnica do Processo</CardTitle>
            <CardDescription>
              Informações complementares consolidadas a partir da entrevista guiada.
            </CardDescription>
          </div>
          <ProcessStatus status={process.status} />
        </CardHeader>
        <CardContent className="space-y-4 border-t border-fx-linha/70 pt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          </div>

          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-between sm:w-auto"
              aria-expanded={fichaAberta}
              onClick={() => setFichaAberta((current) => !current)}
            >
              <span className="flex items-center gap-1.5">
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${fichaAberta ? 'rotate-180' : ''}`}
                />
                {fichaAberta
                  ? 'Ocultar quadros complementares'
                  : 'Ver quadros complementares (legenda, documentos, sistemas, taxas)'}
              </span>
            </Button>
            {fichaAberta && (
              <div className="mt-3">
                <ProcessFichaTecnicaCards process={process} />
              </div>
            )}
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

      {layoutError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-sm border border-fx-alerta/40 bg-fx-alerta/10 px-4 py-3 text-sm text-fx-alerta"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold">Não foi possível salvar o layout</p>
            <p className="text-xs leading-relaxed">{layoutError}</p>
          </div>
        </div>
      )}

      {process.bpmnXml ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-fx-azul" />
                <CardTitle className="text-base">Diagrama BPMN 2.0</CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Versão {process.version}</Badge>
                <span className="text-xs text-fx-cinza" aria-live="polite">
                  {lastSavedAt
                    ? `Sincronizado às ${new Date(lastSavedAt).toLocaleTimeString('pt-BR')}`
                    : 'Sincronizado com o banco'}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <BPMNEditor
              xml={process.bpmnXml}
              filename={process.code ?? 'processo-bpmn'}
              processName={process.info.name}
              status={process.status}
              readOnly={readOnly}
              isSaving={isSavingLayout}
              onSaveLayout={onSaveLayout}
            />
          </CardContent>
        </Card>
      ) : readOnly ? (
        <Card>
          <CardContent className="p-5 text-sm text-fx-grafite">Não há diagrama BPMN disponível para consulta.</CardContent>
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

      {/* Avaliação da geração da IA — abaixo da ficha técnica e do diagrama */}
      {process.bpmnXml && !readOnly && (
        <Card>
          <CardHeader className="gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base">Avaliação da Geração da IA</CardTitle>
              <CardDescription>
                Registre a qualidade do fluxo gerado e envie para validação do gestor quando estiver
                adequado. Ajustes de layout não alteram a versão funcional do processo.
              </CardDescription>
            </div>
            <Badge variant="secondary">
              {process.feedback.representsProcess === null
                ? 'Avaliação pendente'
                : 'Avaliação preenchida'}
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 border-t border-fx-linha/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={onBack} disabled={isSavingLayout}>
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar à Entrevista
              </Button>
              <Button type="button" variant="outline" onClick={onSave} disabled={isSavingLayout}>
                <Save className="mr-1.5 h-4 w-4" /> Salvar Rascunho
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onGenerate}
                disabled={isGenerating || isSavingLayout}
              >
                {isGenerating ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <WandSparkles className="mr-1.5 h-4 w-4" />
                )}
                Geração com IA
              </Button>
            </div>
            <Button type="button" onClick={onContinue} disabled={isGenerating || isSavingLayout}>
              Avaliar Fluxo <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      <VersionHistory entries={process.history} />
    </div>
  )
}
