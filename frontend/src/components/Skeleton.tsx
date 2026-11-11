import { cn } from '../utils/cn'
import './skeleton.css'

export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('skeleton', className)} />
}

type Variante = 'tabla' | 'tarjetas' | 'perfil' | 'horario'

export function LoadingSkeleton({ variante = 'tabla', cabecera = false }: { variante?: Variante; cabecera?: boolean }) {
  return <div className="loading-skeleton" role="status" aria-label="Cargando contenido" aria-busy="true">
    <span className="sr-only">Cargando contenido…</span>
    <div aria-hidden="true">
      {cabecera && <div className="skeleton-heading"><Skeleton className="skeleton-eyebrow" /><Skeleton className="skeleton-title" /><Skeleton className="skeleton-description" /></div>}
      {variante === 'tarjetas' ? <div className="skeleton-cards">
        {[0, 1, 2].map(i => <div className="skeleton-panel" key={i}><Skeleton className="skeleton-icon" /><Skeleton className="skeleton-card-title" /><Skeleton /><Skeleton className="skeleton-short" /><Skeleton className="skeleton-button" /></div>)}
      </div> : variante === 'perfil' ? <div className="skeleton-profile">
        {[0, 1].map(i => <div className="skeleton-panel" key={i}><Skeleton className="skeleton-card-title" />{[0, 1, 2, 3].map(j => <div className="skeleton-field" key={j}><Skeleton className="skeleton-eyebrow" /><Skeleton className="skeleton-description" /></div>)}</div>)}
      </div> : <div className={cn('skeleton-panel skeleton-table', variante === 'horario' && 'skeleton-calendar')}>
        <div className="skeleton-table-toolbar"><Skeleton className="skeleton-card-title" /><Skeleton className="skeleton-button" /></div>
        {Array.from({ length: variante === 'horario' ? 7 : 6 }, (_, i) => <div className="skeleton-row" key={i}>
          {Array.from({ length: variante === 'horario' ? 6 : 3 }, (_, j) => <Skeleton key={j} />)}
        </div>)}
      </div>}
    </div>
  </div>
}
