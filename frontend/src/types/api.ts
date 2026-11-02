export interface Usuario {
  id_usuario: number
  correo: string
  roles: string[]
}

export interface LoginResponse {
  mensaje: string
  token: string
  usuario: Usuario
}

export interface MeResponse {
  mensaje: string
  usuario: Usuario & { iat?: number; exp?: number }
}

export interface Perfil {
  id_persona: number
  id_usuario: number
  rut: string | null
  nombres: string
  apellido_paterno: string
  apellido_materno: string | null
  correo_institucional: string
  telefono: string | null
  id_estudiante: number | null
  numero_matricula: string | null
  id_carrera: number | null
  anio_ingreso: number | null
  id_plan: number | null
  id_docente: number | null
  id_unidad_docente: number | null
  id_unidad_admin: number | null
}

export interface PerfilResponse {
  perfil: Perfil
}

export interface Carrera {
  id_carrera: number
  codigo: string
  nombre: string
  estado: string
  id_unidad: number
  unidad_academica: string
}

export interface CarrerasResponse {
  carreras: Carrera[]
}

export interface Asignatura {
  id_asignatura: number
  codigo: string | null
  nombre: string
  creditos: number | null
  descripcion: string | null
  estado: string
}

export interface AsignaturasResponse {
  asignaturas: Asignatura[]
}

export interface MallaItem {
  id_carrera: number
  carrera: string
  id_plan: number
  plan: string
  semestre: number
  id_asignatura: number
  codigo: string | null
  asignatura: string
  creditos: number | null
  obligatoria: boolean
}

export interface MallaResponse {
  malla: MallaItem[]
  planes: Plan[]
  plan: Plan
  prerrequisitos: {id_asignatura:number;id_asignatura_requisito:number}[]
}

export interface AsignaturaInscrita {
  id_curso: number
  id_asignatura: number
  codigo: string | null
  nombre: string | null
  creditos: number | null
  seccion: number
}

export interface AsignaturasInscritasResponse {
  asignaturas: AsignaturaInscrita[]
}

export interface HorarioItem {
  id_horario?: number
  id_curso: number
  id_asignatura: number
  seccion: number
  dia_semana: string
  hora_inicio: string
  hora_fin: string
  sala: string | null
  codigo?: string | null
  nombre?: string | null
}

export interface HorarioResponse {
  horario: HorarioItem[]
  demostracion: boolean
  descripcion_escenario: string | null
}

export interface NotaItem {
  id_curso: number
  id_asignatura: number
  id_evaluacion: number
  evaluacion: string
  porcentaje: string
  nota: string | null
  seccion: number
}

export interface NotasResponse {
  notas: NotaItem[]
  finales: {id_curso:number;id_asignatura:number;seccion:number;nota:string;nota_minima:string}[]
}

export interface AsistenciaItem {
  id_clase: number
  id_curso: number
  id_asignatura: number
  fecha: string
  hora_inicio: string | null
  hora_fin: string | null
  estado: string
  observacion: string | null
}

export interface AsistenciaResponse {
  asistencia: AsistenciaItem[]
}

export interface Plan { id_plan:number; id_carrera:number; nombre:string; anio_inicio:number; estado:string }
export interface OfertaCurso extends AsignaturaInscrita {
  cupos_disponibles:number; inscrito:boolean; inscripcion_abierta:boolean; horarios:HorarioItem[]
  lista_espera_estado:'ESPERA'|'PROMOVIDA'|'CANCELADA'|'NO_ELEGIBLE'|null
  posicion_espera:number|null
}
export interface Restriccion { id_restriccion:number; tipo:string; descripcion:string|null; activa:boolean }
export interface Solicitud { id_solicitud:number; id_restriccion:number; tipo:string; motivo:string; estado:string; fecha_creacion:string; resolucion:string|null; fecha_resolucion:string|null }
export interface Encuesta { id_encuesta:number; titulo:string; nombre:string; id_docente:number; fecha_fin:string; respondida:boolean; disponible:boolean; preguntas:{id_pregunta:number;texto:string;orden:number}[] }
export type DisponibilidadCurricular = 'DISPONIBLE' | 'BLOQUEADA' | 'POR_CONFIRMAR'
export interface RequisitoCurricular { id_asignatura:number; asignatura:string; codigo:string|null; cumplido:boolean }
export interface AsignaturaAvance extends Omit<MallaItem, 'codigo' | 'creditos'> {
  codigo:string|null; creditos:number|null; orden:number; estado:'APROBADA'|'EN_CURSO'|'REPROBADA'|'PENDIENTE'
  nota:number|null; intentos:number; disponibilidad:DisponibilidadCurricular
  requisitos_estado:'CONFIRMADOS'|'POR_CONFIRMAR'; requisito_nivel:number|null; espacio_electivo:boolean; fuente:string|null
  elegida:{id_asignatura:number;nombre:string;codigo:string|null}|null
  prerrequisitos:RequisitoCurricular[]; pendientes:RequisitoCurricular[]
  habilita:{id_asignatura:number;asignatura:string;codigo:string|null;disponibilidad:DisponibilidadCurricular;otros_pendientes:RequisitoCurricular[]}[]
}
export interface Avance {
  plan:Plan & {referencia:string|null;fuente:string|null;observaciones:string|null}
  demostracion:boolean; descripcion_escenario:string|null; sin_historial:boolean; creditos_confirmados:boolean; creditos_totales:number|null; creditos_aprobados:number|null; porcentaje:number|null
  asignaturas_totales:number; asignaturas_aprobadas:number; porcentaje_asignaturas:number; asignaturas:AsignaturaAvance[]
}
