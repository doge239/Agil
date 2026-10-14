export function EmptyState({ mensaje }: { mensaje: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-10 text-center text-sm text-muted">
      {mensaje}
    </div>
  )
}
