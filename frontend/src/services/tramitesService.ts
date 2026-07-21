/**
 * tramitesService.ts — Fase 5A: Solicitudes y trámites
 */
import { api } from '../lib/api'

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
  alumno_nombre: string | null
  alumno_username: string | null
  tipo_tramite_id: number
  tipo_tramite_nombre: string | null
  estado: 'pendiente' | 'en_proceso' | 'resuelta' | 'rechazada'
  fecha_solicitud: string
  fecha_resolucion: string | null
  resuelto_por: number | null
  storage_key_resultado: string | null
  motivo_rechazo: string | null
}

export interface TramitesStats {
  total: number
  pendientes: number
  en_proceso: number
  resueltas: number
  rechazadas: number
}

export const getTiposTramite = () => api.get<TipoTramite[]>('/tramites/tipos')

export const crearSolicitud = (tipo_tramite_id: number) =>
  api.post<Solicitud>('/tramites/solicitudes', { tipo_tramite_id })

// Alumno: solicitudes propias. Admin: todas (filtros opcionales) — mismo endpoint.
export const getMisSolicitudes = (params?: { estado?: string; tipo_tramite_id?: number; q?: string }) => {
  const qs = new URLSearchParams()
  if (params?.estado) qs.set('estado', params.estado)
  if (params?.tipo_tramite_id) qs.set('tipo_tramite_id', String(params.tipo_tramite_id))
  if (params?.q) qs.set('q', params.q)
  const query = qs.toString()
  return api.get<Solicitud[]>(`/tramites/solicitudes/mias${query ? `?${query}` : ''}`)
}

export const getStatsTramites = () => api.get<TramitesStats>('/tramites/stats')

export const getDescargaUrl = (solicitudId: number) =>
  api.get<{ download_url: string }>(`/tramites/solicitudes/${solicitudId}/descargar`)

export const resolverSolicitud = (
  solicitudId: number,
  estado: 'resuelta' | 'rechazada',
  motivo_rechazo?: string,
  archivo?: File,
): Promise<Solicitud> => {
  const form = new FormData()
  form.append('estado', estado)
  if (motivo_rechazo) form.append('motivo_rechazo', motivo_rechazo)
  if (archivo) form.append('archivo', archivo)

  return api.upload<Solicitud>(`/tramites/solicitudes/${solicitudId}/resolver`, form)
}
