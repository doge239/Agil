import { useMemo } from 'react'
import { getNotas } from '../api/academico'
import { DataTable } from '../components/DataTable'
import type { Column } from '../components/DataTable'
import { EmptyState } from '../components/EmptyState'
import { ErrorBanner } from '../components/ErrorBanner'
import { PageHeader } from '../components/PageHeader'
import { Spinner } from '../components/Spinner'
import { useAsignaturasMap } from '../hooks/useAsignaturasMap'
import { useFetch } from '../hooks/useFetch'
import type { NotaItem } from '../types/api'
import { formatNota, formatPorcentaje } from '../utils/format'

const SIN_NOTAS: NotaItem[] = []

export function Notas() {
  const { data, loading, error, refetch } = useFetch(() => getNotas(), [])
  const asignaturas = useAsignaturasMap()

  const notas = data?.notas ?? SIN_NOTAS

  const resumen = useMemo(() => {
    const mapa = new Map<number, { ponderacion: number; suma: number }>()
    notas.forEach((nota) => {
      const actual = mapa.get(nota.id_asignatura) ?? { ponderacion: 0, suma: 0 }
      const porcentaje = Number(nota.porcentaje)
      actual.ponderacion += porcentaje
      actual.suma += Number(nota.nota) * porcentaje
      mapa.set(nota.id_asignatura, actual)
    })
    return Array.from(mapa.entries()).map(([id, valor]) => ({
      id_asignatura: id,
      promedio: valor.ponderacion > 0 ? valor.suma / valor.ponderacion : 0,
    }))
  }, [notas])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted">
        <Spinner /> Cargando notas…
      </div>
    )
  }

  if (error) {
    return <ErrorBanner mensaje={error} onRetry={refetch} />
  }

  const columnas: Column<NotaItem>[] = [
    {
      key: 'asignatura',
      header: 'Asignatura',
      render: (fila) =>
        asignaturas.get(fila.id_asignatura)?.nombre ?? `Asignatura #${fila.id_asignatura}`,
    },
    { key: 'evaluacion', header: 'Evaluación', render: (fila) => fila.evaluacion },
    {
      key: 'porcentaje',
      header: 'Ponderación',
      render: (fila) => formatPorcentaje(fila.porcentaje),
    },
    { key: 'nota', header: 'Nota', render: (fila) => formatNota(fila.nota) },
  ]

  return (
    <div>
      <PageHeader titulo="Notas" descripcion="Calificaciones registradas por evaluación." />

      {notas.length === 0 ? (
        <EmptyState mensaje="No hay calificaciones registradas." />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resumen.map((item) => (
              <div key={item.id_asignatura} className="rounded-xl border border-border bg-surface p-4">
                <p className="text-sm font-medium text-text">
                  {asignaturas.get(item.id_asignatura)?.nombre ?? `Asignatura #${item.id_asignatura}`}
                </p>
                <p className="mt-1 text-2xl font-bold text-primary">{formatNota(item.promedio)}</p>
                <p className="text-xs text-muted">Promedio ponderado</p>
              </div>
            ))}
          </div>

          <DataTable
            columns={columnas}
            rows={notas}
            getRowKey={(fila) => `${fila.id_curso}-${fila.id_evaluacion}`}
          />
        </div>
      )}
    </div>
  )
}
