import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from './Button'
import { LogoUcn } from './LogoUcn'
import { PortalIcon } from './PortalIcon'
import { ThemeToggle } from './ThemeToggle'

export function Navbar() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const docente=useLocation().pathname.startsWith('/docente')
  const general=useLocation().pathname.startsWith('/general')
  const unidad=useLocation().pathname.startsWith('/unidad')
  const portales=[{rol:'ADMIN_GENERAL',ruta:'/general',nombre:'General'},{rol:'ESTUDIANTE',ruta:'/',nombre:'Estudiante'},{rol:'DOCENTE',ruta:'/docente',nombre:'Docente'},{rol:'ADMIN_UNIDAD',ruta:'/unidad',nombre:'Unidad'}].filter(p=>usuario?.roles.includes(p.rol))

  function cerrarSesion() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="portal-topbar">
      <div className="portal-topbar-inner">
        <Link to={general?'/general':unidad?'/unidad':docente?'/docente':'/'} className="portal-brand" aria-label="Banner UCN, inicio">
          <LogoUcn className="h-9 w-9" />
          <div>
            <p className="portal-brand-name">Banner <span>UCN</span></p>
            <p className="portal-brand-caption">Universidad Católica del Norte</p>
          </div>
        </Link>
        <span className="portal-context">{general?'Administración General':unidad?'Administración de Unidad':docente?'Portal docente':'Portal del estudiante'}</span>

        <div className="flex items-center gap-3">
          {portales.length>1&&<nav aria-label="Cambiar perfil" className="flex flex-wrap gap-2">{portales.map(p=><Link key={p.rol} className="text-sm underline" to={p.ruta}>{p.nombre}</Link>)}</nav>}
          {usuario ? (
            <span className="portal-account"><span className="portal-avatar" aria-hidden="true">{usuario.correo.slice(0,1).toUpperCase()}</span><span>{usuario.correo}</span></span>
          ) : null}
          <ThemeToggle />
          <Button variante="secondary" onClick={cerrarSesion}>
            <PortalIcon name="logout" /> Salir
          </Button>
        </div>
      </div>
    </header>
  )
}
