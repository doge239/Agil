import { Select } from '../components/Select'
import { useState } from 'react'
import { PeriodoContext } from './periodo'
import type { ReactNode } from 'react'
import api from '../api/axios'
import { useFetch } from '../hooks/useFetch'
import { ErrorBanner } from '../components/ErrorBanner'
import { LoadingSkeleton, Skeleton } from '../components/Skeleton'
import { useLocation } from 'react-router-dom'
import { PortalIcon } from '../components/PortalIcon'
import { getNavItems } from '../components/navItems'
export interface Periodo { id_periodo:number; anio:number; semestre:number; estado:string; vigente:boolean; inscripcion_abierta:boolean }
export function PeriodoProvider({children}:{children:ReactNode}) {
  const path=useLocation().pathname
  const ruta=path.startsWith('/unidad')?'/academico/unidad/periodos':path.startsWith('/docente')?'/academico/docente/periodos':'/academico/periodos'
  const {data,loading,error,refetch}=useFetch(async()=> (await api.get<{periodos:Periodo[]}>(ruta)).data,[ruta])
  const [seleccion,setSeleccion]=useState<number | undefined>()
  const periodos=data?.periodos??[]
  const id=periodos.some(p=>p.id_periodo===seleccion)?seleccion:(periodos.find(p=>p.vigente)??periodos[0])?.id_periodo
  return <PeriodoContext.Provider value={id}>
    <div className="period-bar glass-panel">
      <div className="period-breadcrumb"><span>Mi portal</span><PortalIcon name="chevron" /><strong>{getNavItems(path).find(p=>p.to===path)?.label ?? 'Información académica'}</strong></div>
      {loading?<Skeleton className="skeleton-button" />:error?<ErrorBanner mensaje={error} onRetry={refetch}/>:<label className="period-selector"><PortalIcon name="calendar" /><span>Período académico</span>
        <Select className="rounded-lg border border-border bg-surface p-2" value={id??''} onChange={e=>setSeleccion(Number(e.target.value))}>
          {periodos.length===0?<option value="">Sin períodos registrados</option>:periodos.map(p=><option key={p.id_periodo} value={p.id_periodo}>{p.anio} · Semestre {p.semestre}{p.vigente?' · Vigente':''}</option>)}
        </Select>
      </label>}
    </div>
    {loading?<LoadingSkeleton cabecera />:!error&&id?children:null}
  </PeriodoContext.Provider>
}
