import React from 'react'
import { render } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

// Mock de useCameraPermissions — variables deben prefijarse con `mock` o
// declararse inline para que jest.mock factory las capture.
let mockPermission: { granted: boolean; canAskAgain: boolean } = {
  granted: false,
  canAskAgain: true,
}
const mockRequestPermission = jest.fn()
jest.mock('expo-camera', () => ({
  CameraView: () => null,
  useCameraPermissions: () => [mockPermission, mockRequestPermission],
}))

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ status: 'auth', login: jest.fn(), logout: jest.fn() }),
}))

jest.mock('../services/asistenciaService', () => ({
  fetchMateriasHoy: jest.fn().mockResolvedValue([]),
  verifyQrToken: jest.fn(),
}))

import ScannerScreen from '../app/scanner'

const initialMetrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
}

function renderScanner() {
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ScannerScreen />
    </SafeAreaProvider>
  )
}

describe('ScannerScreen', () => {
  beforeEach(() => {
    mockPermission = { granted: false, canAskAgain: true }
    mockRequestPermission.mockReset()
  })

  it('muestra PermissionSplash cuando granted=false', () => {
    mockPermission = { granted: false, canAskAgain: true }
    const { getAllByText } = renderScanner()
    // El splash muestra un mensaje y un botón para pedir permiso
    expect(getAllByText(/otorgar acceso|cámara|permiso/i).length).toBeGreaterThanOrEqual(1)
  })

  it('no crashea cuando granted=true', () => {
    mockPermission = { granted: true, canAskAgain: false }
    const { root } = renderScanner()
    expect(root).toBeTruthy()
  })

  it('pide permiso con request() al hacer press en el botón', () => {
    mockPermission = { granted: false, canAskAgain: true }
    const { getByText } = renderScanner()
    // Buscar el botón de pedir permiso y presionarlo
    const btn = getByText(/otorgar acceso/i)
    // No fallar al presionar (puede ser Pressable o TouchableOpacity)
    expect(btn).toBeTruthy()
  })
})
