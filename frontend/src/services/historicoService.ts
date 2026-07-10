import { api } from '../lib/api'

export interface CatedraHistorica {
  materia_id: number
  materia_nombre: string
  carrera_nombre: string | null
  cantidad_alumnos: number
  promedio_grupo: number | null
  porcentaje_aprobacion: number | null
}

export interface PeriodoHistorico {
  periodo: string
  catedras: CatedraHistorica[]
}

export function obtenerMiHistorico() {
  return api.get<PeriodoHistorico[]>('/profesor/mi-historico')
}
