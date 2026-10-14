import { Link } from 'react-router-dom'
import { getCarreras } from '../api/catalogo'
import { Badge } from '../components/Badge'
import { DataTable } from '../components/DataTable'
import type { Column } from '../components/DataTable'
import { EmptyState } from '../components/EmptyState'
import { ErrorBanner } from '../components/ErrorBanner'
import { PageHeader } from '../components/PageHeader'
import { Spinner } from '../components/Spinner'
import { useFetch } from '../hooks/useFetch'
import type { Carrera } from '../types/api'

export function Carreras() {
  const { data, loading, error, refetch } = useFetch(() => getCarreras(), [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted">
        <Spinner /> Cargando carreras…
      </div>
    )
  }

  if (error) {
    return <ErrorBanner mensaje={error} onRetry={refetch} />
  }

  const carreras = data?.carreras ?? []

  const columnas: Column<Carrera>[] = [
    { key: 'codigo', header: 'Código', render: (fila) => fila.codigo },
    { key: 'nombre', header: 'Carrera', render: (fila) => fila.nombre },
    { key: 'unidad', header: 'Unidad académica', render: (fila) => fila.unidad_academica },
    { key: 'estado', header: 'Estado', render: (fila) => <Badge estado={fila.estado} /> },
    {
      key: 'accion',
      header: '',
      className: 'text-right',
      render: (fila) => (
        <Link
          to={`/carreras/${fila.id_carrera}`}
          className="font-medium text-primary hover:underline"
        >
          Ver malla
        </Link>
      ),
    },
  ]

  return (
    <div>
      <PageHeader titulo="Carreras" descripcion="Oferta académica disponible." />
      {carreras.length === 0 ? (
        <EmptyState mensaje="No hay carreras registradas." />
      ) : (
        <DataTable columns={columnas} rows={carreras} getRowKey={(fila) => fila.id_carrera} />
      )}
    </div>
  )
}
