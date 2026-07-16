import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

// Mock useAuth
const mockLogin = jest.fn()
jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    status: 'anon',
    login: mockLogin,
    logout: jest.fn(),
  }),
}))

import LoginScreen from '../app/(auth)/login'

const initialMetrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
}

function renderLogin() {
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <LoginScreen />
    </SafeAreaProvider>
  )
}

describe('LoginScreen', () => {
  beforeEach(() => {
    mockLogin.mockReset()
  })

  it('renderiza inputs de documento y contraseña', () => {
    const { getByPlaceholderText, getAllByText } = renderLogin()
    expect(getByPlaceholderText(/documento/i)).toBeTruthy()
    expect(getByPlaceholderText('••••••••••')).toBeTruthy()
    expect(getAllByText(/contraseña/i).length).toBeGreaterThan(0)
  })

  it('botón "Ingresar" está deshabilitado con campos vacíos', () => {
    const { getByText } = renderLogin()
    const submitBtn = getByText(/ingresar/i)
    // Pressable con `disabled` aplica styling pero no es "disabled" nativo
    // Verificamos que el handler no se llama al hacer press con campos vacíos
    fireEvent.press(submitBtn)
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('submit con campos llenos → llama useAuth().login', async () => {
    mockLogin.mockResolvedValueOnce(undefined)
    const { getByPlaceholderText, getByText } = renderLogin()
    fireEvent.changeText(getByPlaceholderText(/documento/i), '12345678')
    fireEvent.changeText(getByPlaceholderText('••••••••••'), 'Alumno1234!')
    fireEvent.press(getByText(/ingresar/i))
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        username: '12345678',
        password: 'Alumno1234!',
      })
    })
  })

  it('error del backend se muestra en pantalla', async () => {
    const err = Object.assign(new Error('Request failed'), {
      response: { data: { detail: 'Credenciales inválidas' } },
    })
    mockLogin.mockRejectedValueOnce(err)
    const { getByPlaceholderText, getByText } = renderLogin()
    fireEvent.changeText(getByPlaceholderText(/documento/i), '00000000')
    fireEvent.changeText(getByPlaceholderText('••••••••••'), 'wrongpass')
    fireEvent.press(getByText(/ingresar/i))
    await waitFor(() => {
      expect(getByText(/credenciales inválidas/i)).toBeTruthy()
    })
  })
})
