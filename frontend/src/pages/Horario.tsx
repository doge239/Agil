import { useMemo } from 'react'
import { getHorario } from '../api/academico'
import { EmptyState } from '../components/EmptyState'
import { ErrorBanner } from '../components/ErrorBanner'
import { PageHeader } from '../components/PageHeader'
import { Spinner } from '../components/Spinner'
import { useAsignaturasMap } from '../hooks/useAsignaturasMap'
import { useFetch } from '../hooks/useFetch'
import type { HorarioItem } from '../types/api'
import { cn } from '../utils/cn'
import { BLOQUES, DIAS, asignarColores, bloqueParaHorario, normalizarDia } from '../utils/horario'

export function Horario() {
  const { data, loading, error, refetch } = useFetch(() => getHorario(), [])
  const asignaturas = useAsignaturasMap()

  const horario = useMemo(() => data?.horario ?? [], [data])

  const colores = useMemo(
    () => asignarColores(horario.map((item) => item.id_asignatura)),
    [horario],
  )

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

  const celdas = new Map<string, Map<string, HorarioItem[]>>()
  for (const item of horario) {
    const dia = normalizarDia(item.dia_semana)
    const letra = bloqueParaHorario(item.hora_inicio, item.hora_fin)

    if (!celdas.has(dia)) {
      celdas.set(dia, new Map())
    }
    const porBloque = celdas.get(dia)!
    if (!porBloque.has(letra)) {
      porBloque.set(letra, [])
    }
    porBloque.get(letra)!.push(item)
  }

  return (
    <div>
      <PageHeader titulo="Horario" descripcion="Bloques de clases del período actual." />
      {horario.length === 0 ? (
        <EmptyState mensaje="No hay bloques de horario registrados." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-background">
              <tr>
                <th className="px-4 py-3 text-center font-semibold text-muted">Bloque</th>
                {DIAS.map((dia) => (
                  <th key={dia} className="px-4 py-3 text-center font-semibold text-muted">
                    {dia}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {BLOQUES.map((bloque) => (
                <tr key={bloque.letra}>
                  <th className="bg-background px-4 py-3 text-center align-middle font-semibold text-text">
                    <div>{bloque.letra}</div>
                    <div className="text-xs font-normal text-muted">
                      {bloque.hora_inicio} - {bloque.hora_fin}
                    </div>
                  </th>
                  {DIAS.map((dia) => {
                    const items = celdas.get(normalizarDia(dia))?.get(bloque.letra) ?? []
                    return (
                      <td key={dia} className="px-4 py-3 text-center align-middle">
                        <div className="flex flex-col items-center gap-1">
                          {items.map((item, index) => {
                            const asignatura = asignaturas.get(item.id_asignatura)
                            return (
                              <div
                                key={`${item.id_curso}-${index}`}
                                className={cn(
                                  'flex w-full flex-col items-center rounded-lg border px-3 py-1.5 shadow-md',
                                  colores.get(item.id_asignatura),
                                )}
                              >
                                <p className="font-semibold">{asignatura?.codigo ?? '—'}</p>
                                <p className="text-xs opacity-80">
                                  {asignatura?.nombre ?? `Asignatura #${item.id_asignatura}`}
                                </p>
                              </div>
                            )
                          })}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
