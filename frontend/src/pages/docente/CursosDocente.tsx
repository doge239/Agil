import { Link } from 'react-router-dom'
import { getCursosDocente } from '../../api/docente'
import { usePeriodo } from '../../context/periodo'
import { useFetch } from '../../hooks/useFetch'
import { PageHeader } from '../../components/PageHeader'
import { ErrorBanner } from '../../components/ErrorBanner'
import { EmptyState } from '../../components/EmptyState'
import { Spinner } from '../../components/Spinner'
import { Badge } from '../../components/Badge'
import { formatHora } from '../../utils/format'
export function CursosDocente() {
  const periodo=usePeriodo()
  const {data,loading,error,refetch}=useFetch(()=>getCursosDocente(periodo),[periodo])
  return <div><PageHeader titulo="Mis cursos" descripcion="Cursos asignados a tu perfil docente. Consulta inscritos, registra notas y controla asistencia."/>
    {loading?<Spinner/>:error?<ErrorBanner mensaje={error} onRetry={refetch}/>:!data?.cursos.length?<EmptyState mensaje="No tienes cursos asignados en este período."/>:
      <div className="grid gap-4 lg:grid-cols-2">{data.cursos.map(c=><article key={c.id_curso} className="rounded-xl border border-border bg-surface p-5">
        <Badge estado={c.estado}/><h2 className="mt-3 text-lg font-semibold">{c.codigo} · {c.nombre}</h2>
        <p className="my-2 text-sm">Sección {c.seccion} · {c.anio}/{c.semestre} · {c.inscritos} estudiantes</p>
        <ul className="mb-4 text-sm text-muted">{c.horarios.map((h,i)=><li key={i}>{h.dia_semana} {formatHora(h.hora_inicio)}–{formatHora(h.hora_fin)} · {h.sala??'Sala por asignar'}</li>)}</ul>
        <Link className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg" to={`/docente/cursos/${c.id_curso}`}>Gestionar curso</Link>
      </article>)}</div>}
  </div>
}
