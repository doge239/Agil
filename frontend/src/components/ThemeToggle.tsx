import { useSyncExternalStore } from 'react'
import { obtenerTema, alternarTema, suscribirTema } from '../utils/tema'
import { Button } from './Button'
import { PortalIcon } from './PortalIcon'

export function ThemeToggle() {
  const tema = useSyncExternalStore(suscribirTema, obtenerTema, () => 'light')
  const oscuro = tema === 'dark'
  const etiqueta = oscuro ? 'Activar modo claro' : 'Activar modo oscuro'
  return <Button type="button" variante="secondary" className="theme-toggle" onClick={alternarTema} aria-label={etiqueta} title={etiqueta} aria-pressed={oscuro}>
    <PortalIcon name={oscuro ? 'sun' : 'moon'} /><span className="theme-toggle-label">{oscuro ? 'Modo claro' : 'Modo oscuro'}</span>
  </Button>
}
