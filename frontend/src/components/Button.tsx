import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../utils/cn'
import { Spinner } from './Spinner'

type Variante = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  cargando?: boolean
}

const estilos: Record<Variante, string> = {
  primary: 'bg-primary text-primary-fg hover:bg-primary-hover',
  secondary: 'border border-border bg-surface text-text hover:bg-background',
  ghost: 'text-text hover:bg-background',
  danger: 'bg-danger text-white hover:opacity-90',
}

export function Button({
  variante = 'primary',
  cargando = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || cargando}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-60',
        estilos[variante],
        className,
      )}
    >
      {cargando ? <Spinner className="h-4 w-4" /> : null}
      {children}
    </button>
  )
}
