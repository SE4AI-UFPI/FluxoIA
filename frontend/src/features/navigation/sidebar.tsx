import { useAuth } from '@/contexts/AuthContext'
import { MENU_ITEMS, MENU_SECTION_LABEL } from './menu.config'
import { canAccessMenu } from './permissions.config'
import { MenuItem } from './menu-item'

export function Sidebar({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <>{children}</>

  const visibleItems = MENU_ITEMS.filter((item) => canAccessMenu(user, item.permission))

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-44 border-r border-fx-linha bg-fx-fundo px-2 py-5 lg:block">
        <nav aria-label={MENU_SECTION_LABEL}>
          <p className="mb-2 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-fx-cinza">
            {MENU_SECTION_LABEL}
          </p>
          <ul className="space-y-1">
            {visibleItems.map((item) => (
              <li key={item.id}>
                <MenuItem item={item} />
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <details className="border-b border-fx-linha bg-fx-fundo px-4 py-2 lg:hidden">
        <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-wider text-fx-cinza focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fx-azul">
          {MENU_SECTION_LABEL}
        </summary>
        <nav aria-label={MENU_SECTION_LABEL} className="pt-2">
          <ul className="grid gap-1 sm:grid-cols-2">
            {visibleItems.map((item) => (
              <li key={item.id}>
                <MenuItem
                  item={item}
                  onNavigate={(event) => {
                    const details = event.currentTarget.closest('details')
                    if (details) details.open = false
                  }}
                />
              </li>
            ))}
          </ul>
        </nav>
      </details>

      <div className="min-w-0 lg:ml-44">{children}</div>
    </>
  )
}