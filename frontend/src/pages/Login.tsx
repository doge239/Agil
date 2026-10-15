import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../utils/errors'
import { LogoUcn } from '../components/LogoUcn'

export function Login() {
  const { login, autenticado } = useAuth()
  const navigate = useNavigate()
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  if (autenticado) {
    return <Navigate to="/" replace />
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setCargando(true)

    try {
      await login(correo, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <LogoUcn className="h-14 w-14" />
          <div className="rounded-lg bg-surface px-4 py-2 text-center">
            <h1 className="text-xl font-bold text-text">Banner UCN</h1>
            <p className="text-sm text-muted">Portal del estudiante</p>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm"
        >
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
            Ingresar
          </Button>
        </form>
      </div>
    </div>
  )
}
