import api from './axios'
import type { LoginResponse, MeResponse } from '../types/api'

export async function login(correo: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', { correo, password })
  return data
}

export async function getMe(): Promise<MeResponse> {
  const { data } = await api.get<MeResponse>('/auth/me')
  return data
}
