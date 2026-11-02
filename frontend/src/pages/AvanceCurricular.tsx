import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAvance } from '../api/estudiante'
import { useFetch } from '../hooks/useFetch'
import { PageHeader } from '../components/PageHeader'
import { ErrorBanner } from '../components/ErrorBanner'
import { Spinner } from '../components/Spinner'
import { Button } from '../components/Button'
import { PortalIcon } from '../components/PortalIcon'
import { MallaGrid } from '../components/MallaGrid'
import { SEMESTRES } from '../utils/curriculo'
import type { AsignaturaAvance } from '../types/api'
import './avance-curricular.css'

const semestres = SEMESTRES
const academico = { APROBADA: 'Aprobado', EN_CURSO: 'Inscrito', REPROBADA: 'Reprobado', PENDIENTE: 'Sin cursar' }
const disponibilidad = { DISPONIBLE: 'Disponible académicamente', BLOQUEADA: 'Bloqueado por requisitos', POR_CONFIRMAR: 'Requisitos por confirmar' }
const nombre = (a: AsignaturaAvance) => a.elegida?.nombre ?? a.asignatura
const normalizar = (v: string) => v.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export function AvanceCurricular() {
  const { data, loading, error, refetch } = useFetch(getAvance, [])
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState('TODAS')
  const [seleccion, setSeleccion] = useState<number | null>(null)
  const [abierto, setAbierto] = useState(false)
  const dialogo = useRef<HTMLDialogElement>(null)
  const [ampliada, setAmpliada] = useState(false)
  const vistaCompleta = useRef<HTMLDialogElement>(null)
  const seleccionada = data?.asignaturas.find(a => a.id_asignatura === seleccion)
  useEffect(() => {
    if (abierto && seleccionada && !dialogo.current?.open) dialogo.current?.showModal()
  }, [abierto, seleccionada])
  useEffect(() => {
    if (ampliada && !vistaCompleta.current?.open) vistaCompleta.current?.showModal()
  }, [ampliada])
  function seleccionar(id: number) { setSeleccion(id); setAbierto(true) }
  const visibles = data?.asignaturas.filter(a => {
    const coincide = normalizar(`${nombre(a)} ${a.asignatura} ${a.codigo ?? ''} ${a.elegida?.codigo ?? ''}`).includes(normalizar(busqueda))
    return coincide && (filtro === 'TODAS' || a.estado === filtro || (a.estado !== 'APROBADA' && a.estado !== 'EN_CURSO' && a.disponibilidad === filtro))
  }) ?? []
  return <div className="avance">
    <div className="avance-cabecera"><PageHeader titulo="Avance curricular" descripcion="Pasa el cursor por un ramo para resaltar sus relaciones. Haz clic o toca la asignatura para ver su detalle." />{data && <Button variante="secondary" onClick={() => setAmpliada(true)}><PortalIcon name="expand" />Ver malla completa</Button>}</div>
    {loading ? <Spinner /> : error ? <ErrorBanner mensaje={error} onRetry={refetch} /> : data && <>
      <div className="avance-resumen">
        <section className="avance-plan"><span className="avance-eyebrow">CARRERA PROFESIONAL</span><h2>{data.asignaturas[0]?.carrera ?? data.plan.nombre}</h2><p>{data.plan.nombre}</p></section>
        <section className="avance-progreso" aria-label="Progreso de la carrera">
          <div><strong>{data.porcentaje_asignaturas}%</strong><span>{data.asignaturas_aprobadas} de {data.asignaturas_totales} ramos aprobados</span></div>
          <progress aria-label="Asignaturas aprobadas" value={data.asignaturas_aprobadas} max={data.asignaturas_totales || 1} />
          <p>{data.creditos_confirmados ? `${data.creditos_aprobados} de ${data.creditos_totales} SCT aprobados · ${data.porcentaje}% por créditos` : 'Progreso por créditos pendiente: faltan SCT confirmados en el plan.'}</p>
        </section>
        <div className="avance-enlaces"><Link to="/notas">Ver mis calificaciones ↗</Link><Link to="/solicitudes">Ver mis situaciones ↗</Link></div>
      </div>
      {data.demostracion && <details className="avance-demo"><summary>Datos de demostración <span>Ver información</span></summary><p>{data.descripcion_escenario ?? 'Cuenta de demostración · Las notas e inscripciones de esta malla son ficticias y sirven para probar los estados.'}</p></details>}
      {data.sin_historial && <p className="avance-aviso" role="status">Todavía no tienes historial académico. Puedes explorar la malla y consultar los requisitos de cada ramo.</p>}
      <div className="avance-leyenda" aria-label="Leyenda de la malla">
        <span><i className="marca-aprobada" />✓ Aprobado</span><span><i className="marca-curso" />◷ Inscrito este semestre</span><span><i className="marca-reprobada" />× Reprobado</span>
        <span><i className="marca-disponible" />○ Disponible</span><span><i className="marca-bloqueada" />▣ Bloqueado</span><span><i className="marca-confirmar" />? Por confirmar</span>
      </div>
      <div className="avance-herramientas">
        <label className="avance-busqueda"><span>Buscar ramo</span><input type="search" placeholder="Nombre o código…" value={busqueda} onChange={e => setBusqueda(e.target.value)} /></label>
        <label><span>Mostrar</span><select aria-label="Mostrar" value={filtro} onChange={e => setFiltro(e.target.value)}>
          <option value="TODAS">Todos los estados</option><option value="APROBADA">Aprobados</option><option value="EN_CURSO">Inscritos</option><option value="REPROBADA">Reprobados</option>
          <option value="DISPONIBLE">Disponibles para cursar</option><option value="BLOQUEADA">Bloqueados por requisitos</option><option value="POR_CONFIRMAR">Requisitos por confirmar</option>
        </select></label>
        <label><span>Ir al semestre</span><select aria-label="Ir al semestre" defaultValue="" onChange={e => document.getElementById(`avance-semestre-${e.target.value}`)?.querySelector('h2')?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })}>
          <option value="" disabled>Selecciona…</option>{semestres.map((s, i) => <option key={s} value={i + 1}>{s}</option>)}
        </select></label>
        <p aria-live="polite">{visibles.length} ramos{seleccionada && <button className="avance-limpiar" onClick={() => setSeleccion(null)}>Quitar resaltado</button>}</p>
      </div>
      {seleccionada && <p className="avance-relaciones">Explorando <strong>{nombre(seleccionada)}</strong> · <span>Azul: prerrequisitos</span> · <span>Violeta: ramos para los que es requisito</span></p>}
      <p className="avance-ayuda-movil">Desliza la malla horizontalmente para recorrer los ocho semestres.</p>
      {!ampliada && <MallaGrid asignaturas={data.asignaturas} visibles={visibles} seleccion={seleccion} onSeleccionar={seleccionar} />}
      <p className="avance-nota">La disponibilidad es académica. La inscripción también depende de oferta, cupos, horarios y restricciones. Solo una nota final cerrada acredita aprobación.</p>
      {data.plan.observaciones && <details className="avance-fuentes"><summary>Sobre este plan y los datos por confirmar</summary><p>{data.plan.observaciones}</p>{data.plan.fuente && <a href={data.plan.fuente} target="_blank" rel="noreferrer">Consultar programas de ITI en UCN ↗</a>}</details>}
    </>}
    <dialog ref={vistaCompleta} className="avance-vista-completa" aria-labelledby="malla-completa-titulo" onClose={() => setAmpliada(false)}>
      {ampliada && data && <div className="avance-vista-contenido">
        <div className="avance-vista-titulo"><div><span className="page-eyebrow">TU PLAN DE ESTUDIOS</span><h2 id="malla-completa-titulo">{data.asignaturas[0]?.carrera ?? data.plan.nombre}</h2><p>Ocho semestres · {data.asignaturas_aprobadas} de {data.asignaturas_totales} ramos aprobados</p></div><Button variante="secondary" onClick={() => vistaCompleta.current?.close()} aria-label="Cerrar vista completa"><PortalIcon name="close" />Cerrar</Button></div>
        <div className="avance-leyenda"><span><i className="marca-aprobada" />✓ Aprobado</span><span><i className="marca-curso" />◷ Inscrito</span><span><i className="marca-reprobada" />× Reprobado</span><span><i className="marca-disponible" />○ Disponible</span><span><i className="marca-bloqueada" />▣ Bloqueado</span><span><i className="marca-confirmar" />? Por confirmar</span></div>
        <MallaGrid asignaturas={data.asignaturas} visibles={data.asignaturas} seleccion={seleccion} onSeleccionar={seleccionar} />
        <p className="avance-vista-ayuda">Pasa el cursor para resaltar las relaciones. Haz clic o toca el ramo para abrir su detalle.</p>
      </div>}
    </dialog>
    <dialog ref={dialogo} className="avance-dialogo" aria-labelledby="detalle-ramo-titulo" onClose={() => setAbierto(false)} onClick={e => { if (e.target === e.currentTarget) dialogo.current?.close() }}>
      {seleccionada && <div className="avance-detalle">
        <div className="avance-detalle-header"><span className="avance-eyebrow">SEMESTRE {semestres[seleccionada.semestre - 1]}</span><button autoFocus onClick={() => dialogo.current?.close()} aria-label="Cerrar detalle">×</button></div>
        <h2 id="detalle-ramo-titulo">{nombre(seleccionada)}</h2>
        <p className="avance-detalle-meta">{seleccionada.elegida ? seleccionada.elegida.codigo ?? 'Código por confirmar' : seleccionada.codigo ?? 'Código por confirmar'} · {seleccionada.creditos ?? 'Por confirmar'} SCT{seleccionada.espacio_electivo ? ` · ${seleccionada.asignatura}` : ''}</p>
        {seleccionada.elegida && <p className="avance-detalle-meta">Los SCT corresponden al espacio del plan. El código y los créditos específicos de la opción elegida están por confirmar.</p>}
        <div className="avance-detalle-estados"><span>{academico[seleccionada.estado]}{seleccionada.nota !== null ? ` · NF ${seleccionada.nota.toLocaleString('es-CL', { minimumFractionDigits: 1 })}` : ''}</span><span>{disponibilidad[seleccionada.disponibilidad]}</span></div>
        {seleccionada.intentos > 1 && <p>{seleccionada.intentos} resultados finales registrados. Una aprobación conserva el ramo aprobado.</p>}
        <section><h3>Prerrequisitos</h3>
          {seleccionada.requisito_nivel && <p className="avance-aviso">Nivel {seleccionada.requisito_nivel} completo: se consideran todos los ramos y espacios de electivos hasta ese nivel. Interpretación provisional.</p>}
          {seleccionada.prerrequisitos.length ? <ul>{seleccionada.prerrequisitos.map(r => <li key={r.id_asignatura}><span className={r.cumplido ? 'avance-cumplido' : 'avance-pendiente'}>{r.cumplido ? '✓ Aprobado' : '○ Pendiente'}</span><span>{r.asignatura}</span></li>)}</ul> : <p>{seleccionada.requisitos_estado === 'POR_CONFIRMAR' ? 'Requisitos por confirmar.' : 'Sin prerrequisitos confirmados: el plan no exige ramos previos.'}</p>}
          {seleccionada.requisitos_estado === 'POR_CONFIRMAR' && <p className="avance-aviso">Falta confirmar la lista completa de requisitos{seleccionada.espacio_electivo ? ' de la asignatura electiva elegida' : ''}. Este ramo no se considera disponible.</p>}
        </section>
        <section><h3>Requisitos pendientes</h3><p>{seleccionada.pendientes.length ? seleccionada.pendientes.map(r => r.asignatura).join(' · ') : seleccionada.requisitos_estado === 'POR_CONFIRMAR' ? 'Pendiente de validación del programa.' : 'Todos los requisitos registrados están cumplidos.'}</p></section>
        <section><h3>Es requisito para</h3>
          {seleccionada.habilita.length ? <ul>{seleccionada.habilita.map(r => <li key={r.id_asignatura} className="avance-habilita"><button onClick={() => setSeleccion(r.id_asignatura)}>{r.asignatura} ↗</button><small>{r.otros_pendientes.length ? `También falta aprobar: ${r.otros_pendientes.map(p => p.asignatura).join(', ')}.` : 'No faltan otros ramos registrados.'} {r.disponibilidad === 'POR_CONFIRMAR' ? 'Hay requisitos por confirmar.' : ''}</small></li>)}</ul> : <p>No es prerrequisito de otros ramos en este plan.</p>}
        </section>
        {seleccionada.fuente && <a className="avance-programa" href={seleccionada.fuente} target="_blank" rel="noreferrer">Ver programa de la asignatura en UCN ↗</a>}
        <p className="avance-nota">Aprobar un ramo solo habilita los siguientes cuando se cumplen todos sus requisitos.</p>
      </div>}
    </dialog>
  </div>
}
