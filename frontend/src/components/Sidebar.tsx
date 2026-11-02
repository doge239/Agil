import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '../utils/cn'
import { getNavItems } from './navItems'
import { PortalIcon } from './PortalIcon'
import { iconoRuta } from '../utils/portalIcons'

export function Sidebar() {
  const [contraida, setContraida] = useState(() => {
    try { return localStorage.getItem('banner_sidebar_collapsed') === 'true' } catch { return false }
  })
  function alternarBarra() {
    const siguiente = !contraida
    setContraida(siguiente)
    try { localStorage.setItem('banner_sidebar_collapsed', String(siguiente)) } catch { /* La barra sigue funcionando sin almacenamiento. */ }
  }
  const items=getNavItems(useLocation().pathname)
  return (
    <div className={`portal-sidebar-slot ${contraida ? 'is-collapsed' : ''}`}>
    <aside className={`portal-sidebar ${contraida ? 'is-collapsed' : ''}`} aria-label="Barra lateral">
      <div className="portal-sidebar-inner glass-panel">
      <div className="portal-sidebar-header"><span className="portal-sidebar-mark"><PortalIcon name="graduation" /></span><p className="portal-nav-heading">MI ESPACIO<br />ACADÉMICO</p></div>
      <button type="button" className="portal-sidebar-toggle" onClick={alternarBarra} aria-expanded={!contraida} aria-controls="navegacion-lateral" aria-label={contraida ? 'Expandir barra lateral' : 'Contraer barra lateral'} title={contraida ? 'Expandir barra lateral' : 'Contraer barra lateral'}><PortalIcon name="chevron" /></button>
      <nav id="navegacion-lateral" aria-label="Navegación principal" className="portal-navigation">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            aria-label={item.label}
            end={['/','/docente','/unidad'].includes(item.to)}
            className={({ isActive }) =>
              cn(
                'portal-nav-link',
                isActive
                  ? 'is-active'
                  : '',
              )
            }
          >
            <PortalIcon name={iconoRuta(item.to)} /><span className="portal-nav-label">{item.label}</span>{contraida && <span className="portal-nav-tooltip" aria-hidden="true">{item.label}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="portal-sidebar-footer" aria-label="Sesión activa"><span className="portal-online-dot" /><span className="portal-nav-label">Sesión activa</span><PortalIcon name="shield" /></div>
      </div>
    </aside>
    </div>
  )
}
