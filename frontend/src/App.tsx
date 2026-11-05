import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { DashboardPlaceholder } from '@/pages/DashboardPlaceholder'
import { LoginPage } from '@/pages/LoginPage'
import { UserRegistrationPage } from '@/features/users/UserRegistrationPage'
import { Sidebar } from '@/features/navigation/sidebar'

const ProcessMappingPage = lazy(() =>
  import('@/features/process-mapping/pages/ProcessMappingPage').then((module) => ({
    default: module.ProcessMappingPage,
  })),
)

function ProcessMappingRoute() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={(
          <div className="min-h-screen bg-fx-fundo p-6 text-sm font-semibold text-fx-marinho">
            Carregando mapeamento de processos...
          </div>
        )}
      >
        <ProcessMappingPage />
      </Suspense>
    </ProtectedRoute>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-fx-fundo flex items-center justify-center p-6">
        <p className="text-sm font-semibold text-fx-marinho">Verificando sessão...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Sidebar>{children}</Sidebar>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (user?.papel !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPlaceholder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/usuarios/novo"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <UserRegistrationPage />
                </AdminRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/mapear-processo"
            element={<ProcessMappingRoute />}
          />
          <Route
            path="/processos/novo"
            element={<ProcessMappingRoute />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
