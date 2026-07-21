import { useState, useEffect, useCallback, useRef } from 'react'
import { getCurrentUser, emitToast } from '../lib/api'
import { getCondicionEgreso, type CondicionEgreso } from '../services/graduacionService'

const POLL_MS = 30000

export default function GraduacionAlumno() {
  const [condicion, setCondicion] = useState<CondicionEgreso | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState('')
  const user = getCurrentUser()
  const firstLoad = useRef(true)

  const cargar = useCallback((manual = false) => {
    if (!user?.user_id) return
    if (manual) setRefreshing(true)
    if (firstLoad.current) setLoading(true)
    getCondicionEgreso(user.user_id)
      .then(c => { setCondicion(c); setError(''); setLastUpdate(new Date()) })
      .catch(() => {
        setError('No se pudo actualizar la condición de egreso. Mostrando el último dato disponible.')
        if (firstLoad.current) emitToast('Error cargando condición', 'error')
      })
      .finally(() => { setLoading(false); setRefreshing(false); firstLoad.current = false })
  }, [user?.user_id])

  useEffect(() => {
    cargar()
    const id = setInterval(() => cargar(true), POLL_MS)
    return () => clearInterval(id)
  }, [cargar])

  if (loading) return <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 32 }}>Cargando...</div>

  const creditosPct = condicion?.creditos_totales
    ? Math.round(((condicion.creditos_aprobados ?? 0) / condicion.creditos_totales) * 100)
    : 0

  return (
    <div>
      <style>{'@keyframes gaSpin{to{transform:rotate(360deg)}}'}</style>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
        <h1 className="page-title" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="ti ti-graduation-cap" style={{ color: 'var(--accent-bright)' }} /> Mi Graduación
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastUpdate && (
            <span className="mono-label" style={{ fontSize: 11 }}>
              Actualizado {lastUpdate.toLocaleTimeString('es-PY')}
            </span>
          )}
          <button type="button" className="btn-ghost" onClick={() => cargar(true)} disabled={refreshing}>
            <i className="ti ti-refresh" style={refreshing ? { animation: 'gaSpin 1s linear infinite' } : {}} /> {refreshing ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
      </div>
      <p className="page-subtitle" style={{ marginBottom: 20 }}>
        Verificá tu condición de egreso y gestioná tu proceso de graduación.
      </p>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--danger-subtle)', color: 'var(--danger)', fontSize: 12.5, marginBottom: 16 }}>
          <i className="ti ti-alert-triangle" style={{ marginRight: 6 }} />{error}
        </div>
      )}

      {condicion ? (
        <>
          {/* Estado general */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 32 }}>{condicion.puede_graduarse ? '🎉' : '📋'}</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>
                    {condicion.puede_graduarse ? '¡Podés solicitar graduación!' : 'Aún no cumplís los requisitos'}
                  </div>
                  <div className="mono-label" style={{ fontSize: 12, marginTop: 2 }}>Condición de egreso</div>
                </div>
              </div>
              <span className={`badge ${condicion.puede_graduarse ? '' : ''}`} style={{
                background: condicion.puede_graduarse ? 'var(--success-subtle)' : 'var(--warning-subtle)',
                color: condicion.puede_graduarse ? 'var(--success)' : 'var(--warning)',
              }}>
                {condicion.puede_graduarse ? 'ELEGIBLE' : 'NO ELEGIBLE'}
              </span>
            </div>
            {condicion.motivo && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--danger-subtle)', color: 'var(--danger)', fontSize: 12.5, marginBottom: 10 }}>
                <i className="ti ti-alert-triangle" style={{ marginRight: 6 }} />{condicion.motivo}
              </div>
            )}
          </div>

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
            <div className="kpi-card">
              <div className="mono-label" style={{ marginBottom: 6 }}>Créditos Aprobados</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span className="kpi-value" style={{ fontSize: 24 }}>{condicion.creditos_aprobados ?? 0}</span>
                <span className="kpi-unit">/ {condicion.creditos_totales ?? '—'}</span>
              </div>
              <div className="progress-track" style={{ marginTop: 8 }}>
                <div className="progress-fill" style={{ width: `${creditosPct}%`, background: creditosPct >= 100 ? 'var(--success)' : undefined }} />
              </div>
            </div>
            <div className="kpi-card">
              <div className="mono-label" style={{ marginBottom: 6 }}>PPA Actual</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span className="kpi-value" style={{ fontSize: 24, color: (condicion.ppa_actual ?? 0) >= (condicion.ppa_minimo ?? 0) ? 'var(--success)' : 'var(--danger)' }}>
                  {condicion.ppa_actual ?? '—'}
                </span>
                <span className="kpi-unit">mín: {condicion.ppa_minimo ?? '—'}</span>
              </div>
            </div>
            <div className="kpi-card">
              <div className="mono-label" style={{ marginBottom: 6 }}>Pasantía</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="kpi-value" style={{ fontSize: 24, color: condicion.pasantia_completada ? 'var(--success)' : 'var(--warning)' }}>
                  {condicion.pasantia_completada ? '✓' : '—'}
                </span>
                <span className="kpi-unit">{condicion.pasantia_completada ? 'Completada' : 'Pendiente'}</span>
              </div>
            </div>
            <div className="kpi-card">
              <div className="mono-label" style={{ marginBottom: 6 }}>Tesina / TFG</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="kpi-value" style={{ fontSize: 24, color: condicion.tesina_aprobada ? 'var(--success)' : 'var(--text-muted)' }}>
                  {condicion.tesina_aprobada ? '✓' : '○'}
                </span>
                <span className="kpi-unit">{condicion.tesina_aprobada ? 'Aprobada' : 'Pendiente'}</span>
              </div>
            </div>
          </div>

          {/* Si no cumple, mostrar qué falta */}
          {!condicion.puede_graduarse && (
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}><i className="ti ti-list-check" style={{ color: 'var(--accent-bright)' }} /> Requisitos pendientes</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(condicion.creditos_aprobados ?? 0) < (condicion.creditos_totales ?? 999) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: 'var(--bg-elevated)' }}>
                    <i className="ti ti-x" style={{ color: 'var(--danger)' }} />
                    <span style={{ fontSize: 13 }}>Completar créditos: {condicion.creditos_aprobados ?? 0}/{condicion.creditos_totales ?? '?'}</span>
                  </div>
                )}
                {!condicion.pasantia_completada && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: 'var(--bg-elevated)' }}>
                    <i className="ti ti-x" style={{ color: 'var(--danger)' }} />
                    <span style={{ fontSize: 13 }}>Completar pasantía profesional</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>
          <i className="ti ti-graduation-cap" style={{ fontSize: 40, color: 'var(--text-muted)' }} />
          <p style={{ marginTop: 10 }}>No se pudo cargar la información de graduación.</p>
        </div>
      )}
    </div>
  )
}