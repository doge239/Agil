import { useState } from 'react'
import type { FormEvent } from 'react'
import { buscarEstudiantesUnidad } from '../../api/unidad'
import type { PersonaUnidad } from '../../api/unidad'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { ErrorBanner } from '../../components/ErrorBanner'
import { useOperacionUnidad,nombrePersona } from './operacion'
export function ResultadoUnidad({error,mensaje}:{error:string;mensaje:string}){return <>{error&&<ErrorBanner mensaje={error}/>} {mensaje&&<p role="status" className="my-3 rounded-lg bg-success/15 p-3 text-success">{mensaje}</p>}</>}
export function BuscarEstudiante({alElegir}:{alElegir:(p:PersonaUnidad)=>void}){
  const [resultados,setResultados]=useState<PersonaUnidad[]>([]),op=useOperacionUnidad()
  async function buscar(e:FormEvent<HTMLFormElement>){e.preventDefault();const q=String(new FormData(e.currentTarget).get('q')||'');await op.ejecutar(async()=>{setResultados((await buscarEstudiantesUnidad(q)).estudiantes)},()=>{},'Búsqueda completada.')}
  return <div className="mb-4 rounded-xl bg-surface p-4"><form onSubmit={buscar} className="flex flex-wrap items-end gap-3"><Input label="Buscar estudiante de la unidad" name="q" maxLength={100} placeholder="Nombre o matrícula"/><Button type="submit" cargando={op.ocupado}>Buscar</Button></form><ResultadoUnidad {...op}/><p className="my-2 text-sm text-muted">Se muestran hasta 100 resultados. Afina la búsqueda si es necesario.</p><ul>{resultados.map(p=><li key={p.id_estudiante} className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-2"><span>{nombrePersona(p)} · {p.numero_matricula}</span><Button variante="secondary" onClick={()=>alElegir(p)}>Seleccionar</Button></li>)}</ul></div>
}
