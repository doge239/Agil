import { NavLink } from 'react-router-dom'
import { cn } from '../utils/cn'
import { navItems } from './navItems'

export function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 md:block">
      <nav className="sticky top-20 flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-fg'
                  : 'text-muted hover:bg-surface hover:text-text',
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
