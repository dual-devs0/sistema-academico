import { useState, useEffect, useCallback, useRef } from 'react'
import { getCurrentUser, emitToast } from '../lib/api'
import { crearSolicitudEquivalencia, getEquivalenciasAlumno,
  type SolicitudEquivalencia } from '../services/equivalenciasService'

const POLL_MS = 30000

const badgeEstilo = (estado: string) => {
  const colores: Record<string, { bg: string; color: string }> = {
    pendiente: { bg: 'var(--warning-subtle)', color: 'var(--warning)' },
    en_proceso: { bg: 'var(--accent-muted)', color: 'var(--accent-bright)' },
    resuelta: { bg: 'var(--success-subtle)', color: 'var(--success)' },
    rechazada: { bg: 'var(--danger-subtle)', color: 'var(--danger)' },
  }
  return colores[estado] ?? colores.pendiente
}

const badgeLabel = (estado: string) => {
  const labels: Record<string, string> = {
    pendiente: 'Pendiente',
    en_proceso: 'En proceso',
    resuelta: 'Aprobada',
    rechazada: 'Rechazada',
  }
  return labels[estado] ?? 'Pendiente'
}

export default function EquivalenciasAlumno() {
  const [solicitudes, setSolicitudes] = useState<SolicitudEquivalencia[]>([])
  const [tipo, setTipo] = useState('equivalencia')
  const [universidad, setUniversidad] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState('')
  const user = getCurrentUser()
  const firstLoad = useRef(true)

  const cargar = useCallback((manual = false) => {
    if (!user?.user_id) return
    if (manual) setRefreshing(true)
    else if (firstLoad.current) setLoading(true)
    getEquivalenciasAlumno(user.user_id)
      .then(res => { setSolicitudes(res); setError(''); setLastUpdate(new Date()) })
      .catch(() => { emitToast('Error cargando equivalencias', 'error'); setError('No se pudieron actualizar tus solicitudes. Mostrando el último dato disponible.') })
      .finally(() => { setLoading(false); setRefreshing(false); firstLoad.current = false })
  }, [user?.user_id])

  useEffect(() => {
    cargar()
    const id = setInterval(() => cargar(true), POLL_MS)
    return () => clearInterval(id)
  }, [cargar])

  const solicitar = async () => {
    setLoading(true)
    try {
      await crearSolicitudEquivalencia(tipo, universidad || undefined)
      emitToast('Solicitud creada', 'success')
      setTipo('equivalencia'); setUniversidad('')
      cargar(true)
    } catch (e: unknown) {
      emitToast(e instanceof Error ? e.message : 'Error creando solicitud', 'error')
    } finally { setLoading(false) }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}><i className="ti ti-arrows-exchange" style={{ color: 'var(--accent-bright)', marginRight: 8 }} />Equivalencias</h1>
          <p className="page-subtitle" style={{ marginBottom: 20 }}>
            Solicitá equivalencias o convalidaciones de materias cursadas en otras instituciones.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastUpdate && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
              <i className={`ti ti-refresh${refreshing ? ' spin-icon' : ''}`} />
              {lastUpdate.toLocaleTimeString('es-PY')}
            </span>
          )}
          <button type="button" className="btn-ghost" onClick={() => cargar(true)} disabled={refreshing}>
            <i className="ti ti-refresh" /> {refreshing ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      <style>{`@keyframes eqal-spin { to { transform: rotate(360deg); } } .spin-icon { display:inline-block; animation: eqal-spin 1s linear infinite; }`}</style>

      {error && (
        <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', color: 'var(--danger)', borderRadius: 10, padding: '10px 14px', fontSize: 12, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-alert-circle" /> {error}
        </div>
      )}

      {/* Formulario de nueva solicitud */}
      <div className="card" style={{ maxWidth: 520, marginBottom: 24 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}><i className="ti ti-plus" style={{ color: 'var(--accent-bright)' }} /> Nueva Solicitud</h3>

        <div style={{ marginBottom: 14 }}>
          <span className="mono-label" style={{ marginBottom: 6, display: 'block' }}>Tipo</span>
          <select className="input-uca" value={tipo} onChange={e => setTipo(e.target.value)}>
            <option value="equivalencia">Equivalencia</option>
            <option value="convalidacion">Convalidación</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <span className="mono-label" style={{ marginBottom: 6, display: 'block' }}>Universidad de Origen</span>
          <input className="input-uca" value={universidad}
            onChange={e => setUniversidad(e.target.value)} placeholder="Ej: UNIOESTE, UNA, ..." />
        </div>

        <button type="button" className="btn-primary" onClick={solicitar} disabled={loading}>
          <i className="ti ti-send" /> {loading ? 'Enviando...' : 'Solicitar Equivalencia'}
        </button>
      </div>

      {/* Lista de solicitudes */}
      <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: 16, color: 'var(--text-primary)' }}>
        <i className="ti ti-history" style={{ color: 'var(--accent-bright)' }} /> Mis Solicitudes
      </h3>

      {loading && solicitudes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>Cargando...</div>
      ) : solicitudes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <i className="ti ti-shuffle-off" style={{ fontSize: 36, color: 'var(--text-muted)' }} />
          <p style={{ marginTop: 10, color: 'var(--text-secondary)', fontSize: 13 }}>
            No tenés solicitudes de equivalencia aún.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {solicitudes.map(s => {
            const b = badgeEstilo(s.estado)
            return (
              <div key={s.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, textTransform: 'capitalize' }}>{s.tipo}</div>
                  {s.universidad_origen && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      <i className="ti ti-building" style={{ marginRight: 4 }} />{s.universidad_origen}
                    </div>
                  )}
                </div>
                <span className="badge" style={{ background: b.bg, color: b.color, whiteSpace: 'nowrap' }}>
                  {badgeLabel(s.estado)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
