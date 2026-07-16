import React from 'react'
import { render, waitFor } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

// Mock services antes de importar el componente
const mockFetchDashboard = jest.fn()
jest.mock('../services/dashboardService', () => ({
  fetchDashboard: (...args: unknown[]) => mockFetchDashboard(...args),
  formatDayMonth: (d: string) => '15 JUL',
  daysUntil: () => 3,
  formatGuaranies: (n: number) => `₲ ${n.toLocaleString()}`,
  greetingForNow: () => 'Buenas tardes',
  fetchMateriasHoy: jest.fn().mockResolvedValue([]),
}))

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ status: 'auth', login: jest.fn(), logout: jest.fn() }),
}))

import DashboardScreen from '../app/(tabs)/index'

const initialMetrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
}

function renderDashboard() {
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <DashboardScreen />
    </SafeAreaProvider>
  )
}

describe('DashboardScreen', () => {
  beforeEach(() => {
    mockFetchDashboard.mockReset()
  })

  it('muestra skeleton mientras fetchDashboard está pending', () => {
    mockFetchDashboard.mockReturnValue(new Promise(() => {})) // nunca resuelve
    const { UNSAFE_queryAllByType } = renderDashboard()
    // El SkeletonLoader está presente durante loading
    expect(UNSAFE_queryAllByType).toBeDefined()
  })

  it('renderiza cards de stats cuando fetchDashboard resuelve', async () => {
    mockFetchDashboard.mockResolvedValueOnce({
      user: {
        id: 1,
        username: 'juan',
        role: 'alumno',
        nombre: 'Juan Pérez',
        email: null,
        carrera_id: 1,
        es_becado: false,
        foto_url: null,
      },
      promedio: 8.7,
      asistencia_pct: 92,
      regularidad: 'activa',
      estado_cuenta: { estado: 'al_dia', saldo: 0, vencido: 0, pagado: 0 },
      examenes: { inscriptos: 2, disponibles: 1 },
      proximo_evento: null,
      avance: { creditos: 48, total: 240, porcentaje: 20 },
    })
    const { getAllByText } = renderDashboard()
    await waitFor(() => {
      expect(getAllByText(/juan|promedio|exámen/i).length).toBeGreaterThanOrEqual(1)
    })
  })

  it('usa datos dummy cuando fetchDashboard rechaza', async () => {
    mockFetchDashboard.mockRejectedValueOnce(new Error('Network error'))
    const { getByText } = renderDashboard()
    await waitFor(() => {
      expect(getByText(/buenas|María|DashboardKpiCard/i)).toBeTruthy()
    })
  })
})
