import { useState } from 'react'
import { getOferta, inscribir } from '../api/estudiante'
import { usePeriodo } from '../context/periodo'
import { useFetch } from '../hooks/useFetch'
import { Button } from '../components/Button'
import { PageHeader } from '../components/PageHeader'
import { ErrorBanner } from '../components/ErrorBanner'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { getErrorMessage } from '../utils/errors'
import { formatHora } from '../utils/format'
export function Inscripcion() {
  const periodo=usePeriodo()
  const {data,loading,error,refetch}=useFetch(()=>getOferta(periodo),[periodo])
  const [ocupado,setOcupado]=useState<number|null>(null)
  const [mensaje,setMensaje]=useState(''),[fallo,setFallo]=useState('')
  async function registrar(id:number) {
    setOcupado(id);setMensaje('');setFallo('')
    try { await inscribir(id);setMensaje('Inscripción realizada correctamente.');refetch() }
    catch(e) {setFallo(getErrorMessage(e))} finally {setOcupado(null)}
  }
  return <div><PageHeader titulo="Inscripción de asignaturas" descripcion="Oferta de tu plan. Se validarán cupos, prerrequisitos, restricciones y horario al inscribir."/>
    {mensaje&&<p role="status" className="mb-4 rounded-lg bg-success/15 p-3 text-success">{mensaje}</p>}
    {fallo&&<ErrorBanner mensaje={fallo}/>}
    {loading?<Spinner/>:error?<ErrorBanner mensaje={error} onRetry={refetch}/>:!data?.oferta.length?<EmptyState mensaje="No hay cursos disponibles para tu plan en este período."/>:
    <div className="grid gap-4 lg:grid-cols-2">{data.oferta.map(c=><article key={c.id_curso} className="rounded-xl border border-border bg-surface p-4">
      <h2 className="font-semibold">{c.codigo} · {c.nombre}</h2><p className="my-2 text-sm">Sección {c.seccion} · {c.creditos} créditos · {c.cupos_disponibles} cupos</p>
      <ul className="mb-3 text-sm text-muted">{c.horarios.map((h,i)=><li key={i}>{h.dia_semana}: {formatHora(h.hora_inicio)}–{formatHora(h.hora_fin)} · {h.sala??'Sala por asignar'}</li>)}</ul>
      <Button disabled={ocupado!==null||c.inscrito||!c.inscripcion_abierta||c.cupos_disponibles<=0} cargando={ocupado===c.id_curso} onClick={()=>registrar(c.id_curso)}>
        {c.inscrito?'Inscrito':!c.inscripcion_abierta?'Inscripción cerrada':c.cupos_disponibles<=0?'Sin cupos':'Inscribir asignatura'}
      </Button>
    </article>)}</div>}
  </div>
}
