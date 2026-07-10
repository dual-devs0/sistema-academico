/**
 * tramitesService.ts — Fase 5A: Solicitudes y trámites
 */
import { api, getAccessToken } from '../lib/api'

export interface TipoTramite {
  id: number
  nombre: string
  descripcion: string | null
  requiere_aprobacion: boolean
  dias_estimados: number | null
}

export interface Solicitud {
  id: number
  alumno_id: number
  tipo_tramite_id: number
  estado: 'pendiente' | 'en_proceso' | 'resuelta' | 'rechazada'
  fecha_solicitud: string
  fecha_resolucion: string | null
  resuelto_por: number | null
  storage_key_resultado: string | null
  motivo_rechazo: string | null
}

export const getTiposTramite = () => api.get<TipoTramite[]>('/tramites/tipos')

export const crearSolicitud = (tipo_tramite_id: number) =>
  api.post<Solicitud>('/tramites/solicitudes', { tipo_tramite_id })

// Alumno: solicitudes propias. Admin: todas (filtro opcional por estado) — mismo endpoint.
export const getMisSolicitudes = (estado?: string) =>
  api.get<Solicitud[]>(`/tramites/solicitudes/mias${estado ? `?estado=${estado}` : ''}`)

export const getDescargaUrl = (solicitudId: number) =>
  api.get<{ download_url: string }>(`/tramites/solicitudes/${solicitudId}/descargar`)

export const resolverSolicitud = async (
  solicitudId: number,
  estado: 'resuelta' | 'rechazada',
  motivo_rechazo?: string,
  archivo?: File,
): Promise<Solicitud> => {
  const form = new FormData()
  form.append('estado', estado)
  if (motivo_rechazo) form.append('motivo_rechazo', motivo_rechazo)
  if (archivo) form.append('archivo', archivo)

  const token = getAccessToken()
  const res = await fetch(
    `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/tramites/solicitudes/${solicitudId}/resolver`,
    { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: form },
  )
  if (!res.ok) throw new Error('Error al resolver solicitud')
  return res.json()
}
