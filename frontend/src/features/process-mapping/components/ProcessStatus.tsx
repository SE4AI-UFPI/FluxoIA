import { Badge } from '@/components/ui/badge'
import type { ProcessStatus as ProcessStatusValue } from '../types/process.types'

const STATUS_VARIANT: Record<ProcessStatusValue, 'default' | 'secondary' | 'success' | 'warning'> = {
  Rascunho: 'secondary',
  'Em Entrevista': 'default',
  'Em Modelagem BPMN': 'default',
  'Em Avaliação': 'warning',
  'Aguardando Validação do Gestor': 'warning',
  'Ajustes Solicitados': 'warning',
  Aprovado: 'success',
  Publicado: 'success',
  Excluído: 'warning',
}

export function ProcessStatus({ status }: { status: ProcessStatusValue }) {
  return <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
}