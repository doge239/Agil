export type Tema = 'light' | 'dark'
export function obtenerTema(): Tema {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}
export function alternarTema() {
  const siguiente: Tema = obtenerTema() === 'dark' ? 'light' : 'dark'
  document.documentElement.dataset.theme = siguiente
  try { localStorage.setItem('banner_theme', siguiente) } catch { /* El cambio funciona sin almacenamiento. */ }
  window.dispatchEvent(new Event('banner-theme-change'))
}
export function suscribirTema(notificar: () => void) {
  function sincronizar(e: StorageEvent) {
    if (e.key !== 'banner_theme' || (e.newValue !== 'light' && e.newValue !== 'dark')) return
    document.documentElement.dataset.theme = e.newValue
    notificar()
  }
  window.addEventListener('banner-theme-change', notificar)
  window.addEventListener('storage', sincronizar)
  return () => {
    window.removeEventListener('banner-theme-change', notificar)
    window.removeEventListener('storage', sincronizar)
  }
}
