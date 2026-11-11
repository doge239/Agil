import { Select } from '../../components/Select'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { crearClase, eliminarClase, getClases, getResumenAsistenciaCurso, guardarAsistencias } from '../../api/docente'
import type { ClaseDocente, EstudianteCurso } from '../../api/docente'
import type { HorarioItem } from '../../types/api'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { EmptyState } from '../../components/EmptyState'
import { ErrorBanner } from '../../components/ErrorBanner'
import { Spinner } from '../../components/Spinner'
import { useFetch } from '../../hooks/useFetch'
import { estadoAsistencia, estadosAsistencia, resumirAsistencia } from '../../utils/asistencia'
import { formatFecha, formatHora } from '../../utils/format'
import { getErrorMessage } from '../../utils/errors'
import { BLOQUES, etiquetaBloque, normalizarDia } from '../../utils/horario'
import { AsistenciaQr } from './AsistenciaQr'
import { EliminarClase } from './EliminarClase'
import { asistenciaQrHabilitada } from '../../config/funciones'
import '../asistencia.css'
import './asistencia-docente.css'

interface Edicion {clase:number;estudiante:EstudianteCurso;estado:string;observacion:string;version:number}
const nombre=(e:EstudianteCurso)=>`${e.apellido_paterno} ${e.apellido_materno??''}, ${e.nombres}`

export function AsistenciaCurso({curso,estudiantes,bloqueado,horarios}:{curso:number;estudiantes:EstudianteCurso[];bloqueado:boolean;horarios:HorarioItem[]}) {
  const {data,loading,error,refetch}=useFetch(async()=>{
    const [lista,resumen]=await Promise.all([getClases(curso),getResumenAsistenciaCurso(curso)])
    return {...resumen,todas:lista.clases}
  },[curso])
  const [seleccion,setSeleccion]=useState<number>(),[edicion,setEdicion]=useState<Edicion|null>(null)
  const [ocupado,setOcupado]=useState(false),[fallo,setFallo]=useState(''),[mensaje,setMensaje]=useState('')
  const [eliminacion,setEliminacion]=useState<ClaseDocente|null>(null),[errorEliminar,setErrorEliminar]=useState('')
  const [fechaSeleccionada,setFechaSeleccionada]=useState<string>(),[bloqueSeleccionado,setBloqueSeleccionado]=useState<string>()
  useEffect(()=>{const actualizar=()=>{if(!document.hidden)refetch()};const reloj=window.setInterval(actualizar,10_000);window.addEventListener('focus',actualizar);return()=>{window.clearInterval(reloj);window.removeEventListener('focus',actualizar)}},[refetch])
  const clases=data?.clases??[],todas=data?.todas??[]
  const elegida=todas.find(c=>c.id_clase===seleccion)??todas.find(c=>c.fecha.slice(0,10)===data?.fecha_hoy)??todas[0]
  const registros=new Map((data?.asistencias??[]).map(a=>[`${a.id_estudiante}:${a.id_clase}`,a]))
  const claveBloque=(inicio:string,fin:string)=>`${inicio.slice(0,5)}-${fin.slice(0,5)}`
  const opciones=new Map(BLOQUES.map(b=>[claveBloque(b.hora_inicio,b.hora_fin),{...b,delCurso:false}]))
  for(const h of horarios) {
    const clave=claveBloque(h.hora_inicio,h.hora_fin)
    opciones.set(clave,{letra:etiquetaBloque(h.hora_inicio,h.hora_fin),hora_inicio:h.hora_inicio.slice(0,5),hora_fin:h.hora_fin.slice(0,5),delCurso:true})
  }
  const fechaClase=fechaSeleccionada??data?.fecha_hoy??''
  const dia=fechaClase?new Date(`${fechaClase}T12:00:00`).toLocaleDateString('es-CL',{weekday:'long'}):''
  const programados=horarios.filter(h=>normalizarDia(h.dia_semana)===normalizarDia(dia))
  const bloqueElegido=bloqueSeleccionado??(programados[0]?claveBloque(programados[0].hora_inicio,programados[0].hora_fin):'')
  async function crear(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();const bloque=opciones.get(bloqueElegido)
    if(!bloque){setFallo('Selecciona un bloque del horario.');return}
    setOcupado(true);setFallo('');setMensaje('')
    try {const r=await crearClase(curso,{fecha:fechaClase,hora_inicio:bloque.hora_inicio,hora_fin:bloque.hora_fin});setSeleccion(r.clase.id_clase);refetch();setMensaje('Clase creada. Ya puedes registrar la asistencia en la grilla.')}
    catch(e){setFallo(getErrorMessage(e))}finally{setOcupado(false)}
  }
  async function guardar(event:FormEvent) {
    event.preventDefault();if(!edicion)return;setOcupado(true);setFallo('');setMensaje('')
    try {await guardarAsistencias(curso,edicion.clase,[{id_estudiante:edicion.estudiante.id_estudiante,estado:edicion.estado,observacion:edicion.observacion,version:edicion.version}]);setEdicion(null);refetch();setMensaje('Asistencia actualizada manualmente.')}
    catch(e){setFallo(getErrorMessage(e));refetch()}finally{setOcupado(false)}
  }
  async function recargarEdicion() {
    if(!edicion)return
    setOcupado(true);setFallo('')
    try {
      const r=await getResumenAsistenciaCurso(curso)
      const actual=r.asistencias.find(a=>a.id_clase===edicion.clase&&a.id_estudiante===edicion.estudiante.id_estudiante)
      setEdicion({...edicion,estado:actual?estadoAsistencia(actual.estado).estado:'PRESENTE',observacion:actual?.observacion??'',version:actual?.version??0})
      refetch()
    } catch(e){setFallo(getErrorMessage(e))}finally{setOcupado(false)}
  }
  async function confirmarEliminacion(motivo:string) {
    if(!eliminacion?.revision_asistencia)return
    setOcupado(true);setErrorEliminar('');setFallo('');setMensaje('')
    try {
      const r=await eliminarClase(curso,eliminacion.id_clase,motivo,eliminacion.revision_asistencia)
      if(edicion?.clase===eliminacion.id_clase)setEdicion(null)
      setEliminacion(null);setSeleccion(undefined);refetch();setMensaje(`${r.mensaje}. Registros eliminados: ${r.asistencias_eliminadas}.`)
    } catch(e){setErrorEliminar(getErrorMessage(e));refetch()}finally{setOcupado(false)}
  }
  return <section className="asistencia-docente">
    <div className="asistencia-toolbar"><h2>Clases y asistencia</h2><Button variante="secondary" onClick={refetch} disabled={loading}>Actualizar registro</Button></div>
    {mensaje&&<p role="status" className="qr-mensaje">{mensaje}</p>}{(fallo||error)&&<ErrorBanner mensaje={fallo||error!} onRetry={refetch}/>}
    <form onSubmit={crear} className="qr-panel glass-panel"><h3>Registrar clase</h3>
      <fieldset disabled={bloqueado||ocupado} className="qr-configuracion">
        <Input label="Fecha" name="fecha" type="date" required value={fechaClase} onChange={e=>{setFechaSeleccionada(e.target.value);setBloqueSeleccionado(undefined)}}/>
        <label>Bloque del horario<Select aria-label="Bloque del horario" name="bloque" required value={bloqueElegido} onChange={e=>setBloqueSeleccionado(e.target.value)}>
          <option value="">Selecciona un bloque</option>
          {[...opciones].map(([clave,b])=><option key={clave} value={clave}>{etiquetaBloque(b.hora_inicio,b.hora_fin)} · {formatHora(b.hora_inicio)}–{formatHora(b.hora_fin)}{b.delCurso?' · Horario del curso':''}</option>)}
        </Select></label>
        <Button type="submit" cargando={ocupado}>Crear clase</Button>
      </fieldset>
      <p>{programados.length?'Se selecciona el bloque programado para este día. Puedes cambiarlo si corresponde.':'Selecciona el bloque para la clase adicional; el curso no tiene horario programado para esta fecha.'}</p>
    </form>
    {!!todas.length&&<section className="qr-panel glass-panel" aria-label="Gestionar clases">
      <h3>Gestionar clases</h3><p>Si registraste una clase por error, puedes eliminarla junto con su asistencia.</p>
      <div className="qr-configuracion"><label>Clase registrada<Select aria-label="Clase registrada" value={elegida?.id_clase??''} onChange={e=>setSeleccion(Number(e.target.value))} disabled={ocupado}>
        {todas.map(c=><option key={c.id_clase} value={c.id_clase}>{formatFecha(c.fecha.slice(0,10))} · {etiquetaBloque(c.hora_inicio,c.hora_fin)} · {c.asistencias_registradas??0} registros</option>)}
      </Select></label>
        <Button variante="danger" disabled={bloqueado||ocupado||!elegida?.revision_asistencia} onClick={()=>{if(elegida){setErrorEliminar('');setEliminacion(elegida)}}}>Eliminar clase</Button>
      </div>
    </section>}
    {eliminacion&&<EliminarClase clase={eliminacion} ocupado={ocupado} error={errorEliminar} onCancelar={()=>setEliminacion(null)} onConfirmar={confirmarEliminacion}/>}
    {loading&&!data&&<Spinner/>}
    {asistenciaQrHabilitada&&elegida&&<>
      <label className="qr-selector">Clase para el QR<Select value={elegida.id_clase} onChange={e=>setSeleccion(Number(e.target.value))}>{todas.map(c=><option key={c.id_clase} value={c.id_clase}>{formatFecha(c.fecha.slice(0,10))} · {etiquetaBloque(c.hora_inicio,c.hora_fin)}</option>)}</Select></label>
      <AsistenciaQr key={elegida.id_clase} curso={curso} clase={elegida.id_clase} bloqueado={bloqueado||elegida.fecha.slice(0,10)!==data?.fecha_hoy} alCerrar={refetch}/>
    </>}
    <div className="asistencia-toolbar"><div><h3>Registro del curso</h3><p>Selecciona un cuadro para marcar o corregir la asistencia manualmente.</p></div>
      <ul className="asistencia-leyenda">{estadosAsistencia.map(e=><li key={e.estado}><span aria-hidden="true" className={`asistencia-muestra asistencia-estado-${e.estado}`}>{e.simbolo}</span>{e.etiqueta}</li>)}</ul>
    </div>
    {!estudiantes.length?<EmptyState mensaje="No hay estudiantes inscritos en este curso."/>:!clases.length?<EmptyState mensaje="Las clases realizadas aparecerán aquí. Las clases futuras no se marcan como ausencias."/>:
      <div className="asistencia-panel glass-panel"><div className="asistencia-scroll docente-grilla-scroll" role="region" aria-label="Asistencia de estudiantes por clase" tabIndex={0}>
        <table className="asistencia-grilla docente-grilla"><caption className="sr-only">Estudiantes del curso y asistencia de cada clase realizada. Un cuadro gris indica que aún no hay registro.</caption>
          <thead><tr><th scope="col">Estudiante</th>{clases.map(c=><th scope="col" key={c.id_clase}><time dateTime={c.fecha.slice(0,10)}>{formatFecha(c.fecha.slice(0,10))}</time><span title={`${formatHora(c.hora_inicio)}–${formatHora(c.hora_fin)}`}>{etiquetaBloque(c.hora_inicio,c.hora_fin)}</span></th>)}<th scope="col">Asistencia</th></tr></thead>
          <tbody>{estudiantes.map(e=>{
            const propias=(data?.asistencias??[]).filter(a=>a.id_estudiante===e.id_estudiante)
            const resumen=resumirAsistencia(propias)
            return <tr key={e.id_estudiante}><th scope="row"><strong>{nombre(e)}</strong><span>{e.numero_matricula}</span></th>{clases.map(c=>{
              const a=registros.get(`${e.id_estudiante}:${c.id_clase}`),estado=estadoAsistencia(a?.estado)
              const inscrito=e.fecha_inscripcion.slice(0,10)<=c.fecha.slice(0,10)
              return <td key={c.id_clase}>{inscrito||a?<button type="button" className={`asistencia-cuadro asistencia-estado-${estado.estado}`}
                disabled={bloqueado||ocupado||e.estado!=='ACTIVA'||!inscrito} title={`${nombre(e)} · ${formatFecha(c.fecha.slice(0,10))} · ${estado.etiqueta}${asistenciaQrHabilitada&&a?.origen==='QR'?' · QR':''}`}
                aria-label={`${nombre(e)}, ${formatFecha(c.fecha.slice(0,10))}, ${formatHora(c.hora_inicio)}, ${estado.etiqueta}`}
                aria-pressed={edicion?.clase===c.id_clase&&edicion.estudiante.id_estudiante===e.id_estudiante}
                onClick={()=>{setFallo('');setEdicion(actual=>actual?.clase===c.id_clase&&actual.estudiante.id_estudiante===e.id_estudiante?null:{clase:c.id_clase,estudiante:e,estado:estado.estado==='PENDIENTE'?'PRESENTE':estado.estado,observacion:a?.observacion??'',version:a?.version??0})}}>{estado.simbolo}</button>:<span title="La clase es anterior a la inscripción">—</span>}</td>
            })}<td className="asistencia-porcentaje"><strong>{resumen.porcentaje===null?'—':`${resumen.porcentaje}%`}</strong><span>{resumen.asistidas} de {resumen.confirmadas} clases computadas</span></td></tr>
          })}</tbody>
        </table>
      </div><p className="asistencia-nota">«Asistió» y «Justificado» cuentan como asistencia para el porcentaje. Los cuadros grises no cuentan como ausencias. El registro se actualiza cada 10 segundos.</p></div>}
    {edicion&&<form onSubmit={guardar} className="qr-panel glass-panel" aria-label="Editar asistencia manual">
      <h3>{nombre(edicion.estudiante)}</h3><p>{formatFecha(clases.find(c=>c.id_clase===edicion.clase)?.fecha.slice(0,10))} · {etiquetaBloque(clases.find(c=>c.id_clase===edicion.clase)?.hora_inicio??null,clases.find(c=>c.id_clase===edicion.clase)?.hora_fin??null)}</p>
      <div className="qr-configuracion"><label>Estado<Select aria-label="Estado de asistencia" value={edicion.estado} onChange={e=>setEdicion({...edicion,estado:e.target.value})}>{estadosAsistencia.map(e=><option key={e.estado} value={e.estado}>{e.etiqueta}</option>)}</Select></label>
        <Input label="Observación" name="observacion-asistencia" maxLength={500} value={edicion.observacion} onChange={e=>setEdicion({...edicion,observacion:e.target.value})}/>
        <Button type="submit" disabled={bloqueado} cargando={ocupado}>Guardar asistencia</Button>
        <Button type="button" variante="secondary" onClick={recargarEdicion} disabled={ocupado}>Recargar registro</Button>
        <Button type="button" variante="secondary" onClick={()=>setEdicion(null)} disabled={ocupado}>Cancelar</Button></div>
    </form>}
  </section>
}
