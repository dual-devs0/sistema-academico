import { getCurrentUser } from '../lib/api'

export type Role = 'alumno' | 'profesor' | 'admin'

export function getRole(): Role | null {
  const r = getCurrentUser()?.role?.toLowerCase().trim()
  if (r === 'admin' || r === 'administrador') return 'admin'
  if (r === 'profesor') return 'profesor'
  if (r === 'alumno') return 'alumno'
  return null
}

export function getUserId(): number | null {
  return getCurrentUser()?.user_id ?? null
}

export function getUsername(): string {
  return getCurrentUser()?.username ?? ''
}

// Hook: rol actual desde JWT (estable durante la sesión de la página)
export function useRole(): Role | null {
  return getRole()
}
