import { useState } from 'react'
import { api, emitToast } from '../../../lib/api'
import type { PdfScope } from '../types'

export function usePdfExport(alumnoId: number | null) {
  const [downloading, setDownloading] = useState(false)

  async function exportPdf(scope: PdfScope, opts?: { anio?: number; semestre?: number }) {
    if (!alumnoId) return
    setDownloading(true)
    try {
      const params = new URLSearchParams({ alumno_id: String(alumnoId), scope })
      if (opts?.anio != null) params.set('anio', String(opts.anio))
      if (opts?.semestre != null) params.set('semestre', String(opts.semestre))
      await api.download(`/boleta/pdf?${params.toString()}`, `boleta_${scope}.pdf`)
      emitToast('PDF descargado')
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al descargar el PDF', 'error')
    } finally {
      setDownloading(false)
    }
  }

  return { exportPdf, downloading }
}
