import { useEffect, useState } from 'react'
import { getAsistencia } from '../api/academico'
import { usePeriodo } from '../context/periodo'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { ErrorBanner } from '../components/ErrorBanner'
import { PageHeader } from '../components/PageHeader'
import { LoadingSkeleton } from '../components/Skeleton'
import { useAsignaturasMap } from '../hooks/useAsignaturasMap'
import { useFetch } from '../hooks/useFetch'
import { formatFecha, formatHora } from '../utils/format'
import './asistencia.css'
import { estadosAsistencia as estados, estadoAsistencia, resumirAsistencia } from '../utils/asistencia'

function fechaCorta(fecha: string) {
  // La fecha académica es un día civil, incluso si llega con medianoche UTC.
  return new Date(`${fecha.slice(0, 10)}T12:00:00`).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
}

export function Asistencia() {
  const periodo = usePeriodo()
  return <RegistroAsistencia key={periodo} periodo={periodo} />
}

function RegistroAsistencia({ periodo }: { periodo: number | undefined }) {
  const { data, loading, error, refetch } = useFetch(() => getAsistencia(periodo), [periodo])
  const asignaturas = useAsignaturasMap()
  const [seleccion, setSeleccion] = useState<number | null>(null)

  useEffect(() => {
    const actualizar = () => { if (!document.hidden) refetch() }
    const intervalo = window.setInterval(actualizar, 60_000)
    window.addEventListener('focus', actualizar)
    return () => { window.clearInterval(intervalo); window.removeEventListener('focus', actualizar) }
  }, [refetch])

  if (loading && !data) return <LoadingSkeleton cabecera />
  if (error && !data) return <ErrorBanner mensaje={error} onRetry={refetch} />

  const asistencia = data?.asistencia ?? []
  const cursos = [...new Set(asistencia.map(clase => clase.id_curso))].map(id => {
    const clases = asistencia.filter(clase => clase.id_curso === id).sort((a, b) =>
      a.fecha.localeCompare(b.fecha) || (a.hora_inicio ?? '').localeCompare(b.hora_inicio ?? '') || a.id_clase - b.id_clase)
    return { id, clases, ...resumirAsistencia(clases), asignatura: asignaturas.get(clases[0].id_asignatura) }
  })
  const elegida = asistencia.find(clase => clase.id_clase === seleccion)
  const estadoElegido = elegida ? estadoAsistencia(elegida.estado) : null

  return <div className="asistencia-visual">
    <PageHeader titulo="Asistencia" descripcion={asistencia.length > 0 ? 'Selecciona un cuadro para ver la fecha, el horario y el detalle de esa clase.' : undefined} />
    <div className="asistencia-toolbar">
      <ul className="asistencia-leyenda" aria-label="Colores y símbolos de asistencia">
        {estados.map(item => <li key={item.estado}>
          <span className={`asistencia-muestra asistencia-estado-${item.estado}`} aria-hidden="true">{item.simbolo}</span>{item.etiqueta}
        </li>)}
      </ul>
      <Button variante="secondary" onClick={refetch} disabled={loading}>{loading ? 'Actualizando…' : 'Actualizar'}</Button>
    </div>
    {error && <ErrorBanner mensaje={error} onRetry={refetch} />}
    {!asistencia.length ? <EmptyState mensaje="Aún no hay clases realizadas en este período. Los cuadros aparecerán a medida que se registren las clases." /> : <>
      <div className="asistencia-panel glass-panel">
        <div className="asistencia-scroll" role="region" aria-label="Registro de asistencia por asignatura" tabIndex={0}>
          <table className="asistencia-grilla">
            <caption className="sr-only">Selecciona un cuadro para consultar la fecha, el horario y la observación de una clase.</caption>
            <thead><tr><th scope="col">Asignatura</th><th scope="col">Clases realizadas</th><th scope="col">Asistencia</th></tr></thead>
            <tbody>{cursos.map(curso => <tr key={curso.id}>
              <th scope="row"><strong>{curso.asignatura?.nombre ?? `Asignatura #${curso.clases[0].id_asignatura}`}</strong>
                <span>{curso.asignatura?.codigo ?? 'Código por confirmar'} · Curso {curso.id}</span></th>
              <td><ol className="asistencia-cuadros" aria-label={`Clases de ${curso.asignatura?.nombre ?? `curso ${curso.id}`}`}>
                {curso.clases.map(clase => {
                  const estado = estadoAsistencia(clase.estado)
                  const descripcion = `${curso.asignatura?.nombre ?? `Curso ${curso.id}`} · ${formatFecha(clase.fecha.slice(0, 10))} · ${formatHora(clase.hora_inicio)}–${formatHora(clase.hora_fin)} · ${estado.etiqueta}`
                  return <li key={clase.id_clase}>
                    <button type="button" className={`asistencia-cuadro asistencia-estado-${estado.estado}`}
                      aria-label={descripcion} title={descripcion} aria-pressed={elegida?.id_clase === clase.id_clase}
                      aria-controls="asistencia-detalle" onClick={() => setSeleccion(actual => actual === clase.id_clase ? null : clase.id_clase)}>
                      <span aria-hidden="true">{estado.simbolo}</span>
                    </button>
                    <time dateTime={clase.fecha.slice(0, 10)}>{fechaCorta(clase.fecha)}</time>
                  </li>
                })}
              </ol></td>
              <td className="asistencia-porcentaje"><strong>{curso.porcentaje===null?'—':`${curso.porcentaje}%`}</strong>
                <span>{curso.asistidas} de {curso.confirmadas} clases con asistencia</span></td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>
      <section id="asistencia-detalle" className="asistencia-detalle glass-panel" hidden={!elegida} aria-label="Detalle de la clase" aria-live="polite" aria-atomic="true">
        {elegida && estadoElegido ? <>
          <div className="asistencia-detalle-heading"><div><p>Detalle de la clase</p><h2>{asignaturas.get(elegida.id_asignatura)?.nombre ?? `Curso ${elegida.id_curso}`}</h2></div>
            <span className={`asistencia-detalle-estado asistencia-estado-${estadoElegido.estado}`}>{estadoElegido.simbolo} {estadoElegido.etiqueta}</span></div>
          <dl><div><dt>Fecha</dt><dd>{formatFecha(elegida.fecha.slice(0, 10))}</dd></div>
            <div><dt>Horario</dt><dd>{formatHora(elegida.hora_inicio)} – {formatHora(elegida.hora_fin)}</dd></div>
            <div className="asistencia-observacion"><dt>Observación</dt><dd>{elegida.observacion || 'Sin observaciones registradas.'}</dd></div></dl>
        </> : null}
      </section>
    </>}
  </div>
}
