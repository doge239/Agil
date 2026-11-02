import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from './Button'
import { LogoUcn } from './LogoUcn'

export function Navbar() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const docente=useLocation().pathname.startsWith('/docente')

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
            <p className="text-xs text-muted">Portal {docente?'docente':'del estudiante'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {usuario?.roles.includes('DOCENTE')&&usuario.roles.includes('ESTUDIANTE')&&<Link className="text-sm underline" to={docente?'/':'/docente'}>Cambiar a {docente?'Estudiante':'Docente'}</Link>}
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
