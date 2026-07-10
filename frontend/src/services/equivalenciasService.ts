import { api } from '../lib/api'

export interface SolicitudEquivalencia {
  id: number
  alumno_id: number
  tipo: string
  universidad_origen: string | null
  estado: string
}

export interface ExamenSuficiencia {
  id: number
  alumno_id: number
  materia_id: number
  fecha: string
  resultado: string | null
}

export const crearSolicitudEquivalencia = (tipo: string, universidad_origen?: string) =>
  api.post<SolicitudEquivalencia>('/equivalencias/solicitudes', { tipo, universidad_origen })

export const getEquivalenciasAlumno = (alumnoId: number) =>
  api.get<SolicitudEquivalencia[]>(`/equivalencias/alumno/${alumnoId}`)