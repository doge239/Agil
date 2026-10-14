import { cn } from '../utils/cn'

export function PageHeader({
  titulo,
  descripcion,
  className,
}: {
  titulo: string
  descripcion?: string
  className?: string
}) {
  return (
    <div className={cn('mb-5 rounded-xl bg-surface p-5 shadow-sm', className)}>
      <h1 className="text-2xl font-bold text-text">{titulo}</h1>
      {descripcion ? <p className="mt-1 text-sm text-muted">{descripcion}</p> : null}
    </div>
  )
}
