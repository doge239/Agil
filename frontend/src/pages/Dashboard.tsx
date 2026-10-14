import { Link } from 'react-router-dom'
import { getMiPerfil } from '../api/usuarios'
import { PageHeader } from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { useFetch } from '../hooks/useFetch'

const accesos = [
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

  const nombre = data?.perfil.nombres ?? usuario?.correo ?? 'estudiante'

  return (
    <div>
      <PageHeader titulo={`Hola, ${nombre}`} descripcion="Bienvenido al portal del estudiante." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accesos.map((acceso) => (
          <Link
            key={acceso.to}
            to={acceso.to}
            className="rounded-xl border border-border bg-surface p-5 shadow-sm transition-colors hover:border-primary"
          >
            <p className="font-semibold text-text">{acceso.titulo}</p>
            <p className="mt-1 text-sm text-muted">{acceso.descripcion}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
