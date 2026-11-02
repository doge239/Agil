import api from './axios'
import type { PersonaUnidad, RestriccionUnidad } from './unidad'
export interface PeriodoGeneral {id_periodo:number;anio:number;semestre:number;fecha_inicio:string;fecha_fin:string;estado:string;inscripcion_abierta:boolean;version:number}
export interface AuditoriaGeneral {id_auditoria:number;id_usuario:number;accion:string;fecha:string;detalle:unknown}
const base='/academico/general'
export async function getResumenGeneral(){return (await api.get<{resumen:Record<string,number>}>(base+'/resumen')).data}
export async function getPeriodosGeneral(){return (await api.get<{periodos:PeriodoGeneral[]}>(base+'/periodos')).data}
export async function crearPeriodoGeneral(datos:{anio:number;semestre:number;fecha_inicio:string;fecha_fin:string;motivo:string}){return (await api.post(base+'/periodos',datos)).data}
export async function editarPeriodoGeneral(p:PeriodoGeneral,estado:string,inscripcion_abierta:boolean,motivo:string){return (await api.patch(`${base}/periodos/${p.id_periodo}`,{estado,inscripcion_abierta,motivo,version:p.version})).data}
export async function buscarEstudiantesGeneral(q:string){return (await api.get<{estudiantes:PersonaUnidad[]}>(base+'/estudiantes',{params:{q}})).data}
export async function getRestriccionesGeneral(offset:number,estudiante?:number){return (await api.get<{restricciones:RestriccionUnidad[];total:number}>(base+'/restricciones',{params:{offset,estudiante}})).data}
export async function crearRestriccionGeneral(id_estudiante:number,tipo:string,descripcion:string){return (await api.post(base+'/restricciones',{id_estudiante,tipo,descripcion})).data}
export async function levantarRestriccionGeneral(r:RestriccionUnidad,motivo:string){return (await api.patch(`${base}/restricciones/${r.id_restriccion}/levantar`,{motivo,version:r.version})).data}
export async function getAuditoriaGeneral(offset:number,accion:string,origen='academico'){return (await api.get<{auditoria:AuditoriaGeneral[];total:number}>((origen==='catalogo'?'/catalogo/general':base)+'/auditoria',{params:{offset,accion}})).data}
