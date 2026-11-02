import api from './axios'
import type { CursoUnidad } from './unidad'
export interface UnidadGeneral {id_unidad:number;codigo:string;nombre:string;activo:boolean}
export interface CarreraGeneral {id_carrera:number;id_unidad:number;codigo:string;nombre:string;estado:string;version:number;unidad_academica:string}
export interface AsignaturaGeneral {id_asignatura:number;codigo:string|null;nombre:string;creditos:number|null;descripcion:string|null;estado:string;version:number}
export interface PlanGeneral {id_plan:number;id_carrera:number;nombre:string;anio_inicio:number;estado:string;version:number;gestionado:boolean}
export interface FilaMalla {id_asignatura:number;semestre:number;orden:number;obligatoria:boolean;requisitos_estado:string;requisito_nivel:number|null;espacio_electivo:boolean;fuente:string|null;prerrequisitos:number[];opciones:number[]}
export interface CursoGeneral extends CursoUnidad {id_unidad:number;unidad:string}
const base='/catalogo/general'
export async function getUnidadesGeneral(){return (await api.get<{unidades:UnidadGeneral[]}>(base+'/unidades')).data}
export async function getCarrerasGeneral(){return (await api.get<{carreras:CarreraGeneral[]}>(base+'/carreras')).data}
export async function guardarCarreraGeneral(datos:{id_unidad:number;codigo:string;nombre:string;estado:string;motivo:string;version?:number},id?:number){return (id?await api.patch(`${base}/carreras/${id}`,datos):await api.post(base+'/carreras',datos)).data}
export async function getAsignaturasGeneral(){return (await api.get<{asignaturas:AsignaturaGeneral[]}>(base+'/asignaturas')).data}
export async function guardarAsignaturaGeneral(datos:{codigo:string|null;nombre:string;creditos:number|null;descripcion:string;estado:string;motivo:string;version?:number},id?:number){return (id?await api.patch(`${base}/asignaturas/${id}`,datos):await api.post(base+'/asignaturas',datos)).data}
export async function getPlanesGeneral(carrera:number){return (await api.get<{planes:PlanGeneral[]}>(`${base}/carreras/${carrera}/planes`)).data}
export async function crearPlanGeneral(carrera:number,datos:{nombre:string;anio_inicio:number;motivo:string;id_plan_origen:number|null}){return (await api.post(`${base}/carreras/${carrera}/planes`,datos)).data}
export async function getMallaGeneral(plan:number){return (await api.get<{plan:PlanGeneral;malla:FilaMalla[]}>(`${base}/planes/${plan}/malla`)).data}
export async function guardarMallaGeneral(plan:PlanGeneral,malla:FilaMalla[],motivo:string){return (await api.put(`${base}/planes/${plan.id_plan}/malla`,{malla,motivo,version:plan.version})).data}
export async function cambiarEstadoPlan(plan:PlanGeneral,estado:string,motivo:string){return (await api.patch(`${base}/planes/${plan.id_plan}`,{estado,motivo,version:plan.version})).data}
export async function getOfertaGeneral(unidad:number){return (await api.get<{asignaturas:AsignaturaGeneral[]}>(base+'/oferta',{params:{unidad}})).data}
export async function getCursosGeneral(periodo?:number,unidad?:number){return (await api.get<{cursos:CursoGeneral[]}>('/academico/general/cursos',{params:{periodo,unidad}})).data}
export async function crearCursoGeneral(datos:{id_asignatura:number;id_periodo:number;id_unidad:number;seccion:number;cupo_maximo:number;motivo:string}){return (await api.post('/academico/general/cursos',datos)).data}
export async function editarCursoGeneral(c:CursoGeneral,datos:{cupo_maximo:number;estado:string;motivo:string}){return (await api.patch(`/academico/general/cursos/${c.id_curso}`,{...datos,version:c.version})).data}
