// Fixture de navegador: se monta desde las pruebas, no desde las rutas de la aplicación.
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Select } from '../../src/components/Select'
import '../../src/index.css'
import '../../src/styles/themes.css'

declare global {interface Window {fixtureSubmitted?:Record<string,FormDataEntryValue>;fixtureMultiEvent?:string[]}}
function Fixture() {
  const [multi,setMulti]=useState(['a']),[locked,setLocked]=useState(true)
  return <div id="select-fixture" style={{maxWidth:460,margin:24,padding:20,background:'var(--background)'}}>
    <form id="select-fixture-form" style={{display:'grid',gap:12}} onSubmit={e=>{e.preventDefault();window.fixtureSubmitted=Object.fromEntries(new FormData(e.currentTarget))}}>
      <label>Required field<Select name="required" required defaultValue=""><option value="">Choose</option><option value="x">X</option><option value="y" disabled>Disabled Y</option><option value="z">Z</option></Select></label>
      <label>Default field<Select name="default" defaultValue="b"><option value="a">Alpha</option><option value="b">Beta</option></Select></label>
      <label>Multiple field<Select name="multi" multiple value={multi} onChange={e=>{window.fixtureMultiEvent=[...e.target.selectedOptions].map(o=>o.value);setMulti(window.fixtureMultiEvent)}}><option value="a">Alpha</option><option value="b">Beta</option><option value="c" disabled>Disabled Gamma</option></Select></label>
      <fieldset disabled={locked}><label>Locked field<Select name="locked" defaultValue="a"><option value="a">Alpha</option><option value="b">Beta</option></Select></label></fieldset>
      <label>Long field<Select name="long" defaultValue="0">{Array.from({length:120},(_,i)=><option key={i} value={String(i)}>Option {i}</option>)}</Select></label>
      <button type="button" onClick={()=>setLocked(v=>!v)}>Toggle lock</button>
      <button type="submit">Submit fixture</button><button type="reset">Reset fixture</button>
      <button type="button" onClick={()=>document.querySelector<HTMLDialogElement>('#select-fixture-dialog')?.showModal()}>Open fixture dialog</button>
    </form>
    <dialog id="select-fixture-dialog" style={{margin:'auto',padding:24,width:350}}>
      <label>Dialog field<Select name="dialog"><option value="a">Alpha</option><option value="b">Beta</option></Select></label>
      <button type="button" onClick={()=>document.querySelector<HTMLDialogElement>('#select-fixture-dialog')?.close()}>Close fixture dialog</button>
    </dialog>
  </div>
}
createRoot(document.getElementById('root')!).render(<StrictMode><Fixture/></StrictMode>)
