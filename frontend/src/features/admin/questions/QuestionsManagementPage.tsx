import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Eye,
  EyeOff,
  HelpCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import {
  type ApiInterviewQuestion,
  createPerguntaAdmin,
  deletePerguntaAdmin,
  fetchPerguntasAdmin,
  reordenarPerguntasAdmin,
  updatePerguntaAdmin,
} from '@/features/process-mapping/services/interview.service'

interface QuestionFormData {
  id?: string
  titulo: string
  chave: string
  enunciado: string
  obrigatoria: boolean
  ativa: boolean
}

const INITIAL_FORM: QuestionFormData = {
  titulo: '',
  chave: '',
  enunciado: '',
  obrigatoria: false,
  ativa: true,
}

export function QuestionsManagementPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [questions, setQuestions] = React.useState<ApiInterviewQuestion[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<'todas' | 'ativas' | 'inativas' | 'obrigatorias'>('todas')
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [formData, setFormData] = React.useState<QuestionFormData>(INITIAL_FORM)
  const [formSaving, setFormSaving] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)

  // Delete Confirm Modal State
  const [deletingQuestion, setDeletingQuestion] = React.useState<ApiInterviewQuestion | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const loadQuestions = React.useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchPerguntasAdmin()
      setQuestions(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar perguntas da entrevista.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadQuestions()
  }, [loadQuestions])

  const filteredQuestions = React.useMemo(() => {
    return questions.filter((q) => {
      const matchSearch =
        q.titulo.toLowerCase().includes(search.toLowerCase()) ||
        q.chave.toLowerCase().includes(search.toLowerCase()) ||
        q.enunciado.toLowerCase().includes(search.toLowerCase())

      if (!matchSearch) return false

      if (statusFilter === 'ativas') return q.ativa
      if (statusFilter === 'inativas') return !q.ativa
      if (statusFilter === 'obrigatorias') return q.obrigatoria

      return true
    })
  }, [questions, search, statusFilter])

  function handleOpenCreate() {
    setFormData(INITIAL_FORM)
    setFormError(null)
    setIsModalOpen(true)
  }

  function handleOpenEdit(q: ApiInterviewQuestion) {
    setFormData({
      id: q.id,
      titulo: q.titulo,
      chave: q.chave,
      enunciado: q.enunciado,
      obrigatoria: q.obrigatoria,
      ativa: q.ativa,
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  async function handleSaveQuestion(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.titulo.trim()) {
      setFormError('Informe o título da pergunta.')
      return
    }
    if (!formData.enunciado.trim()) {
      setFormError('Informe o enunciado da pergunta.')
      return
    }

    try {
      setFormSaving(true)
      setFormError(null)

      if (formData.id) {
        await updatePerguntaAdmin(formData.id, {
          titulo: formData.titulo.trim(),
          chave: formData.chave.trim() || undefined,
          enunciado: formData.enunciado.trim(),
          obrigatoria: formData.obrigatoria,
          ativa: formData.ativa,
        })
        setSuccess(`Pergunta "${formData.titulo}" atualizada com sucesso.`)
      } else {
        await createPerguntaAdmin({
          titulo: formData.titulo.trim(),
          chave: formData.chave.trim() || undefined,
          enunciado: formData.enunciado.trim(),
          obrigatoria: formData.obrigatoria,
          ativa: formData.ativa,
        })
        setSuccess(`Pergunta "${formData.titulo}" criada com sucesso.`)
      }

      setIsModalOpen(false)
      loadQuestions()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Falha ao salvar a pergunta.')
    } finally {
      setFormSaving(false)
    }
  }

  async function handleToggleAtiva(q: ApiInterviewQuestion) {
    try {
      await updatePerguntaAdmin(q.id, { ativa: !q.ativa })
      setSuccess(`Pergunta "${q.titulo}" ${q.ativa ? 'desativada' : 'ativada'} com sucesso.`)
      loadQuestions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao alterar status da pergunta.')
    }
  }

  async function handleConfirmDelete() {
    if (!deletingQuestion) return
    try {
      setIsDeleting(true)
      await deletePerguntaAdmin(deletingQuestion.id, false)
      setSuccess(`Pergunta "${deletingQuestion.titulo}" desativada com sucesso.`)
      setDeletingQuestion(null)
      loadQuestions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao remover a pergunta.')
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleMove(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= questions.length) return

    const newQuestions = [...questions]
    const temp = newQuestions[index]
    newQuestions[index] = newQuestions[targetIndex]
    newQuestions[targetIndex] = temp

    setQuestions(newQuestions)

    try {
      const orderIds = newQuestions.map((q) => q.id)
      await reordenarPerguntasAdmin(orderIds)
      setSuccess('Ordem das perguntas atualizada com sucesso.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao reordenar perguntas.')
      loadQuestions()
    }
  }

  return (
    <div className="min-h-screen bg-fx-fundo flex flex-col font-sans text-fx-texto">
      {/* Header */}
      <header className="border-b border-fx-cinza-claro bg-white sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 min-h-16 flex items-center justify-between gap-3">
          <img
            src="/logo/fluxoia-horizontal-cor.svg"
            alt="FluxoIA"
            className="h-8 w-auto select-none"
          />
          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-semibold text-fx-marinho">{user.nome}</span>
                <span className="text-xs text-fx-cinza">{user.email}</span>
              </div>
            )}
            <Badge variant="secondary" className="hidden sm:inline-flex">
              Administrador
            </Badge>
            <Button variant="outline" size="sm" onClick={logout}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-7 sm:py-10 space-y-6">
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
          Voltar ao painel
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-fx-cinza">
              Administração da Plataforma
            </p>
            <h1 className="font-serif text-3xl font-semibold leading-tight text-fx-marinho">
              Perguntas da Entrevista Guiada
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-fx-cinza">
              Defina dinamicamente as perguntas realizadas ao servidor público durante o mapeamento
              do processo. Configure o texto, ordem de exibição e obrigatoriedade para a geração do BPMN.
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            className="shrink-0"
            onClick={handleOpenCreate}
          >
            <Plus className="h-4 w-4" />
            Nova Pergunta
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
          <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Relação de Perguntas ({filteredQuestions.length})</CardTitle>
              <CardDescription>
                Ordene as perguntas usando as setas para ajustar o fluxo da entrevista guiada.
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fx-cinza" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar perguntas..."
                  className="pl-9"
                />
              </div>
              <div className="flex gap-1.5">
                {(['todas', 'ativas', 'inativas', 'obrigatorias'] as const).map((filter) => (
                  <Button
                    key={filter}
                    type="button"
                    variant={statusFilter === filter ? 'default' : 'outline'}
                    size="sm"
                    className="capitalize text-xs"
                    onClick={() => setStatusFilter(filter)}
                  >
                    {filter === 'todas' ? 'Todas' : filter}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-sm text-fx-cinza">
                Carregando perguntas da entrevista...
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="p-8 text-center text-sm text-fx-cinza">
                Nenhuma pergunta encontrada com os filtros selecionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-fx-cinza-claro/30 text-xs font-semibold text-fx-cinza uppercase tracking-wider border-b border-fx-cinza-claro">
                    <tr>
                      <th className="py-3 px-4 w-20 text-center">Ordem</th>
                      <th className="py-3 px-4">Pergunta & Enunciado</th>
                      <th className="py-3 px-4 w-32 text-center">Obrigatória</th>
                      <th className="py-3 px-4 w-28 text-center">Status</th>
                      <th className="py-3 px-4 w-40 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-fx-cinza-claro/60">
                    {filteredQuestions.map((q) => {
                      const realIndex = questions.findIndex((item) => item.id === q.id)
                      const isFirst = realIndex === 0
                      const isLast = realIndex === questions.length - 1

                      return (
                        <tr key={q.id} className="hover:bg-fx-cinza-claro/15 transition-colors">
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span className="font-semibold text-fx-marinho w-6">
                                {q.ordem}
                              </span>
                              <div className="flex flex-col gap-0.5">
                                <button
                                  type="button"
                                  disabled={isFirst}
                                  onClick={() => handleMove(realIndex, 'up')}
                                  title="Mover para cima"
                                  className="p-1 rounded text-fx-cinza hover:text-fx-marinho hover:bg-fx-cinza-claro/50 disabled:opacity-30 disabled:pointer-events-none"
                                >
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={isLast}
                                  onClick={() => handleMove(realIndex, 'down')}
                                  title="Mover para baixo"
                                  className="p-1 rounded text-fx-cinza hover:text-fx-marinho hover:bg-fx-cinza-claro/50 disabled:opacity-30 disabled:pointer-events-none"
                                >
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-fx-marinho">{q.titulo}</span>
                              <code className="text-[11px] bg-fx-cinza-claro/60 px-1.5 py-0.5 rounded text-fx-cinza">
                                [{q.chave}]
                              </code>
                            </div>
                            <p className="text-xs text-fx-cinza leading-relaxed line-clamp-2 max-w-xl">
                              {q.enunciado}
                            </p>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {q.obrigatoria ? (
                              <Badge variant="default" className="bg-amber-600 text-white hover:bg-amber-700">
                                Obrigatória
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-fx-cinza">
                                Opcional
                              </Badge>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {q.ativa ? (
                              <Badge variant="default" className="bg-emerald-600 text-white hover:bg-emerald-700">
                                Ativa
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-fx-cinza">
                                Inativa
                              </Badge>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleAtiva(q)}
                                title={q.ativa ? 'Desativar pergunta' : 'Ativar pergunta'}
                                className="h-8 w-8 p-0"
                              >
                                {q.ativa ? (
                                  <EyeOff className="h-4 w-4 text-fx-cinza hover:text-amber-600" />
                                ) : (
                                  <Eye className="h-4 w-4 text-fx-cinza hover:text-emerald-600" />
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEdit(q)}
                                title="Editar pergunta"
                                className="h-8 w-8 p-0 text-fx-cinza hover:text-fx-marinho"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingQuestion(q)}
                                title="Desativar pergunta"
                                className="h-8 w-8 p-0 text-fx-cinza hover:text-fx-alerta"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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

      {/* Modal de Criação / Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-sm bg-white p-6 shadow-xl space-y-5 animate-in fade-in-50">
            <div className="flex items-center justify-between border-b border-fx-cinza-claro pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-fx-azul-gov" />
                <h2 className="text-lg font-semibold text-fx-marinho">
                  {formData.id ? 'Editar Pergunta da Entrevista' : 'Nova Pergunta da Entrevista'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-fx-cinza hover:text-fx-marinho p-1 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="rounded-sm border border-fx-alerta/40 bg-fx-alerta/10 p-3 text-xs text-fx-alerta">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="titulo" className="text-xs font-semibold">
                  Título da Pergunta *
                </Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ex: Sistemas e Ferramentas Utilizadas"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="chave" className="text-xs font-semibold">
                  Chave Identificadora (slug interno para o BPMN/IA)
                </Label>
                <Input
                  id="chave"
                  value={formData.chave}
                  onChange={(e) => setFormData({ ...formData, chave: e.target.value })}
                  placeholder="Deixe em branco para gerar automaticamente"
                />
                <p className="text-[11px] text-fx-cinza">
                  Identificador alfanumérico único para o prompt da IA (ex: <code>systems</code>, <code>regra_negocio</code>).
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="enunciado" className="text-xs font-semibold">
                  Enunciado / Explicação Detalhada *
                </Label>
                <textarea
                  id="enunciado"
                  rows={4}
                  value={formData.enunciado}
                  onChange={(e) => setFormData({ ...formData, enunciado: e.target.value })}
                  placeholder="Descreva a pergunta e exemplos de resposta orientativa para o servidor público preencher..."
                  className="w-full rounded-sm border border-fx-cinza-claro bg-white p-2.5 text-sm outline-none focus:border-fx-azul-gov"
                  required
                />
              </div>

              <div className="space-y-3 pt-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.obrigatoria}
                    onChange={(e) => setFormData({ ...formData, obrigatoria: e.target.checked })}
                    className="h-4 w-4 rounded border-fx-cinza-claro text-fx-azul-gov focus:ring-fx-azul-gov"
                  />
                  <span className="font-medium text-fx-marinho">
                    Obrigatória para geração do fluxo BPMN com IA
                  </span>
                </label>

                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.ativa}
                    onChange={(e) => setFormData({ ...formData, ativa: e.target.checked })}
                    className="h-4 w-4 rounded border-fx-cinza-claro text-fx-azul-gov focus:ring-fx-azul-gov"
                  />
                  <span className="font-medium text-fx-marinho">
                    Ativa na entrevista guiada do mapeamento
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-fx-cinza-claro">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={formSaving}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={formSaving}>
                  {formSaving ? 'Salvando...' : formData.id ? 'Salvar Alterações' : 'Criar Pergunta'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deletingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-sm bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-semibold text-fx-marinho">Desativar Pergunta</h3>
            <p className="text-sm text-fx-cinza leading-relaxed">
              Deseja desativar a pergunta <strong>"{deletingQuestion.titulo}"</strong>?
              Ela deixará de aparecer em novos processos mapeados, preservando o histórico de processos já existentes.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeletingQuestion(null)}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Desativando...' : 'Confirmar Desativação'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
