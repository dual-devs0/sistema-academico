import { api } from '../lib/api'

export type RangoNota = '0-3' | '3-5' | '5-6' | '6-7' | '7-9' | '9-10'

export interface EstadisticasMateria {
  materia_id: number
  total_alumnos: number
  total_notas?: number
  promedio_grupo: number
  nota_maxima?: number
  nota_minima?: number
  distribucion: Partial<Record<RangoNota, number>>
  aprobados: number
  en_riesgo: number
}

export function obtenerEstadisticasMateria(materiaId: number) {
  return api.get<EstadisticasMateria>(`/puntajes/materia/${materiaId}/estadisticas`)
}
