import { Select } from '../components/Select'
import { useState } from 'react'
import { getHorario } from '../api/academico'
import { usePeriodo } from '../context/periodo'
import { useFetch } from '../hooks/useFetch'
import { PageHeader } from '../components/PageHeader'
import { ErrorBanner } from '../components/ErrorBanner'
import { EmptyState } from '../components/EmptyState'
import { LoadingSkeleton } from '../components/Skeleton'
import { BLOQUES, DIAS, aMinutos, asignarColores, bloqueParaHorario, normalizarDia, seSuperponen } from '../utils/horario'
import { formatHora } from '../utils/format'
import './horario.css'

export function Horario() {
  const periodo = usePeriodo()
  const { data, loading, error, refetch } = useFetch(() => getHorario(periodo), [periodo])
  const [diaElegido, setDiaElegido] = useState('TODOS')
  const items = data?.horario ?? []
  const dias = [...DIAS]
  for (const c of items) if (!dias.some(d => normalizarDia(d) === normalizarDia(c.dia_semana))) dias.push(c.dia_semana)
  const diasVisibles = diaElegido === 'TODOS' ? dias : dias.filter(d => normalizarDia(d) === diaElegido)
  const colores = asignarColores(items.map(c => c.id_asignatura))
  const [hoy] = useState(() => normalizarDia(new Intl.DateTimeFormat('es-CL', { weekday: 'long', timeZone: 'America/Santiago' }).format(new Date())))
  const bloques = BLOQUES.map(b => ({ ...b, clave: b.letra }))
  for (const c of items) if (bloqueParaHorario(c.hora_inicio, c.hora_fin) === 'ESPECIAL') {
    const clave = `${formatHora(c.hora_inicio)}-${formatHora(c.hora_fin)}`
    if (!bloques.some(b => b.clave === clave)) bloques.push({ clave, letra: 'Especial', hora_inicio: c.hora_inicio, hora_fin: c.hora_fin })
  }
  bloques.sort((a, b) => aMinutos(a.hora_inicio) - aMinutos(b.hora_inicio) || aMinutos(a.hora_fin) - aMinutos(b.hora_fin))
  const conflictos = new Set(items.flatMap((c, i) => items.some((otra, j) => i !== j && seSuperponen(c, otra)) ? [i] : []))
  const asignaturas = [...new Map(items.map(c => [c.id_asignatura, c])).values()]
  return <div className="horario-semanal">
    <PageHeader titulo="Horario del semestre" />
    {loading ? <LoadingSkeleton variante="horario" /> : error ? <ErrorBanner mensaje={error} onRetry={refetch} /> : !items.length ? <EmptyState mensaje="No hay clases registradas en este período." /> : <>
      <div className="horario-herramientas">
        <p><strong>{asignaturas.length}</strong> asignaturas <span>·</span> <strong>{items.length}</strong> sesiones semanales</p>
        <label>Ver día <Select aria-label="Ver día" value={diaElegido} onChange={e => setDiaElegido(e.target.value)}><option value="TODOS">Semana completa</option>{dias.map(d => <option key={d} value={normalizarDia(d)}>{d}</option>)}</Select></label>
      </div>
      {conflictos.size > 0 && <p className="horario-alerta" role="status">Hay {conflictos.size} sesiones con coincidencia de horario. Se muestran todas para que puedas identificar el cruce.</p>}
      <div className="horario-scroll" tabIndex={0} role="region" aria-label="Horario semanal por bloques, desplazamiento horizontal">
        <table className={diaElegido === 'TODOS' ? 'horario-tabla' : 'horario-tabla horario-un-dia'}>
          <caption className="sr-only">Horario del período seleccionado. Filas por bloque y columnas por día.</caption>
          <colgroup><col className="horario-col-bloque" />{diasVisibles.map(d => <col key={d} />)}</colgroup>
          <thead><tr><th scope="col">Bloque</th>{diasVisibles.map(d => <th key={d} scope="col" className={normalizarDia(d) === hoy ? 'horario-hoy' : ''}>{d}{normalizarDia(d) === hoy && <small>Hoy</small>}</th>)}</tr></thead>
          <tbody>{bloques.map(b => <tr key={b.clave}>
            <th scope="row" className={b.letra === 'Especial' ? 'horario-bloque-especial' : ''}><strong>{b.letra}</strong><span>{formatHora(b.hora_inicio)} – {formatHora(b.hora_fin)}</span></th>
            {diasVisibles.map(d => {
              const clases = items.map((c, indice) => ({ ...c, indice })).filter(c => {
                const bloque = bloqueParaHorario(c.hora_inicio, c.hora_fin)
                return normalizarDia(c.dia_semana) === normalizarDia(d) && (bloque === 'ESPECIAL' ? b.clave === `${formatHora(c.hora_inicio)}-${formatHora(c.hora_fin)}` : b.clave === bloque)
              })
              return <td key={d} className={normalizarDia(d) === hoy ? 'horario-col-hoy' : ''}>
                <div className="horario-celda">{clases.map(c => <article key={c.id_horario ?? `${c.id_curso}-${c.indice}`} className={`horario-clase ${colores.get(c.id_asignatura)} ${conflictos.has(c.indice) ? 'horario-cruce' : ''}`} aria-label={`${c.nombre ?? `Asignatura ${c.id_asignatura}`}, ${d}, ${formatHora(c.hora_inicio)} a ${formatHora(c.hora_fin)}`}>
                  <span className="horario-seccion">S{c.seccion}</span><span className="horario-codigo">{c.codigo ?? 'Código por confirmar'}</span>
                  <h2>{c.nombre ?? `Asignatura #${c.id_asignatura}`}</h2>
                  <p className="horario-horas">{formatHora(c.hora_inicio)} – {formatHora(c.hora_fin)}</p>
                  <div className="horario-clase-pie"><span>Sala {c.sala ?? 'por asignar'}</span><span>Sección {c.seccion}</span></div>
                  {conflictos.has(c.indice) && <p className="horario-cruce-texto">⚠ Cruce de horario</p>}
                </article>)}</div>
              </td>
            })}
          </tr>)}</tbody>
        </table>
      </div>
      <div className="horario-leyenda" aria-label="Asignaturas del horario">{asignaturas.map(c => <span key={c.id_asignatura}><i className={colores.get(c.id_asignatura)} />{c.nombre ?? `Asignatura #${c.id_asignatura}`}</span>)}</div>
      {bloques.some(b => b.letra === 'Especial') && <p className="horario-aclaracion">Las sesiones que no coinciden con A–F aparecen en filas «Especial», conservando sus horas originales.</p>}
    </>}
  </div>
}
