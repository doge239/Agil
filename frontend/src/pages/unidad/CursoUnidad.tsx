import { Select } from '../../components/Select'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link,useParams } from 'react-router-dom'
import { getCursosUnidad,editarCursoUnidad,asignarDocente,guardarHorarioUnidad,inscribirUnidad } from '../../api/unidad'
import type { CursoUnidad as Curso,PersonaUnidad } from '../../api/unidad'
import { useFetch } from '../../hooks/useFetch'
import { PageHeader } from '../../components/PageHeader'
import { ErrorBanner } from '../../components/ErrorBanner'
import { Spinner } from '../../components/Spinner'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { BuscarEstudiante,ResultadoUnidad } from './Compartidos'
import { nombrePersona,useOperacionUnidad } from './operacion'
import { formatHora } from '../../utils/format'
function DatosCurso({curso:c,refrescar}:{curso:Curso;refrescar:()=>void}){
  const op=useOperacionUnidad()
  async function guardar(e:FormEvent<HTMLFormElement>){e.preventDefault();const d=new FormData(e.currentTarget);await op.ejecutar(()=>editarCursoUnidad(c.id_curso,{cupo_maximo:Number(d.get('cupo')),estado:String(d.get('estado')),version:c.version}),refrescar,'Curso actualizado.')}
  return <form onSubmit={guardar} className="mb-4 rounded-xl bg-surface p-4"><h2 className="mb-3 font-semibold">Cupo y disponibilidad</h2><fieldset disabled={op.ocupado||c.estado_periodo!=='ACTIVO'} className="flex flex-wrap items-end gap-3"><Input name="cupo" label="Cupo máximo" type="number" min={Math.max(1,c.inscritos)} required defaultValue={c.cupo_maximo}/><label className="flex flex-col gap-2">Estado<Select name="estado" defaultValue={c.estado} className="rounded-lg border border-border bg-surface p-2"><option>ACTIVO</option><option>INACTIVO</option></Select></label><Button type="submit" cargando={op.ocupado}>Guardar</Button></fieldset><ResultadoUnidad {...op}/></form>
}
function Horarios({curso:c,refrescar}:{curso:Curso;refrescar:()=>void}){
  const [horarios,setHorarios]=useState(c.horarios.map(h=>({dia_semana:h.dia_semana,hora_inicio:formatHora(h.hora_inicio),hora_fin:formatHora(h.hora_fin),sala:h.sala??''}))),op=useOperacionUnidad()
  const bloqueado=c.inscritos>0||c.docentes.length>0||c.estado_periodo!=='ACTIVO'
  function cambiar(i:number,valor:Partial<(typeof horarios)[number]>){setHorarios(horarios.map((h,j)=>i===j?{...h,...valor}:h))}
  async function guardar(e:FormEvent){e.preventDefault();await op.ejecutar(()=>guardarHorarioUnidad(c.id_curso,horarios,c.version),refrescar,'Horario actualizado.')}
  return <form onSubmit={guardar} className="mb-4 rounded-xl bg-surface p-4"><h2 className="mb-3 font-semibold">Horarios</h2><p className="mb-3 text-sm text-muted">Para proteger las inscripciones, el horario se modifica antes de inscribir estudiantes y asignar docentes.</p><fieldset disabled={op.ocupado||bloqueado}>
    {horarios.map((h,i)=><div key={i} className="mb-3 flex flex-wrap items-end gap-2"><label className="flex flex-col gap-2">Día<Select aria-label={`Día del bloque ${i+1}`} value={h.dia_semana} onChange={e=>cambiar(i,{dia_semana:e.target.value})} className="rounded-lg border border-border bg-surface p-2">{['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map(d=><option key={d}>{d}</option>)}</Select></label><Input label="Inicio" type="time" required value={h.hora_inicio} onChange={e=>cambiar(i,{hora_inicio:e.target.value})}/><Input label="Término" type="time" required value={h.hora_fin} onChange={e=>cambiar(i,{hora_fin:e.target.value})}/><Input label="Sala" maxLength={50} value={h.sala} onChange={e=>cambiar(i,{sala:e.target.value})}/><Button type="button" variante="secondary" onClick={()=>setHorarios(horarios.filter((_,j)=>j!==i))}>Quitar bloque</Button></div>)}
    <div className="flex flex-wrap gap-3"><Button type="button" variante="secondary" disabled={horarios.length>=20} onClick={()=>setHorarios([...horarios,{dia_semana:'Lunes',hora_inicio:'09:00',hora_fin:'10:00',sala:''}])}>Añadir bloque</Button><Button type="submit" cargando={op.ocupado}>Guardar horarios</Button></div>
  </fieldset><ResultadoUnidad {...op}/></form>
}
function Docentes({curso:c,docentes,refrescar}:{curso:Curso;docentes:PersonaUnidad[];refrescar:()=>void}){
  const op=useOperacionUnidad(),[quitar,setQuitar]=useState(false)
  async function guardar(e:FormEvent<HTMLFormElement>){e.preventDefault();const d=new FormData(e.currentTarget);await op.ejecutar(()=>asignarDocente(c.id_curso,Number(d.get('docente')),String(d.get('motivo')),!quitar),refrescar,'Asignación actualizada.')}
  return <form onSubmit={guardar} className="mb-4 rounded-xl bg-surface p-4"><h2 className="mb-3 font-semibold">Asignación de docentes</h2><p className="mb-3 text-sm">Asignados: {c.docentes.map(id=>{const p=docentes.find(p=>p.id_docente===id);return p?nombrePersona(p):`Docente #${id}`}).join('; ')||'Ninguno'}</p><fieldset disabled={op.ocupado||c.estado_periodo!=='ACTIVO'} className="flex flex-col gap-3"><label className="flex flex-col gap-2">Operación<Select className="rounded-lg border border-border bg-surface p-2" value={quitar?'retirar':'asignar'} onChange={e=>setQuitar(e.target.value==='retirar')}><option value="asignar">Asignar docente</option><option value="retirar">Retirar asignación</option></Select></label><label className="flex flex-col gap-2">Docente<Select required name="docente" className="rounded-lg border border-border bg-surface p-2"><option value="">Selecciona un docente</option>{docentes.filter(p=>quitar?c.docentes.includes(p.id_docente!):!c.docentes.includes(p.id_docente!)).map(p=><option key={p.id_docente} value={p.id_docente}>{nombrePersona(p)}</option>)}</Select></label><Input label="Motivo" name="motivo" minLength={10} maxLength={1000} required/><Button type="submit" cargando={op.ocupado}>{quitar?'Retirar docente':'Asignar docente'}</Button></fieldset><ResultadoUnidad {...op}/></form>
}
function InscripcionManual({curso:c,refrescar}:{curso:Curso;refrescar:()=>void}){
  const [persona,setPersona]=useState<PersonaUnidad|null>(null),op=useOperacionUnidad()
  async function guardar(e:FormEvent<HTMLFormElement>){e.preventDefault();const d=new FormData(e.currentTarget);await op.ejecutar(()=>inscribirUnidad(c.id_curso,persona!.id_estudiante!,String(d.get('motivo'))),()=>{setPersona(null);refrescar()},'Estudiante inscrito.')}
  return <section><h2 className="mb-3 font-semibold">Inscripción manual</h2><p className="mb-3 text-sm text-muted">Se aplican las mismas reglas de cupo, plan, restricciones, prerrequisitos y horario que en la inscripción estudiantil.</p><BuscarEstudiante alElegir={setPersona}/>{persona&&<form onSubmit={guardar} className="rounded-xl bg-surface p-4"><p className="mb-3">Estudiante seleccionado: {nombrePersona(persona)} · {persona.numero_matricula}</p><fieldset disabled={op.ocupado||c.estado_periodo!=='ACTIVO'||c.estado!=='ACTIVO'} className="flex flex-col gap-3"><Input label="Motivo de inscripción manual" name="motivo" minLength={10} maxLength={1000} required/><Button type="submit" cargando={op.ocupado}>Inscribir estudiante</Button></fieldset></form>}<ResultadoUnidad {...op}/></section>
}
export function CursoUnidad(){
  const {idCurso}=useParams(),id=Number(idCurso)
  const {data,loading,error,refetch}=useFetch(async()=>{const datos=await getCursosUnidad();const curso=datos.cursos.find(c=>c.id_curso===id);if(!curso)throw new Error('El curso no pertenece a tu unidad');return {curso,docentes:datos.docentes}},[id])
  if(loading)return <Spinner/>
  if(error)return <ErrorBanner mensaje={error} onRetry={refetch}/>
  if(!data)return null
  const {curso,docentes}=data
  return <div><Link to="/unidad" className="mb-3 inline-block text-primary underline">Volver a cursos</Link><PageHeader titulo={`${curso.codigo} · ${curso.nombre}`} descripcion={`Sección ${curso.seccion} · ${curso.anio}/${curso.semestre} · ${curso.inscritos}/${curso.cupo_maximo} inscritos`}/><DatosCurso key={`datos-${curso.version}`} curso={curso} refrescar={refetch}/><Docentes curso={curso} docentes={docentes} refrescar={refetch}/><Horarios key={`horario-${curso.version}`} curso={curso} refrescar={refetch}/><InscripcionManual curso={curso} refrescar={refetch}/></div>
}
