import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Coins,
  FileCheck2,
  FileText,
  Monitor,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProcessWizardState } from '../types/process.types'

export function ProcessFichaTecnicaCards({ process }: { process: ProcessWizardState }) {
  const ficha = process.fichaTecnica

  // Fallbacks inteligentes a partir das respostas da entrevista quando a ficha não estiver explícita
  const informacoesGerais =
    ficha?.informacoes_gerais?.trim() ||
    process.info.objective?.trim() ||
    process.info.description?.trim() ||
    'Processo em instrução e modelagem na unidade.'

  const observacoesPrazo =
    ficha?.observacoes_prazo?.trim() ||
    (process.answers.exceptions?.toLowerCase().includes('prazo') ||
    process.answers.rules?.toLowerCase().includes('prazo')
      ? process.answers.exceptions || process.answers.rules
      : 'As pendências deverão ser solucionadas dentro do prazo regimental. Após o prazo sem manifestação, o processo poderá ser encerrado.')

  const legendaItens =
    ficha?.legenda && ficha.legenda.length > 0
      ? ficha.legenda
      : [
          '▲ - Caso seja notificado (Em caso de pendência/diligência)',
          ...(process.answers.exceptions?.toLowerCase().includes('autua') ||
          process.answers.exceptions?.toLowerCase().includes('multa')
            ? ['▼ - Caso seja autuado / emitida notificação fiscal']
            : []),
          'Fluxo Sequencial · Caminho principal de tramitação',
        ]

  const rawSistemas =
    ficha?.sistemas && ficha.sistemas.length > 0
      ? ficha.sistemas
      : process.answers.systems
        ? process.answers.systems.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
        : ['Plataforma SEI']

  const standardSystems = [
    { label: 'Plataforma SEI', match: 'sei' },
    { label: 'Plataforma Construa Fácil', match: 'construa' },
    { label: 'Processo Físico', match: 'físico|fisico' },
  ]

  const documentos =
    ficha?.documentacao && ficha.documentacao.length > 0
      ? ficha.documentacao
      : process.answers.documents
        ? process.answers.documents.split(/[,;\n]+/).map((d) => d.trim()).filter(Boolean)
        : ['Requerimento padrão ou ofício de abertura', 'Documento de identificação do solicitante']

  const taxas =
    ficha?.taxas && ficha.taxas.length > 0
      ? ficha.taxas
      : process.answers.fees
        ? process.answers.fees.split(/[,;\n]+/).map((t) => t.trim()).filter(Boolean)
        : ['Não se aplica / Processo sem cobrança de taxas']

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between border-b border-fx-linha/70 pb-2">
        <div className="flex items-center gap-2">
          <FileCheck2 className="h-4 w-4 text-fx-azul" />
          <h4 className="text-sm font-semibold text-fx-marinho">
            Ficha Técnica e Quadros Complementares do Processo
          </h4>
        </div>
        <span className="text-[11px] text-fx-cinza">
          Gabarito institucional gerado conforme padrão da Secretaria
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-3">
        {/* QUADRO 1: LEGENDA & REGRAS DE PRAZO */}
        <Card className="border-fx-linha bg-white shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-fx-linha/60 bg-fx-nevoa/40">
            <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-fx-marinho">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              1. Legenda e Prazos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-3.5 text-xs flex-1 flex flex-col justify-between">
            <div className="space-y-2">
              <p className="font-semibold text-fx-grafite">Convenções de Desvio:</p>
              <ul className="space-y-1.5 pl-1 text-fx-cinza">
                {legendaItens.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 leading-snug">
                    <span className="font-mono text-fx-azul font-bold shrink-0">•</span>
                    <span className="text-fx-grafite">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-3 rounded-sm border border-amber-200 bg-amber-50/70 p-2.5 text-amber-900">
              <p className="flex items-center gap-1 font-semibold text-[11px] text-amber-800">
                <Clock className="h-3 w-3 shrink-0" />
                Prazo Limite de Pendências:
              </p>
              <p className="mt-1 text-[11px] leading-relaxed">
                {observacoesPrazo}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* QUADRO 2: INFORMAÇÕES GERAIS & SISTEMA */}
        <Card className="border-fx-linha bg-white shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-fx-linha/60 bg-fx-nevoa/40">
            <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-fx-marinho">
              <FileText className="h-3.5 w-3.5 text-fx-azul" />
              2. Informações Gerais e Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-3.5 text-xs flex-1 flex flex-col justify-between">
            <div className="space-y-1.5">
              <p className="font-semibold text-fx-grafite">Finalidade Institucional:</p>
              <p className="leading-relaxed text-fx-cinza">
                {informacoesGerais}
              </p>
              {process.info.legislation && (
                <div className="pt-1">
                  <span className="text-[11px] font-semibold text-fx-grafite">Base Legal: </span>
                  <span className="text-[11px] text-fx-cinza">{process.info.legislation}</span>
                </div>
              )}
            </div>

            <div className="mt-3 rounded-sm border border-fx-linha bg-fx-nevoa/20 p-2.5">
              <p className="flex items-center gap-1 font-semibold text-[11px] text-fx-marinho mb-1.5">
                <Monitor className="h-3 w-3 text-fx-azul shrink-0" />
                Canais e Plataformas de Tramitação:
              </p>
              <div className="space-y-1 text-[11px]">
                {standardSystems.map((sys) => {
                  const isActive = rawSistemas.some((s) => new RegExp(sys.match, 'i').test(s))
                  return (
                    <div key={sys.label} className="flex items-center gap-2">
                      <span
                        className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border text-[9px] font-bold ${
                          isActive
                            ? 'border-fx-azul bg-fx-azul text-white'
                            : 'border-fx-linha bg-white text-transparent'
                        }`}
                      >
                        ✓
                      </span>
                      <span className={isActive ? 'font-semibold text-fx-marinho' : 'text-fx-cinza'}>
                        {sys.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* QUADRO 3: DOCUMENTAÇÃO & TAXAS */}
        <Card className="border-fx-linha bg-white shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-fx-linha/60 bg-fx-nevoa/40">
            <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-fx-marinho">
              <Coins className="h-3.5 w-3.5 text-emerald-600" />
              3. Documentação e Taxas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-3.5 text-xs flex-1 flex flex-col justify-between">
            <div className="space-y-1.5">
              <p className="font-semibold text-fx-grafite">Documentação Exigida / Peças:</p>
              <ul className="max-h-28 overflow-y-auto space-y-1 pl-1 pr-1 text-fx-cinza scrollbar-thin">
                {documentos.map((doc, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 text-[11px] leading-tight">
                    <CheckCircle2 className="h-3 w-3 text-fx-azul shrink-0 mt-0.5" />
                    <span className="text-fx-grafite">{doc}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-3 rounded-sm border border-emerald-200 bg-emerald-50/70 p-2.5 text-emerald-950">
              <p className="flex items-center gap-1 font-semibold text-[11px] text-emerald-900">
                <Coins className="h-3 w-3 shrink-0" />
                Taxas e Guias de Arrecadação:
              </p>
              <div className="mt-1 space-y-0.5 text-[11px]">
                {taxas.map((tx, idx) => (
                  <div key={idx} className="font-medium text-emerald-900">
                    {tx}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
