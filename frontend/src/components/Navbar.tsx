import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from './Button'
import { LogoUcn } from './LogoUcn'

export function Navbar() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const docente=useLocation().pathname.startsWith('/docente')
  const unidad=useLocation().pathname.startsWith('/unidad')
  const portales=[{rol:'ESTUDIANTE',ruta:'/',nombre:'Estudiante'},{rol:'DOCENTE',ruta:'/docente',nombre:'Docente'},{rol:'ADMIN_UNIDAD',ruta:'/unidad',nombre:'Unidad'}].filter(p=>usuario?.roles.includes(p.rol))

  function cerrarSesion() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <LogoUcn className="h-9 w-9" />
          <div className="leading-tight">
            <p className="text-sm font-bold text-text">Banner UCN</p>
            <p className="text-xs text-muted">{unidad?'Administración de Unidad':docente?'Portal docente':'Portal del estudiante'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {portales.length>1&&<nav aria-label="Cambiar perfil" className="flex flex-wrap gap-2">{portales.map(p=><Link key={p.rol} className="text-sm underline" to={p.ruta}>{p.nombre}</Link>)}</nav>}
          {usuario ? (
            <span className="hidden text-sm text-muted sm:inline">{usuario.correo}</span>
          ) : null}
          <Button variante="secondary" onClick={cerrarSesion}>
            Salir
          </Button>
        </div>
      </div>
    </header>
  )
}
