export function ErrorBanner({ mensaje, onRetry }: { mensaje: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
      <span>{mensaje}</span>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="font-medium underline">
          Reintentar
        </button>
      ) : null}
    </div>
  )
}
