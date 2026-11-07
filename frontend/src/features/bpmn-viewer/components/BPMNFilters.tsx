import * as React from 'react'
import { Search, SlidersHorizontal, Star, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  STATUS_BIBLIOTECA,
  type FiltrosBiblioteca,
  type OpcoesFiltro,
} from '../types/bpmnViewer.types'

const PERIODOS = [
  { valor: '', rotulo: 'Qualquer período' },
  { valor: '7', rotulo: 'Últimos 7 dias' },
  { valor: '30', rotulo: 'Últimos 30 dias' },
  { valor: '90', rotulo: 'Últimos 90 dias' },
  { valor: '365', rotulo: 'Último ano' },
]

function Campo({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string
  label: string
  value: string
  onChange: (valor: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-[11px] uppercase tracking-wider text-fx-cinza">
        {label}
      </Label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-sm border border-fx-linha bg-white px-3 text-sm text-fx-grafite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fx-azul"
      >
        {children}
      </select>
    </div>
  )
}

export function BPMNFilters({
  filtros,
  opcoes,
  totalFiltrado,
  totalGeral,
  favoritosCount,
  onChange,
  onLimpar,
}: {
  filtros: FiltrosBiblioteca
  opcoes: OpcoesFiltro
  totalFiltrado: number
  totalGeral: number
  favoritosCount: number
  onChange: <Key extends keyof FiltrosBiblioteca>(chave: Key, valor: FiltrosBiblioteca[Key]) => void
  onLimpar: () => void
}) {
  const [aberto, setAberto] = React.useState(false)
  const filtrosAtivos = [
    filtros.setor,
    filtros.status,
    filtros.responsavel,
    filtros.categoria,
    filtros.periodo,
    filtros.versao,
    filtros.apenasFavoritos ? 'favoritos' : '',
  ].filter(Boolean).length

  return (
    <div className="space-y-3 rounded-sm border border-fx-linha bg-fx-papel p-3 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fx-cinza" />
          <Input
            value={filtros.busca}
            onChange={(event) => onChange('busca', event.target.value)}
            placeholder="Buscar por nome, código, responsável, setor ou palavra-chave"
            aria-label="Busca global de processos"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={filtros.apenasFavoritos ? 'default' : 'outline'}
            size="sm"
            aria-pressed={filtros.apenasFavoritos}
            onClick={() => onChange('apenasFavoritos', !filtros.apenasFavoritos)}
            title="Mostrar apenas meus favoritos"
          >
            <Star className={`mr-1.5 h-3.5 w-3.5 ${filtros.apenasFavoritos ? 'fill-current' : ''}`} />
            Meus Favoritos
            <Badge variant="secondary" className="ml-1.5">{favoritosCount}</Badge>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="lg:hidden"
            aria-expanded={aberto}
            onClick={() => setAberto((atual) => !atual)}
          >
            <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" /> Filtros
            {filtrosAtivos > 0 && <Badge variant="default" className="ml-1.5">{filtrosAtivos}</Badge>}
          </Button>
        </div>
      </div>

      <div className={`${aberto ? 'grid' : 'hidden'} gap-3 sm:grid-cols-2 lg:grid lg:grid-cols-6`}>
        <Campo id="filtro-setor" label="Setor" value={filtros.setor} onChange={(valor) => onChange('setor', valor)}>
          <option value="">Todos os setores</option>
          {opcoes.setores.map((setor) => (
            <option key={setor} value={setor}>{setor}</option>
          ))}
        </Campo>

        <Campo id="filtro-status" label="Status" value={filtros.status} onChange={(valor) => onChange('status', valor)}>
          <option value="">Todos os status</option>
          {STATUS_BIBLIOTECA.map(({ valor, rotulo }) => (
            <option key={valor} value={valor}>{rotulo}</option>
          ))}
        </Campo>

        <Campo
          id="filtro-responsavel"
          label="Responsável"
          value={filtros.responsavel}
          onChange={(valor) => onChange('responsavel', valor)}
        >
          <option value="">Todos os responsáveis</option>
          {opcoes.responsaveis.map((responsavel) => (
            <option key={responsavel} value={responsavel}>{responsavel}</option>
          ))}
        </Campo>

        <Campo
          id="filtro-categoria"
          label="Categoria"
          value={filtros.categoria}
          onChange={(valor) => onChange('categoria', valor)}
        >
          <option value="">Todas as categorias</option>
          {opcoes.categorias.map((categoria) => (
            <option key={categoria} value={categoria}>{categoria}</option>
          ))}
        </Campo>

        <Campo id="filtro-periodo" label="Período" value={filtros.periodo} onChange={(valor) => onChange('periodo', valor)}>
          {PERIODOS.map(({ valor, rotulo }) => (
            <option key={valor || 'todos'} value={valor}>{rotulo}</option>
          ))}
        </Campo>

        <Campo id="filtro-versao" label="Versão" value={filtros.versao} onChange={(valor) => onChange('versao', valor)}>
          <option value="">Todas as versões</option>
          {opcoes.versoes.map((versao) => (
            <option key={versao} value={versao}>v{versao}</option>
          ))}
        </Campo>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-fx-cinza">
        <span>
          Exibindo <strong className="text-fx-marinho">{totalFiltrado}</strong> de {totalGeral}{' '}
          processos visíveis
        </span>
        {filtrosAtivos > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={onLimpar}>
            <X className="mr-1 h-3.5 w-3.5" /> Limpar filtros
          </Button>
        )}
      </div>
    </div>
  )
}
