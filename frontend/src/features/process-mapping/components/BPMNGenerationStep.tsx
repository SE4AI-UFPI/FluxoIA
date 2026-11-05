import { ArrowLeft, Bot, Construction, Save, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProcessStatus } from './ProcessStatus'
import type { ProcessWizardState } from '../types/process.types'

export function BPMNGenerationStep({
  process,
  lastSavedAt,
  onBack,
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
      {/* Resumo do Processo Atual */}
      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle className="text-xl">Modelagem e Geração do Fluxo BPMN</CardTitle>
            <CardDescription>
              Processamento inteligente das respostas da entrevista para geração de diagrama BPMN 2.0.
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
            <p className="text-[11px] text-fx-cinza">Status da Entrevista</p>
            <p className="mt-1 text-sm font-semibold text-fx-sucesso">Entrevista Concluída</p>
          </div>
          <div>
            <p className="text-[11px] text-fx-cinza">Motor de Geração</p>
            <p className="mt-1 text-sm font-semibold text-fx-marinho">Inteligência Artificial (LLM)</p>
          </div>
        </CardContent>
      </Card>

      {/* Painel de Em Desenvolvimento (Motor de IA) */}
      <Card className="border-dashed border-fx-azul/40 bg-fx-nevoa/20">
        <CardContent className="flex flex-col items-center gap-5 py-12 px-4 text-center max-w-2xl mx-auto">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-fx-azul/10 text-fx-azul shadow-xs">
            <Bot className="h-8 w-8" />
            <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white shadow-xs">
              <Construction className="h-3.5 w-3.5" />
            </span>
          </div>

          <div className="space-y-2">
            <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-800 text-xs px-2.5 py-0.5 font-medium">
              Módulo de IA em Desenvolvimento
            </Badge>
            <h3 className="text-xl font-semibold text-fx-marinho">
              Geração de BPMN via Inteligência Artificial
            </h3>
            <p className="text-sm leading-relaxed text-fx-cinza">
              As respostas da entrevista guiada já estão salvas com segurança no banco de dados.
              A integração direta com o modelo de IA (para inferir raias departamentais, gateways de aprovação e diagramação BPMN 2.0 com rastreabilidade) está sendo estruturada no backend.
            </p>
          </div>

          <div className="w-full rounded-lg border border-fx-linha bg-white p-4 text-left text-xs space-y-2 text-fx-grafite">
            <p className="font-semibold text-fx-marinho flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-fx-azul" />
              O que o motor de IA fará a partir das suas respostas:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-fx-cinza">
              <li>Mapear as <strong>áreas envolvidas</strong> em raias (lanes) distintas do setor.</li>
              <li>Estruturar as <strong>atividades sequenciais</strong> e pontos de <strong>aprovação/decisão</strong> (exclusive gateways).</li>
              <li>Identificar <strong>documentos</strong> e <strong>sistemas</strong> vinculados a cada tarefa.</li>
              <li>Produzir o arquivo XML BPMN 2.0 oficial para visualização e edição no canvas interativo.</li>
            </ul>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-between w-full border-t border-fx-linha/60 pt-4 gap-3">
            <span className="text-xs text-fx-cinza">
              {lastSavedAt ? `Rascunho salvo às ${new Date(lastSavedAt).toLocaleTimeString('pt-BR')}` : 'Respostas salvas no banco'}
            </span>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar à Entrevista
              </Button>
              <Button type="button" variant="ghost" onClick={onSave}>
                <Save className="h-4 w-4 mr-1.5" /> Salvar Rascunho
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
