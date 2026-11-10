import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ClipboardCheck,
  FileCheck2,
  Loader2,
  Network,
  Plus,
  Shield,
  Trash2,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SETORES_INSTITUCIONAIS } from '@/constants/institutionalSectors'
import { useAuth } from '@/contexts/AuthContext'
import { fetchProcessosFromApi } from '@/features/process-mapping/services/process.service'
import { usersService, type CriarUsuarioPayload } from '@/services/usersService'

type PerfilCadastro = CriarUsuarioPayload['papel']

interface FormularioUsuario {
  nome: string
  cpf: string
  email: string
  matricula: string
  cargo: string
  secretaria: string
  telefone: string
  setor: string
  setores_vinculados: string[]
  papel: PerfilCadastro
  permissoes: string[]
  is_active: boolean
  password: string
}

const CUSTOM_SECTOR_VALUE = '__custom__'

const PERFIS: Array<{
  id: PerfilCadastro
  nome: string
  descricao: string
  Icone: typeof Shield
}> = [
  { id: 'admin', nome: 'Administrador', descricao: 'Acesso completo à plataforma.', Icone: Shield },
  {
    id: 'supervisor',
    nome: 'Supervisor',
    descricao: 'Gestão e acompanhamento dos setores vinculados.',
    Icone: Network,
  },
  {
    id: 'coordenador',
    nome: 'Coordenador',
    descricao: 'Coordenação operacional e gestão das equipes.',
    Icone: Users,
  },
  {
    id: 'operacional',
    nome: 'Usuário Operacional',
    descricao: 'Execução e acompanhamento das atividades atribuídas.',
    Icone: ClipboardCheck,
  },
]

const PERMISSOES_POR_PERFIL: Record<PerfilCadastro, Array<{ id: string; label: string }>> = {
  admin: [],
  supervisor: [
    { id: 'visualizar_relatorios', label: 'Visualizar relatórios' },
    { id: 'exportar_dados', label: 'Exportar dados' },
    { id: 'aprovar_fluxos', label: 'Aprovar fluxos' },
    { id: 'assinar_documentos', label: 'Assinar documentos' },
    { id: 'gerenciar_indicadores', label: 'Gerenciar indicadores' },
    { id: 'homologar_processos', label: 'Homologar processos' },
    { id: 'gerar_editar_diagramas_institucionais', label: 'Gerar e editar diagramas institucionais' },
    { id: 'exportar_artefatos', label: 'Exportar artefatos em XML, BPMN e PDF' },
    { id: 'acessar_dashboard', label: 'Acessar dashboard' },
  ],
  coordenador: [
    { id: 'responder_entrevistas_guiadas', label: 'Responder entrevistas guiadas' },
    { id: 'gerar_editar_diagramas_institucionais', label: 'Gerar e editar diagramas institucionais' },
    { id: 'exportar_artefatos', label: 'Exportar artefatos em XML, BPMN e PDF' },
    { id: 'exportar_dados', label: 'Exportar dados' },
    { id: 'gerenciar_indicadores', label: 'Consultar indicadores operacionais' },
    { id: 'distribuir_tarefas', label: 'Distribuir tarefas' },
    { id: 'gerenciar_equipes', label: 'Gerenciar equipes vinculadas' },
    { id: 'consultar_processos', label: 'Consultar processos' },
    { id: 'acessar_dashboard', label: 'Acessar dashboard' },
  ],
  operacional: [
    { id: 'responder_entrevistas_guiadas', label: 'Responder entrevistas guiadas' },
    { id: 'executar_atividades', label: 'Executar atividades' },
    { id: 'atualizar_informacoes', label: 'Atualizar informações' },
    { id: 'consultar_processos', label: 'Consultar processos vinculados' },
    { id: 'acessar_dashboard', label: 'Acessar dashboard' },
  ],
}

const INITIAL_FORM: FormularioUsuario = {
  nome: '',
  cpf: '',
  email: '',
  matricula: '',
  cargo: '',
  secretaria: '',
  telefone: '',
  setor: '',
  setores_vinculados: [],
  papel: 'operacional',
  permissoes: PERMISSOES_POR_PERFIL.operacional.map((item) => item.id),
  is_active: true,
  password: '',
}

function cpfIsValid(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 11 || /^([0-9])\1+$/.test(digits)) return false

  for (let length = 9; length <= 10; length += 1) {
    const total = [...digits.slice(0, length)].reduce(
      (sum, digit, index) => sum + Number(digit) * (length + 1 - index),
      0,
    )
    const checkDigit = ((total * 10) % 11) % 10
    if (checkDigit !== Number(digits[length])) return false
  }

  return true
}

function TextField({
  id,
  label,
  value,
  onChange,
  required = false,
  type = 'text',
  autoComplete,
  inputMode,
  maxLength,
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  type?: string
  autoComplete?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  maxLength?: number
  placeholder?: string
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? ' *' : ''}
      </Label>
      <Input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        placeholder={placeholder}
        required={required}
      />
    </div>
  )
}

export function UserRegistrationPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const isEditing = Boolean(id)
  const { user, logout } = useAuth()
  const [form, setForm] = React.useState<FormularioUsuario>(INITIAL_FORM)
  const [availableSectors, setAvailableSectors] = React.useState<string[]>(SETORES_INSTITUCIONAIS)
  const [customPrimarySectorMode, setCustomPrimarySectorMode] = React.useState(false)
  const [selectedLinkedSector, setSelectedLinkedSector] = React.useState('')
  const [customLinkedSectorMode, setCustomLinkedSectorMode] = React.useState(false)
  const [customLinkedSectorText, setCustomLinkedSectorText] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isLoadingUser, setIsLoadingUser] = React.useState(isEditing)

  // Carrega dados do usuário quando em modo de edição
  React.useEffect(() => {
    if (!id) return
    let active = true
    setIsLoadingUser(true)
    usersService
      .get(id)
      .then((data) => {
        if (!active) return
        setForm({
          nome: data.nome || '',
          cpf: data.cpf || '',
          email: data.email || '',
          matricula: data.matricula || '',
          cargo: data.cargo || '',
          secretaria: data.secretaria || '',
          telefone: data.telefone || '',
          setor: data.setor || '',
          setores_vinculados: data.setores_vinculados ?? [],
          papel: data.papel,
          permissoes:
            data.permissoes && data.permissoes.length > 0
              ? data.permissoes
              : PERMISSOES_POR_PERFIL[data.papel]?.map((item) => item.id) ?? [],
          is_active: data.is_active,
          password: '',
        })
        if (data.setor?.trim()) {
          setAvailableSectors((prev) =>
            prev.includes(data.setor.trim()) ? prev : [data.setor.trim(), ...prev],
          )
        }
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error ? err.message : 'Não foi possível carregar os dados do usuário.',
          )
        }
      })
      .finally(() => {
        if (active) setIsLoadingUser(false)
      })
    return () => {
      active = false
    }
  }, [id])

  // Carrega também os setores já existentes nos usuários e processos do banco
  // para que qualquer setor já utilizado apareça automaticamente no <select>.
  React.useEffect(() => {
    let active = true
    Promise.allSettled([usersService.list(), fetchProcessosFromApi()]).then(
      ([usersRes, processosRes]) => {
        if (!active) return
        const dynamicSectors: string[] = []
        if (usersRes.status === 'fulfilled') {
          for (const item of usersRes.value) {
            if (item.setor?.trim()) dynamicSectors.push(item.setor.trim())
            for (const linked of item.setores_vinculados ?? []) {
              if (linked?.trim()) dynamicSectors.push(linked.trim())
            }
          }
        }
        if (processosRes.status === 'fulfilled') {
          for (const proc of processosRes.value) {
            if (proc.setor?.trim()) dynamicSectors.push(proc.setor.trim())
          }
        }
        setAvailableSectors(
          Array.from(new Set([...SETORES_INSTITUCIONAIS, ...dynamicSectors])),
        )
      },
    )
    return () => {
      active = false
    }
  }, [])

  function updateField<Key extends keyof FormularioUsuario>(
    key: Key,
    value: FormularioUsuario[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function selectProfile(papel: PerfilCadastro) {
    setForm((current) => ({
      ...current,
      papel,
      setor: papel === 'admin' ? '' : current.setor,
      setores_vinculados: papel === 'admin' ? [] : current.setores_vinculados,
      permissoes: PERMISSOES_POR_PERFIL[papel].map((item) => item.id),
    }))
  }

  function addLinkedSectorByValue(rawSector: string) {
    const sector = rawSector.trim()
    if (!sector || form.setores_vinculados.includes(sector)) return
    updateField('setores_vinculados', [...form.setores_vinculados, sector])
    if (!availableSectors.includes(sector)) {
      setAvailableSectors((prev) => [...prev, sector])
    }
  }

  function handleSelectLinkedSectorChange(value: string) {
    if (value === CUSTOM_SECTOR_VALUE) {
      setCustomLinkedSectorMode(true)
      setSelectedLinkedSector('')
      return
    }
    setCustomLinkedSectorMode(false)
    setSelectedLinkedSector('')
    if (value) {
      addLinkedSectorByValue(value)
    }
  }

  function handleAddCustomLinkedSector() {
    const trimmed = customLinkedSectorText.trim()
    if (!trimmed) return
    addLinkedSectorByValue(trimmed)
    setCustomLinkedSectorText('')
    setCustomLinkedSectorMode(false)
  }

  function togglePermission(permission: string) {
    updateField(
      'permissoes',
      form.permissoes.includes(permission)
        ? form.permissoes.filter((item) => item !== permission)
        : [...form.permissoes, permission],
    )
  }

  function cancel() {
    navigate('/usuarios')
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!cpfIsValid(form.cpf)) {
      setError('Informe um CPF válido.')
      return
    }
    if (form.papel !== 'admin' && !form.setor.trim()) {
      setError('Selecione ou informe o setor de atuação para o perfil selecionado.')
      return
    }
    if (!isEditing && !form.password) {
      setError('Informe a senha inicial do usuário.')
      return
    }
    if (!isEditing && form.password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.')
      return
    }
    if (isEditing && form.password && form.password.length < 8) {
      setError('A nova senha deve ter no mínimo 8 caracteres.')
      return
    }

    setIsSubmitting(true)
    try {
      const primarySector = form.setor.trim()
      const linkedSectors =
        form.papel === 'supervisor'
          ? Array.from(new Set([primarySector, ...form.setores_vinculados].filter(Boolean)))
          : form.setores_vinculados

      if (isEditing && id) {
        const updatePayload: Partial<CriarUsuarioPayload> = {
          nome: form.nome.trim(),
          cpf: form.cpf ? form.cpf.replace(/\D/g, '') : '',
          email: form.email.trim().toLowerCase(),
          matricula: form.matricula.trim(),
          cargo: form.cargo.trim(),
          secretaria: form.secretaria.trim(),
          telefone: form.telefone.trim(),
          setor: primarySector,
          setores_vinculados: linkedSectors,
          papel: form.papel,
          permissoes: form.permissoes,
          is_active: form.is_active,
          ...(form.password.trim() ? { password: form.password.trim() } : {}),
        }
        const updated = await usersService.update(id, updatePayload)
        navigate('/usuarios', { state: { updatedUserName: updated.nome } })
      } else {
        const payload: CriarUsuarioPayload = {
          ...form,
          nome: form.nome.trim(),
          cpf: form.cpf.replace(/\D/g, ''),
          email: form.email.trim().toLowerCase(),
          secretaria: form.secretaria.trim(),
          setor: primarySector,
          setores_vinculados: linkedSectors,
          password: form.password,
        }
        const created = await usersService.create(payload)
        setForm(INITIAL_FORM)
        navigate('/usuarios', { state: { createdUserName: created.nome } })
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Não foi possível salvar o usuário.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user || user.papel !== 'admin') return null

  const primarySectorOptions = Array.from(
    new Set([
      ...(form.setor && !customPrimarySectorMode ? [form.setor] : []),
      ...availableSectors,
    ]),
  )

  const remainingLinkedSectorOptions = availableSectors.filter(
    (sector) => !form.setores_vinculados.includes(sector) && sector !== form.setor,
  )

  return (
    <div className="min-h-screen bg-fx-fundo text-fx-grafite flex flex-col">
      <header className="border-b border-fx-linha bg-fx-papel">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 min-h-16 flex items-center justify-between gap-3">
          <img
            src="/logo/fluxoia-horizontal-cor.svg"
            alt="FluxoIA"
            className="h-8 w-auto select-none"
          />
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-fx-marinho">{user.nome}</span>
              <span className="text-xs text-fx-cinza">{user.email}</span>
            </div>
            <Badge variant="secondary" className="hidden sm:inline-flex">
              Administrador
            </Badge>
            <Button variant="outline" size="sm" onClick={logout}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-7 sm:py-10 space-y-6">
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/usuarios')}>
          <ArrowLeft className="h-4 w-4" />
          Voltar para Gestão de Usuários
        </Button>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-fx-cinza">
            Gestão de usuários
          </p>
          <h1 className="font-serif text-3xl font-semibold leading-tight text-fx-marinho">
            {isEditing ? `Editar Usuário: ${form.nome || '...'}` : 'Cadastrar Novo Usuário'}
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-fx-cinza">
            {isEditing
              ? 'Atualize os dados funcionais, perfil de acesso e escopo de atuação do usuário.'
              : 'Cadastre um novo usuário e defina seu nível de acesso e escopo de atuação dentro da plataforma.'}
          </p>
        </div>

        {isLoadingUser ? (
          <div className="flex h-64 items-center justify-center gap-2 rounded-sm border border-fx-linha bg-white text-sm text-fx-cinza">
            <Loader2 className="h-5 w-5 animate-spin text-fx-azul" />
            Carregando dados do usuário...
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5" noValidate>
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
            <CardHeader>
              <CardTitle className="text-xl">Dados Cadastrais</CardTitle>
              <CardDescription>Informações funcionais e de contato do usuário.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <TextField
                id="nome"
                label="Nome Completo"
                value={form.nome}
                onChange={(value) => updateField('nome', value)}
                required
                autoComplete="name"
              />
              <TextField
                id="cpf"
                label="CPF"
                value={form.cpf}
                onChange={(value) => updateField('cpf', value)}
                required
                inputMode="numeric"
                maxLength={14}
                placeholder="000.000.000-00"
              />
              <TextField
                id="email"
                label="E-mail"
                type="email"
                value={form.email}
                onChange={(value) => updateField('email', value)}
                required
                autoComplete="email"
              />
              <TextField
                id="matricula"
                label="Matrícula"
                value={form.matricula}
                onChange={(value) => updateField('matricula', value)}
              />
              <TextField
                id="cargo"
                label="Cargo/Função"
                value={form.cargo}
                onChange={(value) => updateField('cargo', value)}
              />
              <TextField
                id="secretaria"
                label="Órgão / Secretaria"
                value={form.secretaria}
                onChange={(value) => updateField('secretaria', value)}
                placeholder="Ex.: SECTI, SDU, SEAD"
                required
              />
              <TextField
                id="telefone"
                label="Telefone"
                type="tel"
                value={form.telefone}
                onChange={(value) => updateField('telefone', value)}
                autoComplete="tel"
              />
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={form.is_active ? 'ativo' : 'inativo'}
                  onChange={(event) => updateField('is_active', event.target.value === 'ativo')}
                  className="flex h-10 w-full rounded-sm border border-fx-linha bg-white px-3 py-2 text-base text-fx-grafite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fx-azul"
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
              <TextField
                id="password"
                label={isEditing ? 'Nova Senha (opcional)' : 'Senha inicial'}
                placeholder={isEditing ? 'Deixe em branco para manter a senha atual' : 'Mínimo de 8 caracteres'}
                type="password"
                value={form.password}
                onChange={(value) => updateField('password', value)}
                required={!isEditing}
                autoComplete="new-password"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Perfil de Acesso</CardTitle>
              <CardDescription>
                Selecione um único perfil para definir os acessos disponíveis.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {PERFIS.map(({ id, nome, descricao, Icone }) => {
                const selected = form.papel === id
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => selectProfile(id)}
                    className={`min-w-0 rounded-sm border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fx-azul ${selected ? 'border-fx-azul bg-fx-nevoa/60 ring-1 ring-fx-azul' : 'border-fx-linha bg-fx-papel hover:bg-fx-nevoa/30'}`}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <Icone className="h-5 w-5 shrink-0 text-fx-azul" />
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-fx-azul bg-fx-azul text-fx-papel' : 'border-fx-linha text-transparent'}`}
                      >
                        <Check className="h-3 w-3" />
                      </span>
                    </span>
                    <span className="mt-3 block text-sm font-semibold text-fx-marinho">{nome}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-fx-cinza">
                      {descricao}
                    </span>
                  </button>
                )
              })}
            </CardContent>
          </Card>

          {form.papel === 'admin' ? (
            <div className="flex items-start gap-3 rounded-sm border border-fx-azul/30 bg-fx-nevoa/50 px-4 py-3.5 text-sm text-fx-marinho">
              <Shield className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Este perfil possui acesso institucional completo a todos os setores e módulos do
                sistema.
              </span>
            </div>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Escopo de Atuação</CardTitle>
                  <CardDescription>
                    Selecione o setor principal e, no caso de Supervisor, os demais setores sob sua
                    supervisão.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="setor">
                      {form.papel === 'supervisor'
                        ? 'Setor Principal *'
                        : form.papel === 'coordenador'
                          ? 'Setor de Atuação *'
                          : 'Setor Vinculado *'}
                    </Label>
                    {!customPrimarySectorMode ? (
                      <select
                        id="setor"
                        value={form.setor}
                        onChange={(event) => {
                          if (event.target.value === CUSTOM_SECTOR_VALUE) {
                            setCustomPrimarySectorMode(true)
                            updateField('setor', '')
                            return
                          }
                          updateField('setor', event.target.value)
                        }}
                        className="flex h-10 w-full rounded-sm border border-fx-linha bg-white px-3 py-2 text-sm text-fx-grafite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fx-azul"
                        required
                      >
                        <option value="">Selecione um setor...</option>
                        {primarySectorOptions.map((sector) => (
                          <option key={sector} value={sector}>
                            {sector}
                          </option>
                        ))}
                        <option value={CUSTOM_SECTOR_VALUE}>+ Cadastrar novo setor...</option>
                      </select>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          id="setor"
                          value={form.setor}
                          onChange={(event) => updateField('setor', event.target.value)}
                          placeholder="Digite o nome do novo setor"
                          required
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCustomPrimarySectorMode(false)}
                        >
                          Usar lista
                        </Button>
                      </div>
                    )}
                  </div>

                  {form.papel === 'supervisor' && (
                    <div className="space-y-2 sm:col-span-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="setor-vinculado">
                          Setores Adicionais Supervisionados
                        </Label>
                        {remainingLinkedSectorOptions.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              updateField(
                                'setores_vinculados',
                                Array.from(
                                  new Set([
                                    ...form.setores_vinculados,
                                    ...remainingLinkedSectorOptions,
                                  ]),
                                ),
                              )
                            }
                            className="text-xs font-medium text-fx-azul hover:underline"
                          >
                            Vincular todos os setores
                          </button>
                        )}
                      </div>

                      {!customLinkedSectorMode ? (
                        <div className="flex gap-2">
                          <select
                            id="setor-vinculado"
                            value={selectedLinkedSector}
                            onChange={(event) =>
                              handleSelectLinkedSectorChange(event.target.value)
                            }
                            className="flex h-10 w-full rounded-sm border border-fx-linha bg-white px-3 py-2 text-sm text-fx-grafite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fx-azul"
                          >
                            <option value="">
                              Selecione um setor na lista para vincular...
                            </option>
                            {remainingLinkedSectorOptions.map((sector) => (
                              <option key={sector} value={sector}>
                                {sector}
                              </option>
                            ))}
                            <option value={CUSTOM_SECTOR_VALUE}>
                              + Digitar outro setor não listado...
                            </option>
                          </select>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            id="setor-vinculado"
                            value={customLinkedSectorText}
                            onChange={(event) => setCustomLinkedSectorText(event.target.value)}
                            placeholder="Digite o nome do setor e pressione Enter"
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault()
                                handleAddCustomLinkedSector()
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label="Adicionar setor"
                            onClick={handleAddCustomLinkedSector}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setCustomLinkedSectorMode(false)
                              setCustomLinkedSectorText('')
                            }}
                          >
                            Voltar à lista
                          </Button>
                        </div>
                      )}

                      {form.setores_vinculados.length > 0 && (
                        <ul className="flex flex-wrap gap-2 pt-1" aria-label="Setores adicionados">
                          {form.setores_vinculados.map((sector) => (
                            <li
                              key={sector}
                              className="inline-flex items-center gap-1 rounded-sm border border-fx-linha bg-fx-nevoa/40 pl-2.5 pr-1 py-1 text-xs text-fx-marinho"
                            >
                              {sector}
                              <button
                                type="button"
                                onClick={() =>
                                  updateField(
                                    'setores_vinculados',
                                    form.setores_vinculados.filter((item) => item !== sector),
                                  )
                                }
                                className="rounded-sm p-1 hover:bg-fx-nevoa focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fx-azul"
                                aria-label={`Remover setor ${sector}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Permissões Complementares</CardTitle>
                  <CardDescription>
                    As opções são limitadas ao perfil selecionado.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {PERMISSOES_POR_PERFIL[form.papel].map(({ id, label }) => (
                    <label
                      key={id}
                      className="flex min-h-10 items-center gap-3 rounded-sm border border-fx-linha px-3 py-2 text-sm text-fx-grafite"
                    >
                      <input
                        type="checkbox"
                        checked={form.permissoes.includes(id)}
                        onChange={() => togglePermission(id)}
                        className="h-4 w-4 shrink-0 accent-fx-azul"
                      />
                      {label}
                    </label>
                  ))}
                </CardContent>
              </Card>
            </>
          )}

          <Card>
            <CardContent className="flex flex-col-reverse gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={cancel}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileCheck2 className="h-4 w-4" />
                )}
                {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Cadastrar Usuário'}
              </Button>
            </CardContent>
          </Card>
        </form>
        )}
      </main>
    </div>
  )
}
