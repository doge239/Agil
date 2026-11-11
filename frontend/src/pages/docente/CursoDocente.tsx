import { Select } from '../../components/Select'
import { AsistenciaCurso } from './AsistenciaCurso'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getCursosDocente, getEstudiantesCurso, getEvaluaciones, guardarEvaluacion, getNotasDocente, guardarNotas, getHistorialDocente } from '../../api/docente'
import type { EstudianteCurso, EvaluacionDocente, NotaDocente } from '../../api/docente'
import { usePeriodo } from '../../context/periodo'
import { useFetch } from '../../hooks/useFetch'
import { PageHeader } from '../../components/PageHeader'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { ErrorBanner } from '../../components/ErrorBanner'
import { EmptyState } from '../../components/EmptyState'
import { Spinner } from '../../components/Spinner'
import { Badge } from '../../components/Badge'
import { getErrorMessage } from '../../utils/errors'
import { formatFecha } from '../../utils/format'

function nombre(e:EstudianteCurso) {return `${e.apellido_paterno} ${e.apellido_materno??''}, ${e.nombres}`}
function useOperacion() {
  const [ocupado,setOcupado]=useState(false),[error,setError]=useState(''),[mensaje,setMensaje]=useState('')
  async function ejecutar(fn:()=>Promise<unknown>,ok:()=>void,mensajeExito:string) {
    setOcupado(true);setError('');setMensaje('')
    try {await fn();ok();setMensaje(mensajeExito)}catch(e){setError(getErrorMessage(e))}finally{setOcupado(false)}
  }
  return {ocupado,error,mensaje,ejecutar}
}
function Resultado({error,mensaje}:{error:string;mensaje:string}) {return <>{error&&<ErrorBanner mensaje={error}/>} {mensaje&&<p role="status" className="my-3 rounded-lg bg-success/15 p-3 text-success">{mensaje}</p>}</>}
function Nomina({estudiantes}:{estudiantes:EstudianteCurso[]}) {
  if(!estudiantes.length)return <EmptyState mensaje="No hay estudiantes inscritos en este curso."/>
  return <div className="overflow-x-auto rounded-xl bg-surface p-4"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Matrícula</th><th className="p-2">Estudiante</th><th className="p-2">Correo institucional</th><th className="p-2">Estado</th></tr></thead><tbody>{estudiantes.map(e=><tr key={e.id_estudiante} className="border-t border-border"><td className="p-2">{e.numero_matricula}</td><td className="p-2">{nombre(e)}</td><td className="p-2">{e.correo_institucional}</td><td className="p-2"><Badge estado={e.estado}/></td></tr>)}</tbody></table></div>
}
function FormularioEvaluacion({curso,evaluacion,alGuardar,bloqueado}:{curso:number;evaluacion?:EvaluacionDocente;alGuardar:()=>void;bloqueado:boolean}) {
  const op=useOperacion()
  async function enviar(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();const datos=new FormData(e.currentTarget)
    await op.ejecutar(()=>guardarEvaluacion(curso,{nombre:String(datos.get('nombre')),porcentaje:Number(datos.get('porcentaje')),fecha:String(datos.get('fecha'))||null,version:evaluacion?.version},evaluacion?.id_evaluacion),alGuardar,'Evaluación guardada.')
  }
  return <form onSubmit={enviar} className="mb-4 rounded-xl border border-border bg-surface p-4">
    <h3 className="mb-3 font-semibold">{evaluacion?'Editar evaluación':'Nueva evaluación'}</h3>
    <fieldset disabled={bloqueado||op.ocupado} className="grid gap-3 sm:grid-cols-3">
      <Input label="Nombre" name="nombre" defaultValue={evaluacion?.nombre??''} required minLength={3} maxLength={100}/>
      <Input label="Ponderación (%)" name="porcentaje" type="number" min="0.1" max="100" step="0.1" defaultValue={evaluacion?.porcentaje??''} required/>
      <Input label="Fecha (opcional)" name="fecha" type="date" defaultValue={evaluacion?.fecha?.slice(0,10)??''}/>
      <Button type="submit" cargando={op.ocupado}>Guardar evaluación</Button>
    </fieldset><Resultado {...op}/>
  </form>
}
function EditorNotas({curso,evaluacion,estudiantes,filas,alGuardar,bloqueado}:{curso:number;evaluacion:number;estudiantes:EstudianteCurso[];filas:NotaDocente[];alGuardar:()=>void;bloqueado:boolean}) {
  const [cambios,setCambios]=useState<Record<number,string>>({}),op=useOperacion()
  async function guardar(e:FormEvent) {
    e.preventDefault()
    const notas=filas.filter(n=>cambios[n.id_estudiante]!==undefined).map(n=>({id_estudiante:n.id_estudiante,nota:Number(cambios[n.id_estudiante]),version:n.version}))
    await op.ejecutar(()=>guardarNotas(curso,evaluacion,notas),alGuardar,'Calificaciones guardadas.')
  }
  return <form onSubmit={guardar} className="rounded-xl bg-surface p-4"><p className="mb-3 text-sm text-muted">Escala de 1,0 a 7,0, hasta un decimal. Los resultados finales cerrados requieren revisión administrativa.</p><Resultado {...op}/>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Estudiante</th><th className="p-2">Nota</th><th className="p-2">Condición</th></tr></thead><tbody>{filas.map(n=>{
      const e=estudiantes.find(e=>e.id_estudiante===n.id_estudiante)
      return <tr key={n.id_estudiante} className="border-t border-border"><td className="p-2">{e?nombre(e):`Estudiante #${n.id_estudiante}`}</td><td className="p-2"><input aria-label={`Nota de ${e?nombre(e):n.id_estudiante}`} className="w-24 rounded-lg border border-border bg-surface p-2" type="number" min="1" max="7" step="0.1" placeholder="Pendiente" value={cambios[n.id_estudiante]??n.nota??''} required={cambios[n.id_estudiante]!==undefined} disabled={bloqueado||op.ocupado||n.cerrado||n.estado!=='ACTIVA'} onChange={ev=>setCambios({...cambios,[n.id_estudiante]:ev.target.value})}/></td><td className="p-2">{n.cerrado?'Resultado cerrado':n.estado==='ACTIVA'?'Editable':'Inscripción finalizada'}</td></tr>
    })}</tbody></table></div>
    {!filas.length&&<EmptyState mensaje="No hay estudiantes para calificar."/>}
    <Button className="mt-3" type="submit" disabled={bloqueado||!Object.keys(cambios).length} cargando={op.ocupado}>Guardar notas modificadas</Button>
  </form>
}
function NotasEvaluacion({curso,evaluacion,estudiantes,bloqueado}:{curso:number;evaluacion:number;estudiantes:EstudianteCurso[];bloqueado:boolean}) {
  const {data,loading,error,refetch}=useFetch(()=>getNotasDocente(curso,evaluacion),[curso,evaluacion])
  const [mensaje,setMensaje]=useState('')
  if(loading)return <Spinner/>
  if(error)return <ErrorBanner mensaje={error} onRetry={refetch}/>
  return <><Resultado error="" mensaje={mensaje}/><Button variante="secondary" className="mb-3" onClick={()=>{setMensaje('');refetch()}}>Recargar notas</Button><EditorNotas curso={curso} evaluacion={evaluacion} estudiantes={estudiantes} filas={data?.notas??[]} alGuardar={()=>{setMensaje('Calificaciones guardadas.');refetch()}} bloqueado={bloqueado}/></>
}
function NotasCurso({curso,estudiantes,bloqueado}:{curso:number;estudiantes:EstudianteCurso[];bloqueado:boolean}) {
  const {data,loading,error,refetch}=useFetch(()=>getEvaluaciones(curso),[curso])
  const [seleccion,setSeleccion]=useState<number|undefined>(),[editar,setEditar]=useState(false)
  const evaluaciones=data?.evaluaciones??[]
  const elegida=evaluaciones.find(e=>e.id_evaluacion===seleccion)??evaluaciones[0]
  return <section><h2 className="mb-3 text-lg font-semibold">Evaluaciones y calificaciones</h2>
    <FormularioEvaluacion curso={curso} alGuardar={refetch} bloqueado={bloqueado}/>
    {loading?<Spinner/>:error?<ErrorBanner mensaje={error} onRetry={refetch}/>:!elegida?<EmptyState mensaje="Crea una evaluación para registrar notas."/>:<>
      <p className="mb-3 text-sm">Ponderación total configurada: {evaluaciones.reduce((s,e)=>s+Number(e.porcentaje),0)}%</p>
      <label className="mb-3 flex flex-wrap items-center gap-3">Evaluación<Select className="rounded-lg border border-border bg-surface p-2" value={elegida.id_evaluacion} onChange={e=>{setSeleccion(Number(e.target.value));setEditar(false)}}>{evaluaciones.map(e=><option key={e.id_evaluacion} value={e.id_evaluacion}>{e.nombre} · {e.porcentaje}%</option>)}</Select></label>
      <Button variante="secondary" className="mb-3" onClick={()=>setEditar(!editar)} disabled={bloqueado}>{editar?'Cerrar edición':'Editar evaluación'}</Button>
      {editar&&<FormularioEvaluacion key={`${elegida.id_evaluacion}-${elegida.version}`} curso={curso} evaluacion={elegida} alGuardar={()=>{setEditar(false);refetch()}} bloqueado={bloqueado}/>}
      <NotasEvaluacion key={elegida.id_evaluacion} curso={curso} evaluacion={elegida.id_evaluacion} estudiantes={estudiantes} bloqueado={bloqueado}/>
    </>}
  </section>
}
function Historial({curso,estudiantes}:{curso:number;estudiantes:EstudianteCurso[]}) {
  const {data,loading,error,refetch}=useFetch(()=>getHistorialDocente(curso),[curso])
  return <section><h2 className="mb-3 text-lg font-semibold">Historial de cambios</h2><p className="mb-3 text-sm text-muted">Últimas 200 operaciones del curso, con fecha y valores anteriores.</p>{loading?<Spinner/>:error?<ErrorBanner mensaje={error} onRetry={refetch}/>:!data?.historial.length?<EmptyState mensaje="No hay cambios registrados."/>:<ul className="rounded-xl bg-surface p-4">{data.historial.map(h=>{
    const e=estudiantes.find(e=>e.id_estudiante===h.detalle.id_estudiante),anterior=h.detalle.anterior,nuevo=h.detalle.nuevo
    const antes=anterior?.nota??anterior?.estado??anterior?.nombre??'Sin registro'
    const despues=typeof nuevo==='number'?nuevo:nuevo?.nota??nuevo?.estado??nuevo?.nombre??'Registro creado'
    return <li key={h.id_auditoria} className="border-b border-border py-3 last:border-0"><p className="font-medium">{h.accion.replace('DOCENTE_','').replaceAll('_',' ')}{e?` · ${nombre(e)}`:''}</p><p className="text-sm text-muted">{formatFecha(h.fecha)} · {new Date(h.fecha).toLocaleTimeString('es-CL')} · {antes} → {despues}</p>{h.detalle.id_evaluacion&&<p className="text-sm">Evaluación #{h.detalle.id_evaluacion}</p>}{h.detalle.id_clase&&<p className="text-sm">Clase #{h.detalle.id_clase}</p>}</li>
  })}</ul>}</section>
}
export function CursoDocente() {
  const {idCurso}=useParams(),id=Number(idCurso),periodo=usePeriodo()
  const {data,loading,error,refetch}=useFetch(async()=>{
    if(!Number.isInteger(id)||id<=0)throw new Error('Curso inválido')
    const [c,e]=await Promise.all([getCursosDocente(),getEstudiantesCurso(id)])
    const curso=c.cursos.find(c=>c.id_curso===id);if(!curso)throw new Error('No tienes asignado este curso')
    return {curso,estudiantes:e.estudiantes}
  },[id])
  const [pestana,setPestana]=useState('estudiantes')
  if(loading)return <Spinner/>
  if(error)return <ErrorBanner mensaje={error} onRetry={refetch}/>
  if(!data)return null
  const {curso,estudiantes}=data,bloqueado=curso.estado!=='ACTIVO'||curso.estado_periodo!=='ACTIVO'
  return <div><Link to="/docente" className="mb-3 inline-block text-sm text-primary underline">Volver a mis cursos</Link>
    <PageHeader titulo={`${curso.codigo} · ${curso.nombre}`} descripcion={`Sección ${curso.seccion} · ${curso.anio}/${curso.semestre} · ${estudiantes.length} estudiantes`}/>
    {curso.id_periodo!==periodo&&<p className="mb-3 rounded-lg bg-surface p-3 text-sm">Estás consultando el curso del período {curso.anio}/{curso.semestre}. Para cambiar de curso, vuelve a Mis cursos.</p>}
    {bloqueado&&<p className="mb-3 rounded-lg bg-surface p-3">Curso o período cerrado: solo consulta.</p>}
    <nav aria-label="Gestión del curso" className="mb-5 flex flex-wrap gap-2">{[['estudiantes','Estudiantes'],['notas','Notas'],['asistencia','Asistencia'],['historial','Historial']].map(([clave,titulo])=><Button key={clave} variante={pestana===clave?'primary':'secondary'} aria-pressed={pestana===clave} onClick={()=>setPestana(clave)}>{titulo}</Button>)}</nav>
    {pestana==='estudiantes'?<Nomina estudiantes={estudiantes}/>:pestana==='notas'?<NotasCurso key={id} curso={id} estudiantes={estudiantes} bloqueado={bloqueado}/>:pestana==='asistencia'?<AsistenciaCurso key={id} curso={id} estudiantes={estudiantes} horarios={curso.horarios} bloqueado={bloqueado}/>:<Historial key={id} curso={id} estudiantes={estudiantes}/>}
  </div>
}
