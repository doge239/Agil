import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getAsignaturasGeneral,getCarrerasGeneral,getUnidadesGeneral,guardarAsignaturaGeneral,guardarCarreraGeneral,getPlanesGeneral,crearPlanGeneral } from '../../api/gestionGeneral'
import type { CarreraGeneral,AsignaturaGeneral,UnidadGeneral } from '../../api/gestionGeneral'
import { useFetch } from '../../hooks/useFetch'
import { PageHeader } from '../../components/PageHeader'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Badge } from '../../components/Badge'
import { Spinner } from '../../components/Spinner'
import { ErrorBanner } from '../../components/ErrorBanner'
import { EmptyState } from '../../components/EmptyState'
import { useOperacionUnidad } from '../unidad/operacion'
import { ResultadoUnidad } from '../unidad/Compartidos'
export const panelGeneral='mb-4 rounded-xl border border-border bg-surface p-5'
export const selectGeneral='rounded-lg border border-border bg-surface p-2'

function FormCarrera({c,unidades,refrescar,cerrar}:{c:CarreraGeneral|null;unidades:UnidadGeneral[];refrescar:()=>void;cerrar:()=>void}){
  const op=useOperacionUnidad()
  async function guardar(e:FormEvent<HTMLFormElement>){
    e.preventDefault();const d=new FormData(e.currentTarget)
    await op.ejecutar(()=>guardarCarreraGeneral({id_unidad:Number(d.get('unidad')),codigo:String(d.get('codigo')),nombre:String(d.get('nombre')),estado:String(d.get('estado')),motivo:String(d.get('motivo')),version:c?.version},c?.id_carrera),()=>{refrescar();cerrar()},'Carrera guardada.')
  }
  return <form onSubmit={guardar} className={`${panelGeneral} grid gap-3 sm:grid-cols-2`}>
    <h2 className="font-semibold sm:col-span-2">{c?'Editar carrera':'Crear carrera'}</h2>
    <Input label="Código" name="codigo" defaultValue={c?.codigo} maxLength={20} required/>
    <Input label="Nombre" name="nombre" defaultValue={c?.nombre} minLength={3} maxLength={150} required/>
    <label className="flex flex-col gap-1">Unidad académica<select name="unidad" className={selectGeneral} defaultValue={c?.id_unidad??''} required><option value="">Selecciona unidad</option>{unidades.filter(u=>u.activo||u.id_unidad===c?.id_unidad).map(u=><option key={u.id_unidad} value={u.id_unidad}>{u.codigo} · {u.nombre}</option>)}</select></label>
    <label className="flex flex-col gap-1">Estado<select name="estado" className={selectGeneral} defaultValue={c?.estado??'ACTIVA'}><option value="ACTIVA">Activa</option><option value="INACTIVA">Inactiva</option></select></label>
    <Input label="Motivo" name="motivo" minLength={10} maxLength={2000} required/>
    <div className="flex items-end gap-2"><Button type="submit" cargando={op.ocupado}>Guardar carrera</Button><Button variante="secondary" onClick={cerrar}>Cancelar</Button></div>
    <ResultadoUnidad {...op}/>
  </form>
}
export function CarrerasGeneral(){
  const carreras=useFetch(getCarrerasGeneral,[]),unidades=useFetch(getUnidadesGeneral,[])
  const [editar,setEditar]=useState<CarreraGeneral|null|undefined>(),[q,setQ]=useState('')
  const error=carreras.error||unidades.error
  return <div><PageHeader titulo="Carreras" descripcion="Administra el catálogo institucional de carreras y sus planes de estudio."/>
    <div className="mb-4 flex flex-wrap items-end gap-3"><Input label="Buscar por nombre o código" name="buscar-carrera" value={q} onChange={e=>setQ(e.target.value)}/><Button onClick={()=>setEditar(null)}>Crear carrera</Button></div>
    {editar!==undefined&&<FormCarrera key={editar?.id_carrera??'nueva'} c={editar} unidades={unidades.data?.unidades??[]} refrescar={carreras.refetch} cerrar={()=>setEditar(undefined)}/>}
    {carreras.loading||unidades.loading?<Spinner/>:error?<ErrorBanner mensaje={error} onRetry={()=>{carreras.refetch();unidades.refetch()}}/>:!carreras.data?.carreras.length?<EmptyState mensaje="No hay carreras registradas."/>:carreras.data.carreras.filter(c=>`${c.codigo} ${c.nombre}`.toLowerCase().includes(q.toLowerCase())).map(c=><article className={panelGeneral} key={c.id_carrera}><Badge estado={c.estado}/><h2 className="my-2 text-lg font-semibold">{c.codigo} · {c.nombre}</h2><p className="mb-3 text-muted">{c.unidad_academica}</p><div className="flex flex-wrap items-center gap-4"><Button variante="secondary" onClick={()=>setEditar(c)}>Editar carrera</Button><Link className="text-primary underline" to={`/general/carreras/${c.id_carrera}/planes`}>Gestionar planes y mallas</Link></div></article>)}
  </div>
}
function FormAsignatura({a,refrescar,cerrar}:{a:AsignaturaGeneral|null;refrescar:()=>void;cerrar:()=>void}){
  const op=useOperacionUnidad()
  async function guardar(e:FormEvent<HTMLFormElement>){
    e.preventDefault();const d=new FormData(e.currentTarget),codigo=String(d.get('codigo')),creditos=String(d.get('creditos'))
    await op.ejecutar(()=>guardarAsignaturaGeneral({codigo:codigo||null,creditos:creditos===''?null:Number(creditos),nombre:String(d.get('nombre')),descripcion:String(d.get('descripcion')),estado:String(d.get('estado')),version:a?.version,motivo:String(d.get('motivo'))},a?.id_asignatura),()=>{refrescar();cerrar()},'Asignatura guardada.')
  }
  return <form onSubmit={guardar} className={`${panelGeneral} grid gap-3 sm:grid-cols-2`}>
    <h2 className="font-semibold sm:col-span-2">{a?'Editar asignatura':'Crear asignatura'}</h2>
    <Input label="Código" name="codigo" defaultValue={a?.codigo??''} maxLength={20} required={!a||a.codigo!==null}/>
    <Input label="Nombre" name="nombre" defaultValue={a?.nombre} minLength={3} maxLength={150} required/>
    <Input label="Créditos" name="creditos" type="number" min={0} max={60} defaultValue={a?.creditos??''} required={!a||a.creditos!==null}/>
    <label className="flex flex-col gap-1">Estado<select name="estado" className={selectGeneral} defaultValue={a?.estado??'ACTIVA'}><option value="ACTIVA">Activa</option><option value="INACTIVA">Inactiva</option></select></label>
    <Input label="Descripción" name="descripcion" defaultValue={a?.descripcion??''} maxLength={4000}/>
    <Input label="Motivo" name="motivo" minLength={10} maxLength={2000} required/>
    <p className="text-sm text-muted sm:col-span-2">Si una asignatura ya está en una malla, su código y créditos se conservan. Para cambiarlos, registra otra asignatura.</p>
    <div className="flex gap-2"><Button type="submit" cargando={op.ocupado}>Guardar asignatura</Button><Button variante="secondary" onClick={cerrar}>Cancelar</Button></div><ResultadoUnidad {...op}/>
  </form>
}
export function AsignaturasGeneral(){
  const {data,loading,error,refetch}=useFetch(getAsignaturasGeneral,[])
  const [editar,setEditar]=useState<AsignaturaGeneral|null|undefined>(),[q,setQ]=useState('')
  const resultados=data?.asignaturas.filter(a=>`${a.codigo??''} ${a.nombre}`.toLowerCase().includes(q.toLowerCase()))??[]
  return <div><PageHeader titulo="Catálogo de asignaturas" descripcion="Registra asignaturas y mantén sus datos, créditos y disponibilidad."/>
    <div className="mb-4 flex flex-wrap items-end gap-3"><Input label="Buscar por nombre o código" name="buscar-asignatura" value={q} onChange={e=>setQ(e.target.value)}/><Button onClick={()=>setEditar(null)}>Crear asignatura</Button></div>
    {editar!==undefined&&<FormAsignatura key={editar?.id_asignatura??'nueva'} a={editar} refrescar={refetch} cerrar={()=>setEditar(undefined)}/>}
    {loading?<Spinner/>:error?<ErrorBanner mensaje={error} onRetry={refetch}/>:!resultados.length?<EmptyState mensaje="No hay asignaturas para esta búsqueda."/>:<div className="grid gap-4 lg:grid-cols-2">{resultados.map(a=><article className={panelGeneral} key={a.id_asignatura}><Badge estado={a.estado}/><h2 className="my-2 font-semibold">{a.codigo??'Código pendiente'} · {a.nombre}</h2><p>Créditos: {a.creditos??'Por confirmar'}</p><p className="my-2 text-sm text-muted">{a.descripcion}</p><Button variante="secondary" onClick={()=>setEditar(a)}>Editar asignatura</Button></article>)}</div>}
  </div>
}
export function PlanesGeneral(){
  const carrera=Number(useParams().idCarrera),op=useOperacionUnidad()
  const planes=useFetch(()=>getPlanesGeneral(carrera),[carrera]),carreras=useFetch(getCarrerasGeneral,[])
  const nombre=carreras.data?.carreras.find(c=>c.id_carrera===carrera)?.nombre??`Carrera #${carrera}`
  async function crear(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=e.currentTarget,d=new FormData(f);await op.ejecutar(()=>crearPlanGeneral(carrera,{nombre:String(d.get('nombre')),anio_inicio:Number(d.get('anio')),motivo:String(d.get('motivo')),id_plan_origen:d.get('origen')?Number(d.get('origen')):null}),()=>{f.reset();planes.refetch()},'Borrador creado.')}
  return <div><PageHeader titulo="Planes y mallas curriculares" descripcion={nombre}/><Link className="mb-4 inline-block text-primary underline" to="/general/carreras">Volver a carreras</Link>
    <details className={panelGeneral}><summary className="cursor-pointer font-semibold">Crear plan de estudio</summary><form onSubmit={crear} className="mt-4 grid gap-3 sm:grid-cols-2"><Input label="Nombre del plan" name="nombre" minLength={3} maxLength={100} required/><Input label="Año de inicio" name="anio" type="number" min={2000} max={2200} required/><label className="flex flex-col gap-1">Contenido inicial<select name="origen" className={selectGeneral}><option value="">Malla vacía</option>{planes.data?.planes.map(p=><option key={p.id_plan} value={p.id_plan}>Copiar {p.nombre} · {p.estado}</option>)}</select></label><Input label="Motivo" name="motivo" minLength={10} maxLength={2000} required/><Button type="submit" cargando={op.ocupado}>Crear borrador</Button><ResultadoUnidad {...op}/></form></details>
    {planes.loading?<Spinner/>:planes.error?<ErrorBanner mensaje={planes.error} onRetry={planes.refetch}/>:!planes.data?.planes.length?<EmptyState mensaje="No hay planes. Crea el primer borrador."/>:planes.data.planes.map(p=><article key={p.id_plan} className={panelGeneral}><Badge estado={p.estado}/><h2 className="my-2 font-semibold">{p.nombre} · {p.anio_inicio}</h2><Link className="text-primary underline" to={`/general/planes/${p.id_plan}`}>{p.estado==='BORRADOR'?'Editar y publicar malla':'Consultar malla y administrar estado'}</Link></article>)}
  </div>
}
