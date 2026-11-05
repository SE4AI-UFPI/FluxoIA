import { Check, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ProcessInfo } from '../types/process.types'
import type { ProcessInfoErrors } from '../validations/process.schema'

function FieldError({ children }: { children?: string }) {
  return children ? <p className="text-xs text-fx-alerta">{children}</p> : null
}

export function ProcessInfoStep({
  info,
  sectors,
  errors,
  lastSavedAt,
  onChange,
  onSave,
  onNext,
}: {
  info: ProcessInfo
  sectors: string[]
  errors: ProcessInfoErrors
  lastSavedAt: string | null
  onChange: <Key extends keyof ProcessInfo>(key: Key, value: ProcessInfo[Key]) => void
  onSave: () => void
  onNext: () => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Identificação do Processo</CardTitle>
        <CardDescription>Informe os dados básicos para iniciar a entrevista guiada.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="process-name">Nome do Processo *</Label>
            <Input
              id="process-name"
              value={info.name}
              onChange={(event) => onChange('name', event.target.value)}
              placeholder="Ex.: Processo de Aquisição de Bens"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'process-name-error' : undefined}
            />
            {errors.name && <p id="process-name-error" className="text-xs text-fx-alerta">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="process-sector">Setor / Unidade *</Label>
            <select
              id="process-sector"
              value={info.sector}
              onChange={(event) => onChange('sector', event.target.value)}
              aria-invalid={Boolean(errors.sector)}
              className="h-10 w-full rounded-sm border border-fx-linha bg-white px-3 text-sm text-fx-grafite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fx-azul"
            >
              {sectors.length === 0 ? (
                <option value="">Nenhum setor vinculado à sua conta</option>
              ) : sectors.map((sector) => <option key={sector} value={sector}>{sector}</option>)}
            </select>
            <FieldError>{errors.sector}</FieldError>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="process-objective">Objetivo do Processo *</Label>
          <textarea
            id="process-objective"
            value={info.objective}
            onChange={(event) => onChange('objective', event.target.value)}
            rows={3}
            placeholder="Qual o objetivo principal deste processo?"
            aria-invalid={Boolean(errors.objective)}
            className="w-full resize-y rounded-sm border border-fx-linha bg-white px-3 py-2 text-sm text-fx-grafite placeholder:text-fx-cinza/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fx-azul"
          />
          <FieldError>{errors.objective}</FieldError>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="process-description">Descrição Geral</Label>
            <textarea
              id="process-description"
              value={info.description}
              onChange={(event) => onChange('description', event.target.value)}
              rows={4}
              placeholder="Descreva resumidamente este processo."
              className="w-full resize-y rounded-sm border border-fx-linha bg-white px-3 py-2 text-sm text-fx-grafite placeholder:text-fx-cinza/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fx-azul"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="process-legislation">Legislação ou Norma Relacionada</Label>
            <textarea
              id="process-legislation"
              value={info.legislation}
              onChange={(event) => onChange('legislation', event.target.value)}
              rows={4}
              placeholder="Informe leis, decretos ou normas aplicáveis."
              className="w-full resize-y rounded-sm border border-fx-linha bg-white px-3 py-2 text-sm text-fx-grafite placeholder:text-fx-cinza/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fx-azul"
            />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-fx-linha/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-fx-cinza" aria-live="polite">
            {lastSavedAt ? `Rascunho salvo às ${new Date(lastSavedAt).toLocaleTimeString('pt-BR')}` : 'Salvamento automático ativo'}
          </span>
          <div className="grid gap-2 sm:flex">
            <Button type="button" variant="outline" onClick={onSave}>
              <Save className="h-4 w-4" /> Salvar Rascunho
            </Button>
            <Button type="button" onClick={onNext}>
              Próxima Etapa <Check className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}