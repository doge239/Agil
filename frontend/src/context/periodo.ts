import { createContext, useContext } from 'react'
export const PeriodoContext = createContext<number | undefined>(undefined)
export function usePeriodo() { return useContext(PeriodoContext) }
