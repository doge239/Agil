import { createContext, useContext } from 'react'

export type Tema = 'light' | 'dark'

export interface ThemeContextValue {
  tema: Tema
  toggleTema: () => void
}

export const THEME_KEY = 'banner_tema'

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme debe usarse dentro de un ThemeProvider')
  }
  return context
}
