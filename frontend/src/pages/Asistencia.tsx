import { getAsistencia } from '../api/academico'
import { usePeriodo } from '../context/periodo'
import { Badge } from '../components/Badge'
import { DataTable } from '../components/DataTable'
import type { Column } from '../components/DataTable'
import { EmptyState } from '../components/EmptyState'
import { ErrorBanner } from '../components/ErrorBanner'
import { PageHeader } from '../components/PageHeader'
import { Spinner } from '../components/Spinner'
import { useAsignaturasMap } from '../hooks/useAsignaturasMap'
import { useFetch } from '../hooks/useFetch'
import type { AsistenciaItem } from '../types/api'
import { formatFecha, formatHora } from '../utils/format'

export function Asistencia() {
  const periodo=usePeriodo()
  const { data, loading, error, refetch } = useFetch(() => getAsistencia(periodo), [periodo])
  const asignaturas = useAsignaturasMap()

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted">
        <Spinner /> Cargando asistencia…
      </div>
    )
  }

  if (error) {
    return <ErrorBanner mensaje={error} onRetry={refetch} />
  }

  const asistencia = data?.asistencia ?? []
  const resumen = [...new Set(asistencia.map(a=>a.id_curso))].map(id=> {
    const filas=asistencia.filter(a=>a.id_curso===id)
    const registradas=filas.filter(a=>a.estado!=='PENDIENTE').length
    const presentes=filas.filter(a=>a.estado==='PRESENTE').length
    return {id,id_asignatura:filas[0].id_asignatura,registradas,presentes}
  })

  const columnas: Column<AsistenciaItem>[] = [
    { key: 'fecha', header: 'Fecha', render: (fila) => formatFecha(fila.fecha) },
    {
      key: 'hora',
      header: 'Horario',
      render: (fila) => `${formatHora(fila.hora_inicio)} - ${formatHora(fila.hora_fin)}`,
    },
    {
      key: 'asignatura',
      header: 'Asignatura',
      render: (fila) =>
        asignaturas.get(fila.id_asignatura)?.nombre ?? `Asignatura #${fila.id_asignatura}`,
    },
    { key: 'estado', header: 'Estado', render: (fila) => <Badge estado={fila.estado} /> },
    { key: 'observacion', header: 'Observación', render: (fila) => fila.observacion ?? '—' },
  ]

  return (
    <div>
      <PageHeader titulo="Asistencia" descripcion="Registro de clases del período seleccionado." />
      <div className="mb-4 grid gap-3 sm:grid-cols-2">{resumen.map(r=><div key={r.id} className="rounded-lg bg-surface p-3"><p className="font-medium">{asignaturas.get(r.id_asignatura)?.nombre??`Asignatura #${r.id_asignatura}`} · Curso #{r.id}</p><p className="text-sm text-muted">{r.registradas?`${Math.round(100*r.presentes/r.registradas)}% de registros PRESENTE`:'Sin registros confirmados'} · {r.presentes}/{r.registradas}. No incluye pendientes en el denominador.</p></div>)}</div>
      <p className="mb-4 text-sm text-muted">Los registros pendientes no se consideran ausencias. Presentes: {asistencia.filter(a=>a.estado==='PRESENTE').length}; ausentes: {asistencia.filter(a=>a.estado==='AUSENTE').length}; pendientes: {asistencia.filter(a=>a.estado==='PENDIENTE').length}.</p>
      {asistencia.length === 0 ? (
        <EmptyState mensaje="No hay registros de asistencia." />
      ) : (
        <DataTable
          columns={columnas}
          rows={asistencia}
          getRowKey={(fila, i) => `${fila.id_curso}-${fila.fecha}-${i}`}
        />
      )}
    </div>
  )
}
