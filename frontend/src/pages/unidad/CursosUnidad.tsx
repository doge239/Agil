import { Select } from '../../components/Select'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { getCursosUnidad,getAsignaturasUnidad,crearCursoUnidad } from '../../api/unidad'
import { usePeriodo } from '../../context/periodo'
import { useFetch } from '../../hooks/useFetch'
import { PageHeader } from '../../components/PageHeader'
import { ErrorBanner } from '../../components/ErrorBanner'
import { EmptyState } from '../../components/EmptyState'
import { Spinner } from '../../components/Spinner'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { Badge } from '../../components/Badge'
import { ResultadoUnidad } from './Compartidos'
import { useOperacionUnidad,nombrePersona } from './operacion'
export function CursosUnidad(){
  const periodo=usePeriodo(),op=useOperacionUnidad(),[mostrar,setMostrar]=useState(false)
  const {data,loading,error,refetch}=useFetch(()=>getCursosUnidad(periodo),[periodo])
  const catalogo=useFetch(getAsignaturasUnidad,[])
  async function crear(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=e.currentTarget,d=new FormData(f);await op.ejecutar(()=>crearCursoUnidad({id_asignatura:Number(d.get('id_asignatura')),id_periodo:periodo!,seccion:Number(d.get('seccion')),cupo_maximo:Number(d.get('cupo_maximo'))}),()=>{f.reset();setMostrar(false);refetch()},'Curso creado.')}
  return <div><PageHeader titulo="Cursos de la unidad" descripcion="Gestiona la oferta, docentes e inscripciones de tu unidad académica."/><Button className="mb-4" onClick={()=>setMostrar(!mostrar)}>{mostrar?'Cerrar formulario':'Crear curso'}</Button><ResultadoUnidad {...op}/>
    {mostrar&&<form onSubmit={crear} className="mb-4 rounded-xl bg-surface p-4"><fieldset disabled={op.ocupado||catalogo.loading} className="grid gap-3 sm:grid-cols-3"><label className="flex flex-col gap-2">Asignatura<Select required name="id_asignatura" className="rounded-lg border border-border bg-surface p-2"><option value="">Selecciona una asignatura</option>{catalogo.data?.asignaturas.map(a=><option key={a.id_asignatura} value={a.id_asignatura}>{a.codigo} · {a.nombre}</option>)}</Select></label><Input label="Sección" type="number" name="seccion" min="1" required/><Input label="Cupo máximo" type="number" name="cupo_maximo" min="1" required/><Button type="submit" cargando={op.ocupado}>Guardar en el período seleccionado</Button></fieldset>{catalogo.error&&<ErrorBanner mensaje={catalogo.error} onRetry={catalogo.refetch}/>}</form>}
    {loading?<Spinner/>:error?<ErrorBanner mensaje={error} onRetry={refetch}/>:!data?.cursos.length?<EmptyState mensaje="No hay cursos de tu unidad en este período."/>:<div className="grid gap-4 lg:grid-cols-2">{data.cursos.map(c=><article key={c.id_curso} className="rounded-xl border border-border bg-surface p-4"><Badge estado={c.estado}/><h2 className="my-2 font-semibold">{c.codigo} · {c.nombre}</h2><p>Sección {c.seccion} · {c.inscritos}/{c.cupo_maximo} inscritos</p><p className="my-2 text-sm text-muted">Docentes: {c.docentes.map(id=>{const p=data.docentes.find(p=>p.id_docente===id);return p?nombrePersona(p):`Docente #${id}`}).join('; ')||'Sin asignar'}</p><Link className="font-medium text-primary underline" to={`/unidad/cursos/${c.id_curso}`}>Gestionar curso</Link></article>)}</div>}
  </div>
}
