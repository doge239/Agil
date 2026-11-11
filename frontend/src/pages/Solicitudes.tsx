import { Select } from '../components/Select'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { getSolicitudes,solicitar } from '../api/estudiante'
import { useFetch } from '../hooks/useFetch'
import { Button } from '../components/Button'
import { Badge } from '../components/Badge'
import { ErrorBanner } from '../components/ErrorBanner'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { PageHeader } from '../components/PageHeader'
import { getErrorMessage } from '../utils/errors'
import { formatFecha } from '../utils/format'
export function Solicitudes() {
  const {data,loading,error,refetch}=useFetch(getSolicitudes,[])
  const [id,setId]=useState(''),[motivo,setMotivo]=useState(''),[fallo,setFallo]=useState(''),[mensaje,setMensaje]=useState(''),[enviando,setEnviando]=useState(false)
  const disponibles=data?.restricciones.filter(r=>r.activa&&!data.solicitudes.some(s=>s.id_restriccion===r.id_restriccion&&s.estado==='PENDIENTE'))??[]
  async function enviar(e:FormEvent) {
    e.preventDefault();setEnviando(true);setFallo('');setMensaje('')
    try {await solicitar(Number(id),motivo);setId('');setMotivo('');setMensaje('Solicitud enviada.');refetch()}
    catch(err){setFallo(getErrorMessage(err))}finally{setEnviando(false)}
  }
  return <div><PageHeader titulo="Restricciones y solicitudes" descripcion="Consulta tus restricciones y solicita su levantamiento. La aprobación no omite las demás condiciones de inscripción."/>
    {loading?<Spinner/>:error?<ErrorBanner mensaje={error} onRetry={refetch}/>:<>
      <section className="mb-5 rounded-xl bg-surface p-4"><h2 className="mb-3 font-semibold">Mis restricciones</h2>
        {!data?.restricciones.length?<EmptyState mensaje="No tienes restricciones registradas."/>:data.restricciones.map(r=><div key={r.id_restriccion} className="border-t border-border py-3"><Badge estado={r.activa?'ACTIVA':'LEVANTADA'}/> <strong>{r.tipo}</strong><p>{r.descripcion}</p></div>)}
      </section>
      {!!disponibles.length&&<form onSubmit={enviar} className="mb-5 flex flex-col gap-3 rounded-xl bg-surface p-4"><h2 className="font-semibold">Solicitar levantamiento</h2>
        <label htmlFor="restriccion">Restricción</label><Select id="restriccion" required value={id} onChange={e=>setId(e.target.value)} className="rounded-lg border border-border bg-surface p-2"><option value="">Selecciona una restricción</option>{disponibles.map(r=><option key={r.id_restriccion} value={r.id_restriccion}>{r.tipo}</option>)}</Select>
        <label htmlFor="motivo">Motivo (10 a 2000 caracteres)</label><textarea id="motivo" required minLength={10} maxLength={2000} value={motivo} onChange={e=>setMotivo(e.target.value)} className="min-h-28 rounded-lg border border-border p-2"/>
        <Button type="submit" cargando={enviando}>Enviar solicitud</Button>
      </form>}
      {fallo&&<ErrorBanner mensaje={fallo}/>} {mensaje&&<p role="status" className="mb-3 text-success">{mensaje}</p>}
      <h2 className="mb-3 font-semibold">Seguimiento</h2>
      {!data?.solicitudes.length?<EmptyState mensaje="No has enviado solicitudes."/>:data.solicitudes.map(s=><article key={s.id_solicitud} className="mb-3 rounded-xl bg-surface p-4"><Badge estado={s.estado}/><h3 className="mt-2 font-medium">Solicitud #{s.id_solicitud} · {s.tipo}</h3><p className="text-sm text-muted">Enviada el {formatFecha(s.fecha_creacion)}</p><p className="my-2 whitespace-pre-wrap">{s.motivo}</p>{s.resolucion&&<p className="whitespace-pre-wrap">Resolución ({formatFecha(s.fecha_resolucion)}): {s.resolucion}</p>}</article>)}
    </>}
  </div>
}
