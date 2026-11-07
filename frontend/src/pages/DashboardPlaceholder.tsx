import { useAuth } from '@/contexts/AuthContext'
import { OperationalDashboard } from '@/features/dashboard/operational/OperationalDashboard'
import { SupervisorDashboardPage } from '@/features/supervisor/pages/SupervisorDashboardPage'

export function DashboardPlaceholder() {
  const { user, logout } = useAuth()

  if (!user) return null

  // O perfil supervisor possui painel próprio de homologação técnica.
  if (user.papel === 'supervisor') {
    return <SupervisorDashboardPage />
  }

  return <OperationalDashboard user={user} logout={logout} />
}
