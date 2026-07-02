import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

type Estado = 'verificando' | 'exito' | 'duplicado' | 'expirado' | 'no_autorizado' | 'error'

interface ResultData {
  materia: string
  fecha: string
  alumno: string
}

export default function AsistenciaScan() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token')
  const [estado, setEstado] = useState<Estado>('verificando')
  const [result, setResult] = useState<ResultData | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) {
      setEstado('error')
      setErrorMsg('No se recibió ningún token QR.')
      return
    }

    const authToken = sessionStorage.getItem('token')
    const userRol   = sessionStorage.getItem('user_rol')

    if (!authToken) {
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search)
      navigate(`/login?redirect=${returnUrl}`)
      return
    }

    if (userRol !== 'alumno') {
      setEstado('no_autorizado')
      return
    }

    registrarAsistencia()
  }, [token])

  const registrarAsistencia = async () => {
    try {
      const res = await api.post<ResultData>('/asistencias/scan', { token })
      setResult(res)
      setEstado('exito')
    } catch (err: any) {
      const msg = err.message || ''
      if (msg.includes('expirado') || msg.includes('inválido')) {
        setEstado('expirado')
      } else if (msg.includes('ya registraste')) {
        setEstado('duplicado')
      } else {
        setEstado('error')
        setErrorMsg(msg || 'Error al conectar con el servidor')
      }
    }
  }

  const fechaStr = result?.fecha
    ? new Date(result.fecha + 'T12:00:00').toLocaleDateString('es-PY', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : ''

  return (
    <div className="min-h-screen bg-[#0b0f14] flex items-center justify-center p-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-[var(--accent)] text-xs font-semibold uppercase tracking-widest">Sistema Académico UCA</p>
          <p className="text-white/30 text-xs mt-1">Registro de asistencia</p>
        </div>

        <div className="bg-[#111820] border border-white/10 rounded-2xl p-8 flex flex-col items-center gap-6 text-center shadow-2xl">
          {estado === 'verificando' && (
            <>
              <div className="w-16 h-16 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                <svg className="animate-spin" width="30" height="30" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" className="text-[var(--accent)]"/>
                  <path d="M12 2a10 10 0 0110 10" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold text-lg">Verificando…</p>
                <p className="text-white/40 text-sm mt-1">Registrando tu asistencia</p>
              </div>
            </>
          )}

          {estado === 'exito' && result && (
            <>
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold text-xl mb-1">¡Asistencia registrada!</p>
                <p className="text-white/50 text-sm">Tu presencia quedó confirmada</p>
              </div>
              <div className="w-full bg-white/4 rounded-xl p-4 text-left space-y-3">
                {[
                  { label: 'Materia', value: result.materia },
                  { label: 'Fecha',   value: fechaStr },
                  { label: 'Alumno',  value: result.alumno },
                ].map(r => (
                  <div key={r.label} className="flex justify-between items-start gap-3">
                    <span className="text-white/35 text-xs shrink-0">{r.label}</span>
                    <span className="text-white text-xs font-medium text-right">{r.value}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate('/asistencia')}
                className="w-full py-3 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] font-medium text-sm hover:bg-[var(--accent)]/25 transition-colors">
                Ver mis asistencias
              </button>
            </>
          )}

          {estado === 'duplicado' && (
            <>
              <div className="w-16 h-16 rounded-full bg-amber-400/10 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold text-lg">Ya registraste tu asistencia</p>
                <p className="text-white/40 text-sm mt-1">Tu presencia para esta clase ya estaba confirmada.</p>
              </div>
              <button onClick={() => navigate('/asistencia')}
                className="w-full py-3 rounded-xl bg-white/6 text-white/60 font-medium text-sm hover:bg-white/10 transition-colors">
                Ver mis asistencias
              </button>
            </>
          )}

          {estado === 'expirado' && (
            <>
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" opacity="0.3">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold text-lg">QR expirado</p>
                <p className="text-white/40 text-sm mt-1">Este código ya no es válido. Pedile al profesor que genere uno nuevo.</p>
              </div>
            </>
          )}

          {estado === 'no_autorizado' && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-400/10 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold text-lg">Acceso denegado</p>
                <p className="text-white/40 text-sm mt-1">Solo alumnos pueden registrar asistencia con QR.</p>
              </div>
            </>
          )}

          {estado === 'error' && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-400/10 flex items-center justify-center">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold text-lg">Algo salió mal</p>
                <p className="text-white/40 text-sm mt-1">{errorMsg}</p>
              </div>
              <button onClick={() => window.location.reload()}
                className="w-full py-3 rounded-xl bg-white/6 text-white/60 font-medium text-sm hover:bg-white/10 transition-colors">
                Reintentar
              </button>
            </>
          )}
        </div>

        <p className="text-center text-white/15 text-xs mt-6">
          Universidad Católica "Nuestra Señora de la Asunción"
        </p>
      </div>
    </div>
  )
}
