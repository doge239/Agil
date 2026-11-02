import { getAvance } from '../api/estudiante'
import { useFetch } from '../hooks/useFetch'
import { PageHeader } from '../components/PageHeader'
import { ErrorBanner } from '../components/ErrorBanner'
import { Spinner } from '../components/Spinner'
import { Badge } from '../components/Badge'
export function AvanceCurricular() {
  const {data,loading,error,refetch}=useFetch(getAvance,[])
  return <div><PageHeader titulo="Avance curricular" descripcion="Progreso acumulado de tu plan. Solo los resultados finales cerrados acreditan aprobación."/>
    {loading?<Spinner/>:error?<ErrorBanner mensaje={error} onRetry={refetch}/>:data&&<>
      <section className="mb-4 rounded-xl bg-surface p-5"><h2 className="font-semibold">{data.plan.nombre}</h2><p className="my-2">{data.creditos_aprobados} de {data.creditos_totales} créditos aprobados · {data.porcentaje}%</p><progress aria-label="Créditos aprobados" className="w-full" value={data.creditos_aprobados} max={data.creditos_totales||1}/><p className="mt-2 text-sm text-muted">El avance no depende del período seleccionado.</p></section>
      {[...new Set(data.asignaturas.map(a=>a.semestre))].sort((a,b)=>a-b).map(s=><section key={s} className="mb-4 rounded-xl bg-surface p-4"><h2 className="mb-2 font-semibold">Semestre {s}</h2>{data.asignaturas.filter(a=>a.semestre===s).map(a=><div key={a.id_asignatura} className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-3"><div><p>{a.codigo} · {a.asignatura}</p><p className="text-sm text-muted">{a.creditos} créditos · {a.obligatoria?'Obligatoria':'Electiva'}</p></div><Badge estado={a.estado}/></div>)}</section>)}
    </>}
  </div>
}
