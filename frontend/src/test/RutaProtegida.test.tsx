import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { RutaProtegida } from '../App'

// Mock de ../lib/api
let _currentUser: { username: string; role: string; user_id?: number } | null = null

vi.mock('../lib/api', () => ({
  getCurrentUser: () => _currentUser,
  initAuth: () =>
    _currentUser
      ? Promise.resolve(_currentUser)
      : Promise.resolve(null),
  setAccessToken: vi.fn(),
  getAccessToken: () => null,
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  emitHelp: vi.fn(),
  emitToast: vi.fn(),
  emitAvatarUpdated: vi.fn(),
  decodeToken: vi.fn().mockReturnValue(null),
}))

beforeEach(() => {
  _currentUser = null
  sessionStorage.clear()
})

describe('RutaProtegida', () => {
  it('sin auth y sin session_active → redirige a /login', async () => {
    _currentUser = null
    sessionStorage.clear()

    render(
      <MemoryRouter initialEntries={['/usuarios']}>
        <Routes>
          <Route
            path="/usuarios"
            element={
              <RutaProtegida path="/usuarios">
                <div>contenido protegido</div>
              </RutaProtegida>
            }
          />
          <Route path="/login" element={<div>PAGINA_LOGIN</div>} />
          <Route path="/dashboard" element={<div>PAGINA_DASHBOARD</div>} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('PAGINA_LOGIN')).toBeInTheDocument()
    })
  })

  it('con auth y rol no permitido → redirige a /dashboard', async () => {
    _currentUser = { username: 'juan', role: 'alumno', user_id: 1 }
    sessionStorage.setItem('session_active', '1')

    render(
      <MemoryRouter initialEntries={['/usuarios']}>
        <Routes>
          <Route
            path="/usuarios"
            element={
              <RutaProtegida path="/usuarios">
                <div>contenido admin</div>
              </RutaProtegida>
            }
          />
          <Route path="/login" element={<div>PAGINA_LOGIN</div>} />
          <Route path="/dashboard" element={<div>PAGINA_DASHBOARD</div>} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('PAGINA_DASHBOARD')).toBeInTheDocument()
    })
  })

  it('con auth y rol permitido → renderiza children', async () => {
    _currentUser = { username: 'admin', role: 'admin', user_id: 1 }
    sessionStorage.setItem('session_active', '1')

    render(
      <MemoryRouter initialEntries={['/usuarios']}>
        <Routes>
          <Route
            path="/usuarios"
            element={
              <RutaProtegida path="/usuarios">
                <div>contenido admin</div>
              </RutaProtegida>
            }
          />
          <Route path="/login" element={<div>PAGINA_LOGIN</div>} />
          <Route path="/dashboard" element={<div>PAGINA_DASHBOARD</div>} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('contenido admin')).toBeInTheDocument()
    })
  })
})
