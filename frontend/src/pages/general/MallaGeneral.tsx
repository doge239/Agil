import { Select } from '../../components/Select'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link,useParams } from 'react-router-dom'
import { cambiarEstadoPlan,getAsignaturasGeneral,getMallaGeneral,guardarMallaGeneral } from '../../api/gestionGeneral'
import type { AsignaturaGeneral,FilaMalla,PlanGeneral } from '../../api/gestionGeneral'
import { useFetch } from '../../hooks/useFetch'
import { PageHeader } from '../../components/PageHeader'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Badge } from '../../components/Badge'
import { Spinner } from '../../components/Spinner'
import { ErrorBanner } from '../../components/ErrorBanner'
import { useOperacionUnidad } from '../unidad/operacion'
import { ResultadoUnidad } from '../unidad/Compartidos'
import { panelGeneral,selectGeneral } from './GestionCatalogo'

function EditorMalla({plan,inicial,asignaturas,refrescar}:{plan:PlanGeneral;inicial:FilaMalla[];asignaturas:AsignaturaGeneral[];refrescar:()=>void}){
  const [filas,setFilas]=useState(inicial),[nueva,setNueva]=useState(''),[sucia,setSucia]=useState(false)
  const op=useOperacionUnidad(),estado=useOperacionUnidad(),editable=plan.estado==='BORRADOR'&&plan.gestionado
  function editar(index:number,patch:Partial<FilaMalla>){setFilas(filas.map((f,i)=>i===index?{...f,...patch}:f));setSucia(true)}
  function agregar(){if(!nueva)return;setFilas([...filas,{id_asignatura:Number(nueva),semestre:1,orden:filas.length+1,obligatoria:true,requisitos_estado:'CONFIRMADOS',requisito_nivel:null,espacio_electivo:false,fuente:null,prerrequisitos:[],opciones:[]}]);setNueva('');setSucia(true)}
  async function guardar(e:FormEvent<HTMLFormElement>){e.preventDefault();const d=new FormData(e.currentTarget);await op.ejecutar(()=>guardarMallaGeneral(plan,filas,String(d.get('motivo-malla'))),refrescar,'Borrador guardado.')}
  async function publicar(e:FormEvent<HTMLFormElement>){e.preventDefault();const d=new FormData(e.currentTarget);await estado.ejecutar(()=>cambiarEstadoPlan(plan,String(d.get('estado')),String(d.get('motivo-estado'))),refrescar,'Estado actualizado.')}
  const nombre=(id:number)=>{const a=asignaturas.find(a=>a.id_asignatura===id);return a?`${a.codigo??'Sin código'} · ${a.nombre}`:`Asignatura #${id}`}
  return <>
    <p className="mb-4 text-sm text-muted">{editable?'Edita el borrador, guárdalo y publica la versión guardada. Los prerrequisitos deben pertenecer a semestres anteriores de esta malla.':'La estructura publicada se conserva. Para mantenerla, vuelve a los planes y crea una copia en borrador.'}</p>
    {editable&&<div className={`${panelGeneral} flex flex-wrap items-end gap-3`}><label className="flex min-w-0 flex-1 flex-col gap-1">Agregar asignatura<Select className={selectGeneral} value={nueva} onChange={e=>setNueva(e.target.value)}><option value="">Selecciona una asignatura del catálogo</option>{asignaturas.filter(a=>a.estado==='ACTIVA'&&!filas.some(f=>f.id_asignatura===a.id_asignatura)).map(a=><option value={a.id_asignatura} key={a.id_asignatura}>{nombre(a.id_asignatura)}</option>)}</Select></label><Button onClick={agregar} disabled={!nueva||filas.length>=200}>Agregar a la malla</Button></div>}
    <form onSubmit={guardar}>
      <fieldset disabled={!editable||op.ocupado}>
        {filas.length===0&&<p className={panelGeneral}>La malla está vacía. Agrega asignaturas antes de publicar.</p>}
        {filas.map((f,index)=><details key={f.id_asignatura} className={panelGeneral}>
          <summary className="cursor-pointer font-semibold">Semestre {f.semestre} · {nombre(f.id_asignatura)}{f.espacio_electivo?' · Espacio electivo':''}</summary>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Input label="Semestre" id={`semestre-${f.id_asignatura}`} type="number" min={1} max={20} value={f.semestre} onChange={e=>editar(index,{semestre:Number(e.target.value)})} required/>
            <Input label="Orden dentro del semestre" id={`orden-${f.id_asignatura}`} type="number" min={0} max={200} value={f.orden} onChange={e=>editar(index,{orden:Number(e.target.value)})} required/>
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.obligatoria} onChange={e=>editar(index,{obligatoria:e.target.checked})}/>Asignatura obligatoria</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.espacio_electivo} onChange={e=>editar(index,{espacio_electivo:e.target.checked,opciones:e.target.checked?f.opciones:[]})}/>Espacio electivo</label>
            <label className="flex flex-col gap-1">Estado de requisitos<Select className={selectGeneral} value={f.requisitos_estado} onChange={e=>editar(index,{requisitos_estado:e.target.value})}><option value="CONFIRMADOS">Confirmados</option><option value="POR_CONFIRMAR">Por confirmar (bloquea inscripción)</option></Select></label>
            <Input label="Nivel completo requerido (opcional)" id={`nivel-${f.id_asignatura}`} type="number" min={1} max={7} value={f.requisito_nivel??''} onChange={e=>editar(index,{requisito_nivel:e.target.value?Number(e.target.value):null})}/>
            <label className="flex flex-col gap-1">Prerrequisitos<Select multiple size={4} className={selectGeneral} value={f.prerrequisitos.map(String)} onChange={e=>editar(index,{prerrequisitos:Array.from(e.target.selectedOptions,o=>Number(o.value))})}>{filas.filter(r=>r.id_asignatura!==f.id_asignatura).map(r=><option key={r.id_asignatura} value={r.id_asignatura}>{nombre(r.id_asignatura)}</option>)}</Select></label>
            {f.espacio_electivo&&<label className="flex flex-col gap-1">Asignaturas que pueden ocupar este electivo<Select multiple size={4} className={selectGeneral} value={f.opciones.map(String)} onChange={e=>editar(index,{opciones:Array.from(e.target.selectedOptions,o=>Number(o.value))})}>{asignaturas.filter(a=>a.estado==='ACTIVA'&&!filas.some(r=>r.id_asignatura===a.id_asignatura)).map(a=><option key={a.id_asignatura} value={a.id_asignatura}>{nombre(a.id_asignatura)}</option>)}</Select></label>}
            <Input label="Fuente o referencia (opcional)" id={`fuente-${f.id_asignatura}`} maxLength={2000} value={f.fuente??''} onChange={e=>editar(index,{fuente:e.target.value||null})}/>
            {editable&&<Button variante="secondary" onClick={()=>{setFilas(filas.filter((_,i)=>i!==index).map(r=>({...r,prerrequisitos:r.prerrequisitos.filter(id=>id!==f.id_asignatura)})));setSucia(true)}}>Quitar del borrador</Button>}
          </div>
        </details>)}
      </fieldset>
      {editable&&<div className={panelGeneral}><p className="mb-3 text-sm text-muted">Para seleccionar varios requisitos u opciones, usa Ctrl (o Cmd) al seleccionar. Quitar una asignatura también la quita de los requisitos de este borrador.</p><Input label="Motivo de mantención de la malla" name="motivo-malla" minLength={10} maxLength={2000} required/><Button className="mt-3" type="submit" cargando={op.ocupado}>Guardar borrador</Button><ResultadoUnidad {...op}/></div>}
    </form>
    <form onSubmit={publicar} className={panelGeneral}>
      <h2 className="mb-3 font-semibold">Estado del plan guardado</h2>
      <label className="flex flex-col gap-1">Cambiar estado<Select name="estado" className={selectGeneral} defaultValue={plan.estado}>{plan.estado==='BORRADOR'&&<option value="BORRADOR">Mantener borrador</option>}<option value="ACTIVO">Publicar / activar</option><option value="INACTIVO">Desactivar</option></Select></label>
      <Input label="Motivo de publicación o cambio de estado" name="motivo-estado" minLength={10} maxLength={2000} required/>
      {sucia&&<p className="my-3 text-sm text-muted">Guarda los cambios de la malla antes de modificar el estado.</p>}
      <Button className="mt-3" type="submit" disabled={sucia} cargando={estado.ocupado}>Actualizar estado del plan</Button><ResultadoUnidad {...estado}/>
    </form>
  </>
}
export function MallaGeneral(){
  const id=Number(useParams().idPlan),malla=useFetch(()=>getMallaGeneral(id),[id]),asignaturas=useFetch(getAsignaturasGeneral,[])
  const error=malla.error||asignaturas.error
  return <div><PageHeader titulo="Mantención de malla curricular" descripcion={malla.data?.plan.nombre??'Plan de estudio'}/>
    {malla.data&&<div className="mb-4 flex flex-wrap items-center gap-3"><Badge estado={malla.data.plan.estado}/><Link className="text-primary underline" to={`/general/carreras/${malla.data.plan.id_carrera}/planes`}>Volver a los planes de la carrera</Link></div>}
    {malla.loading||asignaturas.loading?<Spinner/>:error?<ErrorBanner mensaje={error} onRetry={()=>{malla.refetch();asignaturas.refetch()}}/>:malla.data&&<EditorMalla key={`${id}-${malla.data.plan.version}`} plan={malla.data.plan} inicial={malla.data.malla} asignaturas={asignaturas.data?.asignaturas??[]} refrescar={malla.refetch}/>}
  </div>
}
