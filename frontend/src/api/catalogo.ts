import api from './axios'
import type { AsignaturasResponse, CarrerasResponse, MallaResponse } from '../types/api'

export async function getCarreras(): Promise<CarrerasResponse> {
  const { data } = await api.get<CarrerasResponse>('/catalogo/carreras')
  return data
}

export async function getAsignaturas(): Promise<AsignaturasResponse> {
  const { data } = await api.get<AsignaturasResponse>('/catalogo/asignaturas')
  return data
}

export async function getMalla(idCarrera: number): Promise<MallaResponse> {
  const { data } = await api.get<MallaResponse>(`/catalogo/carreras/${idCarrera}/malla`)
  return data
}
