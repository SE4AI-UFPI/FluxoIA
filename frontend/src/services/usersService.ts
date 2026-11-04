import { tokenStorage } from '@/services/authService'
import type { Usuario } from '@/types/auth'

export interface CriarUsuarioPayload {
  nome: string
  cpf: string
  email: string
  matricula: string
  cargo: string
  secretaria: string
  telefone: string
  setor: string
  setores_vinculados: string[]
  papel: 'admin' | 'supervisor' | 'coordenador' | 'operacional'
  permissoes: string[]
  is_active: boolean
  password: string
}

function extractErrorMessage(data: unknown): string {
  if (!data || typeof data !== 'object') return 'Não foi possível cadastrar o usuário.'

  const errors = data as Record<string, unknown>
  const firstError = Object.values(errors).find((value) => Array.isArray(value) || typeof value === 'string')
  if (Array.isArray(firstError) && typeof firstError[0] === 'string') return firstError[0]
  if (typeof firstError === 'string') return firstError
  return 'Não foi possível cadastrar o usuário.'
}

export const usersService = {
  async create(payload: CriarUsuarioPayload): Promise<Usuario> {
    const access = tokenStorage.getAccess()
    if (!access) throw new Error('Sessão não autenticada.')

    const response = await fetch('/api/usuarios/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error(extractErrorMessage(data))
    return data as Usuario
  },
}