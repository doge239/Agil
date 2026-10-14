import { useMemo } from 'react'
import { getAsignaturas } from '../api/catalogo'
import { useFetch } from './useFetch'

export interface AsignaturaInfo {
  codigo: string
  nombre: string
}

export function useAsignaturasMap() {
  const { data } = useFetch(() => getAsignaturas(), [])

  return useMemo(() => {
    const mapa = new Map<number, AsignaturaInfo>()
    data?.asignaturas.forEach((asignatura) => {
      mapa.set(asignatura.id_asignatura, {
        codigo: asignatura.codigo,
        nombre: asignatura.nombre,
      })
    })
    return mapa
  }, [data])
}
