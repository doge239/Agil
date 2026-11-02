import { useState } from 'react'
import { getOferta, inscribir, retirarInscripcion, salirListaEspera, unirseListaEspera } from '../api/estudiante'
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
  async function operar(id:number,accion:()=>Promise<unknown>,correcto:string) {
    setOcupado(id);setMensaje('');setFallo('')
    try { await accion();setMensaje(correcto);refetch() }
    catch(e) {setFallo(getErrorMessage(e))} finally {setOcupado(null)}
  }
  return <div><PageHeader titulo="Inscripción de asignaturas" descripcion="Oferta de tu plan. Se validarán cupos, prerrequisitos, restricciones y horario al inscribir."/>
    {mensaje&&<p role="status" className="mb-4 rounded-lg bg-success/15 p-3 text-success">{mensaje}</p>}
    {fallo&&<ErrorBanner mensaje={fallo}/>}
    {loading?<Spinner/>:error?<ErrorBanner mensaje={error} onRetry={refetch}/>:!data?.oferta.length?<EmptyState mensaje="No hay cursos disponibles para tu plan en este período."/>:
    <div className="grid gap-4 lg:grid-cols-2">{data.oferta.map(c=><article key={c.id_curso} className="rounded-xl border border-border bg-surface p-4">
      <h2 className="font-semibold">{c.codigo} · {c.nombre}</h2><p className="my-2 text-sm">Sección {c.seccion} · {c.creditos} créditos · {c.cupos_disponibles} cupos</p>
      <ul className="mb-3 text-sm text-muted">{c.horarios.map((h,i)=><li key={i}>{h.dia_semana}: {formatHora(h.hora_inicio)}–{formatHora(h.hora_fin)} · {h.sala??'Sala por asignar'}</li>)}</ul>
      {c.lista_espera_estado==='PROMOVIDA'&&c.inscrito&&<p role="status" className="mb-3 text-sm text-success">Se liberó un cupo y quedaste inscrito automáticamente.</p>}
      {c.lista_espera_estado==='NO_ELEGIBLE'&&!c.inscrito&&<p className="mb-3 text-sm text-muted">Tu turno terminó porque ya no cumplías los requisitos de inscripción.</p>}
      {c.inscrito
        ? <div><p className="mb-2 text-sm text-success">Inscrito</p><Button variante="danger" disabled={ocupado!==null||!c.inscripcion_abierta} cargando={ocupado===c.id_curso} onClick={()=>{
            if(window.confirm('¿Quieres retirarte de esta asignatura? Si hay una lista de espera, el cupo se asignará automáticamente a la primera persona elegible.')) {
              void operar(c.id_curso,()=>retirarInscripcion(c.id_curso),'Te retiraste de la asignatura.')
            }
          }}>Retirarme de la asignatura</Button></div>
        : c.lista_espera_estado==='ESPERA'
          ? <div><p className="mb-2 text-sm text-muted">En lista de espera · posición {c.posicion_espera}</p>
              <Button variante="secondary" disabled={ocupado!==null} cargando={ocupado===c.id_curso} onClick={()=>void operar(c.id_curso,()=>salirListaEspera(c.id_curso),'Saliste de la lista de espera.')}>Salir de la lista</Button>
            </div>
          : <Button disabled={ocupado!==null||!c.inscripcion_abierta} cargando={ocupado===c.id_curso} onClick={()=>{
              if(c.cupos_disponibles>0)void operar(c.id_curso,()=>inscribir(c.id_curso),'Inscripción realizada correctamente.')
              else void operar(c.id_curso,()=>unirseListaEspera(c.id_curso),'Te agregaste a la lista de espera.')
            }}>
              {!c.inscripcion_abierta?'Inscripción cerrada':c.cupos_disponibles<=0?'Unirme a la lista de espera':'Inscribir asignatura'}
            </Button>}
    </article>)}</div>}
  </div>
}
