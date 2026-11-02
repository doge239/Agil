import api from './axios'
import type {
  AsignaturasInscritasResponse,
  AsistenciaResponse,
  HorarioResponse,
  NotasResponse,
} from '../types/api'

export async function getAsignaturas(periodo?:number): Promise<AsignaturasInscritasResponse> {
  const { data } = await api.get<AsignaturasInscritasResponse>('/academico/asignaturas',{params:{periodo}})
  return data
}

export async function getHorario(periodo?:number): Promise<HorarioResponse> {
  const { data } = await api.get<HorarioResponse>('/academico/horario',{params:{periodo}})
  return data
}

export async function getNotas(periodo?:number): Promise<NotasResponse> {
  const { data } = await api.get<NotasResponse>('/academico/notas',{params:{periodo}})
  return data
}

export async function getAsistencia(periodo?:number): Promise<AsistenciaResponse> {
  const { data } = await api.get<AsistenciaResponse>('/academico/asistencia',{params:{periodo}})
  return data
}
