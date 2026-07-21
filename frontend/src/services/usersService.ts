import { api } from '../lib/api'

export interface UsersStats {
  total_alumnos: number
  total_profesores: number
  total_admins: number
  total_becados: number
  crecimiento_mensual: { month: string; count: number }[]
}

export interface Usuario {
  id: number
  username: string
  role: string
  nombre: string | null
  email: string | null
  carrera_id: number | null
  carrera_nombre: string | null
  es_becado: boolean
  cedula: string | null
  foto_url: string | null
  created_at: string | null
}

export interface UsuarioList {
  items: Usuario[]
  total: number
}

export interface Carrera {
  id: number
  nombre: string
}

export async function obtenerStatsUsuarios(): Promise<UsersStats> {
  return api.get<UsersStats>('/users/stats')
}

export async function listarCarreras(): Promise<Carrera[]> {
  return api.get<Carrera[]>('/carreras/')
}

export async function listarUsuarios(params: Record<string, string>): Promise<UsuarioList> {
  const qs = new URLSearchParams(params).toString()
  return api.get<UsuarioList>(`/users/?${qs}`)
}

export async function crearUsuario(data: {
  username: string
  password: string
  role: string
  nombre: string
  email: string
  es_becado: boolean
}): Promise<Usuario> {
  return api.post<Usuario>('/users/', data)
}

export async function actualizarUsuario(
  id: number,
  data: Partial<{
    nombre: string
    email: string
    role: string
    es_becado: boolean
    carrera_id: number | null
    password: string
  }>
): Promise<Usuario> {
  return api.patch<Usuario>(`/users/${id}`, data)
}

export async function eliminarUsuario(id: number): Promise<void> {
  return api.delete<void>(`/users/${id}`)
}
