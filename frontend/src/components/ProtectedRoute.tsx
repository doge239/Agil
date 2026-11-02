import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FullScreenLoader } from './FullScreenLoader'

export function ProtectedRoute({roles=['ESTUDIANTE','DOCENTE']}:{roles?:string[]}) {
  const { autenticado, inicializando, usuario, logout } = useAuth()

  if (inicializando) {
    return <FullScreenLoader />
  }

  if (!autenticado) {
    return <Navigate to="/login" replace />
  }

  if (!usuario?.roles.some(r=>roles.includes(r))) {
    if(usuario?.roles.includes('DOCENTE'))return <Navigate to="/docente" replace/>
    if(usuario?.roles.includes('ESTUDIANTE'))return <Navigate to="/" replace/>
    return <div className="p-8" role="alert">Tu perfil no tiene acceso a este portal. <button className="underline" onClick={logout}>Volver al inicio de sesión</button></div>
  }
  return <Outlet />
}
