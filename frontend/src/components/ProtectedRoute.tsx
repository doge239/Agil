import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FullScreenLoader } from './FullScreenLoader'

export function ProtectedRoute() {
  const { autenticado, inicializando } = useAuth()

  if (inicializando) {
    return <FullScreenLoader />
  }

  if (!autenticado) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
