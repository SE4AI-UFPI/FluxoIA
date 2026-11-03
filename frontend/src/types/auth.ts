export type PapelUsuario = 'servidor' | 'validador' | 'admin'

export interface Usuario {
  id: string
  email: string
  nome: string
  papel: PapelUsuario
  secretaria: string
  setor: string
  cargo: string
  matricula: string | null
  is_active: boolean
  criado_em: string
  atualizado_em: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface AuthTokensResponse {
  access: string
  refresh: string
  user: Usuario
}
