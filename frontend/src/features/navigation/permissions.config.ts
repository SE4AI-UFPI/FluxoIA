import type { PapelUsuario } from '@/types/auth'
import type { MenuPermission, NavigationUser } from './navigation.types'

const PERMISSIONS_BY_ROLE: Record<PapelUsuario, MenuPermission[]> = {
  admin: ['dashboard:view', 'reports:view', 'users:manage'],
  supervisor: [
    'dashboard:view',
    'processes:view',
    'governance:validate',
    'indicators:view',
    'reports:view',
  ],
  validador: [
    'dashboard:view',
    'processes:view',
    'governance:validate',
    'indicators:view',
    'reports:view',
  ],
  coordenador: [
    'dashboard:view',
    'processes:view',
    'indicators:view',
    'reports:view',
  ],
  operacional: ['dashboard:view', 'processes:view'],
  servidor: ['dashboard:view', 'processes:create', 'processes:view'],
}

const COMPLEMENTARY_PERMISSION_MAP: Record<string, MenuPermission[]> = {
  acessar_dashboard: ['dashboard:view'],
  responder_entrevistas_guiadas: ['processes:create'],
  gerar_editar_diagramas_institucionais: ['processes:create', 'processes:view'],
  exportar_artefatos: ['processes:view'],
  consultar_processos: ['processes:view'],
  aprovar_fluxos: ['governance:validate'],
  assinar_documentos: ['governance:validate'],
  homologar_processos: ['governance:validate'],
  visualizar_relatorios: ['reports:view'],
  gerenciar_indicadores: ['indicators:view'],
}

export function getUserMenuPermissions(user: NavigationUser): Set<MenuPermission> {
  const permissions = new Set(PERMISSIONS_BY_ROLE[user.papel])
  if (user.papel === 'admin') return permissions

  for (const complementaryPermission of user.permissoes ?? []) {
    for (const permission of COMPLEMENTARY_PERMISSION_MAP[complementaryPermission] ?? []) {
      permissions.add(permission)
    }
  }

  return permissions
}

export function canAccessMenu(user: NavigationUser, permission: MenuPermission): boolean {
  return getUserMenuPermissions(user).has(permission)
}