import * as React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ListFilter,
  Search,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { usersService } from '@/services/usersService'
import { PAPEL_LABEL, type PapelUsuario, type Usuario } from '@/types/auth'

interface LocationState {
  createdUserName?: string
}

export function UsersManagementPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [usersList, setUsersList] = React.useState<Usuario[]>([])
  const [usersLoading, setUsersLoading] = React.useState(true)
  const [userSearch, setUserSearch] = React.useState('')
  const [roleFilter, setRoleFilter] = React.useState<'todos' | PapelUsuario>('todos')
  const [statusFilter, setStatusFilter] = React.useState<'todos' | 'ativo' | 'inativo'>('todos')
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(() => {
    const state = location.state as LocationState | null
    return state?.createdUserName
      ? `Usuário ${state.createdUserName} cadastrado com sucesso.`
      : null
  })

  React.useEffect(() => {
    let active = true
    usersService
      .list()
      .then((data) => {
        if (active) setUsersList(data)
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error ? err.message : 'Não foi possível carregar a lista de usuários.',
          )
        }
      })
      .finally(() => {
        if (active) setUsersLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function handleToggleActive(target: Usuario) {
    try {
      const updated = await usersService.updateStatus(target.id, !target.is_active)
      setUsersList((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      setSuccess(
        `Usuário ${updated.nome} ${updated.is_active ? 'ativado' : 'desativado'} com sucesso.`,
      )
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível alterar o status do usuário.')
    }
  }

  async function handleDeleteUser(target: Usuario) {
    if (!window.confirm(`Deseja realmente remover o usuário ${target.nome} (${target.email})?`)) {
      return
    }
    try {
      await usersService.remove(target.id)
      setUsersList((prev) => prev.filter((item) => item.id !== target.id))
      setSuccess(`Usuário ${target.nome} removido com sucesso.`)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível remover o usuário.')
    }
  }

  const filteredUsers = React.useMemo(() => {
    const term = userSearch.trim().toLowerCase()
    return usersList.filter((item) => {
      const matchesTerm =
        !term ||
        `${item.nome} ${item.email} ${item.cpf ?? ''} ${item.setor} ${item.secretaria} ${(item.setores_vinculados ?? []).join(' ')}`
          .toLowerCase()
          .includes(term)
      const matchesRole = roleFilter === 'todos' || item.papel === roleFilter
      const matchesStatus =
        statusFilter === 'todos' ||
        (statusFilter === 'ativo' ? item.is_active : !item.is_active)
      return matchesTerm && matchesRole && matchesStatus
    })
  }, [usersList, userSearch, roleFilter, statusFilter])

  if (!user || user.papel !== 'admin') return null

  const totalAtivos = usersList.filter((item) => item.is_active).length

  return (
    <div className="min-h-screen bg-fx-fundo text-fx-grafite flex flex-col">
      <header className="border-b border-fx-linha bg-fx-papel">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 min-h-16 flex items-center justify-between gap-3">
          <img
            src="/logo/fluxoia-horizontal-cor.svg"
            alt="FluxoIA"
            className="h-8 w-auto select-none"
          />
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-fx-marinho">{user.nome}</span>
              <span className="text-xs text-fx-cinza">{user.email}</span>
            </div>
            <Badge variant="secondary" className="hidden sm:inline-flex">
              Administrador
            </Badge>
            <Button variant="outline" size="sm" onClick={logout}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-7 sm:py-10 space-y-6">
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
          Voltar ao painel
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-fx-cinza">
              Administração do Sistema
            </p>
            <h1 className="font-serif text-3xl font-semibold leading-tight text-fx-marinho">
              Gestão de Usuários
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-fx-cinza">
              Consulte os usuários cadastrados, seus perfis de acesso RBAC, setores vinculados e
              gerencie a ativação de contas.
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            className="shrink-0"
            onClick={() => navigate('/usuarios/novo')}
          >
            <UserPlus className="h-4 w-4" />
            Novo Usuário
          </Button>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-sm border border-fx-alerta/40 bg-fx-alerta/10 px-3.5 py-3 text-sm text-fx-alerta"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-sm border border-fx-sucesso/40 bg-fx-sucesso/10 px-3.5 py-3 text-sm text-fx-sucesso"
          >
            <Check className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Users className="h-5 w-5 text-fx-azul" />
                  Usuários Cadastrados ({filteredUsers.length})
                </CardTitle>
                <CardDescription>
                  {usersList.length} usuário(s) registrado(s) · {totalAtivos} ativo(s)
                </CardDescription>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-fx-cinza"
                  aria-hidden="true"
                />
                <Input
                  placeholder="Buscar por nome, e-mail ou setor..."
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="relative">
                <label className="sr-only" htmlFor="filter-role">
                  Filtrar por perfil
                </label>
                <select
                  id="filter-role"
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value as 'todos' | PapelUsuario)}
                  className="h-10 w-full appearance-none rounded-sm border border-fx-linha bg-white pl-3 pr-9 text-sm text-fx-grafite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fx-azul"
                >
                  <option value="todos">Todos os Perfis</option>
                  <option value="admin">Administrador</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="coordenador">Coordenador</option>
                  <option value="operacional">Operacional</option>
                </select>
                <ListFilter
                  className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-fx-cinza"
                  aria-hidden="true"
                />
              </div>

              <div className="relative">
                <label className="sr-only" htmlFor="filter-status">
                  Filtrar por status
                </label>
                <select
                  id="filter-status"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as 'todos' | 'ativo' | 'inativo')
                  }
                  className="h-10 w-full appearance-none rounded-sm border border-fx-linha bg-white pl-3 pr-9 text-sm text-fx-grafite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fx-azul"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="ativo">Somente Ativos</option>
                  <option value="inativo">Somente Inativos</option>
                </select>
                <ListFilter
                  className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-fx-cinza"
                  aria-hidden="true"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {usersLoading ? (
              <p className="py-6 text-sm text-fx-cinza">Carregando usuários...</p>
            ) : filteredUsers.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <p className="text-sm text-fx-cinza">
                  Nenhum usuário encontrado para os filtros selecionados.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/usuarios/novo')}
                >
                  <UserPlus className="h-4 w-4" />
                  Cadastrar Novo Usuário
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-fx-linha text-xs font-semibold uppercase tracking-wider text-fx-cinza">
                      <th className="py-2.5 pr-4">Usuário</th>
                      <th className="py-2.5 px-4">Perfil</th>
                      <th className="py-2.5 px-4">Setor / Escopo</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 pl-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-fx-linha/70">
                    {filteredUsers.map((item) => {
                      const isSelf = item.id === user.id
                      return (
                        <tr key={item.id} className="hover:bg-fx-nevoa/20">
                          <td className="py-3 pr-4">
                            <p className="font-semibold text-fx-marinho">{item.nome}</p>
                            <p className="text-xs text-fx-cinza">{item.email}</p>
                            {item.cargo && (
                              <p className="text-[11px] text-fx-cinza">{item.cargo}</p>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="secondary">{PAPEL_LABEL[item.papel]}</Badge>
                          </td>
                          <td className="py-3 px-4 text-xs text-fx-grafite">
                            <p className="font-medium">
                              {item.setor || item.secretaria || 'Acesso Institucional Completo'}
                            </p>
                            {item.secretaria && item.setor && (
                              <p className="text-[11px] text-fx-cinza">Órgão: {item.secretaria}</p>
                            )}
                            {item.setores_vinculados && item.setores_vinculados.length > 0 && (
                              <p className="mt-0.5 text-[11px] text-fx-cinza">
                                Supervisiona: {item.setores_vinculados.join(', ')}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={item.is_active ? 'success' : 'outline'}>
                              {item.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </td>
                          <td className="py-3 pl-4 text-right">
                            {isSelf ? (
                              <span className="text-xs text-fx-cinza">Sessão atual</span>
                            ) : (
                              <div className="inline-flex items-center gap-1.5">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void handleToggleActive(item)}
                                >
                                  {item.is_active ? 'Desativar' : 'Ativar'}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-fx-alerta hover:text-fx-alerta"
                                  aria-label={`Remover ${item.nome}`}
                                  title="Remover usuário"
                                  onClick={() => void handleDeleteUser(item)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
