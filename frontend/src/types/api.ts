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
  codigo: string
  nombre: string
  creditos: number
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
  codigo: string
  asignatura: string
  creditos: number
  obligatoria: boolean
}

export interface MallaResponse {
  malla: MallaItem[]
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
  id_curso: number
  id_asignatura: number
  seccion: number
  dia_semana: string
  hora_inicio: string
  hora_fin: string
  sala: string | null
}

export interface HorarioResponse {
  horario: HorarioItem[]
}

export interface NotaItem {
  id_curso: number
  id_asignatura: number
  id_evaluacion: number
  evaluacion: string
  porcentaje: string
  nota: string
}

export interface NotasResponse {
  notas: NotaItem[]
}

export interface AsistenciaItem {
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
