import type { ReactNode } from 'react'
import { cn } from '../utils/cn'

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border bg-surface p-5 shadow-sm', className)}>
      {children}
    </div>
  )
}
