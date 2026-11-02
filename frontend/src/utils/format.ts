export function formatFecha(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }
  // Una fecha académica sin hora representa un día civil, no medianoche UTC.
  const fecha = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value)
  if (Number.isNaN(fecha.getTime())) {
    return '—'
  }
  return fecha.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatHora(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }
  return value.slice(0, 5)
}

export function formatNota(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—'
  }
  const nota = Number(value)
  return Number.isNaN(nota) ? '—' : nota.toFixed(1)
}

export function formatPorcentaje(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—'
  }
  const numero = Number(value)
  return Number.isNaN(numero) ? '—' : `${numero}%`
}
