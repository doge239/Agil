import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthProvider'
import { Asistencia } from './pages/Asistencia'
import { MarcarAsistenciaQr } from './pages/MarcarAsistenciaQr'
import { asistenciaQrHabilitada } from './config/funciones'
import { Carreras } from './pages/Carreras'
import { Dashboard } from './pages/Dashboard'
import { Horario } from './pages/Horario'
import { Login } from './pages/Login'
import { MallaCarrera } from './pages/MallaCarrera'
import { MiPerfil } from './pages/MiPerfil'
import { MisAsignaturas } from './pages/MisAsignaturas'
import { Notas } from './pages/Notas'
import { Inscripcion } from './pages/Inscripcion'
import { Solicitudes } from './pages/Solicitudes'
import { AvanceCurricular } from './pages/AvanceCurricular'
import { Encuestas } from './pages/Encuestas'
import { Certificados } from './pages/Certificados'
import { CursosDocente } from './pages/docente/CursosDocente'
import { CursoDocente } from './pages/docente/CursoDocente'
import { CursosUnidad } from './pages/unidad/CursosUnidad'
import { CursoUnidad } from './pages/unidad/CursoUnidad'
import { RestriccionesUnidad } from './pages/unidad/RestriccionesUnidad'
import { SolicitudesUnidad } from './pages/unidad/SolicitudesUnidad'
import { ResumenGeneral,PeriodosGeneral,RestriccionesGeneral,AuditoriaGeneral } from './pages/general/AdministracionGeneral'
import { CarrerasGeneral,AsignaturasGeneral,PlanesGeneral } from './pages/general/GestionCatalogo'
import { MallaGeneral } from './pages/general/MallaGeneral'
import { CursosGeneral } from './pages/general/CursosGeneral'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute roles={['ESTUDIANTE']} />}>
            <Route path="/asistencia/qr/:token" element={asistenciaQrHabilitada?<MarcarAsistenciaQr />:<Navigate to="/asistencia" replace />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/perfil" element={<MiPerfil />} />
              <Route path="/asignaturas" element={<MisAsignaturas />} />
              <Route path="/inscripcion" element={<Inscripcion />} />
              <Route path="/solicitudes" element={<Solicitudes />} />
              <Route path="/avance" element={<AvanceCurricular />} />
              <Route path="/encuestas" element={<Encuestas />} />
              <Route path="/certificados" element={<Certificados />} />
              <Route path="/horario" element={<Horario />} />
              <Route path="/notas" element={<Notas />} />
              <Route path="/asistencia" element={<Asistencia />} />
              <Route path="/carreras" element={<Carreras />} />
              <Route path="/carreras/:idCarrera" element={<MallaCarrera />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={['DOCENTE']} />}>
            <Route element={<Layout />}>
              <Route path="/docente" element={<CursosDocente/>}/>
              <Route path="/docente/perfil" element={<MiPerfil docente/>}/>
              <Route path="/docente/cursos/:idCurso" element={<CursoDocente/>}/>
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={['ADMIN_UNIDAD']} />}>
            <Route element={<Layout/>}>
              <Route path="/unidad" element={<CursosUnidad/>}/>
              <Route path="/unidad/cursos/:idCurso" element={<CursoUnidad/>}/>
              <Route path="/unidad/restricciones" element={<RestriccionesUnidad/>}/>
              <Route path="/unidad/solicitudes" element={<SolicitudesUnidad/>}/>
              <Route path="/unidad/perfil" element={<MiPerfil unidad/>}/>
            </Route>
          </Route>
          <Route element={<ProtectedRoute roles={['ADMIN_GENERAL']} />}>
            <Route element={<Layout/>}>
              <Route path="/general" element={<ResumenGeneral/>}/>
              <Route path="/general/carreras" element={<CarrerasGeneral/>}/>
              <Route path="/general/asignaturas" element={<AsignaturasGeneral/>}/>
              <Route path="/general/cursos" element={<CursosGeneral/>}/>
              <Route path="/general/carreras/:idCarrera/planes" element={<PlanesGeneral/>}/>
              <Route path="/general/planes/:idPlan" element={<MallaGeneral/>}/>
              <Route path="/general/periodos" element={<PeriodosGeneral/>}/>
              <Route path="/general/restricciones" element={<RestriccionesGeneral/>}/>
              <Route path="/general/solicitudes" element={<SolicitudesUnidad general/>}/>
              <Route path="/general/auditoria" element={<AuditoriaGeneral/>}/>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
