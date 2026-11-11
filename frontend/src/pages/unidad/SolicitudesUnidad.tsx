import { Select } from '../../components/Select'
import type { FormEvent } from 'react'
import { getSolicitudesUnidad,resolverSolicitudUnidad } from '../../api/unidad'
import type { Solicitud } from '../../types/api'
import { useFetch } from '../../hooks/useFetch'
import { PageHeader } from '../../components/PageHeader'
import { ErrorBanner } from '../../components/ErrorBanner'
import { Spinner } from '../../components/Spinner'
import { EmptyState } from '../../components/EmptyState'
import { Badge } from '../../components/Badge'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { ResultadoUnidad } from './Compartidos'
import { useOperacionUnidad } from './operacion'
import { formatFecha } from '../../utils/format'
function Resolucion({s,refrescar}:{s:Solicitud;refrescar:()=>void}){
  const op=useOperacionUnidad()
  async function enviar(e:FormEvent<HTMLFormElement>){e.preventDefault();const d=new FormData(e.currentTarget);await op.ejecutar(()=>resolverSolicitudUnidad(s.id_solicitud,String(d.get('estado')),String(d.get('resolucion'))),refrescar,'Solicitud resuelta.')}
  return <form onSubmit={enviar} className="mt-3 flex flex-col gap-3"><label className="flex flex-col gap-2">Decisión<Select name="estado" className="rounded-lg border border-border bg-surface p-2"><option value="APROBADA">Aprobar y levantar restricción</option><option value="RECHAZADA">Rechazar solicitud</option></Select></label><Input label="Motivo de resolución" name="resolucion" minLength={10} maxLength={2000} required/><Button type="submit" cargando={op.ocupado}>Resolver solicitud</Button><ResultadoUnidad {...op}/></form>
}
export function SolicitudesUnidad({general=false}:{general?:boolean}){
  const {data,loading,error,refetch}=useFetch(getSolicitudesUnidad,[])
  return <div><PageHeader titulo="Solicitudes de levantamiento" descripcion={general?"Resuelve solicitudes globales y de todas las unidades. No puedes resolver tus propias solicitudes.":"Resuelve solicitudes correspondientes a restricciones de tu unidad."}/>{loading?<Spinner/>:error?<ErrorBanner mensaje={error} onRetry={refetch}/>:!data?.solicitudes.length?<EmptyState mensaje={general?"No hay solicitudes registradas.":"No hay solicitudes de tu unidad."}/>:data.solicitudes.map(s=><article key={s.id_solicitud} className="mb-4 rounded-xl bg-surface p-4"><Badge estado={s.estado}/><h2 className="mt-2 font-semibold">Solicitud #{s.id_solicitud} · {s.tipo} · Estudiante #{s.id_estudiante}</h2><p className="my-2 text-sm text-muted">{formatFecha(s.fecha_creacion)}</p><p className="whitespace-pre-wrap">{s.motivo}</p>{s.estado==='PENDIENTE'?<Resolucion s={s} refrescar={refetch}/>:<p className="mt-3 whitespace-pre-wrap">Resolución: {s.resolucion}</p>}</article>)}</div>
}
