import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FilePlus2,
  ListFilter,
  PencilLine,
  Search,
  UserPlus,
  Workflow,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  fetchProcessosFromApi,
  type ApiProcesso,
} from '@/features/process-mapping/services/process.service'
import { PAPEL_LABEL, type Usuario } from '@/types/auth'
import {
  PROCESSOS_DEMONSTRACAO,
  SETORES_PROCESSO,
  STATUS_PROCESSO,
  type ProcessoResumo,
  type ProcessoStatus,
} from './processes.demo'

const STATUS_VARIANT: Record<ProcessoStatus, 'default' | 'secondary' | 'success' | 'warning'> = {
  'Em Entrevista': 'secondary',
  'Em Modelagem': 'secondary',
  'Em Revisão': 'warning',
  'Aguardando Aprovação': 'default',
  Aprovado: 'success',
  Publicado: 'success',
}

function mapApiStatusToDashboardStatus(status: ApiProcesso['status']): ProcessoStatus {
  switch (status) {
    case 'rascunho':
    case 'em_entrevista':
      return 'Em Entrevista'
    case 'em_modelagem':
      return 'Em Modelagem'
    case 'em_avaliacao':
    case 'ajustes_solicitados':
      return 'Em Revisão'
    case 'aguardando_validacao':
      return 'Aguardando Aprovação'
    case 'aprovado':
      return 'Aprovado'
    case 'publicado':
      return 'Publicado'
    default:
      return 'Em Entrevista'
  }
}

function mapApiProcessoToResumo(item: ApiProcesso): ProcessoResumo {
  const formattedDate = item.atualizado_em
    ? new Date(item.atualizado_em).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recente'

  return {
    id: item.id,
    codigo: item.codigo ?? 'RASCUNHO',
    nome: item.nome,
    setor: item.setor || 'Não informado',
    ultimaAtualizacao: formattedDate,
    status: mapApiStatusToDashboardStatus(item.status),
  }
}

function StatusBadge({ status }: { status: ProcessoStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
}

function ProcessActions({ processo }: { processo: ProcessoResumo }) {
  const navigate = useNavigate()
  const query = `?processo=${encodeURIComponent(processo.id)}`

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label={`Editar ${processo.nome}`}
        title="Editar ou revisar processo"
        onClick={() => navigate(`/mapear-processo${query}`)}
      >
        <PencilLine className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label={`Abrir diagrama de ${processo.nome}`}
        title="Abrir diagrama na Biblioteca BPMN"
        onClick={() => navigate(`/bpmn${query}`)}
      >
        <Workflow className="h-4 w-4" />
      </Button>
    </div>
  )
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
}) {
  return (
    <div className="relative min-w-0">
      <label className="sr-only" htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full appearance-none rounded-sm border border-fx-linha bg-white pl-3 pr-9 text-sm text-fx-grafite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fx-azul"
      >
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <ListFilter className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-fx-cinza" aria-hidden="true" />
    </div>
  )
}

export function OperationalDashboard({
  user,
  logout,
}: {
  user: Usuario
  logout: () => void
}) {
  const navigate = useNavigate()
  const [processes, setProcesses] = React.useState<ProcessoResumo[]>(PROCESSOS_DEMONSTRACAO)
  const [syncedWithApi, setSyncedWithApi] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [sector, setSector] = React.useState('Todos os Setores')
  const [status, setStatus] = React.useState('Todos')

  React.useEffect(() => {
    let active = true
    fetchProcessosFromApi()
      .then((apiProcessos) => {
        if (!active) return
        setProcesses(apiProcessos.map(mapApiProcessoToResumo))
        setSyncedWithApi(true)
      })
      .catch(() => {
        if (!active) return
        setProcesses(PROCESSOS_DEMONSTRACAO)
        setSyncedWithApi(false)
      })
    return () => {
      active = false
    }
  }, [])

  const sectorOptions = React.useMemo(
    () => [
      'Todos os Setores',
      ...new Set([...SETORES_PROCESSO, ...processes.map((item) => item.setor).filter(Boolean)]),
    ],
    [processes],
  )

  const filteredProcesses = processes.filter((processo) => {
    const matchesQuery = `${processo.nome} ${processo.codigo}`.toLowerCase().includes(query.trim().toLowerCase())
    const matchesSector = sector === 'Todos os Setores' || processo.setor === sector
    const matchesStatus = status === 'Todos' || processo.status === status
    return matchesQuery && matchesSector && matchesStatus
  })

  const processosEmAnalise = processes.filter(
    ({ status: itemStatus }) => itemStatus !== 'Aprovado' && itemStatus !== 'Publicado',
  ).length

  const processosAprovados = processes.filter(
    ({ status: itemStatus }) => itemStatus === 'Aprovado' || itemStatus === 'Publicado',
  ).length

  const ultimaAtualizacao = processes[0]?.ultimaAtualizacao ?? 'Sem registros'

  return (
    <div className="min-h-screen bg-fx-fundo text-fx-grafite">
      <header className="border-b border-fx-linha bg-fx-papel">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <img src="/logo/fluxoia-horizontal-cor.svg" alt="FluxoIA" className="h-8 w-auto select-none" />
          <div className="flex items-center gap-3">
            {user.papel === 'admin' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate('/usuarios/novo')}
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Cadastrar Usuário</span>
              </Button>
            )}
            <div className="hidden flex-col items-end sm:flex">
              <span className="text-sm font-semibold text-fx-marinho">{user.nome}</span>
              <span className="text-xs text-fx-cinza">{user.email}</span>
            </div>
            <Badge variant="secondary">{PAPEL_LABEL[user.papel]}</Badge>
            <Button variant="outline" size="sm" onClick={logout}>Sair</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        <Card>
          <CardContent className="flex flex-col items-start justify-between gap-5 pt-6 sm:flex-row sm:items-center">
            <div className="max-w-3xl space-y-2">
              <Badge variant="secondary" className="normal-case tracking-normal">
                <Workflow className="mr-1.5 h-3.5 w-3.5" />
                Mapeamento de processos
              </Badge>
              <h1 className="font-serif text-3xl font-semibold leading-tight text-fx-marinho sm:text-4xl">
                Bem-vindo ao Mapeamento de Processos
              </h1>
              <p className="text-sm leading-relaxed text-fx-cinza sm:text-base">
                Crie, acompanhe e atualize os processos da sua unidade utilizando o assistente de mapeamento inteligente.
              </p>
            </div>
            <Button
              size="lg"
              className="w-full shrink-0 sm:w-auto"
              onClick={() => navigate('/mapear-processo?novo=1')}
            >
              <FilePlus2 className="h-4 w-4" />
              Iniciar Novo Processo
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <section aria-label="Resumo dos processos" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-start justify-between gap-3 pt-5">
              <div>
                <p className="text-xs font-semibold text-fx-cinza">Processos Criados</p>
                <p className="mt-2 text-2xl font-semibold text-fx-marinho">{processes.length}</p>
              </div>
              <FilePlus2 className="h-4 w-4 text-fx-azul" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start justify-between gap-3 pt-5">
              <div>
                <p className="text-xs font-semibold text-fx-cinza">Processos em Análise</p>
                <p className="mt-2 text-2xl font-semibold text-fx-marinho">{processosEmAnalise}</p>
              </div>
              <Clock3 className="h-4 w-4 text-fx-azul" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start justify-between gap-3 pt-5">
              <div>
                <p className="text-xs font-semibold text-fx-cinza">Processos Aprovados</p>
                <p className="mt-2 text-2xl font-semibold text-fx-marinho">
                  {processosAprovados}
                </p>
              </div>
              <CheckCircle2 className="h-4 w-4 text-fx-sucesso" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start justify-between gap-3 pt-5">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-fx-cinza">Última Atualização</p>
                <p className="mt-2 truncate text-base font-semibold text-fx-marinho">{ultimaAtualizacao}</p>
              </div>
              <FileCheck2 className="h-4 w-4 shrink-0 text-fx-azul" />
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5">
              <CardTitle className="text-xl">Meus Processos</CardTitle>
              <CardDescription>
                Acompanhe os processos criados e o andamento do fluxo de validação institucional.
              </CardDescription>
            </div>
            {syncedWithApi ? (
              <Badge variant="success">Sincronizado com a API</Badge>
            ) : (
              <Badge variant="outline">Dados de demonstração</Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_minmax(170px,0.65fr)_minmax(170px,0.65fr)]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-fx-cinza" aria-hidden="true" />
                <label className="sr-only" htmlFor="process-search">Buscar processo</label>
                <Input
                  id="process-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar processo..."
                  className="pl-9"
                />
              </div>
              <FilterSelect
                id="process-sector"
                label="Filtrar por setor"
                value={sector}
                onChange={setSector}
                options={sectorOptions}
              />
              <FilterSelect
                id="process-status"
                label="Filtrar por status"
                value={status}
                onChange={setStatus}
                options={['Todos', ...STATUS_PROCESSO]}
              />
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-fx-nevoa/50 text-[10px] font-semibold uppercase tracking-wide text-fx-marinho">
                    <th scope="col" className="px-3 py-3">Nome do Processo</th>
                    <th scope="col" className="px-3 py-3">Setor / Unidade</th>
                    <th scope="col" className="px-3 py-3">Última Atualização</th>
                    <th scope="col" className="px-3 py-3">Status de Governança</th>
                    <th scope="col" className="px-3 py-3 text-right">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProcesses.map((processo) => (
                    <tr key={processo.id} className="border-b border-fx-linha/70 last:border-0">
                      <td className="px-3 py-3.5">
                        <p className="text-sm font-semibold text-fx-marinho">{processo.nome}</p>
                        <p className="mt-1 text-[10px] text-fx-cinza">{processo.codigo}</p>
                      </td>
                      <td className="px-3 py-3.5 text-fx-grafite">{processo.setor}</td>
                      <td className="px-3 py-3.5 text-fx-cinza">{processo.ultimaAtualizacao}</td>
                      <td className="px-3 py-3.5"><StatusBadge status={processo.status} /></td>
                      <td className="px-3 py-3.5"><ProcessActions processo={processo} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredProcesses.length === 0 && (
                <p className="py-10 text-center text-sm text-fx-cinza">Nenhum processo encontrado para os filtros selecionados.</p>
              )}
            </div>

            <ul className="space-y-3 md:hidden">
              {filteredProcesses.map((processo) => (
                <li key={processo.id} className="rounded-sm border border-fx-linha bg-fx-papel p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-snug text-fx-marinho">{processo.nome}</p>
                      <p className="mt-1 text-[10px] text-fx-cinza">{processo.codigo}</p>
                    </div>
                    <ProcessActions processo={processo} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-fx-cinza">{processo.setor} · {processo.ultimaAtualizacao}</span>
                    <StatusBadge status={processo.status} />
                  </div>
                </li>
              ))}
              {filteredProcesses.length === 0 && (
                <li className="py-8 text-center text-sm text-fx-cinza">Nenhum processo encontrado para os filtros selecionados.</li>
              )}
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-fx-linha/70 pt-3 text-xs text-fx-cinza">
              <span>Exibindo {filteredProcesses.length} de {processes.length} processos</span>
              <span>
                {syncedWithApi
                  ? 'Conectado em tempo real com /api/processos/.'
                  : 'Exibindo dados de demonstração locais.'}
              </span>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
