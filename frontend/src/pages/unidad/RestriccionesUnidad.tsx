import { useState } from 'react'
import type { FormEvent } from 'react'
import { getRestriccionesUnidad,crearRestriccionUnidad,levantarRestriccion } from '../../api/unidad'
import type { PersonaUnidad,RestriccionUnidad } from '../../api/unidad'
import { useFetch } from '../../hooks/useFetch'
import { PageHeader } from '../../components/PageHeader'
import { ErrorBanner } from '../../components/ErrorBanner'
import { Spinner } from '../../components/Spinner'
import { EmptyState } from '../../components/EmptyState'
import { Badge } from '../../components/Badge'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { BuscarEstudiante,ResultadoUnidad } from './Compartidos'
import { useOperacionUnidad,nombrePersona } from './operacion'
function Levantamiento({r,refrescar}:{r:RestriccionUnidad;refrescar:()=>void}){
  const op=useOperacionUnidad()
  async function enviar(e:FormEvent<HTMLFormElement>){e.preventDefault();const d=new FormData(e.currentTarget);await op.ejecutar(()=>levantarRestriccion(r.id_restriccion,String(d.get('motivo')),r.version),refrescar,'Restricción levantada.')}
  return <form onSubmit={enviar} className="mt-3 flex flex-col gap-3"><Input label="Motivo de levantamiento" name="motivo" minLength={10} maxLength={2000} required/><Button type="submit" cargando={op.ocupado}>Levantar restricción</Button><ResultadoUnidad {...op}/></form>
}
export function RestriccionesUnidad(){
  const {data,loading,error,refetch}=useFetch(getRestriccionesUnidad,[]),op=useOperacionUnidad(),[persona,setPersona]=useState<PersonaUnidad|null>(null)
  async function crear(e:FormEvent<HTMLFormElement>){e.preventDefault();const d=new FormData(e.currentTarget);await op.ejecutar(()=>crearRestriccionUnidad(persona!.id_estudiante!,String(d.get('tipo')),String(d.get('descripcion'))),()=>{setPersona(null);refetch()},'Restricción creada.')}
  return <div><PageHeader titulo="Restricciones de la unidad" descripcion="Crea restricciones y levántalas con motivo registrado. Las restricciones globales corresponden a Administración General."/><BuscarEstudiante alElegir={setPersona}/>{persona&&<form onSubmit={crear} className="mb-4 flex flex-col gap-3 rounded-xl bg-surface p-4"><h2 className="font-semibold">Nueva restricción para {nombrePersona(persona)}</h2><Input label="Tipo" name="tipo" minLength={3} maxLength={100} required/><Input label="Descripción" name="descripcion" minLength={10} maxLength={2000} required/><Button type="submit" cargando={op.ocupado}>Crear restricción de unidad</Button></form>}<ResultadoUnidad {...op}/>
    {loading?<Spinner/>:error?<ErrorBanner mensaje={error} onRetry={refetch}/>:!data?.restricciones.length?<EmptyState mensaje="No hay restricciones de tu unidad."/>:data.restricciones.map(r=><article key={r.id_restriccion} className="mb-4 rounded-xl bg-surface p-4"><Badge estado={r.activa?'ACTIVA':'LEVANTADA'}/><h2 className="mt-2 font-semibold">{r.tipo} · Estudiante #{r.id_estudiante}</h2><p className="whitespace-pre-wrap">{r.descripcion}</p>{r.activa?<Levantamiento r={r} refrescar={refetch}/>:<p className="mt-2 text-sm text-muted">Motivo: {r.motivo_levantamiento??'Resolución registrada en solicitud'}</p>}</article>)}
  </div>
}
