import { getHorario } from '../api/academico'
import { usePeriodo } from '../context/periodo'
import { useFetch } from '../hooks/useFetch'
import { useAsignaturasMap } from '../hooks/useAsignaturasMap'
import { PageHeader } from '../components/PageHeader'
import { ErrorBanner } from '../components/ErrorBanner'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { DIAS, normalizarDia } from '../utils/horario'
import { formatHora } from '../utils/format'
export function Horario() {
  const periodo=usePeriodo()
  const {data,loading,error,refetch}=useFetch(()=>getHorario(periodo),[periodo])
  const nombres=useAsignaturasMap()
  if(loading) return <Spinner/>
  if(error) return <ErrorBanner mensaje={error} onRetry={refetch}/>
  const items=data?.horario??[]
  const dias=[...DIAS,...new Set(items.map(i=>i.dia_semana).filter(d=>!DIAS.some(x=>normalizarDia(x)===normalizarDia(d))))]
  return <div><PageHeader titulo="Horario" descripcion="Horas reales, secciones y salas del período seleccionado."/>
    {!items.length?<EmptyState mensaje="No hay clases registradas en este período."/>:
    <div className="grid gap-4 lg:grid-cols-2">{dias.map(d=>{
      const clases=items.filter(i=>normalizarDia(i.dia_semana)===normalizarDia(d)).sort((a,b)=>a.hora_inicio.localeCompare(b.hora_inicio))
      return clases.length?<section key={d} className="rounded-xl border border-border bg-surface p-4"><h2 className="mb-3 font-semibold">{d}</h2>
        {clases.map((c,i)=><article key={`${c.id_curso}-${i}`} className="border-t border-border py-3">
          <p className="font-medium">{nombres.get(c.id_asignatura)?.nombre??`Asignatura #${c.id_asignatura}`}</p>
          <p>{formatHora(c.hora_inicio)} – {formatHora(c.hora_fin)}</p>
          <p className="text-sm text-muted">Sección {c.seccion} · Sala {c.sala??'por asignar'}</p>
        </article>)}</section>:null
    })}</div>}
  </div>
}
