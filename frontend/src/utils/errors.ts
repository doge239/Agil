import { isAxiosError } from 'axios'

export function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { mensaje?: string } | undefined
    if (data?.mensaje) {
      return data.mensaje
    }
    if (error.response?.status === 401) {
      return 'Sesión expirada o no autorizada'
    }
    if (error.code === 'ERR_NETWORK') {
      return 'No se pudo conectar con el servidor'
    }
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Ocurrió un error inesperado'
}
