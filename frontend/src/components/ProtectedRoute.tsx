import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FullScreenLoader } from './FullScreenLoader'

export function ProtectedRoute() {
  const { autenticado, inicializando, usuario, logout } = useAuth()

  if (inicializando) {
    return <FullScreenLoader />
  }

  if (!autenticado) {
    return <Navigate to="/login" replace />
  }

  if (!usuario?.roles.includes('ESTUDIANTE')) return <div className="p-8" role="alert">Este portal requiere el perfil Estudiante. <button className="underline" onClick={logout}>Volver al inicio de sesión</button></div>
  return <Outlet />
}
