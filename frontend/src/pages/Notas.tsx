import { getNotas } from '../api/academico'
import { usePeriodo } from '../context/periodo'
import { useFetch } from '../hooks/useFetch'
import { useAsignaturasMap } from '../hooks/useAsignaturasMap'
import { PageHeader } from '../components/PageHeader'
import { ErrorBanner } from '../components/ErrorBanner'
import { EmptyState } from '../components/EmptyState'
import { LoadingSkeleton } from '../components/Skeleton'
import { PortalIcon } from '../components/PortalIcon'
import { formatNota, formatPorcentaje } from '../utils/format'
export function Notas() {
  const periodo=usePeriodo()
  return <RegistroNotas key={periodo} periodo={periodo}/>
}

function RegistroNotas({periodo}:{periodo:number|undefined}) {
  const [seleccion,setSeleccion]=useState<number|null>(null)
  const {data,loading,error,refetch}=useFetch(()=>getNotas(periodo),[periodo])
  const nombres=useAsignaturasMap()
  if(loading) return <LoadingSkeleton cabecera />
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
      const abierta=seleccion===id
      return <section key={id} className="overflow-hidden rounded-xl border border-border bg-surface">
        <h2><button type="button" id={`notas-curso-${id}`} aria-expanded={abierta} aria-controls={`notas-detalle-${id}`} onClick={()=>setSeleccion(actual=>actual===id?null:id)} className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary">
          <span><span className="block font-semibold">{nombres.get(curso.id_asignatura)?.nombre??`Asignatura #${curso.id_asignatura}`}</span><span className="mt-1 block text-xs text-muted">Sección {curso.seccion}</span></span>
          <span className="flex shrink-0 items-center gap-2 text-sm text-primary"><span>{abierta?'Ocultar notas':'Ver notas'}</span><span aria-hidden="true" className={abierta?'rotate-90':''}><PortalIcon name="chevron"/></span></span>
        </button></h2>
        <div id={`notas-detalle-${id}`} role="region" aria-labelledby={`notas-curso-${id}`} hidden={!abierta} className="border-t border-border p-4">
        <p className="my-2 text-sm">Promedio parcial: {formatNota(promedio)} · Ponderación calificada: {peso}%</p>
        <p className="mb-3 font-medium">Resultado final: {final?`${formatNota(final.nota)} · ${Number(final.nota)>=Number(final.nota_minima)?'Aprobado':'Reprobado'}`:'Pendiente de cierre'}</p>
        {!filas.length?<EmptyState mensaje="No hay evaluaciones parciales registradas para esta asignatura."/>:<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th scope="col" className="p-2">Evaluación</th><th scope="col" className="p-2">Ponderación</th><th scope="col" className="p-2">Nota</th></tr></thead>
          <tbody>{filas.map(n=><tr key={n.id_evaluacion} className="border-t border-border"><td className="p-2">{n.evaluacion}</td><td className="p-2">{formatPorcentaje(n.porcentaje)}</td><td className="p-2">{n.nota===null?'Pendiente':formatNota(n.nota)}</td></tr>)}</tbody>
        </table></div>}
        </div>
      </section>
    })}</div>}
  </div>
}
import { useState } from 'react'
