import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ThemeContext, THEME_KEY } from './ThemeContext'
import type { Tema, ThemeContextValue } from './ThemeContext'

function obtenerTemaInicial(): Tema {
  const guardado = localStorage.getItem(THEME_KEY)
  if (guardado === 'light' || guardado === 'dark') {
    return guardado
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(() => obtenerTemaInicial())

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', tema === 'dark')
    localStorage.setItem(THEME_KEY, tema)
  }, [tema])

  const toggleTema = useCallback(() => {
    setTema((actual) => (actual === 'dark' ? 'light' : 'dark'))
  }, [])

  const value = useMemo<ThemeContextValue>(() => ({ tema, toggleTema }), [tema, toggleTema])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
