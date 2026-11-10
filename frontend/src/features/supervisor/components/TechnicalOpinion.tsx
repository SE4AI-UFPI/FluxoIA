import * as React from 'react'
import { AlertCircle, CheckCircle2, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import type { DecisaoRevisao, ParecerRevisaoPayload } from '../types/supervisor.types'

const ACOES: Array<{
  decisao: DecisaoRevisao
  label: string
  variant: 'default' | 'outline' | 'destructive'
  icone: typeof CheckCircle2
  exigeParecer: boolean
}> = [
  { decisao: 'aprovado', label: 'Aprovar e Homologar', variant: 'default', icone: CheckCircle2, exigeParecer: false },
  { decisao: 'ajustes_solicitados', label: 'Solicitar Correção', variant: 'outline', icone: RotateCcw, exigeParecer: true },
]

export function TechnicalOpinion({
  parecer,
  onParecerChange,
  onDecidir,
  enviando = false,
  erro = null,
  desabilitado = false,
  avisoConformidade = null,
}: {
  parecer: string
  onParecerChange: (valor: string) => void
  onDecidir: (payload: ParecerRevisaoPayload) => void
  enviando?: boolean
  erro?: string | null
  desabilitado?: boolean
  avisoConformidade?: string | null
}) {
  const [erroLocal, setErroLocal] = React.useState<string | null>(null)

  function decidir(decisao: DecisaoRevisao, exigeParecer: boolean) {
    if (exigeParecer && parecer.trim().length < 15) {
      setErroLocal('Descreva o parecer técnico com pelo menos 15 caracteres para esta decisão.')
      return
    }
    setErroLocal(null)
    onDecidir({ decisao, parecer: parecer.trim() })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Parecer Técnico</CardTitle>
        <p className="text-xs text-fx-cinza">
          O parecer é registrado na auditoria do processo com autor e data/hora.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="space-y-1.5">
          <Label htmlFor="parecer-tecnico">Parecer do supervisor</Label>
          <textarea
            id="parecer-tecnico"
            value={parecer}
            onChange={(event) => onParecerChange(event.target.value)}
            rows={5}
            placeholder="Descreva a análise de conformidade BPMN e LGPD, apontando eventuais ajustes necessários."
            className="w-full resize-y rounded-sm border border-fx-linha bg-white px-3 py-2 text-sm text-fx-grafite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fx-azul"
          />
        </div>

        {avisoConformidade && (
          <p className="flex items-start gap-2 rounded-sm border border-fx-alerta/40 bg-fx-alerta/10 px-3 py-2 text-xs text-fx-alerta">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {avisoConformidade}
          </p>
        )}
        {(erroLocal || erro) && (
          <p role="alert" className="flex items-start gap-2 rounded-sm border border-fx-alerta/40 bg-fx-alerta/10 px-3 py-2 text-xs text-fx-alerta">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {erroLocal ?? erro}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {ACOES.map(({ decisao, label, variant, icone: Icone, exigeParecer }) => (
            <Button
              key={decisao}
              type="button"
              variant={variant}
              disabled={enviando || (decisao === 'aprovado' && desabilitado)}
              onClick={() => decidir(decisao, exigeParecer)}
            >
              {enviando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Icone className="mr-1.5 h-4 w-4" />}
              {label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
