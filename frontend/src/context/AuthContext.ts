import { createContext, useContext } from 'react'
import type { Usuario } from '../types/api'

export interface AuthContextValue {
  usuario: Usuario | null
  token: string | null
  autenticado: boolean
  inicializando: boolean
  login: (correo: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return context
}
