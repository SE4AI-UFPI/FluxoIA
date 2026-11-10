import { apiClient } from '@/services/apiClient'
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
  password?: string
}

export type AtualizarUsuarioPayload = Partial<CriarUsuarioPayload>

function extractErrorMessage(data: unknown): string {
  if (!data || typeof data !== 'object') return 'Não foi possível salvar o usuário.'

  const errors = data as Record<string, unknown>
  const firstError = Object.values(errors).find((value) => Array.isArray(value) || typeof value === 'string')
  if (Array.isArray(firstError) && typeof firstError[0] === 'string') return firstError[0]
  if (typeof firstError === 'string') return firstError
  return 'Não foi possível salvar o usuário.'
}

export const usersService = {
  async list(): Promise<Usuario[]> {
    return apiClient.get<Usuario[]>('/api/usuarios/')
  },

  async get(id: string): Promise<Usuario> {
    return apiClient.get<Usuario>(`/api/usuarios/${id}/`)
  },

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

  async update(id: string, payload: AtualizarUsuarioPayload): Promise<Usuario> {
    const access = tokenStorage.getAccess()
    if (!access) throw new Error('Sessão não autenticada.')

    const response = await fetch(`/api/usuarios/${id}/`, {
      method: 'PATCH',
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

  async updateStatus(id: string, is_active: boolean): Promise<Usuario> {
    return apiClient.patch<Usuario>(`/api/usuarios/${id}/`, { is_active })
  },

  async remove(id: string): Promise<void> {
    return apiClient.delete(`/api/usuarios/${id}/`)
  },
}