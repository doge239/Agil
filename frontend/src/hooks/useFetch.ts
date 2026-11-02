import { useCallback, useEffect, useRef, useState } from 'react'
import { getErrorMessage } from '../utils/errors'

interface UseFetchResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useFetch<T>(fetcher: () => Promise<T>, deps: unknown[] = []): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetcherRef = useRef(fetcher)
  const secuencia = useRef(0)
  fetcherRef.current = fetcher

  const run = useCallback(async () => {
    const actual=++secuencia.current
    setLoading(true)
    setError(null)
    try {
      const result = await fetcherRef.current()
      if(actual===secuencia.current) setData(result)
    } catch (err) {
      if(actual===secuencia.current) setError(getErrorMessage(err))
    } finally {
      if(actual===secuencia.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void run()
    // Este ref es un contador de peticiones, no un nodo del DOM.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { secuencia.current++ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, error, refetch: run }
}
