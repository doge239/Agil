import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { ClaseDocente } from '../../api/docente'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { ErrorBanner } from '../../components/ErrorBanner'
import { formatFecha } from '../../utils/format'
import { etiquetaBloque } from '../../utils/horario'

export function EliminarClase({clase,ocupado,error,onCancelar,onConfirmar}:{clase:ClaseDocente;ocupado:boolean;error:string;onCancelar:()=>void;onConfirmar:(motivo:string)=>void}) {
  const dialogo=useRef<HTMLDialogElement>(null)
  const [motivo,setMotivo]=useState('')
  useEffect(()=>{const modal=dialogo.current;modal?.showModal();modal?.querySelector<HTMLButtonElement>('#cancelar-eliminacion-clase')?.focus();return()=>{modal?.close()}},[])
  function enviar(e:FormEvent){
    e.preventDefault()
    const detalle=motivo.trim()
    onConfirmar(detalle?(detalle.length<10?`Corrección de clase: ${detalle}`:detalle):'Clase registrada por error; eliminación confirmada por el docente.')
  }
  const cantidad=clase.asistencias_registradas??0
  return <dialog ref={dialogo} className="eliminar-clase-dialogo" aria-labelledby="eliminar-clase-titulo" aria-describedby="eliminar-clase-descripcion"
    onCancel={e=>{e.preventDefault();if(!ocupado)onCancelar()}}>
    <form onSubmit={enviar}>
      <h2 id="eliminar-clase-titulo">¿Eliminar esta clase?</h2>
      <p className="eliminar-clase-fecha">{formatFecha(clase.fecha.slice(0,10))} · {etiquetaBloque(clase.hora_inicio,clase.hora_fin)}</p>
      <p id="eliminar-clase-descripcion">Se eliminarán la clase y sus <strong>{cantidad} {cantidad===1?'registro de asistencia':'registros de asistencia'}</strong>. Desaparecerá de la grilla del docente y del registro de los estudiantes. Esta acción no se puede deshacer.</p>
      <Input label="Motivo de eliminación (opcional)" name="motivo-eliminar-clase" value={motivo} onChange={e=>setMotivo(e.target.value)} maxLength={2000} disabled={ocupado} placeholder="Por ejemplo: clase registrada por error"/>
      <p>Si lo dejas vacío, se registrará como una clase creada por error.</p>
      {error&&<ErrorBanner mensaje={error}/>}
      <div className="eliminar-clase-acciones">
        <Button type="button" id="cancelar-eliminacion-clase" variante="secondary" onClick={onCancelar} disabled={ocupado}>Cancelar</Button>
        <Button type="submit" variante="danger" cargando={ocupado}>Eliminar definitivamente</Button>
      </div>
    </form>
  </dialog>
}
