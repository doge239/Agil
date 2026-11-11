import { Select } from '../../components/Select'
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { abrirAsistenciaQr, cerrarAsistenciaQr, getSesionAsistenciaQr } from '../../api/docente'
import { useFetch } from '../../hooks/useFetch'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { ErrorBanner } from '../../components/ErrorBanner'
import { getErrorMessage } from '../../utils/errors'

export function AsistenciaQr({curso,clase,bloqueado,alCerrar}:{curso:number;clase:number;bloqueado:boolean;alCerrar:()=>void}) {
  const {data,error,loading,refetch}=useFetch(()=>getSesionAsistenciaQr(curso,clase),[curso,clase])
  const [minutos,setMinutos]=useState(10),[origen,setOrigen]=useState(window.location.origin)
  const [imagen,setImagen]=useState(''),[fallo,setFallo]=useState(''),[mensaje,setMensaje]=useState('')
  const [ocupado,setOcupado]=useState(false),[ausentes,setAusentes]=useState(false),[ahora,setAhora]=useState(Date.now())
  const sesion=data?.sesion
  let direccion='',direccionValida=false
  try {const url=new URL(origen);direccionValida=['http:','https:'].includes(url.protocol)&&!url.username&&!url.password&&url.pathname==='/'&&!url.search&&!url.hash;direccion=url.origin} catch { /* Dirección incompleta mientras se escribe. */ }
  const enlace=sesion?.token&&direccionValida?`${direccion}/asistencia/qr/${sesion.token}`:''
  const segundos=sesion?Math.max(0,Math.ceil((new Date(sesion.expira).getTime()-ahora)/1000)):0
  const activa=sesion?.activa&&segundos>0
  useEffect(()=>{const reloj=window.setInterval(()=>setAhora(Date.now()),1000);return()=>window.clearInterval(reloj)},[])
  useEffect(()=>{const reloj=window.setInterval(()=>{if(!document.hidden)refetch()},10_000);return()=>window.clearInterval(reloj)},[refetch])
  useEffect(()=>{let cancelado=false;setImagen('');if(enlace)void QRCode.toDataURL(enlace,{width:320,margin:3,errorCorrectionLevel:'M'}).then(url=>{if(!cancelado)setImagen(url)}).catch(()=>{if(!cancelado)setFallo('No se pudo generar la imagen del QR.')});return()=>{cancelado=true}},[enlace])
  async function abrir() {
    setOcupado(true);setFallo('');setMensaje('')
    try {await abrirAsistenciaQr(curso,clase,minutos);setAhora(Date.now());refetch();setMensaje('QR habilitado. Cada estudiante debe ingresar con su cuenta y confirmar su RUT.')}
    catch(e){setFallo(getErrorMessage(e))}finally{setOcupado(false)}
  }
  async function cerrar() {
    setOcupado(true);setFallo('');setMensaje('')
    try {const r=await cerrarAsistenciaQr(curso,clase,ausentes);setMensaje(`${r.mensaje}. ${r.ausentes_registrados} ausencias registradas.`);setAusentes(false);refetch();alCerrar()}
    catch(e){setFallo(getErrorMessage(e))}finally{setOcupado(false)}
  }
  return <section className="qr-panel glass-panel" aria-label="Asistencia con QR">
    <div><h3>Asistencia con QR</h3><p>Abre la sesión de esta clase y proyecta el código para tus estudiantes.</p></div>
    {(fallo||error)&&<ErrorBanner mensaje={fallo||error!} onRetry={refetch}/>}
    {mensaje&&<p role="status" className="qr-mensaje">{mensaje}</p>}
    <div className="qr-configuracion">
      <Input label="Dirección del portal para estudiantes" name="portal-asistencia" type="url" value={origen} onChange={e=>setOrigen(e.target.value)} placeholder="http://192.168.1.10:5173"/>
      <label>Duración<Select value={minutos} onChange={e=>setMinutos(Number(e.target.value))}>{[5,10,15,30].map(m=><option key={m} value={m}>{m} minutos</option>)}</Select></label>
      <Button onClick={abrir} disabled={bloqueado||ocupado||loading||!direccionValida}>{activa?'Renovar QR':'Generar QR'}</Button>
    </div>
    {!direccionValida&&<p className="qr-ayuda">Ingresa una dirección válida, por ejemplo http://192.168.1.10:5173.</p>}
    {direccionValida&&['localhost','127.0.0.1','[::1]'].includes(new URL(direccion).hostname)&&<p className="qr-ayuda">Para escanear desde un celular, usa la dirección IP de este computador y conecta ambos equipos a la misma red. Un QR con localhost funciona solo en este computador.</p>}
    {bloqueado&&<p className="qr-ayuda">El QR se habilita únicamente para una clase de hoy, con el curso y período activos.</p>}
    {activa&&enlace&&<div className="qr-proyeccion">
      {imagen&&<img src={imagen} alt="Código QR para registrar la asistencia de esta clase" width="320" height="320"/>}
      <div><span className="qr-vigencia">QR activo · {Math.floor(segundos/60)}:{String(segundos%60).padStart(2,'0')}</span>
        <h4>Escanea e inicia sesión</h4><p>Confirma tu RUT para marcar tu asistencia. El código no contiene datos personales.</p>
        <a href={enlace} target="_blank" rel="noreferrer">Abrir enlace de asistencia</a>
        <Button variante="secondary" onClick={async()=>{try{await navigator.clipboard.writeText(enlace);setMensaje('Enlace copiado.')}catch{setFallo('No se pudo copiar. Usa el enlace de asistencia.')}}}>Copiar enlace</Button>
      </div>
    </div>}
    {sesion&&!activa&&!sesion.cerrada&&<p className="qr-ayuda">El QR venció. Puedes renovarlo o cerrar la sesión y revisar los pendientes.</p>}
    {sesion&&!sesion.cerrada&&<div className="qr-cierre"><label><input type="checkbox" checked={ausentes} onChange={e=>setAusentes(e.target.checked)} disabled={ocupado||bloqueado}/> Marcar como ausentes a los estudiantes sin registro al cerrar</label>
      <Button variante="secondary" onClick={cerrar} disabled={ocupado||bloqueado}>Cerrar sesión QR</Button></div>}
    <p className="qr-ayuda">Renovar el QR invalida el anterior. Los registros existentes se conservan.</p>
  </section>
}
