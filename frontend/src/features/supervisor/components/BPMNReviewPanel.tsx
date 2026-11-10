import { FileCode2, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BPMNEditor } from '@/features/process-mapping/components/BPMNEditor'
import type { ProcessoSupervisao } from '../types/supervisor.types'
import { mapApiStatusToWizardStatus } from '@/features/process-mapping/services/process.service'

export function BPMNReviewPanel({
  processo,
  onFechar,
}: {
  processo: ProcessoSupervisao
  onFechar?: () => void
}) {
  return (
    <Card>
      <CardHeader className="gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileCode2 className="h-4 w-4 text-fx-azul" />
            <CardTitle className="text-base">Diagrama BPMN 2.0 · {processo.nome}</CardTitle>
          </div>
          <p className="text-xs text-fx-cinza">
            {processo.codigo ?? 'Sem código'} · {processo.setor} · v{processo.versao_atual} ·{' '}
            {processo.criado_por_nome}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">v{processo.versao_atual}</Badge>
          <Badge variant="outline">{processo.versoes_bpmn.length} versões</Badge>
          {onFechar && (
            <Button type="button" size="sm" variant="ghost" onClick={onFechar}>
              Fechar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {processo.bpmn_xml_atual ? (
          <BPMNEditor
            xml={processo.bpmn_xml_atual}
            filename={processo.codigo ?? 'processo-bpmn'}
            processName={processo.nome}
            status={mapApiStatusToWizardStatus(processo.status)}
            readOnly
            onSaveLayout={() => undefined}
          />
        ) : (
          <p className="flex items-start gap-2 rounded-sm border border-fx-linha bg-fx-nevoa/30 px-3 py-4 text-sm text-fx-cinza">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            Este processo não possui diagrama BPMN registrado.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
