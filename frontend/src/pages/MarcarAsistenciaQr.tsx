import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { consultarAsistenciaQr, marcarAsistenciaQr } from '../api/asistenciaQr'
import { useFetch } from '../hooks/useFetch'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { ErrorBanner } from '../components/ErrorBanner'
import { Spinner } from '../components/Spinner'
import { ThemeToggle } from '../components/ThemeToggle'
import { LogoUcn } from '../components/LogoUcn'
import { getErrorMessage } from '../utils/errors'
import { formatFecha } from '../utils/format'
import { estadoAsistencia } from '../utils/asistencia'
import './docente/asistencia-docente.css'

export function MarcarAsistenciaQr() {
  const {token=''}=useParams()
  return <ConfirmarAsistencia key={token} token={token}/>
}

function ConfirmarAsistencia({token}:{token:string}) {
  const {usuario}=useAuth()
  const {data,loading,error,refetch}=useFetch(()=>consultarAsistenciaQr(token),[token])
  const [rut,setRut]=useState(''),[ocupado,setOcupado]=useState(false),[fallo,setFallo]=useState(''),[resultado,setResultado]=useState<{estado:string;mensaje:string}|null>(null)
  async function enviar(e:FormEvent) {
    e.preventDefault();setOcupado(true);setFallo('')
    try {setResultado(await marcarAsistenciaQr(token,rut))}catch(error){setFallo(getErrorMessage(error))}finally{setOcupado(false)}
  }
  const estado=resultado?.estado??data?.estado
  return <main className="qr-estudiante-page"><header><LogoUcn/><ThemeToggle/></header>
    <section className="qr-estudiante-tarjeta glass-panel">
      <p className="qr-ceja">Registro de asistencia</p><h1>Confirma tu asistencia</h1>
      {loading?<Spinner/>:error?<ErrorBanner mensaje={error} onRetry={refetch}/>:data&&<>
        <h2>{data.clase.nombre}</h2><p>{data.clase.codigo} · Sección {data.clase.seccion} · {formatFecha(data.clase.fecha)}</p>
        <p className="qr-cuenta">Cuenta: {usuario?.correo}</p>
        {estado?<div className="qr-resultado" role="status"><strong>{estadoAsistencia(estado).etiqueta}</strong><p>{resultado?.mensaje??'Ya tienes asistencia registrada en esta clase. El docente puede revisar o corregir tu registro.'}</p></div>:
          !data.tiene_rut?<ErrorBanner mensaje="Tu cuenta no tiene RUT registrado. Solicita su actualización; el docente puede marcarte manualmente."/>:
          <form onSubmit={enviar} className="qr-estudiante-form"><p>Ingresa el RUT de tu cuenta para confirmar. Solo puedes registrar tu propia asistencia.</p>
            <Input label="Tu RUT" name="rut" placeholder="12.345.678-9" maxLength={20} value={rut} onChange={e=>setRut(e.target.value)} required autoComplete="off"/>
            {fallo&&<ErrorBanner mensaje={fallo}/>}
            <Button type="submit" cargando={ocupado}>Marcar mi asistencia</Button>
          </form>}
      </>}
      <Link to="/asistencia">Ver mi registro de asistencia</Link>
    </section>
  </main>
}
