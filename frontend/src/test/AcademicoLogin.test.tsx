import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AcademicoLogin from '../pages/AcademicoLogin'

// Mock de ../lib/api
const mockApiPost = vi.fn()
const mockSetAccessToken = vi.fn()
const mockDecodeToken = vi.fn()

vi.mock('../lib/api', () => ({
  api: {
    post: (...args: unknown[]) => mockApiPost(...args),
  },
  setAccessToken: (...args: unknown[]) => mockSetAccessToken(...args),
  decodeToken: (...args: unknown[]) => mockDecodeToken(...args),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AcademicoLogin', () => {
  it('renderiza inputs de documento y contraseña', () => {
    render(
      <MemoryRouter>
        <AcademicoLogin />
      </MemoryRouter>
    )
    const inputs = document.querySelectorAll('input')
    expect(inputs.length).toBeGreaterThanOrEqual(2) // documento + password
  })

  it('submit con credenciales válidas → llama setAccessToken', async () => {
    mockApiPost.mockResolvedValueOnce({ access_token: 'fake-token' })
    mockDecodeToken.mockReturnValue({ username: 'juan', role: 'alumno', user_id: 1 })

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AcademicoLogin />
      </MemoryRouter>
    )

    const inputs = document.querySelectorAll('input')
    fireEvent.change(inputs[0], { target: { value: '12345678' } })
    fireEvent.change(inputs[1], { target: { value: 'Alumno1234!' } })

    const submitBtn = screen.getByRole('button', { name: /ingresar/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(mockSetAccessToken).toHaveBeenCalledWith('fake-token')
    })
  })

  it('submit con error del backend → muestra mensaje de error', async () => {
    mockApiPost.mockRejectedValueOnce(new Error('Credenciales inválidas'))

    render(
      <MemoryRouter>
        <AcademicoLogin />
      </MemoryRouter>
    )

    const inputs = document.querySelectorAll('input')
    fireEvent.change(inputs[0], { target: { value: '00000000' } })
    fireEvent.change(inputs[1], { target: { value: 'wrongpass' } })

    const submitBtn = screen.getByRole('button', { name: /ingresar/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/credenciales inválidas/i)).toBeInTheDocument()
    })
  })
})
