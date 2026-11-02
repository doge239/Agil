import { useState } from 'react'
import type { FormEvent } from 'react'
import { getEncuestas,responder } from '../api/estudiante'
import { usePeriodo } from '../context/periodo'
import { useFetch } from '../hooks/useFetch'
import { PageHeader } from '../components/PageHeader'
import { ErrorBanner } from '../components/ErrorBanner'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { Button } from '../components/Button'
import { getErrorMessage } from '../utils/errors'
import { formatFecha } from '../utils/format'
import type { Encuesta } from '../types/api'
function Formulario({encuesta:e,onSuccess}:{encuesta:Encuesta;onSuccess:()=>void}) {
  const [respuestas,setRespuestas]=useState<Record<number,number>>({}),[enviando,setEnviando]=useState(false),[error,setError]=useState('')
  async function enviar(event:FormEvent) { event.preventDefault();setEnviando(true);setError('');try{await responder(e.id_encuesta,respuestas);onSuccess()}catch(err){setError(getErrorMessage(err))}finally{setEnviando(false)} }
  return <form onSubmit={enviar} className="rounded-xl border border-border bg-surface p-4"><h2 className="font-semibold">{e.titulo}</h2><p className="mb-3 text-sm text-muted">{e.nombre} · Docente #{e.id_docente} · Hasta {formatFecha(e.fecha_fin)}</p>
    {e.respondida?<p className="text-success">Encuesta respondida.</p>:!e.disponible?<p>Fuera del plazo de respuesta.</p>:<>
      <p className="mb-3 text-sm">Escala: 1, muy en desacuerdo; 5, muy de acuerdo. Las respuestas individuales no se muestran al docente.</p>
      {(e.preguntas??[]).map(p=><label key={p.id_pregunta} className="mb-4 flex flex-col gap-2">{p.texto}<select required value={respuestas[p.id_pregunta]??''} onChange={ev=>setRespuestas({...respuestas,[p.id_pregunta]:Number(ev.target.value)})} className="rounded-lg border border-border bg-surface p-2"><option value="">Selecciona una respuesta</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}</select></label>)}
      {error&&<ErrorBanner mensaje={error}/>}<Button type="submit" cargando={enviando} disabled={!e.preguntas?.length}>Enviar respuestas</Button>
    </>}
  </form>
}
export function Encuestas() {
  const periodo=usePeriodo();const {data,loading,error,refetch}=useFetch(()=>getEncuestas(periodo),[periodo])
  return <div><PageHeader titulo="Encuesta docente" descripcion="Encuestas correspondientes a los cursos en los que estás inscrito."/>{loading?<Spinner/>:error?<ErrorBanner mensaje={error} onRetry={refetch}/>:!data?.encuestas.length?<EmptyState mensaje="No tienes encuestas habilitadas en este período."/>:<div className="flex flex-col gap-4">{data.encuestas.map(e=><Formulario key={e.id_encuesta} encuesta={e} onSuccess={refetch}/>)}</div>}</div>
}
