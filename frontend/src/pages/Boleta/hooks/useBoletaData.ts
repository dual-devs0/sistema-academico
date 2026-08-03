import { useCallback, useEffect, useState } from 'react'
import { api } from '../../../lib/api'
import type { BoletaData } from '../types'

export function useBoletaData(alumnoId: number | null) {
  const [data, setData] = useState<BoletaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(() => {
    if (!alumnoId) {
      setData(null)
      setLoading(false)
      return
    }
    setLoading(true)
    api.get<BoletaData>(`/boleta/resumen?alumno_id=${alumnoId}`)
      .then(d => { setData(d); setError(null) })
      .catch(e => {
        setData(null)
        setError(e instanceof Error ? e.message : 'Error al cargar la boleta')
      })
      .finally(() => setLoading(false))
  }, [alumnoId])

  useEffect(() => { reload() }, [reload])

  return { data, loading, error, reload }
}
