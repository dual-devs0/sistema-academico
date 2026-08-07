import { useCallback, useEffect, useState } from 'react'
import { api } from '../../../lib/api'
import type { BoletaData } from '../types'

export function useBoletaData(alumnoId: number | null) {
  const [data, setData] = useState<BoletaData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fetchedFor, setFetchedFor] = useState<number | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (!alumnoId) return
    api.get<BoletaData>(`/boleta/resumen?alumno_id=${alumnoId}`)
      .then(d => { setData(d); setError(null); setFetchedFor(alumnoId) })
      .catch(e => {
        setData(null)
        setError(e instanceof Error ? e.message : 'Error al cargar la boleta')
        setFetchedFor(alumnoId)
      })
  }, [alumnoId, reloadToken])

  const reload = useCallback(() => setReloadToken(t => t + 1), [])
  const loading = alumnoId !== null && fetchedFor !== alumnoId

  return { data: alumnoId ? data : null, loading, error, reload }
}
