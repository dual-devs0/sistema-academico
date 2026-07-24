import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Layout from '../components/Layout'

// Mock de useRole para controlar el rol
let _mockRole: string | null = null
const _mockUsername = 'testuser'

vi.mock('../hooks/useRole', () => ({
  getRole: () => _mockRole,
  getUserId: () => 1,
  getUsername: () => _mockUsername,
  useRole: () => _mockRole,
}))

// Mock de ../lib/api
vi.mock('../lib/api', () => ({
  getCurrentUser: () => null,
  setAccessToken: vi.fn(),
  emitToast: vi.fn(),
  emitHelp: vi.fn(),
  emitAvatarUpdated: vi.fn(),
  getAccessToken: () => null,
  api: {
    get: vi.fn().mockResolvedValue({ foto_url: null }),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  initAuth: vi.fn().mockResolvedValue(null),
  decodeToken: vi.fn().mockReturnValue(null),
}))

function renderLayout(role: string | null) {
  _mockRole = role
  return render(
    <MemoryRouter>
      <Layout>
        <div>contenido</div>
      </Layout>
    </MemoryRouter>
  )
}

describe('Layout — menú por rol', () => {
  it('rol admin renderiza 17 side items', () => {
    renderLayout('admin')
    const sideItems = document.querySelectorAll('button.side-item')
    expect(sideItems.length).toBe(16)
  })

  it('rol alumno renderiza 15 side items', () => {
    renderLayout('alumno')
    const sideItems = document.querySelectorAll('button.side-item')
    expect(sideItems.length).toBe(15)
  })

  it('rol profesor renderiza 8 side items', () => {
    renderLayout('profesor')
    const sideItems = document.querySelectorAll('button.side-item')
    expect(sideItems.length).toBe(8)
  })
})
