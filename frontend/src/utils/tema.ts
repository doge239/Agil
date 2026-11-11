export type Tema = 'light' | 'dark'
let cambiandoTema = false

export function obtenerTema(): Tema {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}
export async function alternarTema() {
  if (cambiandoTema) return
  const siguiente: Tema = obtenerTema() === 'dark' ? 'light' : 'dark'
  const raiz = document.documentElement
  const aplicarTema = () => {
    raiz.dataset.theme = siguiente
    try { localStorage.setItem('banner_theme', siguiente) } catch { /* El cambio funciona sin almacenamiento. */ }
    window.dispatchEvent(new Event('banner-theme-change'))
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    aplicarTema()
    return
  }

  cambiandoTema = true
  try {
    if (document.startViewTransition) {
      // Las capturas permiten fundir también fondos con imágenes y gradientes.
      raiz.dataset.themeTransition = ''
      const transicion = document.startViewTransition(aplicarTema)
      // El navegador puede omitir la animación si la pestaña deja de estar visible.
      void transicion.ready.catch(() => {})
      await transicion.finished
    } else {
      // Alternativa para navegadores sin View Transitions.
      const salida = raiz.animate(
        [{ filter: 'blur(0px)', opacity: 1 }, { filter: 'blur(3px)', opacity: 0.75 }],
        { duration: 140, easing: 'ease-in', fill: 'forwards' },
      )
      await salida.finished.catch(() => {})
      aplicarTema()
      const entrada = raiz.animate(
        [{ filter: 'blur(3px)', opacity: 0.75 }, { filter: 'blur(0px)', opacity: 1 }],
        { duration: 280, easing: 'ease-out' },
      )
      salida.cancel()
      await entrada.finished.catch(() => {})
    }
  } finally {
    delete raiz.dataset.themeTransition
    cambiandoTema = false
  }
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
