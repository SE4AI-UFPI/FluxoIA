import { ArrowLeft, Cog } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { PAPEL_LABEL } from '@/types/auth'

/**
 * Tela de Relatórios — em construção.
 * As métricas consolidadas permanecem na tela de Indicadores.
 */
export function RelatoriosEmConstrucaoPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-screen flex-col bg-fx-fundo text-fx-grafite">
      <header className="border-b border-fx-linha bg-fx-papel">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
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
            <img
              src="/logo/fluxoia-horizontal-cor.svg"
              alt="FluxoIA"
              className="h-8 w-auto select-none"
            />
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

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div
          role="status"
          className="flex flex-col items-center gap-4 text-center"
          aria-live="polite"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-fx-linha bg-fx-papel text-fx-azul shadow-xs">
            <Cog className="h-8 w-8" aria-hidden="true" />
          </span>
          <p className="font-serif text-2xl font-semibold text-fx-marinho sm:text-3xl">
            Em construção
          </p>
        </div>
      </main>
    </div>
  )
}
