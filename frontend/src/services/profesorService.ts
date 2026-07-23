import { api } from '../lib/api'

export interface ProfesorDashboardData {
  resumen: {
    materias_activas: number
    total_alumnos: number
    promedio_general: number | null
    porcentaje_aprobacion: number | null
    asistencia_promedio: number | null
  }
  materias: ProfesorMateria[]
  agenda_hoy: AgendaItem[]
  alertas: AlertaAlumno[]
  timestamp: string
}

export interface ProfesorMateria {
  id: number
  oferta_id: number
  nombre: string
  codigo: string | null
  carrera: string | null
  periodo: string
  cantidad_alumnos: number
  promedio: number | null
  horarios: { dia: number; hora_inicio: string; hora_fin: string; aula: string | null }[]
}

export interface AgendaItem {
  tipo: string
  hora_inicio: string
  hora_fin: string | null
  titulo: string
  aula: string | null
  materia?: string | null
}

export interface AlertaAlumno {
  alumno_id: number
  alumno_nombre: string
  materia_id: number
  materia_nombre: string
  inasistencia_pct: number
}

export const obtenerDashboardProfesor = () =>
  api.get<ProfesorDashboardData>('/profesor/dashboard')
