import { api } from '../lib/api'

export interface AdminDashboardData {
  resumen: {
    total_alumnos: number
    total_profesores: number
    total_materias: number
    total_becados: number
    tramites_pendientes: number
    materias_sin_oferta: number
  }
  kpis: {
    promedio_general: number
    aprobacion_pct: number
    asistencia_pct: number
    alumnos_activos: number
  }
  ultimos_usuarios: {
    id: number
    nombre: string
    email: string
    role: string
    created_at: string
  }[]
  alertas: {
    user_id: number
    nombre: string
    inasistencia_pct: number
    promedio: number | null
  }[]
  timestamp: string
}

export async function obtenerDashboardAdmin(): Promise<AdminDashboardData> {
  return api.get<AdminDashboardData>('/admin/dashboard')
}
