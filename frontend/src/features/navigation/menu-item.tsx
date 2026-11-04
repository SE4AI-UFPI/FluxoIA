import type { MouseEvent } from 'react'
import { NavLink } from 'react-router-dom'
import type { MenuConfigItem } from './navigation.types'

export function MenuItem({
  item,
  onNavigate,
}: {
  item: MenuConfigItem
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void
}) {
  const Icon = item.icon

  return (
    <NavLink
      to={item.path}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex min-h-9 items-center gap-2.5 rounded-sm px-2.5 py-2 text-xs leading-snug transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fx-azul ${
          isActive
            ? 'bg-fx-azul text-fx-papel'
            : 'text-fx-marinho hover:bg-fx-nevoa/60'
        }`
      }
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{item.label}</span>
    </NavLink>
  )
}