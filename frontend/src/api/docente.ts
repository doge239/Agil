import api from './axios'
import type { HorarioItem } from '../types/api'
const base='/academico/docente'
export interface CursoDocente {
  id_curso:number;nombre:string;codigo:string;id_periodo:number;anio:number;semestre:number;
  seccion:number;estado:string;estado_periodo:string;inscritos:number;horarios:HorarioItem[]
}
export interface EstudianteCurso {
  id_estudiante:number;id_inscripcion:number;nombres:string;apellido_paterno:string;apellido_materno:string|null;
  numero_matricula:string;correo_institucional:string;estado:string;fecha_inscripcion:string
}
export interface EvaluacionDocente {id_evaluacion:number;id_curso:number;nombre:string;porcentaje:string;fecha:string|null;version:number}
export interface NotaDocente {id_estudiante:number;nota:string|null;version:number;cerrado:boolean;estado:string}
export interface ClaseDocente {id_clase:number;id_curso:number;fecha:string;hora_inicio:string|null;hora_fin:string|null;asistencias_registradas?:number;revision_asistencia?:string}
export interface AsistenciaDocente {id_estudiante:number;estado:string|null;observacion:string|null;version:number;estado_inscripcion:string}
export interface HistorialDocente {id_auditoria:number;accion:string;fecha:string;detalle:{id_estudiante?:number;id_evaluacion?:number;id_clase?:number;anterior?:{nota?:string;estado?:string;nombre?:string;observacion?:string}|null;nuevo?:number|{nota?:number;estado?:string;nombre?:string;observacion?:string}}}
export async function getCursosDocente(periodo?:number) {return (await api.get<{cursos:CursoDocente[]}>(`${base}/cursos`,{params:{periodo}})).data}
export async function getEstudiantesCurso(id:number) {return (await api.get<{estudiantes:EstudianteCurso[]}>(`${base}/cursos/${id}/estudiantes`)).data}
export async function getEvaluaciones(id:number) {return (await api.get<{evaluaciones:EvaluacionDocente[]}>(`${base}/cursos/${id}/evaluaciones`)).data}
export async function guardarEvaluacion(id:number,datos:{nombre:string;porcentaje:number;fecha:string|null;version?:number},evaluacion?:number) {
  return evaluacion?(await api.patch(`${base}/cursos/${id}/evaluaciones/${evaluacion}`,datos)).data:(await api.post(`${base}/cursos/${id}/evaluaciones`,datos)).data
}
export async function getNotasDocente(id:number,evaluacion:number) {return (await api.get<{notas:NotaDocente[]}>(`${base}/cursos/${id}/evaluaciones/${evaluacion}/notas`)).data}
export async function guardarNotas(id:number,evaluacion:number,notas:{id_estudiante:number;nota:number;version:number}[]) {return (await api.put(`${base}/cursos/${id}/evaluaciones/${evaluacion}/notas`,{notas})).data}
export async function getClases(id:number) {return (await api.get<{clases:ClaseDocente[]}>(`${base}/cursos/${id}/clases`)).data}
export async function crearClase(id:number,datos:{fecha:string;hora_inicio:string;hora_fin:string}) {return (await api.post(`${base}/cursos/${id}/clases`,datos)).data}
export async function eliminarClase(id:number,clase:number,motivo:string,revision_asistencia:string) {return (await api.delete<{mensaje:string;asistencias_eliminadas:number}>(`${base}/cursos/${id}/clases/${clase}`,{data:{confirmar:true,motivo,revision_asistencia}})).data}
export async function getAsistenciasDocente(id:number,clase:number) {return (await api.get<{asistencias:AsistenciaDocente[]}>(`${base}/cursos/${id}/clases/${clase}/asistencias`)).data}
export async function guardarAsistencias(id:number,clase:number,asistencias:{id_estudiante:number;estado:string;observacion:string;version:number}[]) {return (await api.put(`${base}/cursos/${id}/clases/${clase}/asistencias`,{asistencias})).data}
export async function getHistorialDocente(id:number) {return (await api.get<{historial:HistorialDocente[]}>(`${base}/cursos/${id}/historial`)).data}
export interface RegistroAsistenciaCurso {id_clase:number;id_estudiante:number;estado:string;observacion:string|null;version:number;origen:'MANUAL'|'QR'}
export interface ResumenAsistenciaCurso {clases:ClaseDocente[];asistencias:RegistroAsistenciaCurso[];fecha_hoy:string}
export interface SesionAsistenciaQr {id_sesion:string;id_clase:number;creada:string;expira:string;cerrada:string|null;activa:boolean;token:string|null}
export async function getResumenAsistenciaCurso(id:number) {return (await api.get<ResumenAsistenciaCurso>(`${base}/cursos/${id}/asistencia-resumen`)).data}
export async function getSesionAsistenciaQr(id:number,clase:number) {return (await api.get<{sesion:SesionAsistenciaQr|null}>(`${base}/cursos/${id}/clases/${clase}/qr`)).data}
export async function abrirAsistenciaQr(id:number,clase:number,duracion_minutos:number) {return (await api.post<{sesion:SesionAsistenciaQr}>(`${base}/cursos/${id}/clases/${clase}/qr`,{duracion_minutos})).data}
export async function cerrarAsistenciaQr(id:number,clase:number,marcar_ausentes:boolean) {return (await api.delete<{mensaje:string;ausentes_registrados:number}>(`${base}/cursos/${id}/clases/${clase}/qr`,{data:{marcar_ausentes}})).data}
