import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getMalla } from '../api/catalogo'
import { Badge } from '../components/Badge'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { ErrorBanner } from '../components/ErrorBanner'
import { PageHeader } from '../components/PageHeader'
import { Spinner } from '../components/Spinner'
import { useFetch } from '../hooks/useFetch'
import type { MallaItem } from '../types/api'

export function MallaCarrera() {
  const { idCarrera } = useParams<{ idCarrera: string }>()
  const id = Number(idCarrera)

  const { data, loading, error, refetch } = useFetch(() => getMalla(id), [id])

  const grupos = useMemo(() => {
    const mapa = new Map<number, MallaItem[]>()
    data?.malla.forEach((item) => {
      const lista = mapa.get(item.semestre) ?? []
      lista.push(item)
      mapa.set(item.semestre, lista)
    })
    return Array.from(mapa.entries()).sort((a, b) => a[0] - b[0])
  }, [data])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted">
        <Spinner /> Cargando malla…
      </div>
    )
  }

  if (error) {
    return <ErrorBanner mensaje={error} onRetry={refetch} />
  }

  const malla = data?.malla ?? []
  const cabecera = malla[0]

  return (
    <div>
      <Link to="/carreras" className="text-sm font-medium text-primary hover:underline">
        ← Volver a carreras
      </Link>

      <div className="mt-3">
        <PageHeader
          titulo={cabecera?.carrera ?? 'Malla curricular'}
          descripcion={cabecera ? `Plan ${cabecera.plan}` : undefined}
        />
      </div>

      {malla.length === 0 ? (
        <EmptyState mensaje="Esta carrera no tiene malla registrada." />
      ) : (
        <div className="flex flex-col gap-4">
          {grupos.map(([semestre, items]) => (
            <Card key={semestre}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
                Semestre {semestre}
              </h2>
              <ul className="flex flex-col divide-y divide-border">
                {items.map((item) => (
                  <li
                    key={item.id_asignatura}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-text">{item.asignatura}</p>
                      <p className="text-xs text-muted">
                        {item.codigo} · {item.creditos} créditos
                      </p>
                    </div>
                    <Badge estado={item.obligatoria ? 'OBLIGATORIA' : 'ELECTIVA'} />
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
