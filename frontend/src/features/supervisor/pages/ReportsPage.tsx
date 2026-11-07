import { ArrowLeft, BarChart3, Download, Loader2, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { PAPEL_LABEL } from '@/types/auth'
import { SLAIndicator } from '../components/SLAIndicator'
import { SupervisorStats } from '../components/SupervisorStats'
import { useSupervisorDashboard } from '../hooks/useSupervisorDashboard'

function formatarDias(valor: number | null): string {
  if (valor === null) return '—'
  return `${valor.toFixed(1).replace('.', ',')} d`
}

export function ReportsPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { processos, indicadores, porSetor, carregando, erro, recarregar } = useSupervisorDashboard()

  const distribuicao = [
    { rotulo: 'Aguardando parecer', total: processos.filter((p) => p.status === 'aguardando_validacao').length, cor: 'bg-fx-alerta' },
    { rotulo: 'Em correção', total: processos.filter((p) => p.status === 'ajustes_solicitados').length, cor: 'bg-fx-azul' },
    { rotulo: 'Homologados', total: processos.filter((p) => p.status === 'aprovado').length, cor: 'bg-fx-sucesso' },
    { rotulo: 'Publicados', total: processos.filter((p) => p.status === 'publicado').length, cor: 'bg-fx-marinho' },
  ]
  const totalProcessos = processos.length || 1

  function exportarCsv() {
    const cabecalho = ['Processo', 'Codigo', 'Setor', 'Status', 'Versao', 'Autor', 'Enviado em']
    const linhas = processos.map((processo) =>
      [
        processo.nome,
        processo.codigo ?? '',
        processo.setor,
        processo.status,
        processo.versao_atual,
        processo.criado_por_nome,
        processo.submetido_em ?? '',
      ]
        .map((valor) => `"${String(valor).replace(/"/g, '""')}"`)
        .join(';'),
    )
    const csv = [cabecalho.join(';'), ...linhas].join('\n')
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'relatorio-processos-supervisao.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-fx-fundo text-fx-grafite">
      <header className="border-b border-fx-linha bg-fx-papel">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              aria-label="Voltar ao painel"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <img src="/logo/fluxoia-horizontal-cor.svg" alt="FluxoIA" className="h-8 w-auto select-none" />
          </div>
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
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-fx-cinza">
              Relatórios & Indicadores
            </p>
            <h1 className="font-serif text-3xl font-semibold leading-tight text-fx-marinho">
              Desempenho da Área Supervisionada
            </h1>
            <p className="text-sm text-fx-cinza">
              Métricas de qualidade, produtividade e conformidade dos processos da sua supervisão.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void recarregar()} disabled={carregando}>
              {carregando ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-4 w-4" />
              )}
              Atualizar
            </Button>
            <Button size="sm" onClick={exportarCsv}>
              <Download className="mr-1.5 h-4 w-4" /> Exportar CSV
            </Button>
          </div>
        </div>

        {erro && (
          <div role="alert" className="rounded-sm border border-fx-alerta/40 bg-fx-alerta/10 px-4 py-3 text-sm text-fx-alerta">
            {erro}
          </div>
        )}

        <SupervisorStats indicadores={indicadores} />

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-fx-azul" /> Distribuição por status
              </CardTitle>
              <CardDescription className="text-xs">
                {processos.length} processos sob supervisão
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {distribuicao.map(({ rotulo, total, cor }) => (
                <div key={rotulo} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-fx-grafite">{rotulo}</span>
                    <span className="font-semibold text-fx-marinho">{total}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-sm bg-fx-nevoa">
                    <div className={`h-full ${cor}`} style={{ width: `${(total / totalProcessos) * 100}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Qualidade da geração por IA</CardTitle>
              <CardDescription className="text-xs">
                Baseada nas avaliações registradas pelos autores dos processos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-0 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-fx-cinza">Pareceres registrados</span>
                <span className="font-semibold text-fx-marinho">{indicadores.totalAnalisados}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-fx-cinza">Taxa de devolução</span>
                <span className="font-semibold text-fx-marinho">
                  {indicadores.taxaDevolucao.toFixed(1).replace('.', ',')}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-fx-cinza">SLA médio de análise</span>
                <span className="font-semibold text-fx-marinho">{formatarDias(indicadores.slaMedioDias)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-fx-cinza">Acima da meta de SLA</span>
                <span className="font-semibold text-fx-alerta">{indicadores.slaForaDaMeta}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Desempenho por setor</CardTitle>
            <CardDescription className="text-xs">
              Pendências, homologações e tempo médio de análise por unidade.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-fx-linha text-left text-[11px] uppercase tracking-wider text-fx-cinza">
                    <th className="py-2 pr-3 font-semibold">Setor</th>
                    <th className="py-2 pr-3 font-semibold">Pendentes</th>
                    <th className="py-2 pr-3 font-semibold">Homologados</th>
                    <th className="py-2 pr-3 font-semibold">Devolvidos</th>
                    <th className="py-2 font-semibold">SLA médio</th>
                  </tr>
                </thead>
                <tbody>
                  {porSetor.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-sm text-fx-cinza">
                        Nenhum processo encontrado para a sua área de supervisão.
                      </td>
                    </tr>
                  )}
                  {porSetor.map((linha) => (
                    <tr key={linha.setor} className="border-b border-fx-linha/60 last:border-0">
                      <td className="py-2.5 pr-3 font-medium text-fx-marinho">{linha.setor}</td>
                      <td className="py-2.5 pr-3">{linha.pendentes}</td>
                      <td className="py-2.5 pr-3">{linha.homologados}</td>
                      <td className="py-2.5 pr-3">{linha.devolvidos}</td>
                      <td className="py-2.5">{formatarDias(linha.slaMedioDias)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Fila atual com SLA</CardTitle>
            <CardDescription className="text-xs">
              Priorize os processos que já ultrapassaram a meta de {indicadores.metaSlaDias} dias.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {processos.filter((item) => item.status === 'aguardando_validacao').length === 0 ? (
              <p className="text-sm text-fx-cinza">Nenhum processo aguardando parecer.</p>
            ) : (
              processos
                .filter((item) => item.status === 'aguardando_validacao')
                .map((processo) => (
                  <div
                    key={processo.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-fx-linha bg-white px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-fx-marinho">{processo.nome}</p>
                      <p className="text-[11px] text-fx-cinza">
                        {processo.setor} · {processo.criado_por_nome}
                      </p>
                    </div>
                    <SLAIndicator processo={processo} metaDias={indicadores.metaSlaDias} />
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
