export function PageHeader({ titulo, descripcion }: { titulo: string; descripcion?: string }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-bold text-text">{titulo}</h1>
      {descripcion ? <p className="mt-1 text-sm text-muted">{descripcion}</p> : null}
    </div>
  )
}
