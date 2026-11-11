import { useState } from 'react'
import { getCertificados,descargar } from '../api/estudiante'
import { usePeriodo } from '../context/periodo'
import { useFetch } from '../hooks/useFetch'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/Button'
import { ErrorBanner } from '../components/ErrorBanner'
import { LoadingSkeleton } from '../components/Skeleton'
import { getErrorMessage } from '../utils/errors'
const detalles: Record<string, { descripcion: string; contenido: string }> = {
  INSCRIPCION: { descripcion: 'Consulta las asignaturas inscritas en el período seleccionado.', contenido: 'Datos del estudiante, asignaturas, secciones y estado de inscripción.' },
  CALIFICACIONES: { descripcion: 'Consulta las notas finales de tus asignaturas del período.', contenido: 'Asignaturas y nota final disponible. Si aún no está registrada, aparece como pendiente.' },
  ASIGNACION_FAMILIAR: { descripcion: 'Obtén tu constancia de alumno regular para asignación familiar.', contenido: 'Identificación del estudiante, carrera y período académico. Requiere una inscripción activa.' },
}
export function Certificados() {
  const periodo=usePeriodo();const {data,loading,error,refetch}=useFetch(getCertificados,[])
  const [ocupado,setOcupado]=useState(''),[fallo,setFallo]=useState(''),[mensaje,setMensaje]=useState('')
  async function bajar(tipo:string) {setOcupado(tipo);setFallo('');setMensaje('');try{await descargar(tipo,periodo);setMensaje('Documento generado. La descarga se ha iniciado.')}catch(e){setFallo(getErrorMessage(e))}finally{setOcupado('')}}
  return <div><PageHeader titulo="Certificados" descripcion="Descarga documentos del período seleccionado."/>
    {fallo&&<ErrorBanner mensaje={fallo}/>}
    {mensaje&&<p role="status" className="mb-4 text-sm text-success">{mensaje}</p>}
    {loading?<LoadingSkeleton variante="tarjetas" />:error?<ErrorBanner mensaje={error} onRetry={refetch}/>:<>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{data?.certificados.map(c=><article key={c.tipo} className="glass-panel flex flex-col rounded-xl border border-border p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-background text-primary" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></svg></span>
          <span className="rounded-lg border border-border px-2 py-1 text-xs font-semibold text-muted">PDF</span>
        </div>
        <h2 className="mb-2 text-lg font-semibold">{c.nombre}</h2>
        <p className="mb-4 text-sm text-muted">{detalles[c.tipo]?.descripcion}</p>
        <p className="mb-6 border-t border-border pt-4 text-sm text-muted">{detalles[c.tipo]?.contenido}</p>
        <Button className="mt-auto w-full" cargando={ocupado===c.tipo} disabled={!!ocupado} aria-label={`Descargar PDF: ${c.nombre}`} onClick={()=>bajar(c.tipo)}>{ocupado===c.tipo?'Generando documento…':'Descargar PDF'}</Button>
      </article>)}</div>
    </>}
  </div>
}
