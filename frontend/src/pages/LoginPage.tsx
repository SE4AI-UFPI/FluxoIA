import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react'
import { FioDeFluxo } from '@/components/brand/FioDeFluxo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'

export function LoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuth()

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, navigate])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password) {
      setError('Informe seu e-mail e sua senha.')
      return
    }

    setIsSubmitting(true)
    try {
      await login({ email: email.trim(), password })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao conectar com o servidor.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-fx-fundo text-fx-grafite">
      {/* Coluna Institucional (Azul Marinho #0B2A4A - 30% a 40% da composição) */}
      <aside className="hidden lg:flex lg:col-span-5 xl:col-span-5 bg-fx-marinho text-fx-papel flex-col justify-between p-10 xl:p-14">
        <div>
          {/* Logotipo oficial em contornos - Versão Negativa sobre Azul Marinho */}
          <img
            src="/logo/fluxoia-horizontal-negativo.svg"
            alt="FluxoIA"
            className="h-11 w-auto select-none"
          />
        </div>

        <div className="my-auto py-8 space-y-6 max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fx-claro">
            Mapeamento de processos · Governança pública
          </p>

          <h1 className="font-serif text-3xl xl:text-4xl font-semibold leading-tight text-fx-papel">
            Tornar visível o caminho de cada processo público, da primeira etapa à decisão final.
          </h1>

          <p className="text-base leading-relaxed text-fx-nevoa/90">
            Responda à entrevista guiada em linguagem simples. A IA sugere o diagrama BPMN por
            setor, e o fluxo só se torna oficial após a revisão e aprovação da chefia.
          </p>

          {/* Pilares da Essência da Marca (Seção 01 do Guia) */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-sm border border-fx-claro/25 bg-fx-papel/5 p-3.5">
              <p className="text-xs font-semibold text-fx-claro">Confiável</p>
              <p className="mt-1 text-xs leading-snug text-fx-nevoa/85">
                A IA propõe, uma pessoa aprova. Nada fica oficial sem revisão humana.
              </p>
            </div>
            <div className="rounded-sm border border-fx-claro/25 bg-fx-papel/5 p-3.5">
              <p className="text-xs font-semibold text-fx-claro">Rastreável</p>
              <p className="mt-1 text-xs leading-snug text-fx-nevoa/85">
                Cada etapa mostra de qual trecho da entrevista se originou.
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé institucional com o grafismo oficial "O fio de fluxo" */}
        <div className="space-y-5 pt-4 border-t border-fx-claro/15">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fx-nevoa/75">
              UFPI · FÁBRICA DE IA DO PIAUÍ · SECTI
            </span>
            <FioDeFluxo theme="dark" className="w-44 shrink-0" />
          </div>
        </div>
      </aside>

      {/* Coluna de Acesso (Fundo #E9F0F8 + Cartão em Papel #F7FAFD) */}
      <main className="lg:col-span-7 xl:col-span-7 flex flex-col justify-between p-6 sm:p-10 md:p-14">
        {/* Cabeçalho compacto visível no mobile */}
        <div className="flex items-center justify-between lg:hidden">
          <img
            src="/logo/fluxoia-horizontal-cor.svg"
            alt="FluxoIA"
            className="h-9 w-auto select-none"
          />
        </div>

        <div className="my-auto mx-auto w-full max-w-md">
          <Card className="border-fx-linha bg-fx-papel shadow-sm rounded-[14px]">
            <CardHeader className="space-y-2 pb-5">
              <CardTitle className="text-[28px] leading-[36px] text-fx-marinho">
                Entrar no FluxoIA
              </CardTitle>
              <CardDescription className="text-sm text-fx-cinza">
                Informe seu e-mail e senha para acessar o mapeamento e a validação de
                processos do seu setor.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 rounded-sm border border-fx-alerta/40 bg-fx-alerta/10 px-3.5 py-3 text-sm text-fx-alerta"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="font-medium leading-snug">{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Digite sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting}
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-fx-cinza hover:text-fx-marinho transition-colors cursor-pointer"
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full mt-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Autenticando...
                    </>
                  ) : (
                    <>
                      Acessar plataforma
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-5 border-t border-fx-linha/70">
                <p className="text-xs leading-relaxed text-fx-cinza">
                  <strong className="font-semibold text-fx-grafite">Proteção de dados (LGPD):</strong>{' '}
                  O acesso é vinculado ao seu papel no sistema (Servidor, Chefe do Setor ou
                  Administrador). Não insira CPF nem dados pessoais de cidadãos nas entrevistas.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rodapé secundário */}
        <footer className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-fx-cinza pt-6">
          <span>FluxoIA · Mapeamento de processos com IA e aprovação humana</span>
          <span className="lg:hidden text-[11px] font-semibold uppercase tracking-wider">
            UFPI · FÁBRICA DE IA DO PIAUÍ · SECTI
          </span>
        </footer>
      </main>
    </div>
  )
}
