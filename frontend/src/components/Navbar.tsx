import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from './Button'

export function Navbar() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()

  function cerrarSesion() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-fg">
            UCN
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-text">Banner UCN</p>
            <p className="text-xs text-muted">Portal del estudiante</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
