import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '../utils/cn'
import { navItems, docenteNavItems } from './navItems'

export function MobileNav() {
  const items=useLocation().pathname.startsWith('/docente')?docenteNavItems:navItems
  return (
    <div className="border-b border-border bg-surface md:hidden">
      <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/' || item.to === '/docente'}
            className={({ isActive }) =>
              cn(
                'whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                isActive ? 'bg-primary text-primary-fg' : 'text-muted hover:bg-background',
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
