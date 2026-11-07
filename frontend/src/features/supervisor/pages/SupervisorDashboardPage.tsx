import { BarChart3, ClipboardCheck, Loader2, RefreshCw, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { PAPEL_LABEL } from '@/types/auth'
import { HomologationQueue } from '../components/HomologationQueue'
import { RevisionTimeline } from '../components/RevisionTimeline'
import { SLAPanel } from '../components/SLAIndicator'
import { SupervisorStats } from '../components/SupervisorStats'
import { useSupervisorDashboard } from '../hooks/useSupervisorDashboard'

export function SupervisorDashboardPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { pendentes, finalizados, processos, indicadores, carregando, erro, recarregar } =
    useSupervisorDashboard()

  const processoRecente = processos.find((item) => (item.revisoes_governanca ?? []).length > 0)

  return (
    <div className="min-h-screen bg-fx-fundo text-fx-grafite">
      <header className="border-b border-fx-linha bg-fx-papel">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <img src="/logo/fluxoia-horizontal-cor.svg" alt="FluxoIA" className="h-8 w-auto select-none" />
          <div className="flex items-center gap-3">
            <div className="hidden flex-col items-end sm:flex">
              <span className="text-sm font-semibold text-fx-marinho">{user?.nome}</span>
              <span className="text-xs text-fx-cinza">{user?.email}</span>
            </div>
            {user && <Badge variant="secondary">{PAPEL_LABEL[user.papel]}</Badge>}
            <Button variant="outline" size="sm" onClick={logout}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        <Card>
          <CardContent className="flex flex-col items-start justify-between gap-5 pt-6 sm:flex-row sm:items-center">
            <div className="max-w-3xl space-y-2">
              <Badge variant="secondary" className="normal-case tracking-normal">
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                Supervisão · Governança de processos
              </Badge>
              <h1 className="font-serif text-3xl font-semibold leading-tight text-fx-marinho sm:text-4xl">
                Painel de Homologação Técnica
              </h1>
              <p className="text-sm leading-relaxed text-fx-cinza sm:text-base">
                Análise, homologação e validação dos processos submetidos pelos colaboradores da
                sua área de supervisão.
              </p>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
              <Button variant="outline" onClick={() => void recarregar()} disabled={carregando}>
                {carregando ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 h-4 w-4" />
                )}
                Atualizar
              </Button>
              <Button onClick={() => navigate('/governanca')}>
                <ClipboardCheck className="mr-1.5 h-4 w-4" />
                Validar processos
              </Button>
            </div>
          </CardContent>
        </Card>

        {erro && (
          <div role="alert" className="rounded-sm border border-fx-alerta/40 bg-fx-alerta/10 px-4 py-3 text-sm text-fx-alerta">
            {erro}
          </div>
        )}

        <SupervisorStats indicadores={indicadores} />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.9fr)]">
          <HomologationQueue
            processos={pendentes}
            onAnalisar={(processo) => navigate(`/governanca?processo=${processo.id}`)}
          />
          <div className="space-y-4">
            <SLAPanel processos={pendentes} metaDias={indicadores.metaSlaDias} />
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Resumo da Área</CardTitle>
                <CardDescription className="text-xs">
                  {finalizados.length} processos homologados ou publicados.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 pt-0 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-fx-cinza">Pendentes de parecer</span>
                  <span className="font-semibold text-fx-marinho">{indicadores.aguardandoParecer}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-fx-cinza">Aguardando publicação</span>
                  <span className="font-semibold text-fx-marinho">
                    {indicadores.aprovadosSemPublicacao}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-fx-cinza">Em correção pelos autores</span>
                  <span className="font-semibold text-fx-marinho">
                    {indicadores.processosComAjuste}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => navigate('/indicadores')}
                >
                  <BarChart3 className="mr-1.5 h-4 w-4" />
                  Relatórios & Indicadores
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {processoRecente && <RevisionTimeline processo={processoRecente} />}
      </main>
    </div>
  )
}
