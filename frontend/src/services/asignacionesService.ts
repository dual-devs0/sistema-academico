import { api } from '../lib/api'

export interface MateriaStats {
  total_materias: number
  materias_con_profesor: number
  materias_sin_profesor: number
  total_profesores: number
  profesores_con_carga: number
  profesores_sin_asignacion: number
  carga_promedio: number
  por_carrera: {
    carrera: string
    materias: number
    con_profesor: number
    sin_profesor: number
  }[]
}

export interface MateriaApi {
  id: number
  nombre: string
  carrera_id: number | null
  carrera_nombre: string | null
  profesor_id: number | null
  anio: number | null
  semestre: number | null
  profesor_nombre: string | null
}

export interface UserApi {
  id: number
  username: string
  nombre: string
  role: string
  email?: string
  carrera_id?: number | null
  carrera_nombre?: string | null
  es_becado?: boolean | null
  foto_url?: string | null
  fecha_ingreso?: string | null
  cv?: string | null
  activo?: boolean
  created_at?: string | null
}

export interface OfertaCreate {
  materia_id: number
  profesor_id: number
  periodo: string
  activa?: boolean
}

export interface ProfesorMateria {
  id: number
  materia_id: number
  materia_nombre: string
  carrera_id: number | null
  carrera_nombre: string | null
  anio: number | null
  semestre: number | null
  periodo: string
  activa: boolean
}

export async function obtenerStatsMaterias(): Promise<MateriaStats> {
  return api.get<MateriaStats>('/materias/stats')
}

export async function listarMaterias(params?: Record<string, string>): Promise<MateriaApi[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return api.get<MateriaApi[]>(`/materias/${qs}`)
}

export async function listarProfesores(): Promise<UserApi[]> {
  const res = await api.get<{ items: UserApi[]; total: number }>('/users/?role=profesor&limit=500')
  return res.items
}

export async function asignarProfesor(materiaId: number, profesorId: number): Promise<MateriaApi> {
  return api.patch<MateriaApi>(`/materias/${materiaId}`, { profesor_id: profesorId })
}

export async function crearOferta(data: OfertaCreate): Promise<unknown> {
  return api.post('/materias/ofertas', data)
}

export async function obtenerUsuario(id: number): Promise<UserApi> {
  return api.get<UserApi>(`/users/${id}`)
}

export async function obtenerMateriasProfesor(id: number): Promise<ProfesorMateria[]> {
  return api.get<ProfesorMateria[]>(`/users/${id}/materias`)
}

export async function actualizarUsuario(id: number, data: Record<string, unknown>): Promise<UserApi> {
  return api.patch<UserApi>(`/users/${id}`, data)
}

export async function eliminarUsuario(id: number): Promise<void> {
  return api.delete(`/users/${id}`)
}
