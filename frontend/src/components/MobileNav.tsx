import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '../utils/cn'
import { getNavItems } from './navItems'
import { PortalIcon } from './PortalIcon'
import { iconoRuta } from '../utils/portalIcons'

export function MobileNav() {
  const items=getNavItems(useLocation().pathname)
  return (
    <div className="portal-mobile-nav">
      <nav aria-label="Navegación móvil" className="flex gap-2 overflow-x-auto px-4 py-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={['/','/docente','/unidad'].includes(item.to)}
            className={({ isActive }) =>
              cn(
                'portal-nav-link whitespace-nowrap',
                isActive ? 'is-active' : '',
              )
            }
          >
            <PortalIcon name={iconoRuta(item.to)} />{item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
