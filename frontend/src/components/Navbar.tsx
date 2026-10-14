import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Button } from './Button'

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  )
}

export function Navbar() {
  const { usuario, logout } = useAuth()
  const { tema, toggleTema } = useTheme()
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
          <button
            type="button"
            onClick={toggleTema}
            aria-label="Cambiar tema"
            className="rounded-lg border border-border p-2 text-muted transition-colors hover:bg-background hover:text-text"
          >
            {tema === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
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
