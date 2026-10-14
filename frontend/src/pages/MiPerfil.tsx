import { getCarreras } from '../api/catalogo'
import { getMiPerfil } from '../api/usuarios'
import { Card } from '../components/Card'
import { ErrorBanner } from '../components/ErrorBanner'
import { PageHeader } from '../components/PageHeader'
import { Spinner } from '../components/Spinner'
import { useFetch } from '../hooks/useFetch'

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | number | null }) {
  return (
    <div className="border-b border-border py-3 last:border-0">
      <p className="text-xs uppercase tracking-wide text-muted">{etiqueta}</p>
      <p className="mt-0.5 text-sm font-medium text-text">{valor ?? '—'}</p>
    </div>
  )
}

export function MiPerfil() {
  const { data, loading, error, refetch } = useFetch(() => getMiPerfil(), [])
  const carreras = useFetch(() => getCarreras(), [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted">
        <Spinner /> Cargando perfil…
      </div>
    )
  }

  if (error) {
    return <ErrorBanner mensaje={error} onRetry={refetch} />
  }

  const perfil = data?.perfil
  if (!perfil) {
    return <ErrorBanner mensaje="No se encontró el perfil." />
  }

  const carreraNombre =
    carreras.data?.carreras.find((c) => c.id_carrera === perfil.id_carrera)?.nombre ??
    (perfil.id_carrera ? `Carrera #${perfil.id_carrera}` : null)

  return (
    <div>
      <PageHeader titulo="Mi perfil" descripcion="Datos personales y académicos registrados." />

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
            Datos personales
          </h2>
          <Dato etiqueta="RUT" valor={perfil.rut} />
          <Dato etiqueta="Nombres" valor={perfil.nombres} />
          <Dato etiqueta="Apellido paterno" valor={perfil.apellido_paterno} />
          <Dato etiqueta="Apellido materno" valor={perfil.apellido_materno} />
          <Dato etiqueta="Correo institucional" valor={perfil.correo_institucional} />
          <Dato etiqueta="Teléfono" valor={perfil.telefono} />
        </Card>

        <Card>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
            Datos académicos
          </h2>
          <Dato etiqueta="Número de matrícula" valor={perfil.numero_matricula} />
          <Dato etiqueta="Carrera" valor={carreraNombre} />
          <Dato etiqueta="Año de ingreso" valor={perfil.anio_ingreso} />
        </Card>
      </div>
    </div>
  )
}
