import { useState } from 'react'
import { getCertificados,descargar } from '../api/estudiante'
import { usePeriodo } from '../context/periodo'
import { useFetch } from '../hooks/useFetch'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/Button'
import { ErrorBanner } from '../components/ErrorBanner'
import { Spinner } from '../components/Spinner'
import { getErrorMessage } from '../utils/errors'
export function Certificados() {
  const periodo=usePeriodo();const {data,loading,error,refetch}=useFetch(getCertificados,[])
  const [ocupado,setOcupado]=useState(''),[fallo,setFallo]=useState('')
  async function bajar(tipo:string) {setOcupado(tipo);setFallo('');try{await descargar(tipo,periodo)}catch(e){setFallo(getErrorMessage(e))}finally{setOcupado('')}}
  return <div><PageHeader titulo="Certificados" descripcion="Descarga documentos del período seleccionado."/><p className="mb-4 rounded-lg border border-warning bg-surface p-4">Documentos de demostración, sin validez institucional. La emisión oficial requiere validación de la Universidad.</p>
    {fallo&&<ErrorBanner mensaje={fallo}/>} {loading?<Spinner/>:error?<ErrorBanner mensaje={error} onRetry={refetch}/>:<div className="grid gap-4 sm:grid-cols-2">{data?.certificados.map(c=><article key={c.tipo} className="rounded-xl bg-surface p-5"><h2 className="mb-3 font-semibold">{c.nombre}</h2><Button cargando={ocupado===c.tipo} disabled={!!ocupado} onClick={()=>bajar(c.tipo)}>Descargar PDF</Button></article>)}</div>}
  </div>
}
