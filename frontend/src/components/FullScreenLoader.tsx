import { LoadingSkeleton, Skeleton } from './Skeleton'

export function FullScreenLoader() {
  return (
    <div className="skeleton-shell">
      <div className="skeleton-sidebar" aria-hidden="true"><Skeleton className="skeleton-icon" />{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} />)}</div>
      <div className="skeleton-shell-main">
        <div className="skeleton-shell-bar" aria-hidden="true"><Skeleton className="skeleton-description" /><Skeleton className="skeleton-icon" /></div>
        <LoadingSkeleton variante="tarjetas" cabecera />
      </div>
    </div>
  )
}
