import { useState } from 'react'
import { PeriodoContext } from './periodo'
import type { ReactNode } from 'react'
import api from '../api/axios'
import { useFetch } from '../hooks/useFetch'
import { ErrorBanner } from '../components/ErrorBanner'
import { Spinner } from '../components/Spinner'
export interface Periodo { id_periodo:number; anio:number; semestre:number; estado:string; vigente:boolean; inscripcion_abierta:boolean }
export function PeriodoProvider({children}:{children:ReactNode}) {
  const {data,loading,error,refetch}=useFetch(async()=> (await api.get<{periodos:Periodo[]}>('/academico/periodos')).data,[])
  const [seleccion,setSeleccion]=useState<number | undefined>()
  const periodos=data?.periodos??[]
  const id=periodos.some(p=>p.id_periodo===seleccion)?seleccion:(periodos.find(p=>p.vigente)??periodos[0])?.id_periodo
  return <PeriodoContext.Provider value={id}>
    <div className="mb-5 rounded-xl bg-surface p-4">
      {loading?<Spinner/>:error?<ErrorBanner mensaje={error} onRetry={refetch}/>:<label className="flex flex-wrap items-center gap-3 text-sm font-medium">Período académico
        <select className="rounded-lg border border-border bg-surface p-2" value={id??''} onChange={e=>setSeleccion(Number(e.target.value))}>
          {periodos.length===0?<option value="">Sin períodos registrados</option>:periodos.map(p=><option key={p.id_periodo} value={p.id_periodo}>{p.anio} · Semestre {p.semestre}{p.vigente?' · Vigente':''}</option>)}
        </select>
      </label>}
    </div>
    {!loading&&!error&&id?children:null}
  </PeriodoContext.Provider>
}
