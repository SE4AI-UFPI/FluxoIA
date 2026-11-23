import * as React from 'react'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Circle,
  ClipboardCheck,
  Clock,
  Loader2,
  Save,
  Sparkles,
  WandSparkles,
} from 'lucide-react'
import { FluxoBotIcon } from '@/components/icons/FluxoBotIcon'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BPMNEditor } from './BPMNEditor'
import { ProcessFichaTecnicaCards } from './ProcessFichaTecnicaCards'
import { ProcessStatus } from './ProcessStatus'
import { VersionHistory } from './VersionHistory'
import type { BpmnStreamProgress } from '../services/process.service'
import type { ProcessWizardState } from '../types/process.types'

const ETAPAS_GERACAO_IA = [
  {
    id: 'interpretacao',
    titulo: '1. Conectando à IA e interpretando a entrevista',
    detalhe: 'Enviando contexto da entrevista e sintetizando resumo estrutural do processo.',
  },
  {
    id: 'ficha',
    titulo: '2. Consolidando Ficha Técnica institucional',
    detalhe: 'Extraindo quadros de prazos, sistemas, documentos exigidos e taxas.',
  },
  {
    id: 'modelagem',
    titulo: '3. Modelando raias, atividades e gateways BPMN 2.0',
    detalhe: 'Estruturando tarefas sequenciais, decisões exclusivas e conexões de fluxo.',
  },
  {
    id: 'compilacao',
    titulo: '4. Validando schema Pydantic e compilando XML BPMN 2.0',
    detalhe: 'Posicionando elementos nas raias, portas dos losangos e rótulos sem colisão.',
  },
] as const

export function BPMNGenerationStep({
  process,
  readOnly = false,
  lastSavedAt,
  isGenerating = false,
  generationProgress = null,
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
  generationProgress?: BpmnStreamProgress | null
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
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0)
  const [isCompleting, setIsCompleting] = React.useState(false)
  const wasGeneratingRef = React.useRef(false)

  React.useEffect(() => {
    if (isGenerating) {
      wasGeneratingRef.current = true
      setIsCompleting(false)
      setElapsedSeconds(0)
      const interval = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1)
      }, 1000)
      return () => window.clearInterval(interval)
    }

    if (wasGeneratingRef.current) {
      wasGeneratingRef.current = false
      if (!generationError) {
        setIsCompleting(true)
        const timer = window.setTimeout(() => {
          setIsCompleting(false)
          setElapsedSeconds(0)
        }, 700)
        return () => window.clearTimeout(timer)
      }
      setElapsedSeconds(0)
    }
  }, [isGenerating, generationError])

  const showProgressOverlay = isGenerating || isCompleting
  const progressPercent = isCompleting
    ? 100
    : isGenerating
      ? (generationProgress?.progresso ?? 8)
      : 0
  const activeStageIndex = isCompleting
    ? ETAPAS_GERACAO_IA.length
    : Math.min(ETAPAS_GERACAO_IA.length - 1, Math.max(0, generationProgress?.etapaIndice ?? 0))
  const mediaHistorica = generationProgress?.mediaHistoricaSegundos

  const progressOverlayNode = showProgressOverlay ? (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/65 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-xl rounded-xl border border-fx-azul/35 bg-white/95 p-5 sm:p-6 shadow-lg space-y-4">
        <div className="flex items-center gap-3 w-full">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-xs transition-colors ${
              isCompleting ? 'bg-emerald-600' : 'bg-fx-azul'
            }`}
          >
            {isCompleting ? (
              <CheckCircle2 className="h-6 w-6" />
            ) : (
              <Loader2 className="h-6 w-6 animate-spin" />
            )}
          </div>
          <div className="text-left flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm sm:text-base font-semibold text-fx-marinho">
                {isCompleting
                  ? 'Diagrama BPMN 2.0 concluído com sucesso!'
                  : process.bpmnXml
                    ? 'Regenerando diagrama BPMN 2.0 com IA...'
                    : 'Gerando diagrama BPMN 2.0 e Ficha Técnica com IA...'}
              </h3>
              <Badge variant="secondary" className="flex items-center gap-1 text-xs font-medium">
                <Clock className="h-3.5 w-3.5 text-fx-azul" />
                {elapsedSeconds}s{mediaHistorica ? ` · Média real: ~${mediaHistorica}s` : ''}
              </Badge>
            </div>
            <p className="text-xs text-fx-cinza mt-0.5">
              {isCompleting
                ? 'Renderizando o fluxo atualizado no canvas BPMN 2.0...'
                : (generationProgress?.detalhe || 'Recebendo streaming de tokens em tempo real do motor de IA...')}
            </p>
          </div>
        </div>

        {/* Barra de Progresso Visual */}
        <div className="w-full space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-fx-marinho">
            <span>
              {isCompleting
                ? 'Concluído!'
                : ETAPAS_GERACAO_IA[Math.min(activeStageIndex, ETAPAS_GERACAO_IA.length - 1)].titulo}
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progresso real da geração do diagrama BPMN"
            className="h-2.5 w-full overflow-hidden rounded-full bg-fx-nevoa border border-fx-linha"
          >
            <div
              className={`h-full transition-all duration-300 ease-out rounded-full ${
                isCompleting ? 'bg-emerald-600' : 'bg-fx-azul'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Etapas Semânticas do Pipeline */}
        <div className="w-full rounded-lg border border-fx-linha bg-fx-nevoa/25 p-3 space-y-2 text-left">
          {ETAPAS_GERACAO_IA.map((etapa, idx) => {
            const concluida = isCompleting || idx < activeStageIndex
            const ativa = !isCompleting && idx === activeStageIndex
            const textoDetalhe =
              ativa && generationProgress?.detalhe ? generationProgress.detalhe : etapa.detalhe
            return (
              <div
                key={etapa.id}
                className={`flex items-start gap-2.5 rounded-md px-2.5 py-1.5 transition-colors ${
                  ativa
                    ? 'bg-white border border-fx-azul/30 shadow-2xs'
                    : concluida
                      ? 'opacity-95'
                      : 'opacity-50'
                }`}
              >
                {concluida ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : ativa ? (
                  <Loader2 className="h-4 w-4 text-fx-azul animate-spin shrink-0 mt-0.5" />
                ) : (
                  <Circle className="h-4 w-4 text-fx-cinza shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <p
                    className={`text-xs font-semibold ${
                      ativa
                        ? 'text-fx-azul'
                        : concluida
                          ? 'text-fx-marinho'
                          : 'text-fx-cinza'
                    }`}
                  >
                    {etapa.titulo}
                  </p>
                  <p className="text-[11px] text-fx-cinza leading-snug">{textoDetalhe}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  ) : null

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
        <Card className="relative overflow-hidden">
          {progressOverlayNode}
          <div
            className={
              showProgressOverlay
                ? 'opacity-30 pointer-events-none select-none transition-opacity duration-300'
                : 'transition-opacity duration-300'
            }
          >
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
          </div>
        </Card>
      ) : readOnly ? (
        <Card>
          <CardContent className="p-5 text-sm text-fx-grafite">Não há diagrama BPMN disponível para consulta.</CardContent>
        </Card>
      ) : (
        <Card className="relative overflow-hidden border-dashed border-fx-azul/40 bg-fx-nevoa/20 min-h-[420px]">
          {progressOverlayNode}
          <CardContent
            className={`flex flex-col items-center gap-5 py-12 px-4 text-center max-w-2xl mx-auto transition-opacity duration-300 ${
              showProgressOverlay ? 'opacity-25 pointer-events-none select-none' : ''
            }`}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-fx-azul/10 text-fx-azul shadow-xs">
              <FluxoBotIcon className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Badge variant="secondary" className="text-xs px-2.5 py-0.5 font-medium">
                  Gateway IA · LiteLLM / DeepSeek / OpenAI / Local
                </Badge>
                <Badge variant="outline" className="text-xs px-2.5 py-0.5 font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3 text-fx-azul" />
                  Tempo estimado: ~15 a 35s
                </Badge>
              </div>
              <h3 className="text-xl font-semibold text-fx-marinho">
                Pronto para gerar o diagrama BPMN com IA
              </h3>
              <p className="text-sm leading-relaxed text-fx-cinza">
                O assistente usará as respostas da entrevista guiada para inferir as raias departamentais, tarefas sequenciais e gateways de decisão.
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
                <WandSparkles className="h-4 w-4 mr-1.5" /> Gerar Fluxo BPMN com IA
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
