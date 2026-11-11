import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate, useLocation } from 'react-router-dom'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../utils/errors'
import { LogoUcn } from '../components/LogoUcn'
import { FullScreenLoader } from '../components/FullScreenLoader'
import { PortalIcon } from '../components/PortalIcon'
import { ThemeToggle } from '../components/ThemeToggle'

export function Login() {
  const { login, autenticado, inicializando } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const destino = typeof location.state?.volverA === 'string' && location.state.volverA.startsWith('/asistencia/qr/') ? location.state.volverA : '/'
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  if (inicializando) {
    return <FullScreenLoader />
  }

  if (autenticado) {
    return <Navigate to={destino} replace />
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setCargando(true)

    try {
      await login(correo, password)
      navigate(destino, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="login-page">
      <ThemeToggle />
      <section className="login-story">
        <div className="login-story-brand"><LogoUcn /><div><p>Banner UCN</p><small>Universidad Católica del Norte</small></div></div>
        <span className="page-eyebrow">TU ESPACIO ACADÉMICO</span>
        <h2>Tu universidad.<br />Siempre contigo.</h2>
        <p>Un lugar para organizar tu semestre, conocer tu avance y dar el siguiente paso en tu carrera.</p>
        <div className="login-story-note">UNIVERSIDAD CATÓLICA DEL NORTE · PORTAL ACADÉMICO</div>
      </section>
      <div>
        <form
          onSubmit={onSubmit}
          className="login-form"
        >
          <div className="login-form-header"><span className="page-eyebrow">BIENVENIDO A BANNER UCN</span><h1>Inicia tu sesión</h1><p>Ingresa con tu cuenta institucional para continuar.</p></div>
          <Input
            label="Correo institucional"
            type="email"
            name="correo"
            autoComplete="username"
            placeholder="estudiante@ucn.cl"
            value={correo}
            onChange={(event) => setCorreo(event.target.value)}
            required
          />
          <Input
            label="Contraseña"
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {error ? (
            <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}

          <Button type="submit" cargando={cargando} className="w-full">
            Ingresar <PortalIcon name="arrow" />
          </Button>
          <p className="login-security"><PortalIcon name="shield" />Acceso personal a tu información académica</p>
        </form>
      </div>
    </div>
  )
}
