import api from './axios'
import type { CursoDocente } from './docente'
import type { Asignatura, Restriccion, Solicitud, HorarioItem } from '../types/api'
export interface PersonaUnidad {id_estudiante?:number;id_docente?:number;id_carrera?:number;id_plan?:number;nombres:string;apellido_paterno:string;apellido_materno:string|null;numero_matricula:string|null;correo_institucional:string}
export interface CursoUnidad extends CursoDocente {id_asignatura:number;cupo_maximo:number;version:number;docentes:number[]}
export interface RestriccionUnidad extends Restriccion {id_estudiante:number;version:number;motivo_levantamiento:string|null}
const base='/academico/unidad'
export async function getCursosUnidad(periodo?:number){return (await api.get<{cursos:CursoUnidad[];docentes:PersonaUnidad[]}>(`${base}/cursos`,{params:{periodo}})).data}
export async function getAsignaturasUnidad(){return (await api.get<{asignaturas:Asignatura[]}>(`${base}/asignaturas`)).data}
export async function buscarEstudiantesUnidad(q=''){return (await api.get<{estudiantes:PersonaUnidad[]}>(`${base}/estudiantes`,{params:{q}})).data}
export async function crearCursoUnidad(datos:{id_asignatura:number;id_periodo:number;seccion:number;cupo_maximo:number}){return (await api.post(base+'/cursos',datos)).data}
export async function editarCursoUnidad(id:number,datos:{cupo_maximo:number;estado:string;version:number}){return (await api.patch(`${base}/cursos/${id}`,datos)).data}
export async function asignarDocente(id:number,docente:number,motivo:string,asignar=true){const ruta=`${base}/cursos/${id}/docentes/${docente}`;return asignar?(await api.put(ruta,{motivo})).data:(await api.delete(ruta,{data:{motivo}})).data}
export async function guardarHorarioUnidad(id:number,horarios:Partial<HorarioItem>[],version:number){return (await api.put(`${base}/cursos/${id}/horarios`,{horarios,version})).data}
export async function inscribirUnidad(id:number,id_estudiante:number,motivo:string){return (await api.post(`${base}/cursos/${id}/inscripciones`,{id_estudiante,motivo})).data}
export async function getRestriccionesUnidad(){return (await api.get<{restricciones:RestriccionUnidad[]}>(base+'/restricciones')).data}
export async function crearRestriccionUnidad(id_estudiante:number,tipo:string,descripcion:string){return (await api.post(base+'/restricciones',{id_estudiante,tipo,descripcion})).data}
export async function levantarRestriccion(id:number,motivo:string,version:number){return (await api.patch(`${base}/restricciones/${id}/levantar`,{motivo,version})).data}
export async function getSolicitudesUnidad(){return (await api.get<{solicitudes:(Solicitud&{id_estudiante:number})[]}>('/academico/administracion/solicitudes')).data}
export async function resolverSolicitudUnidad(id:number,estado:string,resolucion:string){return (await api.patch(`/academico/administracion/solicitudes/${id}`,{estado,resolucion})).data}
