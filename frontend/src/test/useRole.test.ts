import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getRole, getUserId, getUsername } from '../hooks/useRole'

// Mock de ../lib/api
let _currentUser: { username: string; role: string; user_id?: number } | null = null
let _accessToken: string | null = null

vi.mock('../lib/api', () => ({
  getCurrentUser: () => _currentUser,
  getAccessToken: () => _accessToken,
  setAccessToken: (token: string | null) => {
    _accessToken = token
  },
  decodeToken: (token: string) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return { username: payload.sub, role: payload.role, user_id: payload.user_id }
    } catch {
      return null
    }
  },
  initAuth: () => Promise.resolve(_currentUser),
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  emitHelp: vi.fn(),
  emitToast: vi.fn(),
  emitAvatarUpdated: vi.fn(),
}))

beforeEach(() => {
  _currentUser = null
  _accessToken = null
})

describe('useRole helpers', () => {
  it('getRole devuelve null si no hay usuario', () => {
    expect(getRole()).toBeNull()
  })

  it('getRole normaliza "administrador" a "admin"', () => {
    _currentUser = { username: 'admin', role: 'administrador', user_id: 1 }
    expect(getRole()).toBe('admin')
  })

  it('getRole devuelve "alumno" cuando role es "alumno"', () => {
    _currentUser = { username: 'juan', role: 'alumno', user_id: 2 }
    expect(getRole()).toBe('alumno')
  })

  it('getRole devuelve "profesor" cuando role es "profesor"', () => {
    _currentUser = { username: 'profe', role: 'profesor', user_id: 3 }
    expect(getRole()).toBe('profesor')
  })

  it('getUserId devuelve el user_id del usuario actual', () => {
    _currentUser = { username: 'juan', role: 'alumno', user_id: 42 }
    expect(getUserId()).toBe(42)
  })

  it('getUserId devuelve null si no hay usuario', () => {
    expect(getUserId()).toBeNull()
  })

  it('getUsername devuelve el username del usuario actual', () => {
    _currentUser = { username: 'maria', role: 'alumno', user_id: 5 }
    expect(getUsername()).toBe('maria')
  })
})
