import { useAuth } from '@/contexts/AuthContext'
import { OperationalDashboard } from '@/features/dashboard/operational/OperationalDashboard'

export function DashboardPlaceholder() {
  const { user, logout } = useAuth()

  if (!user) return null

  return <OperationalDashboard user={user} logout={logout} />
}
