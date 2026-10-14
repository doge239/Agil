import api from './axios'
import type { PerfilResponse } from '../types/api'

export async function getMiPerfil(): Promise<PerfilResponse> {
  const { data } = await api.get<PerfilResponse>('/usuarios/me')
  return data
}
