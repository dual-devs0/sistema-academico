import { decodeToken } from '../lib/api'

export type Role = 'alumno' | 'profesor' | 'admin'

export function getRole(): Role | null {
  const token = sessionStorage.getItem('token')
  const user = token ? decodeToken(token) : null
  const r = user?.role
  if (r === 'admin' || r === 'administrador') return 'admin'
  if (r === 'profesor') return 'profesor'
  if (r === 'alumno') return 'alumno'
  return null
}

export function getUserId(): number | null {
  const token = sessionStorage.getItem('token')
  const user = token ? decodeToken(token) : null
  return user?.user_id ?? null
}

export function getUsername(): string {
  const token = sessionStorage.getItem('token')
  const user = token ? decodeToken(token) : null
  return user?.username ?? ''
}

// Hook: rol actual desde JWT (estable durante la sesión de la página)
export function useRole(): Role | null {
  return getRole()
}
