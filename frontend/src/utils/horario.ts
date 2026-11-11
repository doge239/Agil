export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export interface Bloque {
  letra: string
  hora_inicio: string
  hora_fin: string
}

export const BLOQUES: Bloque[] = [
  { letra: 'A', hora_inicio: '08:10', hora_fin: '09:40' },
  { letra: 'B', hora_inicio: '09:55', hora_fin: '11:25' },
  { letra: 'C', hora_inicio: '11:40', hora_fin: '13:10' },
  { letra: 'D', hora_inicio: '14:30', hora_fin: '16:00' },
  { letra: 'E', hora_inicio: '16:15', hora_fin: '17:45' },
  { letra: 'F', hora_inicio: '18:00', hora_fin: '19:30' },
]

export function normalizarDia(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function aMinutos(hora: string): number {
  const [horas, minutos] = hora.slice(0, 5).split(':').map(Number)
  return horas * 60 + minutos
}

export function bloqueParaHorario(horaInicio: string, horaFin: string): string {
  const inicio = aMinutos(horaInicio)
  const fin = aMinutos(horaFin)
  // No redondear una clase a otro bloque: se deben conservar sus horas reales.
  return BLOQUES.find(b => inicio >= aMinutos(b.hora_inicio) && fin <= aMinutos(b.hora_fin))?.letra ?? 'ESPECIAL'
}

export function etiquetaBloque(horaInicio: string | null, horaFin: string | null): string {
  if (!horaInicio || !horaFin) return 'Sin bloque'
  const bloque = bloqueParaHorario(horaInicio, horaFin)
  return bloque === 'ESPECIAL' ? `Especial · ${horaInicio.slice(0, 5)}–${horaFin.slice(0, 5)}` : `Bloque ${bloque}`
}

export function seSuperponen(a: {dia_semana:string;hora_inicio:string;hora_fin:string}, b: {dia_semana:string;hora_inicio:string;hora_fin:string}): boolean {
  return normalizarDia(a.dia_semana) === normalizarDia(b.dia_semana)
    && aMinutos(a.hora_inicio) < aMinutos(b.hora_fin)
    && aMinutos(b.hora_inicio) < aMinutos(a.hora_fin)
}

export const COLORES_ASIGNATURA: string[] = [
  'border-sky-300 bg-sky-50 text-sky-900',
  'border-emerald-300 bg-emerald-50 text-emerald-900',
  'border-violet-300 bg-violet-50 text-violet-900',
  'border-amber-300 bg-amber-50 text-amber-900',
  'border-rose-300 bg-rose-50 text-rose-900',
  'border-teal-300 bg-teal-50 text-teal-900',
  'border-indigo-300 bg-indigo-50 text-indigo-900',
  'border-orange-300 bg-orange-50 text-orange-900',
]

export function asignarColores(ids: number[]): Map<number, string> {
  const colores = new Map<number, string>()
  const usados = new Set<number>()
  for (const id of [...new Set(ids)].sort((a, b) => a - b)) {
    let indice = (id - 1) % COLORES_ASIGNATURA.length
    for (let intento = 0; usados.has(indice) && intento < COLORES_ASIGNATURA.length; intento++) indice = (indice + 1) % COLORES_ASIGNATURA.length
    usados.add(indice)
    colores.set(id, COLORES_ASIGNATURA[indice])
  }
  return colores
}
