import { api } from '../lib/api'

export interface PensumMateriaOut {
  id: number
  carrera_id: number
  materia_id: number
  materia_nombre: string | null
  semestre: number
  creditos: number
  es_electiva: boolean
}

export interface PensumMateriaCreate {
  materia_id: number
  semestre: number
  creditos: number
  es_electiva?: boolean
}

export interface CorrelatividadOut {
  id: number
  materia_id: number
  prerrequisito_id: number
  tipo: string
}

export interface CorrelatividadCreate {
  materia_id: number
  prerrequisito_id: number
  tipo: string
}

export interface PendienteOut {
  materia_id: number
  materia_nombre: string
  tipo: string
}

export interface AvanceMateriaOut {
  pensum_materia_id: number
  materia_id: number
  materia_nombre: string
  semestre: number
  creditos: number
  estado: 'aprobada' | 'cursando' | 'pendiente' | 'bloqueada'
  pendientes: PendienteOut[]
}

export interface CreditosAlumnoOut {
  creditos_acumulados: number
  creditos_totales: number | null
}

export function obtenerMallaCarrera(carreraId: number) {
  return api.get<PensumMateriaOut[]>(`/pensum/carreras/${carreraId}`)
}

export function agregarMateriaAMalla(carreraId: number, data: PensumMateriaCreate) {
  return api.post<PensumMateriaOut>(`/pensum/carreras/${carreraId}/materias`, data)
}

export function quitarMateriaDeMalla(carreraId: number, pensumMateriaId: number) {
  return api.delete(`/pensum/carreras/${carreraId}/materias/${pensumMateriaId}`)
}

export function obtenerCorrelatividades(carreraId: number) {
  return api.get<CorrelatividadOut[]>(`/pensum/correlatividades?carrera_id=${carreraId}`)
}

export function crearCorrelatividad(data: CorrelatividadCreate) {
  return api.post<CorrelatividadOut>('/pensum/correlatividades', data)
}

export function eliminarCorrelatividad(id: number) {
  return api.delete(`/pensum/correlatividades/${id}`)
}

export function obtenerAvanceAlumno(alumnoId: number) {
  return api.get<AvanceMateriaOut[]>(`/pensum/alumno/${alumnoId}/avance`)
}

export function obtenerCreditosAlumno(alumnoId: number) {
  return api.get<CreditosAlumnoOut>(`/pensum/alumno/${alumnoId}/creditos`)
}
