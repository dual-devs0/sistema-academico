import { api } from '../lib/api'

export interface ExpedienteMateriaOut {
  id: number
  alumno_id: number
  materia_id: number
  materia_nombre: string
  periodo: string
  nota_final: number
  creditos: number
  condicion: 'aprobada' | 'reprobada'
}

export interface ExpedienteSemestreOut {
  periodo: string
  ppa_periodo: number | null
  creditos_periodo: number
  materias_aprobadas: number
  materias_reprobadas: number
}

export interface ExpedienteAlumnoOut {
  materias: ExpedienteMateriaOut[]
  semestres: ExpedienteSemestreOut[]
}

export interface PPAOut {
  ppa: number | null
  creditos_computados: number
}

export interface RegularidadOut {
  estado: 'activo' | 'en_riesgo' | 'irregular' | 'de_baja'
  motivo: string | null
  ppa_acumulado: number | null
}

export function cerrarMateria(alumnoId: number, ofertaMateriaId: number) {
  return api.post<ExpedienteMateriaOut>('/expediente/cerrar-materia', {
    alumno_id: alumnoId, oferta_materia_id: ofertaMateriaId,
  })
}

export function obtenerPPA(alumnoId: number) {
  return api.get<PPAOut>(`/expediente/alumno/${alumnoId}/ppa`)
}

export function obtenerExpediente(alumnoId: number) {
  return api.get<ExpedienteAlumnoOut>(`/expediente/alumno/${alumnoId}`)
}

export function obtenerRegularidad(alumnoId: number) {
  return api.get<RegularidadOut>(`/expediente/alumno/${alumnoId}/regularidad`)
}
