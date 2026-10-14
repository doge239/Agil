import type { InputHTMLAttributes } from 'react'
import { cn } from '../utils/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id ?? props.name

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-text">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        {...props}
        className={cn(
          'rounded-lg border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors',
          'placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/30',
          error ? 'border-danger' : 'border-border',
          className,
        )}
      />
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </div>
  )
}
