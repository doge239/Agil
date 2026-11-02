import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '../utils/cn'
import { navItems, docenteNavItems } from './navItems'

export function Sidebar() {
  const items=useLocation().pathname.startsWith('/docente')?docenteNavItems:navItems
  return (
    <aside className="hidden w-56 shrink-0 md:block">
      <nav className="sticky top-20 flex flex-col gap-1 rounded-xl bg-surface p-3 shadow-sm">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/' || item.to === '/docente'}
            className={({ isActive }) =>
              cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-fg'
                  : 'text-muted hover:bg-background hover:text-text',
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
