import { Select } from '../../components/Select'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { getCursosGeneral,getUnidadesGeneral,getOfertaGeneral,crearCursoGeneral,editarCursoGeneral } from '../../api/gestionGeneral'
import type { CursoGeneral } from '../../api/gestionGeneral'
import { getPeriodosGeneral } from '../../api/general'
import { useFetch } from '../../hooks/useFetch'
import { PageHeader } from '../../components/PageHeader'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Badge } from '../../components/Badge'
import { Spinner } from '../../components/Spinner'
import { ErrorBanner } from '../../components/ErrorBanner'
import { EmptyState } from '../../components/EmptyState'
import { useOperacionUnidad } from '../unidad/operacion'
import { ResultadoUnidad } from '../unidad/Compartidos'
import { panelGeneral,selectGeneral } from './GestionCatalogo'
function EditarCurso({c,refrescar}:{c:CursoGeneral;refrescar:()=>void}){
  const op=useOperacionUnidad()
  async function guardar(e:FormEvent<HTMLFormElement>){e.preventDefault();const d=new FormData(e.currentTarget);await op.ejecutar(()=>editarCursoGeneral(c,{cupo_maximo:Number(d.get('cupo')),estado:String(d.get('estado')),motivo:String(d.get('motivo'))}),refrescar,'Curso actualizado.')}
  return <article className={panelGeneral}>
    <Badge estado={c.estado}/><h2 className="my-2 font-semibold">{c.codigo} · {c.nombre}</h2>
    <p className="text-sm text-muted">{c.unidad} · {c.anio}/{c.semestre} · Sección {c.seccion}</p><p className="my-2">{c.inscritos}/{c.cupo_maximo} inscritos</p>
    {c.horarios.map(h=><p className="text-sm text-muted" key={h.id_horario}>{h.dia_semana} · {h.hora_inicio}–{h.hora_fin} · {h.sala??'Sin sala'}</p>)}
    {c.estado_periodo==='ACTIVO'?<details className="mt-3"><summary className="cursor-pointer text-primary">Administrar curso</summary><form onSubmit={guardar} className="mt-3 flex flex-col gap-3"><Input label="Cupo máximo" id={`cupo-${c.id_curso}`} name="cupo" type="number" min={Math.max(1,c.inscritos)} max={2147483647} defaultValue={c.cupo_maximo} required/><label className="flex flex-col gap-1">Estado<Select name="estado" className={selectGeneral} defaultValue={c.estado}><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option></Select></label><Input label="Motivo" id={`motivo-curso-${c.id_curso}`} name="motivo" minLength={10} maxLength={2000} required/><Button type="submit" cargando={op.ocupado}>Guardar curso</Button><ResultadoUnidad {...op}/></form></details>:<p className="mt-3 text-sm text-muted">Período cerrado: solo consulta.</p>}
  </article>
}
export function CursosGeneral(){
  const [unidad,setUnidad]=useState(''),[periodo,setPeriodo]=useState(''),[q,setQ]=useState('')
  const cursos=useFetch(()=>getCursosGeneral(periodo?Number(periodo):undefined,unidad?Number(unidad):undefined),[periodo,unidad])
  const unidades=useFetch(getUnidadesGeneral,[]),periodos=useFetch(getPeriodosGeneral,[])
  const oferta=useFetch(()=>unidad?getOfertaGeneral(Number(unidad)):Promise.resolve({asignaturas:[]}),[unidad]),op=useOperacionUnidad()
  async function crear(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=e.currentTarget,d=new FormData(f);await op.ejecutar(()=>crearCursoGeneral({id_unidad:Number(unidad),id_periodo:Number(d.get('periodo')),id_asignatura:Number(d.get('asignatura')),seccion:Number(d.get('seccion')),cupo_maximo:Number(d.get('cupo')),motivo:String(d.get('motivo'))}),()=>{f.reset();cursos.refetch()},'Curso registrado.')}
  const error=unidades.error||periodos.error
  const filas=cursos.data?.cursos.filter(c=>`${c.codigo} ${c.nombre} ${c.unidad}`.toLowerCase().includes(q.toLowerCase()))??[]
  return <div><PageHeader titulo="Gestión general de cursos" descripcion="Registra y administra la oferta de todas las unidades académicas."/>
    {error&&<ErrorBanner mensaje={error} onRetry={()=>{unidades.refetch();periodos.refetch()}}/>}
    <div className={`${panelGeneral} grid gap-3 sm:grid-cols-3`}>
      <label className="flex flex-col gap-1">Unidad<Select className={selectGeneral} value={unidad} onChange={e=>setUnidad(e.target.value)}><option value="">Todas las unidades</option>{unidades.data?.unidades.map(u=><option key={u.id_unidad} value={u.id_unidad}>{u.codigo} · {u.nombre}</option>)}</Select></label>
      <label className="flex flex-col gap-1">Período<Select className={selectGeneral} value={periodo} onChange={e=>setPeriodo(e.target.value)}><option value="">Todos los períodos</option>{periodos.data?.periodos.map(p=><option key={p.id_periodo} value={p.id_periodo}>{p.anio} · Semestre {p.semestre}</option>)}</Select></label>
      <Input label="Buscar curso" name="buscar-curso" value={q} onChange={e=>setQ(e.target.value)}/>
    </div>
    <details className={panelGeneral}><summary className="cursor-pointer font-semibold">Registrar curso</summary>{!unidad?<p className="mt-3">Selecciona una unidad en el filtro para registrar sus cursos.</p>:<form key={unidad} onSubmit={crear} className="mt-4 grid gap-3 sm:grid-cols-2">
      <fieldset disabled={oferta.loading||!!oferta.error||!oferta.data?.asignaturas.length} className="contents">
        <label className="flex flex-col gap-1">Asignatura de un plan activo<Select name="asignatura" className={selectGeneral} required><option value="">Selecciona asignatura</option>{oferta.data?.asignaturas.map(a=><option key={a.id_asignatura} value={a.id_asignatura}>{a.codigo} · {a.nombre}</option>)}</Select></label>
        <label className="flex flex-col gap-1">Período de creación<Select name="periodo" className={selectGeneral} defaultValue={periodo} required><option value="">Selecciona período activo</option>{periodos.data?.periodos.filter(p=>p.estado==='ACTIVO').map(p=><option key={p.id_periodo} value={p.id_periodo}>{p.anio} · Semestre {p.semestre}</option>)}</Select></label>
        <Input label="Sección" name="seccion" type="number" min={1} max={2147483647} required/><Input label="Cupo máximo" name="cupo" type="number" min={1} max={2147483647} required/><Input label="Motivo" name="motivo" minLength={10} maxLength={2000} required/><Button type="submit" cargando={op.ocupado}>Registrar curso</Button>
      </fieldset>
      {oferta.error&&<ErrorBanner mensaje={oferta.error} onRetry={oferta.refetch}/>}{!oferta.loading&&!oferta.error&&!oferta.data?.asignaturas.length&&<p>No hay asignaturas de planes activos para esta unidad.</p>}<ResultadoUnidad {...op}/>
    </form>}</details>
    {cursos.loading?<Spinner/>:cursos.error?<ErrorBanner mensaje={cursos.error} onRetry={cursos.refetch}/>:!filas.length?<EmptyState mensaje="No hay cursos para esta selección."/>:<div className="grid gap-4 lg:grid-cols-2">{filas.map(c=><EditarCurso key={`${c.id_curso}-${c.version}`} c={c} refrescar={cursos.refetch}/>)}</div>}
  </div>
}
