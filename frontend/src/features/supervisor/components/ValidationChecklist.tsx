import { CheckCircle2, Circle, CircleDot } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ChecklistItem } from '../types/supervisor.types'

export const CHECKLIST_PADRAO: ChecklistItem[] = [
  {
    id: 'bpmn-elementos',
    grupo: 'BPMN',
    titulo: 'Elementos BPMN 2.0 válidos',
    descricao: 'Eventos, atividades e gateways com nomenclatura e conexões consistentes.',
  },
  {
    id: 'bpmn-raias',
    grupo: 'BPMN',
    titulo: 'Raias e responsáveis corretos',
    descricao: 'Cada atividade está atribuída à unidade responsável pela execução.',
  },
  {
    id: 'bpmn-decisoes',
    grupo: 'BPMN',
    titulo: 'Decisões e caminhos alternativos',
    descricao: 'Gateways possuem condição explícita e caminhos de exceção previstos.',
  },
  {
    id: 'bpmn-aprovacoes',
    grupo: 'BPMN',
    titulo: 'Aprovações de chefia representadas',
    descricao: 'Etapas de validação e homologação interna estão visíveis no fluxo.',
  },
  {
    id: 'lgpd-dados',
    grupo: 'LGPD',
    titulo: 'Dados pessoais minimizados',
    descricao: 'O fluxo não exige dados pessoais além do necessário para o serviço.',
  },
  {
    id: 'lgpd-base-legal',
    grupo: 'LGPD',
    titulo: 'Base legal e finalidade declaradas',
    descricao: 'Objetivo do processo e fundamentação legal estão descritos na ficha técnica.',
  },
  {
    id: 'lgpd-retencao',
    grupo: 'LGPD',
    titulo: 'Guarda e descarte documental',
    descricao: 'Prazos de retenção e destinação final dos documentos estão previstos.',
  },
  {
    id: 'lgpd-acesso',
    grupo: 'LGPD',
    titulo: 'Controle de acesso ao processo',
    descricao: 'Somente perfis autorizados manipulam informações sensíveis.',
  },
]

export type EstadoChecklist = Record<string, 'pendente' | 'conforme' | 'nao_conforme'>

const PROXIMO_ESTADO: Record<string, EstadoChecklist[string]> = {
  pendente: 'conforme',
  conforme: 'nao_conforme',
  nao_conforme: 'pendente',
}

export function ValidationChecklist({
  estados,
  onAlternar,
}: {
  estados: EstadoChecklist
  onAlternar: (item: ChecklistItem) => void
}) {
  const grupos: Array<ChecklistItem['grupo']> = ['BPMN', 'LGPD']

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Checklist de Conformidade</CardTitle>
        <p className="text-xs text-fx-cinza">
          Clique em cada item para alternar entre pendente, conforme e não conforme.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {grupos.map((grupo) => {
          const itens = CHECKLIST_PADRAO.filter((item) => item.grupo === grupo)
          const conformes = itens.filter((item) => (estados[item.id] ?? 'pendente') === 'conforme').length
          return (
            <div key={grupo} className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-fx-cinza">
                  Conformidade {grupo}
                </h4>
                <Badge variant={conformes === itens.length ? 'success' : 'outline'}>
                  {conformes}/{itens.length}
                </Badge>
              </div>
              <ul className="space-y-1.5">
                {itens.map((item) => {
                  const estado = estados[item.id] ?? 'pendente'
                  const Icone =
                    estado === 'conforme' ? CheckCircle2 : estado === 'nao_conforme' ? CircleDot : Circle
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => onAlternar(item)}
                        className={`flex w-full items-start gap-2.5 rounded-sm border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fx-azul ${
                          estado === 'conforme'
                            ? 'border-fx-sucesso/40 bg-fx-sucesso/10'
                            : estado === 'nao_conforme'
                              ? 'border-fx-alerta/40 bg-fx-alerta/10'
                              : 'border-fx-linha bg-white hover:bg-fx-nevoa/40'
                        }`}
                      >
                        <Icone
                          className={`mt-0.5 h-4 w-4 shrink-0 ${
                            estado === 'conforme'
                              ? 'text-fx-sucesso'
                              : estado === 'nao_conforme'
                                ? 'text-fx-alerta'
                                : 'text-fx-cinza'
                          }`}
                        />
                        <span className="space-y-0.5">
                          <span className="block text-sm font-medium text-fx-marinho">
                            {item.titulo}
                          </span>
                          <span className="block text-[11px] leading-relaxed text-fx-cinza">
                            {item.descricao}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

export function alternarEstadoChecklist(
  estados: EstadoChecklist,
  item: ChecklistItem,
): EstadoChecklist {
  const atual = estados[item.id] ?? 'pendente'
  return { ...estados, [item.id]: PROXIMO_ESTADO[atual] }
}

export function checklistCompleto(estados: EstadoChecklist): boolean {
  return CHECKLIST_PADRAO.every((item) => (estados[item.id] ?? 'pendente') !== 'pendente')
}

export function checklistTemNaoConformidade(estados: EstadoChecklist): boolean {
  return CHECKLIST_PADRAO.some((item) => (estados[item.id] ?? 'pendente') === 'nao_conforme')
}
