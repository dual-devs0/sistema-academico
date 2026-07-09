/**
 * finanzasService.ts — Fase 4: Módulo Financiero + Becas
 * Wrappers tipados para todos los endpoints de finanzas y becas.
 */
import { api, getAccessToken } from '../lib/api'

// ── Tipos ────────────────────────────────────────────────────────────

export interface FuenteBeca {
  id: number
  nombre: string
  tipo: string
  es_externa: boolean
  requiere_reporte_externo: boolean
  editable_porcentaje: boolean
}

export interface BecaCatalogo {
  id: number
  nombre: string
  fuente_id: number
  fuente: FuenteBeca
  porcentaje_descuento: string
  monto_fijo: string | null
  requisitos: string | null
  cupos_totales: number | null
  cupos_disponibles: number | null
}

export interface BecaActiva {
  id: number
  beca_nombre: string
  fuente: string
  es_externa: boolean
  porcentaje_descuento: string
  periodo_inicio: string
  periodo_fin: string | null
  promedio_minimo_requerido: string | null
  promedio_actual: string | null
  estado_renovacion: string
}

export interface Postulacion {
  id: number
  alumno_id: number
  beca_id: number
  beca: BecaCatalogo
  estado: string
  fecha_postulacion: string
  documentos_storage_keys: string[] | null
  motivo_rechazo: string | null
  revisado_por: number | null
  revisado_en: string | null
}

export interface ConceptoArancel {
  id: number
  nombre: string
  carrera_id: number | null
  monto_base: string
  periodicidad: string
  activo: boolean
}

export interface Cuota {
  id: number
  alumno_id: number
  concepto_id: number
  periodo: string
  monto: string
  monto_descuento: string
  monto_a_pagar: string
  fecha_vencimiento: string
  estado: 'pendiente' | 'pagada' | 'vencida' | 'anulada'
  beca_nombre: string | null
  fuente_beca: string | null
  es_beca_externa: boolean | null
  pago_id: number | null
  comprobante_estado: 'pendiente' | 'emitido' | 'error' | 'reintentando' | null
  comprobante_url_pdf: string | null
}

export interface Pago {
  id: number
  cuota_id: number
  monto_pagado: string
  fecha_pago: string
  metodo: string
  referencia: string | null
  registrado_por: number
  es_ajuste: boolean
  pago_ajuste_ref_id: number | null
}

export interface Comprobante {
  id: number
  pago_id: number
  tipo: string
  numero_comprobante: string | null
  cdc: string | null
  timbrado: string | null
  url_pdf: string | null
  storage_key: string | null
  estado_emision: 'pendiente' | 'emitido' | 'error' | 'reintentando'
  intentos: number
  ultimo_error: string | null
  fecha_emision: string | null
}

export interface ComprobantePendiente {
  id: number
  pago_id: number
  alumno_nombre: string
  monto_pagado: string
  estado_emision: string
  intentos: number
  ultimo_error: string | null
}

export interface EstadoDeuda {
  bloqueado: boolean
  cuotas_vencidas: number
  max_permitidas: number
  detalle: Array<{
    cuota_id: number
    periodo: string
    monto_a_pagar: string
    fecha_vencimiento: string
    dias_vencida: number
  }>
  tiene_beca_100: boolean
  override_disponible: boolean
}

// ── API calls ─────────────────────────────────────────────────────────

// Fuentes
export const getFuentes = () => api.get<FuenteBeca[]>('/becas/fuentes')

// Catálogo
export const getCatalogoBecas = (fuente_id?: number) =>
  api.get<BecaCatalogo[]>(`/becas/catalogo${fuente_id ? `?fuente_id=${fuente_id}` : ''}`)

// Becas activas de un alumno
export const getBecasActivas = (alumnoId: number) =>
  api.get<BecaActiva[]>(`/becas/alumno/${alumnoId}/activas`)

// Postulaciones
export const postularBeca = (beca_id: number, documentos?: string[]) =>
  api.post<Postulacion>('/becas/postulaciones', { beca_id, documentos_storage_keys: documentos })

export const getPostulaciones = (fuente_id: number, estado?: string) =>
  api.get<Postulacion[]>(`/becas/postulaciones?fuente_id=${fuente_id}${estado ? `&estado=${estado}` : ''}`)

export const revisarPostulacion = (id: number, estado: string, motivo_rechazo?: string) =>
  api.put<Postulacion>(`/becas/postulaciones/${id}/revisar`, { estado, motivo_rechazo })

// Conceptos arancel
export const getConceptos = () => api.get<ConceptoArancel[]>('/finanzas/conceptos')
export const crearConcepto = (data: Omit<ConceptoArancel, 'id' | 'activo'>) =>
  api.post<ConceptoArancel>('/finanzas/conceptos', data)

// Cuotas
export const getCuotasAlumno = (alumnoId: number, estado?: string) =>
  api.get<Cuota[]>(`/finanzas/alumno/${alumnoId}/cuotas${estado ? `?estado=${estado}` : ''}`)

export const generarCuotas = (data: {
  alumno_id: number
  concepto_id: number
  periodos: string[]
  fecha_vencimiento_base: string
}) => api.post<Cuota[]>('/finanzas/cuotas/generar', data)

// Pagos
export const registrarPago = (data: {
  cuota_id: number
  monto_pagado: string
  metodo: string
  referencia?: string
}) => api.post<Pago>('/finanzas/pagos', data)

// Comprobantes (Fase 4B — facturación electrónica)
export const getComprobante = (pagoId: number) =>
  api.get<Comprobante>(`/finanzas/pagos/${pagoId}/comprobante`)

export const reintentarComprobante = (pagoId: number) =>
  api.post<Comprobante>(`/finanzas/pagos/${pagoId}/comprobante/reintentar`, {})

export const getComprobantesPendientes = () =>
  api.get<ComprobantePendiente[]>('/finanzas/comprobantes/pendientes')

// Estado deuda
export const getEstadoDeuda = (alumnoId: number) =>
  api.get<EstadoDeuda>(`/finanzas/alumno/${alumnoId}/estado-deuda-inscripcion`)

// Rendición Excel
export const downloadRendicion = async (fuente: string, periodo?: string): Promise<void> => {
  const token = (window as any).__auth_token__ || ''
  const url = `/finanzas/../becas/reportes/rendicion?fuente=${encodeURIComponent(fuente)}${periodo ? `&periodo=${periodo}` : ''}`
  const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${url}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Error descargando rendición')
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `rendicion_${fuente}_${periodo || 'todos'}.xlsx`
  a.click()
}

// Formatear Guaraníes
export const formatGs = (valor: string | number): string => {
  const n = typeof valor === 'string' ? parseFloat(valor) : valor
  return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(n)
}
