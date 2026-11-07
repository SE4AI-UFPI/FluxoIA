import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { DashboardPlaceholder } from '@/pages/DashboardPlaceholder'
import { LoginPage } from '@/pages/LoginPage'
import { UserRegistrationPage } from '@/features/users/UserRegistrationPage'
import { canAccessMenu } from '@/features/navigation/permissions.config'
import { Sidebar } from '@/features/navigation/sidebar'

const ProcessMappingPage = lazy(() =>
  import('@/features/process-mapping/pages/ProcessMappingPage').then((module) => ({
    default: module.ProcessMappingPage,
  })),
)

const SupervisorValidationPage = lazy(() =>
  import('@/features/supervisor/pages/ValidationPage').then((module) => ({
    default: module.ValidationPage,
  })),
)

const SupervisorReportsPage = lazy(() =>
  import('@/features/supervisor/pages/ReportsPage').then((module) => ({
    default: module.ReportsPage,
  })),
)

const RelatoriosEmConstrucaoPage = lazy(() =>
  import('@/features/supervisor/pages/RelatoriosEmConstrucaoPage').then((module) => ({
    default: module.RelatoriosEmConstrucaoPage,
  })),
)

const BPMNViewerBibliotecaPage = lazy(() =>
  import('@/features/bpmn-viewer/pages/BPMNViewerPage').then((module) => ({
    default: module.BPMNViewerPage,
  })),
)

function Fallback({ mensagem }: { mensagem: string }) {
  return (
    <div className="min-h-screen bg-fx-fundo p-6 text-sm font-semibold text-fx-marinho">
      {mensagem}
    </div>
  )
}

function GovernanceRoute() {
  const { user } = useAuth()

  return (
    <ProtectedRoute>
      {user && !canAccessMenu(user, 'governance:validate') ? (
        <Navigate to="/" replace />
      ) : (
        <Suspense fallback={<Fallback mensagem="Carregando validação..." />}>
          <SupervisorValidationPage />
        </Suspense>
      )}
    </ProtectedRoute>
  )
}

function BpmnViewerRoute() {
  const { user } = useAuth()
  const podeConsultar = user ? user.papel === 'admin' || canAccessMenu(user, 'processes:view') : false

  return (
    <ProtectedRoute>
      {user && !podeConsultar ? (
        <Navigate to="/" replace />
      ) : (
        <Suspense fallback={<Fallback mensagem="Carregando visualizador BPMN..." />}>
          <BPMNViewerBibliotecaPage />
        </Suspense>
      )}
    </ProtectedRoute>
  )
}

function RelatoriosRoute() {
  const { user } = useAuth()

  return (
    <ProtectedRoute>
      {user && !canAccessMenu(user, 'reports:view') ? (
        <Navigate to="/" replace />
      ) : (
        <Suspense fallback={<Fallback mensagem="Carregando relatórios..." />}>
          <RelatoriosEmConstrucaoPage />
        </Suspense>
      )}
    </ProtectedRoute>
  )
}

function ReportsRoute({ permissao }: { permissao: 'reports:view' | 'indicators:view' }) {
  const { user } = useAuth()

  return (
    <ProtectedRoute>
      {user && !canAccessMenu(user, permissao) ? (
        <Navigate to="/" replace />
      ) : (
        <Suspense fallback={<Fallback mensagem="Carregando relatórios..." />}>
          <SupervisorReportsPage />
        </Suspense>
      )}
    </ProtectedRoute>
  )
}

function ProcessMappingRoute() {
  const { user } = useAuth()

  return (
    <ProtectedRoute>
      {user && !canAccessMenu(user, 'processes:create') ? (
        <Navigate to="/" replace />
      ) : (
        <Suspense
          fallback={(
            <div className="min-h-screen bg-fx-fundo p-6 text-sm font-semibold text-fx-marinho">
              Carregando mapeamento de processos...
            </div>
          )}
        >
          <ProcessMappingPage />
        </Suspense>
      )}
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
          <Route path="/mapear-processo" element={<ProcessMappingRoute />} />
          <Route path="/processos/novo" element={<ProcessMappingRoute />} />
          <Route path="/governanca" element={<GovernanceRoute />} />
          <Route path="/indicadores" element={<ReportsRoute permissao="indicators:view" />} />
          <Route path="/relatorios" element={<RelatoriosRoute />} />
          <Route path="/bpmn" element={<BpmnViewerRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
