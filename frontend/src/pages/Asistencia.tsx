import { getAsistencia } from '../api/academico'
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
  const { data, loading, error, refetch } = useFetch(() => getAsistencia(), [])
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
      <PageHeader titulo="Asistencia" descripcion="Registro de clases del período actual." />
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
