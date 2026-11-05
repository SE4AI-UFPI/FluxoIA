import { Building2, LogOut, Shield, UserCheck } from 'lucide-react'
import { FioDeFluxo } from '@/components/brand/FioDeFluxo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import type { PapelUsuario } from '@/types/auth'
import { OperationalDashboard } from '@/features/dashboard/operational/OperationalDashboard'

const PAPEL_LABEL: Record<PapelUsuario, string> = {
  servidor: 'Servidor',
  validador: 'Chefe do Setor (Validador)',
  admin: 'Administrador',
  supervisor: 'Supervisor de Setor',
  coordenador: 'Coordenador',
  operacional: 'Usuário Operacional',
}

export function DashboardPlaceholder() {
  const { user, logout } = useAuth()

  if (!user) return null

  if (user.papel === 'operacional' || user.papel === 'servidor') {
    return <OperationalDashboard user={user} logout={logout} />
  }

  return (
    <div className="min-h-screen bg-fx-fundo text-fx-grafite flex flex-col">
      {/* Barra superior institucional */}
      <header className="border-b border-fx-linha bg-fx-papel">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src="/logo/fluxoia-horizontal-cor.svg"
              alt="FluxoIA"
              className="h-8 w-auto select-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-fx-marinho">{user.nome}</span>
              <span className="text-xs text-fx-cinza">{user.email}</span>
            </div>
            <Badge variant="secondary">{PAPEL_LABEL[user.papel]}</Badge>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10 space-y-6">
        <Card className="rounded-[14px]">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle>Sessão autenticada com sucesso</CardTitle>
              <Badge variant="success">Conectado à API Django REST</Badge>
            </div>
            <CardDescription>
              Dados do seu perfil carregados via JWT a partir de <code>/api/auth/me/</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="rounded-sm border border-fx-linha bg-fx-nevoa/40 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fx-cinza">
                  <UserCheck className="h-4 w-4 text-fx-azul" />
                  Servidor
                </div>
                <p className="mt-1.5 text-base font-semibold text-fx-marinho">{user.nome}</p>
                <p className="text-xs text-fx-cinza">{user.cargo || 'Cargo não informado'}</p>
              </div>

              <div className="rounded-sm border border-fx-linha bg-fx-nevoa/40 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fx-cinza">
                  <Building2 className="h-4 w-4 text-fx-azul" />
                  Lotação
                </div>
                <p className="mt-1.5 text-base font-semibold text-fx-marinho">
                  {user.secretaria || 'Secretaria não informada'}
                </p>
                <p className="text-xs text-fx-cinza">{user.setor || 'Setor não informado'}</p>
              </div>

              <div className="rounded-sm border border-fx-linha bg-fx-nevoa/40 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fx-cinza">
                  <Shield className="h-4 w-4 text-fx-azul" />
                  Papel no FluxoIA
                </div>
                <p className="mt-1.5 text-base font-semibold text-fx-marinho">
                  {PAPEL_LABEL[user.papel]}
                </p>
                <p className="text-xs text-fx-cinza">
                  Matrícula: {user.matricula || 'Não informada'}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-fx-linha/70 flex items-center justify-between flex-wrap gap-4">
              <span className="text-xs text-fx-cinza">
                UFPI · FÁBRICA DE IA DO PIAUÍ · SECTI
              </span>
              <FioDeFluxo theme="light" className="w-48" />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
