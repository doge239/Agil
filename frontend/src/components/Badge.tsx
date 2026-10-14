import { cn } from '../utils/cn'

type Color = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const estilos: Record<Color, string> = {
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/15 text-danger',
  info: 'bg-info/15 text-info',
  neutral: 'bg-muted/15 text-muted',
}

function colorPorEstado(estado: string): Color {
  const normalizado = estado.toUpperCase()

  if (['PRESENTE', 'ACTIVO', 'ACTIVA', 'APROBADO', 'OBLIGATORIA'].includes(normalizado)) {
    return 'success'
  }
  if (['AUSENTE', 'INACTIVO', 'REPROBADO', 'SUSPENDIDO'].includes(normalizado)) {
    return 'danger'
  }
  if (['ATRASADO', 'JUSTIFICADO', 'PENDIENTE'].includes(normalizado)) {
    return 'warning'
  }
  return 'info'
}

export function Badge({ estado, color }: { estado: string; color?: Color }) {
  const tono = color ?? colorPorEstado(estado)

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        estilos[tono],
      )}
    >
      {estado}
    </span>
  )
}
