import {
  ChartNoAxesCombined,
  LayoutDashboard,
  MessageSquareText,
  ShieldCheck,
  UsersRound,
  Workflow,
} from 'lucide-react'
import type { MenuConfigItem } from './navigation.types'

export const MENU_SECTION_LABEL = 'Navegação do sistema'

export const MENU_ITEMS: MenuConfigItem[] = [
  {
    id: 'dashboard',
    label: 'Início / Dashboard',
    path: '/',
    icon: LayoutDashboard,
    permission: 'dashboard:view',
    end: true,
  },
  {
    id: 'process-map',
    label: 'Mapear Processo (IA)',
    path: '/processos/novo',
    icon: MessageSquareText,
    permission: 'processes:create',
  },
  {
    id: 'bpmn-viewer',
    label: 'Visualizador BPMN',
    path: '/bpmn',
    icon: Workflow,
    permission: 'processes:view',
  },
  {
    id: 'governance',
    label: 'Validação & Governança',
    path: '/governanca',
    icon: ShieldCheck,
    permission: 'governance:validate',
  },
  {
    id: 'indicators',
    label: 'Relatórios & Indicadores',
    path: '/indicadores',
    icon: ChartNoAxesCombined,
    permission: 'indicators:view',
  },
  {
    id: 'user-management',
    label: 'Gestão de Usuários',
    path: '/usuarios',
    icon: UsersRound,
    permission: 'users:manage',
  },
]