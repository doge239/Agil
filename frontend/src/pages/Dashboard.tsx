import { Link } from 'react-router-dom'
import { getMiPerfil } from '../api/usuarios'
import type { CSSProperties } from 'react'
import { PortalIcon } from '../components/PortalIcon'
import { iconoRuta } from '../utils/portalIcons'
import { getAvance } from '../api/estudiante'
import { getHorario } from '../api/academico'
import { usePeriodo } from '../context/periodo'
import { useAuth } from '../context/AuthContext'
import { useFetch } from '../hooks/useFetch'

const accesos = [
  { to:'/inscripcion',titulo:'Inscripción',descripcion:'Oferta de cursos y cupos disponibles' },
  { to:'/solicitudes',titulo:'Solicitudes',descripcion:'Restricciones y seguimiento de levantamientos' },
  { to:'/avance',titulo:'Avance curricular',descripcion:'Progreso acumulado en tu plan de estudios' },
  { to:'/encuestas',titulo:'Encuesta docente',descripcion:'Evalúa la docencia de tus cursos' },
  { to:'/certificados',titulo:'Certificados',descripcion:'Documentos académicos de demostración' },
  { to: '/perfil', titulo: 'Mi perfil', descripcion: 'Datos personales y académicos' },
  { to: '/asignaturas', titulo: 'Mis asignaturas', descripcion: 'Ramos inscritos este semestre' },
  { to: '/horario', titulo: 'Horario', descripcion: 'Bloques, días y salas de clases' },
  { to: '/notas', titulo: 'Notas', descripcion: 'Calificaciones por evaluación' },
  { to: '/asistencia', titulo: 'Asistencia', descripcion: 'Registro de clases asistidas' },
  { to: '/carreras', titulo: 'Carreras', descripcion: 'Oferta académica y mallas' },
]

export function Dashboard() {
  const { usuario } = useAuth()
  const { data } = useFetch(() => getMiPerfil(), [])
  const { data: avance } = useFetch(getAvance, [])
  const periodo = usePeriodo()
  const { data: horario } = useFetch(() => getHorario(periodo), [periodo])

  const nombre = data?.perfil.nombres ?? usuario?.correo ?? 'estudiante'

  return (
    <div className="dashboard">
      <section className="dashboard-hero">
        <div className="dashboard-hero-content">
          <span className="page-eyebrow">TU UNIVERSIDAD, CONTIGO</span>
          <h1>Hola, {nombre}.</h1>
          <p>Tu semestre, en un solo lugar. Consulta tu horario, sigue tu avance y encuentra lo que necesitas para continuar.</p>
          <div className="dashboard-hero-actions"><Link to="/horario">Ver mi horario <PortalIcon name="arrow" /></Link><Link to="/avance">Mi avance curricular <PortalIcon name="arrow" /></Link></div>
        </div>
      </section>
      <div className="dashboard-featured">
        <Link to="/avance" className="dashboard-feature glass-panel">
          <div><small>Tu recorrido</small><h2>Un paso más cerca</h2><p>{avance ? `${avance.asignaturas_aprobadas} de ${avance.asignaturas_totales} ramos aprobados` : 'Explora el progreso en tu plan de estudios'}</p><span className="dashboard-feature-link">Ver avance curricular <PortalIcon name="arrow" /></span></div>
          <div className="dashboard-ring" style={{ '--progreso': `${avance?.porcentaje_asignaturas ?? 0}%` } as CSSProperties}><strong>{avance ? `${avance.porcentaje_asignaturas}%` : '—'}</strong></div>
        </Link>
        <Link to="/horario" className="dashboard-feature glass-panel">
          <div><small>Organiza tu semana</small><h2>Todo a su tiempo</h2><p>{horario ? `${horario.horario.length} sesiones en el período seleccionado` : 'Días, bloques y salas de tus asignaturas'}</p><span className="dashboard-feature-link">Consultar horario <PortalIcon name="arrow" /></span></div>
          <span className="dashboard-calendar-icon"><PortalIcon name="calendar" /></span>
        </Link>
      </div>
      <div className="dashboard-section-title"><h2>Explora tu portal</h2><span>Todo lo que necesitas, a un clic</span></div>
      <div className="dashboard-accesses">
        {accesos.filter(a=>!['/avance','/horario'].includes(a.to)).map((acceso) => (
          <Link
            key={acceso.to}
            to={acceso.to}
            className="dashboard-access glass-panel"
          >
            <span className="dashboard-access-icon"><PortalIcon name={iconoRuta(acceso.to)} /></span>
            <div><h3>{acceso.titulo}</h3><p>{acceso.descripcion}</p></div>
          </Link>
        ))}
      </div>
    </div>
  )
}
