import { Children, Fragment, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, ReactNode, SelectHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { PortalIcon } from './PortalIcon'
import './select.css'

interface Opcion {valor:string;texto:string;disabled:boolean;grupo?:string}
function textoDe(nodo:ReactNode):string {
  if(typeof nodo==='string'||typeof nodo==='number')return String(nodo)
  if(isValidElement<{children?:ReactNode}>(nodo))return textoDe(nodo.props.children)
  return Children.toArray(nodo).map(n=>typeof n==='string'||typeof n==='number'?String(n):isValidElement<{children?:ReactNode}>(n)?textoDe(n.props.children):'').join('')
}
function opcionesDe(children:ReactNode,grupo?:string,disabled=false):Opcion[] {
  const opciones:Opcion[]=[]
  Children.forEach(children,nodo=>{
    if(!isValidElement<{children?:ReactNode;value?:string|number;label?:string;disabled?:boolean}>(nodo))return
    if(nodo.type==='option')opciones.push({valor:String(nodo.props.value??textoDe(nodo.props.children)),texto:nodo.props.label??textoDe(nodo.props.children),disabled:disabled||!!nodo.props.disabled,grupo})
    else if(nodo.type==='optgroup'||nodo.type===Fragment)opciones.push(...opcionesDe(nodo.props.children,nodo.type==='optgroup'?nodo.props.label:grupo,disabled||!!nodo.props.disabled))
  })
  return opciones
}
const valores=(valor:SelectHTMLAttributes<HTMLSelectElement>['value'])=>valor===undefined?[]:Array.isArray(valor)?valor.map(String):[String(valor)]
const normalizar=(texto:string)=>texto.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()

// Conserva un select nativo para FormData, required, selectedOptions y eventos onChange reales.
export function Select({children,value,defaultValue,multiple,disabled,id,className,onChange,onInvalid,onFocus,onClick,...props}:SelectHTMLAttributes<HTMLSelectElement>) {
  const uid=useId(),nativo=useRef<HTMLSelectElement>(null),boton=useRef<HTMLButtonElement>(null),contenedor=useRef<HTMLSpanElement>(null),menu=useRef<HTMLDivElement>(null)
  const opciones=opcionesDe(children),controlado=value!==undefined
  const [local,setLocal]=useState(()=>valores(defaultValue??(multiple?undefined:opciones[0]?.valor)))
  const [abierto,setAbierto]=useState(false),[activo,setActivo]=useState(0),[heredado,setHeredado]=useState(false),[etiqueta,setEtiqueta]=useState(''),[error,setError]=useState('')
  const [posicion,setPosicion]=useState<CSSProperties>({}),[destino,setDestino]=useState<Element|null>(null)
  const busqueda=useRef({texto:'',tiempo:0})
  const elegidos=controlado?valores(value):local
  const seleccionadas=opciones.filter(o=>elegidos.includes(o.valor))
  const actual=seleccionadas[0]??(!multiple?opciones.find(o=>!o.disabled):undefined)
  const bloqueado=!!disabled||heredado
  const nombre=props['aria-label']||etiqueta||props.name||'Seleccionar opción'
  const resumen=multiple?(seleccionadas.length===1?seleccionadas[0].texto:seleccionadas.length?`${seleccionadas.length} opciones seleccionadas`:'Selecciona una o más opciones'):(actual?.texto||'Selecciona una opción')
  const habilitadas=opciones.map((o,i)=>!o.disabled?i:-1).filter(i=>i>=0)

  useLayoutEffect(()=>{
    const select=nativo.current;if(!select)return
    const deshabilitado=select.matches(':disabled');if(deshabilitado!==heredado)setHeredado(deshabilitado)
    const labels=[...select.labels??[]].map(label=>{const copia=label.cloneNode(true) as HTMLElement;copia.querySelectorAll('.portal-select,select').forEach(n=>n.remove());return copia.textContent?.trim()||''}).filter(Boolean).join(' ')
    if(labels!==etiqueta)setEtiqueta(labels)
  })
  useEffect(()=>{if(bloqueado)setAbierto(false)},[bloqueado])
  useEffect(()=>{
    const select=nativo.current,form=select?.form;if(!select||!form)return
    let frame=0
    const reset=()=>{frame=requestAnimationFrame(()=>{
      if(controlado)for(const opcion of select.options)opcion.selected=valores(value).includes(opcion.value)
      setLocal([...select.selectedOptions].map(o=>o.value));setError('');setAbierto(false)
    })}
    form.addEventListener('reset',reset)
    return()=>{form.removeEventListener('reset',reset);cancelAnimationFrame(frame)}
  },[controlado,value])
  function colocar() {
    const rect=boton.current?.getBoundingClientRect();if(!rect)return
    const ancho=Math.min(Math.max(rect.width,220),window.innerWidth-24),abajo=window.innerHeight-rect.bottom-16,arriba=rect.top-16
    const encima=abajo<220&&arriba>abajo
    setPosicion({position:'fixed',width:ancho,left:Math.max(12,Math.min(rect.left,window.innerWidth-ancho-12)),
      ...(encima?{bottom:window.innerHeight-rect.top+7}:{top:rect.bottom+7}),maxHeight:Math.max(90,Math.min(380,encima?arriba:abajo))})
  }
  function abrir() {
    if(bloqueado||nativo.current?.matches(':disabled'))return
    busqueda.current={texto:'',tiempo:0}
    const elegida=opciones.findIndex(o=>elegidos.includes(o.valor)&&!o.disabled)
    setActivo(elegida>=0?elegida:habilitadas[0]??0);setDestino(nativo.current?.closest('dialog')??document.body);colocar();setAbierto(true)
  }
  useEffect(()=>{
    if(!abierto)return
    const fuera=(e:PointerEvent)=>{if(!(e.target instanceof Node)||(!contenedor.current?.contains(e.target)&&!menu.current?.contains(e.target)))setAbierto(false)}
    const mover=(e:Event)=>{if(!(e.target instanceof Node)||!menu.current?.contains(e.target))colocar()}
    document.addEventListener('pointerdown',fuera);window.addEventListener('resize',mover);window.addEventListener('scroll',mover,true)
    return()=>{document.removeEventListener('pointerdown',fuera);window.removeEventListener('resize',mover);window.removeEventListener('scroll',mover,true)}
  },[abierto])
  useEffect(()=>{
    const opcion=document.getElementById(`${uid}-opcion-${activo}`),lista=menu.current?.querySelector<HTMLElement>('[role="listbox"]')
    if(abierto&&opcion&&lista){if(opcion.offsetTop<lista.scrollTop)lista.scrollTop=opcion.offsetTop;else if(opcion.offsetTop+opcion.offsetHeight>lista.scrollTop+lista.clientHeight)lista.scrollTop=opcion.offsetTop+opcion.offsetHeight-lista.clientHeight}
  },[abierto,activo,uid])
  function elegir(indice:number) {
    const opcion=opciones[indice],select=nativo.current
    if(!select||select.matches(':disabled')||!opcion||opcion.disabled)return
    const actuales=[...select.selectedOptions].map(o=>o.value)
    if(!multiple&&actuales.length===1&&actuales[0]===opcion.valor){setAbierto(false);boton.current?.focus({preventScroll:true});return}
    const siguientes=multiple?(actuales.includes(opcion.valor)?actuales.filter(v=>v!==opcion.valor):[...actuales,opcion.valor]):[opcion.valor]
    for(const o of select.options)o.selected=siguientes.includes(o.value)
    select.dispatchEvent(new Event('change',{bubbles:true}))
    setLocal(siguientes);setError('');if(!multiple)setAbierto(false)
    boton.current?.focus({preventScroll:true})
  }
  function teclado(e:KeyboardEvent<HTMLButtonElement>) {
    if(e.key==='Escape'){if(abierto){e.preventDefault();e.stopPropagation();setAbierto(false)}return}
    if(e.key==='Tab'){setAbierto(false);return}
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      e.preventDefault();if(!abierto){abrir();return}
      if(habilitadas.length){const i=habilitadas.indexOf(activo);setActivo(habilitadas[(i+(e.key==='ArrowDown'?1:-1)+habilitadas.length)%habilitadas.length])}return
    }
    if(abierto&&(e.key==='Home'||e.key==='End')){e.preventDefault();setActivo((e.key==='Home'?habilitadas[0]:habilitadas.at(-1))??0);return}
    if(abierto&&(e.key==='Enter'||e.key===' ')){e.preventDefault();elegir(activo);return}
    if(e.key.length===1&&e.key!==' '&&!e.ctrlKey&&!e.altKey&&!e.metaKey){
      e.preventDefault();if(!abierto)abrir()
      const texto=(Date.now()-busqueda.current.tiempo<700?busqueda.current.texto:'')+e.key
      busqueda.current={texto,tiempo:Date.now()}
      const i=opciones.findIndex(o=>!o.disabled&&normalizar(o.texto).startsWith(normalizar(texto)))
      if(i>=0)setActivo(i)
    }
  }
  const icono=/per[ií]odo|semestre|d[ií]a|bloque/i.test(nombre)?'calendar':/asignatura|plan|prerrequisito/i.test(nombre)?'book':'clipboard'
  return <span className="portal-select" ref={contenedor}>
    <select {...props} id={id??`${uid}-nativo`} ref={nativo} className={`portal-select-native ${className??''}`} value={value} defaultValue={defaultValue} multiple={multiple} disabled={disabled} tabIndex={-1} aria-hidden="true"
      onChange={e=>{setLocal([...e.currentTarget.selectedOptions].map(o=>o.value));setError('');onChange?.(e)}}
      onClick={e=>{e.preventDefault();onClick?.(e)}} onFocus={e=>{onFocus?.(e);boton.current?.focus()}}
      onInvalid={e=>{e.preventDefault();onInvalid?.(e);setError('Selecciona una opción.');const form=e.currentTarget.form;const primero=form?.querySelector(':invalid');if(!primero||primero===e.currentTarget){abrir();boton.current?.focus()}}}>
      {children}
    </select>
    <button ref={boton} type="button" role="combobox" aria-label={props['aria-labelledby']?undefined:nombre} aria-labelledby={props['aria-labelledby']}
      aria-expanded={abierto&&!bloqueado} aria-haspopup="listbox" aria-controls={abierto?`${uid}-lista`:undefined} aria-activedescendant={abierto?`${uid}-opcion-${activo}`:undefined}
      aria-required={props.required} aria-invalid={!!error||props['aria-invalid']} aria-describedby={error?`${uid}-error`:props['aria-describedby']}
      disabled={bloqueado} className="portal-select-trigger" title={resumen} onClick={()=>abierto?setAbierto(false):abrir()} onKeyDown={teclado}>
      <span className="portal-select-icon"><PortalIcon name={icono}/></span><span className="portal-select-value">{resumen}</span><PortalIcon name="chevron" className="portal-select-chevron"/>
    </button>
    {error&&<span id={`${uid}-error`} role="alert" className="portal-select-error">{error}</span>}
    {abierto&&!bloqueado&&destino&&createPortal(<div ref={menu} className="portal-select-menu" style={posicion}>
      <div className="portal-select-heading"><span>{nombre}</span><small>{multiple?`${seleccionadas.length} seleccionadas`:`${opciones.length} opciones`}</small></div>
      <ul role="listbox" id={`${uid}-lista`} aria-label={nombre} aria-multiselectable={multiple||undefined} className="portal-select-options">
        {opciones.map((o,i)=><Fragment key={`${o.valor}-${i}`}>
          {o.grupo&&o.grupo!==opciones[i-1]?.grupo&&<li role="presentation" className="portal-select-group">{o.grupo}</li>}
          <li role="option" id={`${uid}-opcion-${i}`} aria-selected={elegidos.includes(o.valor)} aria-disabled={o.disabled||undefined}
            className={`portal-select-option${activo===i?' is-active':''}${elegidos.includes(o.valor)?' is-selected':''}`}
            onPointerMove={()=>{if(!o.disabled)setActivo(i)}} onMouseDown={e=>e.preventDefault()} onClick={()=>elegir(i)}>
            <span className={`portal-select-option-mark${multiple?' is-multiple':''}`} aria-hidden="true">{elegidos.includes(o.valor)?'✓':''}</span>
            <span className="portal-select-option-text">{o.texto.split(' · ').map((parte,j)=>j===0?<strong key={j}>{parte}</strong>:<span key={j}>{parte}</span>)}</span>
          </li>
        </Fragment>)}
        {!opciones.length&&<li role="presentation" className="portal-select-empty">No hay opciones disponibles.</li>}
      </ul>
      {multiple&&<button type="button" className="portal-select-done" onClick={()=>{setAbierto(false);boton.current?.focus()}}>Listo</button>}
    </div>,destino)}
  </span>
}
