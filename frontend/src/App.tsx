import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthProvider'
import { ThemeProvider } from './context/ThemeProvider'
import { Asistencia } from './pages/Asistencia'
import { Carreras } from './pages/Carreras'
import { Dashboard } from './pages/Dashboard'
import { Horario } from './pages/Horario'
import { Login } from './pages/Login'
import { MallaCarrera } from './pages/MallaCarrera'
import { MiPerfil } from './pages/MiPerfil'
import { MisAsignaturas } from './pages/MisAsignaturas'
import { Notas } from './pages/Notas'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/perfil" element={<MiPerfil />} />
                <Route path="/asignaturas" element={<MisAsignaturas />} />
                <Route path="/horario" element={<Horario />} />
                <Route path="/notas" element={<Notas />} />
                <Route path="/asistencia" element={<Asistencia />} />
                <Route path="/carreras" element={<Carreras />} />
                <Route path="/carreras/:idCarrera" element={<MallaCarrera />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
