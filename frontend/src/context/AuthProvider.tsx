import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { getMe, login as loginRequest } from '../api/auth'
import { setUnauthorizedHandler, TOKEN_KEY, USER_KEY } from '../api/axios'
import type { Usuario } from '../types/api'
import { AuthContext } from './AuthContext'
import type { AuthContextValue } from './AuthContext'

function leerUsuarioGuardado(): Usuario | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as Usuario
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [usuario, setUsuario] = useState<Usuario | null>(() => leerUsuarioGuardado())
  const [inicializando, setInicializando] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)))

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUsuario(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  useEffect(() => {
    const tokenGuardado = localStorage.getItem(TOKEN_KEY)

    if (!tokenGuardado) {
      return
    }

    let cancelado = false

    getMe()
      .then((data) => {
        if (!cancelado) {
          setUsuario(data.usuario)
        }
      })
      .catch(() => {
        // Un 401 ya limpia el token y cierra sesión mediante el interceptor de axios.
        // Ante errores de red o del servidor se conserva la sesión guardada.
      })
      .finally(() => {
        if (!cancelado) {
          setInicializando(false)
        }
      })

    return () => {
      cancelado = true
    }
  }, [])

  const login = useCallback(async (correo: string, password: string) => {
    const data = await loginRequest(correo, password)
    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(USER_KEY, JSON.stringify(data.usuario))
    setToken(data.token)
    setUsuario(data.usuario)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      usuario,
      token,
      autenticado: Boolean(token),
      inicializando,
      login,
      logout,
    }),
    [usuario, token, inicializando, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
