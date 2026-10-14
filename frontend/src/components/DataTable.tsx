import type { ReactNode } from 'react'
import { cn } from '../utils/cn'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  getRowKey: (row: T, index: number) => string | number
}

export function DataTable<T>({ columns, rows, getRowKey }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-background">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn('px-4 py-3 text-left font-semibold text-muted', column.className)}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-surface">
          {rows.map((row, index) => (
            <tr key={getRowKey(row, index)} className="transition-colors hover:bg-background">
              {columns.map((column) => (
                <td key={column.key} className={cn('px-4 py-3 text-text', column.className)}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
