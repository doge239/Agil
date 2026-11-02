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
    <div className={cn('page-header', className)}>
      <span className="page-eyebrow">PORTAL ACADÉMICO</span>
      <h1>{titulo}</h1>
      {descripcion ? <p>{descripcion}</p> : null}
    </div>
  )
}
