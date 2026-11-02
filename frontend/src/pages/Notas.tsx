import { getNotas } from '../api/academico'
import { usePeriodo } from '../context/periodo'
import { useFetch } from '../hooks/useFetch'
import { useAsignaturasMap } from '../hooks/useAsignaturasMap'
import { PageHeader } from '../components/PageHeader'
import { ErrorBanner } from '../components/ErrorBanner'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { formatNota, formatPorcentaje } from '../utils/format'
export function Notas() {
  const periodo=usePeriodo()
  const {data,loading,error,refetch}=useFetch(()=>getNotas(periodo),[periodo])
  const nombres=useAsignaturasMap()
  if(loading) return <Spinner/>
  if(error) return <ErrorBanner mensaje={error} onRetry={refetch}/>
  const notas=data?.notas??[], finales=data?.finales??[]
  const ids=[...new Set([...notas.map(n=>n.id_curso),...finales.map(n=>n.id_curso)])]
  return <div><PageHeader titulo="Notas" descripcion="Evaluaciones y resultados finales por curso."/>
    {!ids.length?<EmptyState mensaje="No hay evaluaciones ni resultados finales en este período."/>:
    <div className="flex flex-col gap-4">{ids.map(id=>{
      const filas=notas.filter(n=>n.id_curso===id), final=finales.find(n=>n.id_curso===id), curso=filas[0]??final!
      const calificadas=filas.filter(n=>n.nota!==null)
      const peso=calificadas.reduce((s,n)=>s+Number(n.porcentaje),0)
      const promedio=peso?calificadas.reduce((s,n)=>s+Number(n.nota)*Number(n.porcentaje),0)/peso:null
      return <section key={id} className="rounded-xl border border-border bg-surface p-4">
        <h2 className="font-semibold">{nombres.get(curso.id_asignatura)?.nombre??`Asignatura #${curso.id_asignatura}`} · Sección {curso.seccion}</h2>
        <p className="my-2 text-sm">Promedio parcial: {formatNota(promedio)} · Ponderación calificada: {peso}%</p>
        <p className="mb-3 font-medium">Resultado final: {final?`${formatNota(final.nota)} · ${Number(final.nota)>=Number(final.nota_minima)?'Aprobado':'Reprobado'}`:'Pendiente de cierre'}</p>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Evaluación</th><th className="p-2">Ponderación</th><th className="p-2">Nota</th></tr></thead>
          <tbody>{filas.map(n=><tr key={n.id_evaluacion} className="border-t border-border"><td className="p-2">{n.evaluacion}</td><td className="p-2">{formatPorcentaje(n.porcentaje)}</td><td className="p-2">{n.nota===null?'Pendiente':formatNota(n.nota)}</td></tr>)}</tbody>
        </table></div>
      </section>
    })}</div>}
  </div>
}
