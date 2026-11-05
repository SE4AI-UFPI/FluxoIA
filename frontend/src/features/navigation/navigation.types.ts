import type { LucideIcon } from 'lucide-react'
import type { PapelUsuario, Usuario } from '@/types/auth'

export type MenuId =
  | 'dashboard'
  | 'process-map'
  | 'bpmn-viewer'
  | 'governance'
  | 'indicators'
  | 'reports'
  | 'user-management'

export type MenuPermission =
  | 'dashboard:view'
  | 'processes:create'
  | 'processes:view'
  | 'governance:validate'
  | 'indicators:view'
  | 'reports:view'
  | 'users:manage'

export interface MenuConfigItem {
  id: MenuId
  label: string
  path: string
  icon: LucideIcon
  permission: MenuPermission
  end?: boolean
}

export type NavigationUser = Pick<Usuario, 'papel' | 'permissoes'> & {
  papel: PapelUsuario
}