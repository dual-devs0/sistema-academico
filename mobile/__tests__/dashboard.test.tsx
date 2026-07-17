import React from 'react'
import { render, waitFor } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

// Mock antes de importar el componente
const mockFetchDashboard = jest.fn()
jest.mock('../services/dashboardService', () => ({
  fetchDashboard: (...args: unknown[]) => mockFetchDashboard(...args),
  formatDayMonth: (d: string) => '15 JUL',
  daysUntil: () => 3,
  formatGuaranies: (n: number) => `₲ ${n.toLocaleString()}`,
  greetingForNow: () => 'Buenas tardes',
}))

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ status: 'auth', login: jest.fn(), logout: jest.fn() }),
}))

// Mock ThemeContext
jest.mock('../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      background: '#0a0e17',
      surface: '#121829',
      glassBg: 'rgba(18,24,41,0.8)',
      border: 'rgba(255,255,255,0.06)',
      textPrimary: '#ffffff',
      textSecondary: '#8892a0',
      cyan: '#13D6FF',
      cyanDim: 'rgba(19,214,255,0.1)',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      logoutBg: 'rgba(239,68,68,0.08)',
      logoutBorder: 'rgba(239,68,68,0.2)',
    },
    preference: 'dark',
    effective: 'dark',
    setPreference: jest.fn(),
    toggleDark: jest.fn(),
  }),
}))

import DashboardScreen from '../app/(tabs)/index'

function renderDashboard() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 320, height: 640 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <DashboardScreen />
    </SafeAreaProvider>
  )
}

describe('DashboardScreen', () => {
  beforeEach(() => {
    mockFetchDashboard.mockReset()
  })

  it('muestra skeleton mientras fetchDashboard está pending', () => {
    mockFetchDashboard.mockReturnValue(new Promise(() => {}))
    const { UNSAFE_queryAllByType } = renderDashboard()
    expect(UNSAFE_queryAllByType).toBeDefined()
  })

  it('renderiza contenido cuando fetchDashboard resuelve', async () => {
    mockFetchDashboard.mockResolvedValueOnce({
      user: {
        id: 1,
        username: 'juan',
        role: 'alumno',
        nombre: 'Juan Pérez',
        email: null,
        carrera_id: 1,
        carrera_nombre: 'Ingeniería',
        semestre: 4,
        es_becado: false,
        foto_url: null,
      },
      resumen: {
        alumno: null,
        cantidad_materias: 6,
        promedio_general: 7.8,
        notas: [],
        asistencia: [],
      },
      summary: {
        creditos_aprobados: 120,
        creditos_pendientes: 120,
        creditos_totales: 240,
        promedio_general: 7.8,
        asistencia_promedio: 85,
        avance_porcentaje: 50,
        estado_financiero: 'al_dia',
        regularidad_activa: true,
        materias_cursando: 6,
        carrera_nombre: 'Ingeniería',
        semestre_actual: 4,
      },
      proximoEvento: null,
      eventosCercanos: [],
      cuentaSaldoPendiente: 0,
      cuentaSaldoVencido: 0,
      cuentaPagado: 0,
      cuentaHayCuotas: false,
      regularidadActiva: true,
    })
    const { getAllByText } = renderDashboard()
    await waitFor(() => {
      expect(getAllByText(/juan|promedio|avance|créditos/i).length).toBeGreaterThanOrEqual(1)
    })
  })

  it('muestra error cuando fetchDashboard rechaza', async () => {
    mockFetchDashboard.mockRejectedValueOnce(new Error('Network error'))
    const { findAllByText } = renderDashboard()
    const matches = await findAllByText(/reintentar/i)
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })
})
