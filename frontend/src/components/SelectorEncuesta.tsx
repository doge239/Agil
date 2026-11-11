import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { Encuesta } from '../types/api'
import { PortalIcon } from './PortalIcon'

export function EstadoEncuesta({encuesta}:{encuesta:Encuesta}) {
  const estado=encuesta.respondida?'respondida':encuesta.disponible?'pendiente':'cerrada'
  return <span className={`encuesta-estado encuesta-estado-${estado}`}>{encuesta.respondida?'Respondida':encuesta.disponible?'Pendiente':'Fuera de plazo'}</span>
}

export function SelectorEncuesta({encuestas,valor,onChange,disabled}:{encuestas:Encuesta[];valor:string;onChange:(valor:string)=>void;disabled:boolean}) {
  const id=useId(),contenedor=useRef<HTMLDivElement>(null),boton=useRef<HTMLButtonElement>(null)
  const [abierto,setAbierto]=useState(false),[activo,setActivo]=useState(0)
  const elegida=encuestas.find(e=>String(e.id_encuesta)===valor)
  const menuAbierto=abierto&&!disabled
  useEffect(()=>{
    if(!menuAbierto)return
    const cerrar=(e:PointerEvent)=>{if(!contenedor.current?.contains(e.target as Node))setAbierto(false)}
    document.addEventListener('pointerdown',cerrar)
    return()=>document.removeEventListener('pointerdown',cerrar)
  },[menuAbierto])
  useEffect(()=>{if(menuAbierto)document.getElementById(`${id}-opcion-${activo}`)?.scrollIntoView({block:'nearest',inline:'nearest'})},[menuAbierto,activo,id])
  function abrir(){setActivo(Math.max(0,encuestas.findIndex(e=>String(e.id_encuesta)===valor)));setAbierto(true)}
  function elegir(indice:number){const e=encuestas[indice];if(e){onChange(String(e.id_encuesta));setAbierto(false);boton.current?.focus()}}
  function teclado(e:KeyboardEvent<HTMLButtonElement>) {
    if(e.key==='Escape'){e.preventDefault();setAbierto(false);return}
    if(e.key==='Tab'){setAbierto(false);return}
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      e.preventDefault()
      if(!menuAbierto){abrir();return}
      setActivo(a=>(a+(e.key==='ArrowDown'?1:-1)+encuestas.length)%encuestas.length);return
    }
    if(menuAbierto&&(e.key==='Home'||e.key==='End')){e.preventDefault();setActivo(e.key==='Home'?0:encuestas.length-1);return}
    if(menuAbierto&&(e.key==='Enter'||e.key===' ')){e.preventDefault();elegir(activo)}
  }
  return <div className="encuesta-selector" ref={contenedor}>
    <div className="encuesta-selector-etiqueta"><span id={`${id}-etiqueta`}>Encuesta a responder</span><span>{encuestas.filter(e=>!e.respondida&&e.disponible).length} pendientes</span></div>
    <button ref={boton} type="button" role="combobox" aria-labelledby={`${id}-etiqueta`} aria-haspopup="listbox" aria-expanded={menuAbierto}
      aria-controls={menuAbierto?`${id}-lista`:undefined} aria-activedescendant={menuAbierto?`${id}-opcion-${activo}`:undefined}
      disabled={disabled} className="encuesta-selector-boton" onKeyDown={teclado} onClick={()=>menuAbierto?setAbierto(false):abrir()}>
      <span className="encuesta-selector-icono"><PortalIcon name="clipboard"/></span>
      <span className="encuesta-selector-texto"><strong>{elegida?.nombre??'Selecciona una encuesta'}</strong><span>{elegida?.titulo??'Elige la asignatura que quieres evaluar'}</span></span>
      {elegida&&<EstadoEncuesta encuesta={elegida}/>}
      <PortalIcon name="chevron" className={`encuesta-selector-flecha${menuAbierto?' abierta':''}`}/>
    </button>
    {menuAbierto&&<div className="encuesta-selector-menu">
      <div className="encuesta-menu-titulo">Tus asignaturas <span>{encuestas.length} encuestas</span></div>
      <ul id={`${id}-lista`} role="listbox" aria-label="Encuestas disponibles" className="encuesta-selector-lista">
        {encuestas.map((e,i)=><li key={e.id_encuesta} id={`${id}-opcion-${i}`} role="option" aria-selected={String(e.id_encuesta)===valor}
          className={`encuesta-selector-opcion${activo===i?' activa':''}`} onPointerMove={()=>setActivo(i)} onMouseDown={ev=>ev.preventDefault()} onClick={()=>elegir(i)}>
          <span className="encuesta-opcion-icono"><PortalIcon name={e.respondida?'check':'book'}/></span>
          <span className="encuesta-selector-texto"><strong>{e.nombre}</strong><span>{e.titulo}</span></span>
          <EstadoEncuesta encuesta={e}/><span className="encuesta-opcion-marca" aria-hidden="true">{String(e.id_encuesta)===valor?'✓':''}</span>
        </li>)}
      </ul>
    </div>}
  </div>
}
