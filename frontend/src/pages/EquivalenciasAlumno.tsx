import { useState, useEffect, useCallback, useRef } from 'react'
import { getCurrentUser, emitToast } from '../lib/api'
import { crearSolicitudEquivalencia, getEquivalenciasAlumno,
  type SolicitudEquivalencia } from '../services/equivalenciasService'

const POLL_MS = 30000

const badgeEstilo = (estado: string) => {
  const colores: Record<string, { bg: string; color: string; border: string; icon: string }> = {
    pendiente: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)', icon: 'ti-clock' },
    en_proceso: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: 'rgba(59,130,246,0.3)', icon: 'ti-refresh' },
    resuelta: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e', border: 'rgba(34,197,94,0.3)', icon: 'ti-check' },
    rechazada: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'rgba(239,68,68,0.3)', icon: 'ti-x' },
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
  const [submitting, setSubmitting] = useState(false)
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
    setSubmitting(true)
    try {
      await crearSolicitudEquivalencia(tipo, universidad || undefined)
      emitToast('Solicitud creada', 'success')
      setTipo('equivalencia'); setUniversidad('')
      cargar(true)
    } catch (e: unknown) {
      emitToast(e instanceof Error ? e.message : 'Error creando solicitud', 'error')
    } finally { setSubmitting(false) }
  }

  const pendientes = solicitudes.filter(s => s.estado === 'pendiente' || s.estado === 'en_proceso').length
  const resueltas = solicitudes.filter(s => s.estado === 'resuelta').length
  const rechazadas = solicitudes.filter(s => s.estado === 'rechazada').length

  if (loading && solicitudes.length === 0) return (
    <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 32 }}>
      <i className="ti ti-loader" style={{ animation: 'eqal-spin 1s linear infinite', display: 'inline-block', fontSize: 24, marginBottom: 12 }} />
      <div style={{ fontSize: 13 }}>Cargando solicitudes…</div>
      <style>{'@keyframes eqal-spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Equivalencias</h1>
          <p className="page-subtitle" style={{ marginBottom: 20 }}>
            Solicitá equivalencias o convalidaciones de materias cursadas en otras instituciones.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastUpdate && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
              <i className="ti ti-clock" style={{ fontSize: 12 }} />
              {lastUpdate.toLocaleTimeString('es-PY')}
            </span>
          )}
          <button type="button" className="btn-ghost" onClick={() => cargar(true)} disabled={refreshing}>
            <i className={`ti ti-refresh${refreshing ? ' eqal-spin' : ''}`} /> {refreshing ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      <style>{`@keyframes eqal-spin{to{transform:rotate(360deg)}}.eqal-spin{display:inline-block;animation:eqal-spin 1s linear infinite}`}</style>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: 10, padding: '10px 14px', fontSize: 12, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-alert-circle" /> {error}
        </div>
      )}

      {solicitudes.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 14, marginBottom: 20 }}>
          <div className="kpi-card" style={{ borderLeft: '3px solid var(--accent-bright)' }}>
            <div className="kpi-top"><span className="mono-label">Total Solicitudes</span><i className="ti ti-arrows-exchange" style={{ color: 'var(--accent)', fontSize: 15 }} /></div>
            <span className="kpi-value" style={{ fontSize: 28 }}>{solicitudes.length}</span>
          </div>
          <div className="kpi-card" style={{ borderLeft: `3px solid ${pendientes > 0 ? '#f59e0b' : '#22c55e'}` }}>
            <div className="kpi-top"><span className="mono-label">En Proceso</span><i className="ti ti-clock" style={{ color: pendientes > 0 ? '#f59e0b' : '#22c55e', fontSize: 15 }} /></div>
            <span className="kpi-value" style={{ fontSize: 28, color: pendientes > 0 ? '#f59e0b' : '#22c55e' }}>{pendientes}</span>
          </div>
          <div className="kpi-card" style={{ borderLeft: '3px solid #22c55e' }}>
            <div className="kpi-top"><span className="mono-label">Aprobadas</span><i className="ti ti-check" style={{ color: '#22c55e', fontSize: 15 }} /></div>
            <span className="kpi-value" style={{ fontSize: 28, color: '#22c55e' }}>{resueltas}</span>
          </div>
          <div className="kpi-card" style={{ borderLeft: '3px solid #ef4444' }}>
            <div className="kpi-top"><span className="mono-label">Rechazadas</span><i className="ti ti-x" style={{ color: '#ef4444', fontSize: 15 }} /></div>
            <span className="kpi-value" style={{ fontSize: 28, color: '#ef4444' }}>{rechazadas}</span>
          </div>
        </div>
      )}

      <div className="card" style={{ maxWidth: 520, marginBottom: 24, borderLeft: '3px solid var(--accent-bright)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <span style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--accent-muted)', color: 'var(--accent-bright)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
            <i className="ti ti-plus" />
          </span>
          <div>
            <h3 style={{ fontWeight: 800, fontSize: 15, margin: 0 }}>Nueva Solicitud</h3>
            <div className="mono-label" style={{ fontSize: 10 }}>Completá los datos para solicitar una equivalencia</div>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <span className="mono-label" style={{ marginBottom: 6, display: 'block' }}>Tipo</span>
          <select className="input-uca" value={tipo} onChange={e => setTipo(e.target.value)}>
            <option value="equivalencia">Equivalencia</option>
            <option value="convalidacion">Convalidación</option>
          </select>
        </div>

        <div style={{ marginBottom: 18 }}>
          <span className="mono-label" style={{ marginBottom: 6, display: 'block' }}>Universidad de Origen</span>
          <input className="input-uca" value={universidad}
            onChange={e => setUniversidad(e.target.value)} placeholder="Ej: UNIOESTE, UNA, ..." />
        </div>

        <button type="button" className="btn-primary" onClick={solicitar} disabled={submitting}>
          <i className="ti ti-send" /> {submitting ? 'Enviando…' : 'Solicitar Equivalencia'}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ fontWeight: 800, margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-history" style={{ color: 'var(--accent-bright)' }} /> Mis Solicitudes
        </h3>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{solicitudes.length} solicitudes</span>
      </div>

      {solicitudes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 52 }}>
          <i className="ti ti-shuffle-off" style={{ fontSize: 40, color: 'var(--text-muted)' }} />
          <p style={{ marginTop: 12, color: 'var(--text-secondary)', fontSize: 14, marginBottom: 0 }}>
            No tenés solicitudes de equivalencia aún.
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            Usá el formulario de arriba para crear tu primera solicitud.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {solicitudes.map(s => {
            const b = badgeEstilo(s.estado)
            return (
              <div key={s.id} className="card" style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px',
                transition: 'border-color .15s, transform .1s', cursor: 'default',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: b.bg, color: b.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0,
                  }}>
                    <i className={`ti ${b.icon}`} />
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, textTransform: 'capitalize' }}>{s.tipo}</div>
                    {s.universidad_origen && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <i className="ti ti-building" style={{ fontSize: 11 }} />{s.universidad_origen}
                      </div>
                    )}
                    {s.created_at && (
                      <div className="mono-label" style={{ fontSize: 10, marginTop: 2 }}>
                        {new Date(s.created_at).toLocaleDateString('es-PY', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                </div>
                <span className="badge" style={{
                  background: b.bg, color: b.color, border: `1px solid ${b.border}`,
                  padding: '5px 14px', fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap',
                }}>
                  <i className={`ti ${b.icon}`} style={{ marginRight: 4, fontSize: 11 }} />
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
