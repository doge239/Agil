import { getAsignaturas } from '../api/academico'
import { DataTable } from '../components/DataTable'
import type { Column } from '../components/DataTable'
import { EmptyState } from '../components/EmptyState'
import { ErrorBanner } from '../components/ErrorBanner'
import { PageHeader } from '../components/PageHeader'
import { Spinner } from '../components/Spinner'
import { useFetch } from '../hooks/useFetch'
import type { AsignaturaInscrita } from '../types/api'

export function MisAsignaturas() {
  const { data, loading, error, refetch } = useFetch(() => getAsignaturas(), [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted">
        <Spinner /> Cargando asignaturas…
      </div>
    )
  }

  if (error) {
    return <ErrorBanner mensaje={error} onRetry={refetch} />
  }

  const asignaturas = data?.asignaturas ?? []

  const columnas: Column<AsignaturaInscrita>[] = [
    { key: 'codigo', header: 'Código', render: (fila) => fila.codigo ?? '—' },
    { key: 'nombre', header: 'Asignatura', render: (fila) => fila.nombre ?? '—' },
    { key: 'creditos', header: 'Créditos', render: (fila) => fila.creditos ?? '—' },
    { key: 'seccion', header: 'Sección', render: (fila) => fila.seccion },
  ]

  return (
    <div>
      <PageHeader
        titulo="Mis asignaturas"
        descripcion="Ramos en los que estás inscrito este período."
      />
      {asignaturas.length === 0 ? (
        <EmptyState mensaje="No tienes asignaturas inscritas." />
      ) : (
        <DataTable
          columns={columnas}
          rows={asignaturas}
          getRowKey={(fila) => fila.id_curso}
        />
      )}
    </div>
  )
}
