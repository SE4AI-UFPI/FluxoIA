export type PapelUsuario =
  | 'admin'
  | 'supervisor'
  | 'coordenador'
  | 'operacional'

export const PAPEL_LABEL: Record<PapelUsuario, string> = {
  admin: 'Administrador',
  supervisor: 'Supervisor de Setor',
  coordenador: 'Coordenador',
  operacional: 'Usuário Operacional',
}

export interface Usuario {
  id: string
  email: string
  nome: string
  papel: PapelUsuario
  secretaria: string
  setor: string
  cargo: string
  matricula: string | null
  cpf: string | null
  telefone: string
  setores_vinculados: string[]
  permissoes: string[]
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
