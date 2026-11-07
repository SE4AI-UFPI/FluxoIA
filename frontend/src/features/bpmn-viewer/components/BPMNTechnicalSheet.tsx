import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProcessoBiblioteca } from '../types/bpmnViewer.types'

function formatarData(valor: string | null): string {
  if (!valor) return '—'
  return new Date(valor).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-fx-linha/50 py-1.5 last:border-0">
      <span className="text-xs text-fx-cinza">{rotulo}</span>
      <span className="max-w-[60%] text-right text-sm font-medium text-fx-marinho">{valor}</span>
    </div>
  )
}

export function BPMNTechnicalSheet({ processo }: { processo: ProcessoBiblioteca }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Dados Gerais</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Linha rotulo="Código" valor={processo.codigo} />
          <Linha rotulo="Nome" valor={processo.nome} />
          <Linha rotulo="Setor" valor={processo.setor} />
          <Linha rotulo="Categoria" valor={processo.categoria} />
          <Linha rotulo="Criado em" valor={formatarData(processo.criadoEm)} />
          <Linha rotulo="Publicação" valor={formatarData(processo.aprovadoEm)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Responsáveis</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Linha rotulo="Autor" valor={processo.autor} />
          <Linha
            rotulo="Supervisor aprovador"
            valor={processo.supervisorAprovador || 'Aguardando homologação'}
          />
          <Linha rotulo="Secretaria" valor={processo.secretaria || 'Não informada'} />
          <Linha rotulo="Versão atual" valor={`v${processo.versaoAtual}`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Informações Complementares</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0 text-sm text-fx-grafite">
          <div>
            <p className="text-xs text-fx-cinza">Objetivo</p>
            <p className="text-sm leading-relaxed">{processo.objetivo || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-fx-cinza">Legislação / norma</p>
            <p className="text-sm leading-relaxed">{processo.legislacao || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-fx-cinza">Sistemas</p>
            <p className="text-sm leading-relaxed">
              {processo.sistemas.length > 0 ? processo.sistemas.join(' · ') : '—'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
