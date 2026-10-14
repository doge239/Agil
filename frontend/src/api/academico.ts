import api from './axios'
import type {
  AsignaturasInscritasResponse,
  AsistenciaResponse,
  HorarioResponse,
  NotasResponse,
} from '../types/api'

export async function getAsignaturas(): Promise<AsignaturasInscritasResponse> {
  const { data } = await api.get<AsignaturasInscritasResponse>('/academico/asignaturas')
  return data
}

export async function getHorario(): Promise<HorarioResponse> {
  const { data } = await api.get<HorarioResponse>('/academico/horario')
  return data
}

export async function getNotas(): Promise<NotasResponse> {
  const { data } = await api.get<NotasResponse>('/academico/notas')
  return data
}

export async function getAsistencia(): Promise<AsistenciaResponse> {
  const { data } = await api.get<AsistenciaResponse>('/academico/asistencia')
  return data
}
