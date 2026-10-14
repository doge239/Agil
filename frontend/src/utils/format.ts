export function formatFecha(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }
  const fecha = new Date(value)
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
