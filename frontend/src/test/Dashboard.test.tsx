import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from '../pages/Dashboard'
import Layout from '../components/Layout'

let _mockUser: { username: string; role: string; user_id?: number } | null = null

vi.mock('../lib/api', () => ({
  getCurrentUser: () => _mockUser,
  api: {
    get: vi.fn().mockResolvedValue([]),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  emitHelp: vi.fn(),
  emitToast: vi.fn(),
  emitAvatarUpdated: vi.fn(),
  setAccessToken: vi.fn(),
  getAccessToken: () => null,
  initAuth: vi.fn().mockResolvedValue(null),
  decodeToken: vi.fn().mockReturnValue(null),
}))

vi.mock('../hooks/useRole', () => ({
  getRole: () => _mockUser?.role ?? null,
  getUserId: () => _mockUser?.user_id ?? null,
  getUsername: () => _mockUser?.username ?? '',
  useRole: () => _mockUser?.role ?? null,
}))

beforeEach(() => {
  vi.clearAllMocks()
  _mockUser = null
})

describe('Dashboard', () => {
  it('rol alumno renderiza sin crash y muestra sidebar alumno', async () => {
    _mockUser = { username: 'juan', role: 'alumno', user_id: 1 }
    render(
      <MemoryRouter>
        <Layout>
          <Dashboard />
        </Layout>
      </MemoryRouter>
    )
    // El sidebar debe renderizar 17 items
    await waitFor(() => {
      const sideItems = document.querySelectorAll('button.side-item')
<<<<<<< HEAD
      expect(sideItems.length).toBe(17)
=======
      expect(sideItems.length).toBe(18)
>>>>>>> origin/sistema-academico-v2
    })
  })

  it('rol profesor renderiza sin crash y muestra sidebar profesor', async () => {
    _mockUser = { username: 'profe', role: 'profesor', user_id: 2 }
    render(
      <MemoryRouter>
        <Layout>
          <Dashboard />
        </Layout>
      </MemoryRouter>
    )
    await waitFor(() => {
      const sideItems = document.querySelectorAll('button.side-item')
      expect(sideItems.length).toBe(10)
    })
  })

  it('rol admin renderiza sin crash y muestra sidebar admin', async () => {
    _mockUser = { username: 'admin', role: 'admin', user_id: 3 }
    render(
      <MemoryRouter>
        <Layout>
          <Dashboard />
        </Layout>
      </MemoryRouter>
    )
    await waitFor(() => {
      const sideItems = document.querySelectorAll('button.side-item')
      expect(sideItems.length).toBe(17)
    })
  })
})
