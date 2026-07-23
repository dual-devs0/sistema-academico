import { api } from '../lib/api'

export interface SolicitudEquivalencia {
  id: number
  alumno_id: number
  alumno_nombre?: string | null
  tipo: string
  universidad_origen: string | null
  estado: string
  created_at?: string | null
}

export interface ExamenSuficiencia {
  id: number
  alumno_id: number
  materia_id: number
  fecha: string
  resultado: string | null
}

export interface MateriaItem {
  id: number
  nombre: string
  codigo: string
}

export const getTodasSolicitudes = (estado?: string) =>
  api.get<SolicitudEquivalencia[]>(`/equivalencias/solicitudes${estado ? `?estado=${estado}` : ''}`)

export const crearSolicitudEquivalencia = (tipo: string, universidad_origen?: string) =>
  api.post<SolicitudEquivalencia>('/equivalencias/solicitudes', { tipo, universidad_origen })

export const getEquivalenciasAlumno = (alumnoId: number) =>
  api.get<SolicitudEquivalencia[]>(`/equivalencias/alumno/${alumnoId}`)

export const getMateriasEquivalencia = () =>
  api.get<MateriaItem[]>('/equivalencias/materias')