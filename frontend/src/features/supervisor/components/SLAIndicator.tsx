import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { diasEmFila } from '../services/homologation.service'
import type { ProcessoSupervisao } from '../types/supervisor.types'

export function SLAIndicator({
  processo,
  metaDias = 5,
}: {
  processo: ProcessoSupervisao
  metaDias?: number
}) {
  const dias = diasEmFila(processo)

  if (dias === null) {
    return <Badge variant="outline">Sem envio registrado</Badge>
  }

  if (dias > metaDias) {
    return (
      <Badge variant="warning" title={`Acima da meta de ${metaDias} dias`}>
        <AlertTriangle className="mr-1 h-3 w-3" />
        {dias.toFixed(1).replace('.', ',')}d · atrasado
      </Badge>
    )
  }

  if (dias > metaDias * 0.7) {
    return (
      <Badge variant="outline" title={`Próximo da meta de ${metaDias} dias`}>
        <Clock className="mr-1 h-3 w-3" />
        {dias.toFixed(1).replace('.', ',')}d · atenção
      </Badge>
    )
  }

  return (
    <Badge variant="success" title={`Dentro da meta de ${metaDias} dias`}>
      <CheckCircle2 className="mr-1 h-3 w-3" />
      {dias.toFixed(1).replace('.', ',')}d
    </Badge>
  )
}

export function SLAPanel({ processos, metaDias = 5 }: { processos: ProcessoSupervisao[]; metaDias?: number }) {
  const atrasados = processos.filter((item) => (diasEmFila(item) ?? 0) > metaDias)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">SLA de Análise</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="flex items-center justify-between text-sm">
          <span className="text-fx-cinza">Na fila</span>
          <span className="font-semibold text-fx-marinho">{processos.length}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-fx-cinza">Dentro da meta</span>
          <span className="font-semibold text-fx-sucesso">{processos.length - atrasados.length}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-fx-cinza">Acima de {metaDias} dias</span>
          <span className="font-semibold text-fx-alerta">{atrasados.length}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-sm bg-fx-nevoa" role="img" aria-label="Distribuição de SLA">
          <div
            className="h-full bg-fx-sucesso"
            style={{
              width: processos.length === 0 ? '0%' : `${((processos.length - atrasados.length) / processos.length) * 100}%`,
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
