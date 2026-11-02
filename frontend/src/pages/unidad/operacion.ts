import { useState } from 'react'
import { getErrorMessage } from '../../utils/errors'
import type { PersonaUnidad } from '../../api/unidad'
export function useOperacionUnidad(){
  const [ocupado,setOcupado]=useState(false),[error,setError]=useState(''),[mensaje,setMensaje]=useState('')
  async function ejecutar(fn:()=>Promise<unknown>,ok:()=>void,mensajeExito:string){setOcupado(true);setError('');setMensaje('');try{await fn();ok();setMensaje(mensajeExito)}catch(e){setError(getErrorMessage(e))}finally{setOcupado(false)}}
  return {ocupado,error,mensaje,ejecutar}
}
export function nombrePersona(p:PersonaUnidad){return `${p.apellido_paterno} ${p.apellido_materno??''}, ${p.nombres}`}
