import { useState } from 'react'
import type { FormEvent } from 'react'
import { getEncuestas,responder } from '../api/estudiante'
import { usePeriodo } from '../context/periodo'
import { useFetch } from '../hooks/useFetch'
import { PageHeader } from '../components/PageHeader'
import { ErrorBanner } from '../components/ErrorBanner'
import { EmptyState } from '../components/EmptyState'
import { LoadingSkeleton } from '../components/Skeleton'
import { Button } from '../components/Button'
import { getErrorMessage } from '../utils/errors'
import { formatFecha } from '../utils/format'
import type { Encuesta } from '../types/api'
import { SelectorEncuesta } from '../components/SelectorEncuesta'
import './encuestas.css'
const escala=['Muy en desacuerdo','En desacuerdo','Neutral','De acuerdo','Muy de acuerdo']
function Formulario({encuesta:e,onSuccess,onEnviando}:{encuesta:Encuesta;onSuccess:()=>void;onEnviando:(valor:boolean)=>void}) {
  const [respuestas,setRespuestas]=useState<Record<number,number>>({}),[enviando,setEnviando]=useState(false),[error,setError]=useState('')
  async function enviar(event:FormEvent) { event.preventDefault();setEnviando(true);onEnviando(true);setError('');try{await responder(e.id_encuesta,respuestas);onSuccess()}catch(err){setError(getErrorMessage(err))}finally{setEnviando(false);onEnviando(false)} }
  return <form aria-label={`Responder encuesta: ${e.nombre}`} onSubmit={enviar} className="encuesta-formulario glass-panel"><h2>{e.nombre}</h2><p className="encuesta-formulario-subtitulo">{e.titulo} · Hasta {formatFecha(e.fecha_fin)}</p>
    {e.respondida?<p className="text-success">Encuesta respondida.</p>:!e.disponible?<p>Fuera del plazo de respuesta.</p>:<>
      <p className="mb-3 text-sm">Escala: 1, muy en desacuerdo; 5, muy de acuerdo. Las respuestas individuales no se muestran al docente.</p>
      {(e.preguntas??[]).map((p,i)=><fieldset key={p.id_pregunta} disabled={enviando} className="encuesta-pregunta"><legend><span>Pregunta {i+1}</span>{p.texto}</legend>
        <div className="encuesta-escala">{escala.map((texto,n)=><label key={n} className="encuesta-respuesta">
          <input type="radio" name={`pregunta-${p.id_pregunta}`} value={n+1} required checked={respuestas[p.id_pregunta]===n+1} onChange={()=>setRespuestas({...respuestas,[p.id_pregunta]:n+1})}/>
          <span className="encuesta-respuesta-numero">{n+1}</span><span>{texto}</span>
        </label>)}</div>
      </fieldset>)}
      {error&&<ErrorBanner mensaje={error}/>}<Button type="submit" cargando={enviando} disabled={!e.preguntas?.length}>Enviar respuestas</Button>
    </>}
  </form>
}
export function Encuestas() {
  const periodo=usePeriodo()
  return <ListaEncuestas key={periodo} periodo={periodo}/>
}

function ListaEncuestas({periodo}:{periodo:number|undefined}) {
  const {data,loading,error,refetch}=useFetch(()=>getEncuestas(periodo),[periodo])
  const [seleccion,setSeleccion]=useState(''),[ocupado,setOcupado]=useState(false),[mensaje,setMensaje]=useState('')
  const elegida=data?.encuestas.find(e=>String(e.id_encuesta)===seleccion)
  function enviada(){setMensaje('Encuesta enviada correctamente. Puedes seleccionar otra.');setSeleccion('');refetch()}
  return <div><PageHeader titulo="Encuesta docente" descripcion="Encuestas correspondientes a los cursos en los que estás inscrito."/>
    {mensaje&&<p role="status" className="mb-4 rounded-xl border border-border bg-surface p-4 text-sm">{mensaje}</p>}
    {loading?<LoadingSkeleton variante="tarjetas" />:error?<ErrorBanner mensaje={error} onRetry={refetch}/>:!data?.encuestas.length?<EmptyState mensaje="No tienes encuestas habilitadas en este período."/>:<>
      <SelectorEncuesta encuestas={data.encuestas} valor={seleccion} disabled={ocupado} onChange={valor=>{setSeleccion(valor);setMensaje('')}}/>
      {elegida?<>
        <Button type="button" variante="secondary" className="mb-4" disabled={ocupado} onClick={()=>setSeleccion('')}>Cerrar encuesta</Button>
        <Formulario key={elegida.id_encuesta} encuesta={elegida} onSuccess={enviada} onEnviando={setOcupado}/>
      </>:<p className="text-sm text-muted">Selecciona la encuesta que quieres responder para ver sus preguntas.</p>}
    </>}
  </div>
}
