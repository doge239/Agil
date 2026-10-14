import { getHorario } from '../api/academico'
import { DataTable } from '../components/DataTable'
import type { Column } from '../components/DataTable'
import { EmptyState } from '../components/EmptyState'
import { ErrorBanner } from '../components/ErrorBanner'
import { PageHeader } from '../components/PageHeader'
import { Spinner } from '../components/Spinner'
import { useAsignaturasMap } from '../hooks/useAsignaturasMap'
import { useFetch } from '../hooks/useFetch'
import type { HorarioItem } from '../types/api'
import { formatHora } from '../utils/format'

export function Horario() {
  const { data, loading, error, refetch } = useFetch(() => getHorario(), [])
  const asignaturas = useAsignaturasMap()

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted">
        <Spinner /> Cargando horario…
      </div>
    )
  }

  if (error) {
    return <ErrorBanner mensaje={error} onRetry={refetch} />
  }

  const horario = data?.horario ?? []

  const columnas: Column<HorarioItem>[] = [
    { key: 'dia', header: 'Día', render: (fila) => fila.dia_semana },
    {
      key: 'hora',
      header: 'Horario',
      render: (fila) => `${formatHora(fila.hora_inicio)} - ${formatHora(fila.hora_fin)}`,
    },
    {
      key: 'asignatura',
      header: 'Asignatura',
      render: (fila) => asignaturas.get(fila.id_asignatura)?.nombre ?? `Asignatura #${fila.id_asignatura}`,
    },
    { key: 'seccion', header: 'Sección', render: (fila) => fila.seccion },
    { key: 'sala', header: 'Sala', render: (fila) => fila.sala ?? '—' },
  ]

  return (
    <div>
      <PageHeader titulo="Horario" descripcion="Bloques de clases del período actual." />
      {horario.length === 0 ? (
        <EmptyState mensaje="No hay bloques de horario registrados." />
      ) : (
        <DataTable columns={columnas} rows={horario} getRowKey={(fila, i) => `${fila.id_curso}-${i}`} />
      )}
    </div>
  )
}
