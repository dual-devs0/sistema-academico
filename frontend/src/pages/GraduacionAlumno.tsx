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

  if (loading) return (
    <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>
      <i className="ti ti-loader" style={{ animation: 'gaSpin 1s linear infinite', display: 'inline-block', fontSize: 28, marginBottom: 12 }} />
      <div style={{ fontSize: 13 }}>Cargando condición de egreso…</div>
      <style>{'@keyframes gaSpin{to{transform:rotate(360deg)}}'}</style>
    </div>
  )

  const creditosPct = condicion?.creditos_totales
    ? Math.round(((condicion.creditos_aprobados ?? 0) / condicion.creditos_totales) * 100)
    : 0

  return (
    <div>
      <style>{'@keyframes gaSpin{to{transform:rotate(360deg)}}'}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Mi Graduación</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastUpdate && (
            <span className="mono-label" style={{ fontSize: 11 }}>
              <i className="ti ti-clock" style={{ marginRight: 4 }} />
              {lastUpdate.toLocaleTimeString('es-PY')}
            </span>
          )}
          <button type="button" className="btn-ghost" onClick={() => cargar(true)} disabled={refreshing}>
            <i className="ti ti-refresh" style={refreshing ? { animation: 'gaSpin 1s linear infinite' } : {}} />
            {refreshing ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
      </div>
      <p className="page-subtitle" style={{ marginBottom: 20 }}>
        Verificá tu condición de egreso y gestioná tu proceso de graduación.
      </p>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 12.5, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-alert-triangle" />{error}
        </div>
      )}

      {condicion ? (
        <>
          <div className="card" style={{
            marginBottom: 20, padding: 22, position: 'relative', overflow: 'hidden',
            background: condicion.puede_graduarse ? 'linear-gradient(135deg, rgba(34,197,94,0.08), transparent 70%)' : 'linear-gradient(135deg, rgba(239,68,68,0.06), transparent 70%)',
            borderColor: condicion.puede_graduarse ? 'rgba(34,197,94,0.3)' : 'var(--border-subtle)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{
                  width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: condicion.puede_graduarse ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.15)',
                  color: condicion.puede_graduarse ? '#22c55e' : 'var(--text-muted)',
                  fontSize: 22, flexShrink: 0,
                }}>
                  <i className={`ti ${condicion.puede_graduarse ? 'ti-certificate' : 'ti-notebook'}`} />
                </span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: condicion.puede_graduarse ? '#22c55e' : 'var(--text-primary)' }}>
                    {condicion.puede_graduarse ? '¡Podés solicitar tu graduación!' : 'Aún no cumplís los requisitos'}
                  </div>
                  <div className="mono-label" style={{ fontSize: 12, marginTop: 2 }}>Condición de egreso</div>
                </div>
              </div>
              <span className="badge" style={{
                padding: '6px 16px', fontSize: 12, fontWeight: 800,
                background: condicion.puede_graduarse ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                color: condicion.puede_graduarse ? '#22c55e' : '#ef4444',
                border: `1px solid ${condicion.puede_graduarse ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              }}>
                <i className={`ti ${condicion.puede_graduarse ? 'ti-shield-check' : 'ti-x'}`} style={{ marginRight: 4 }} />
                {condicion.puede_graduarse ? 'ELEGIBLE' : 'NO ELEGIBLE'}
              </span>
            </div>
            {condicion.motivo && (
              <div style={{
                marginTop: 14, padding: '10px 14px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', fontSize: 12.5,
              }}>
                <i className="ti ti-alert-triangle" style={{ flexShrink: 0 }} />
                {condicion.motivo}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
            <div className="kpi-card" style={{ borderLeft: `3px solid ${creditosPct >= 100 ? '#22c55e' : creditosPct >= 75 ? 'var(--accent-bright)' : '#f59e0b'}` }}>
              <div className="kpi-top"><span className="mono-label">Créditos Aprobados</span><i className="ti ti-certificate" style={{ color: creditosPct >= 100 ? '#22c55e' : 'var(--accent)', fontSize: 15 }} /></div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span className="kpi-value" style={{ fontSize: 24 }}>{condicion.creditos_aprobados ?? 0}</span>
                <span className="kpi-unit">/ {condicion.creditos_totales ?? '—'}</span>
              </div>
              <div className="progress-track" style={{ marginTop: 8 }}>
                <div className="progress-fill" style={{ width: `${creditosPct}%`, background: creditosPct >= 100 ? '#22c55e' : undefined }} />
              </div>
            </div>
            <div className="kpi-card" style={{ borderLeft: `3px solid ${(condicion.ppa_actual ?? 0) >= (condicion.ppa_minimo ?? 0) ? '#22c55e' : '#ef4444'}` }}>
              <div className="kpi-top"><span className="mono-label">PPA Actual</span><i className="ti ti-trending-up" style={{ color: (condicion.ppa_actual ?? 0) >= (condicion.ppa_minimo ?? 0) ? '#22c55e' : '#ef4444', fontSize: 15 }} /></div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span className="kpi-value" style={{ fontSize: 24, color: (condicion.ppa_actual ?? 0) >= (condicion.ppa_minimo ?? 0) ? '#22c55e' : '#ef4444' }}>
                  {condicion.ppa_actual ?? '—'}
                </span>
                <span className="kpi-unit">mín: {condicion.ppa_minimo ?? '—'}</span>
              </div>
            </div>
            <div className="kpi-card" style={{ borderLeft: `3px solid ${condicion.pasantia_completada ? '#22c55e' : '#f59e0b'}` }}>
              <div className="kpi-top"><span className="mono-label">Pasantía</span><i className="ti ti-briefcase" style={{ color: condicion.pasantia_completada ? '#22c55e' : '#f59e0b', fontSize: 15 }} /></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="kpi-value" style={{ fontSize: 24, color: condicion.pasantia_completada ? '#22c55e' : '#f59e0b' }}>
                  {condicion.pasantia_completada ? '✓' : '—'}
                </span>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{condicion.pasantia_completada ? 'Completada' : 'Pendiente'}</span>
                  {!condicion.pasantia_exigida && <div className="mono-label" style={{ fontSize: 10 }}>No exigida</div>}
                </div>
              </div>
            </div>
            <div className="kpi-card" style={{ borderLeft: `3px solid ${condicion.tesina_aprobada ? '#22c55e' : 'var(--border-light)'}` }}>
              <div className="kpi-top"><span className="mono-label">Tesina / TFG</span><i className="ti ti-file-text" style={{ color: condicion.tesina_aprobada ? '#22c55e' : 'var(--text-muted)', fontSize: 15 }} /></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="kpi-value" style={{ fontSize: 24, color: condicion.tesina_aprobada ? '#22c55e' : 'var(--text-muted)' }}>
                  {condicion.tesina_aprobada ? '✓' : '○'}
                </span>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{condicion.tesina_aprobada ? 'Aprobada' : 'Pendiente'}</span>
                </div>
              </div>
            </div>
          </div>

          {!condicion.puede_graduarse && (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <i className="ti ti-list-check" style={{ color: 'var(--accent-bright)', fontSize: 16 }} />
                <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Requisitos pendientes</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {!condicion.cumple_creditos && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                  }}>
                    <span style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.12)', color: '#ef4444', fontSize: 12, flexShrink: 0 }}>
                      <i className="ti ti-x" />
                    </span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>Completar créditos</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 1 }}>
                        {condicion.creditos_aprobados ?? 0} de {condicion.creditos_totales ?? '?'} créditos aprobados
                      </div>
                    </div>
                  </div>
                )}
                {!condicion.cumple_ppa && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                  }}>
                    <span style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.12)', color: '#ef4444', fontSize: 12, flexShrink: 0 }}>
                      <i className="ti ti-x" />
                    </span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>Alcanzar PPA mínimo</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 1 }}>
                        PPA actual: {condicion.ppa_actual ?? '—'} · Mínimo requerido: {condicion.ppa_minimo}
                      </div>
                    </div>
                  </div>
                )}
                {!condicion.pasantia_completada && condicion.pasantia_exigida && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                  }}>
                    <span style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.12)', color: '#ef4444', fontSize: 12, flexShrink: 0 }}>
                      <i className="ti ti-x" />
                    </span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>Completar pasantía profesional</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 1 }}>Requisito obligatorio para egreso</div>
                    </div>
                  </div>
                )}
                {!condicion.tesina_aprobada && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                  }}>
                    <span style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.12)', color: '#ef4444', fontSize: 12, flexShrink: 0 }}>
                      <i className="ti ti-x" />
                    </span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>Aprobar tesina / TFG</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 1 }}>Trabajo final de grado pendiente</div>
                    </div>
                  </div>
                )}
                {condicion.puede_graduarse === false && !condicion.motivo && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)',
                  }}>
                    <span style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(245,158,11,0.12)', color: '#f59e0b', fontSize: 12, flexShrink: 0 }}>
                      <i className="ti ti-help" />
                    </span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>Consultar con administración</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 1 }}>Comunicate con la oficina de graduaciones para más detalles.</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {condicion.puede_graduarse && (
            <div className="card" style={{
              padding: 20, background: 'linear-gradient(135deg, rgba(34,197,94,0.06), transparent 70%)',
              borderColor: 'rgba(34,197,94,0.25)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <i className="ti ti-info-circle" style={{ color: '#22c55e', fontSize: 18 }} />
                <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Próximos pasos</h3>
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '8px 0 0', lineHeight: 1.6 }}>
                Acercate a la oficina de graduaciones para iniciar el trámite formal de egreso.
                Necesitás presentar tu documento de identidad, el formulario de solicitud de graduación,
                y el comprobante de pago de los aranceles correspondientes.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: 52, color: 'var(--text-secondary)' }}>
          <i className="ti ti-graduation-cap" style={{ fontSize: 44, color: 'var(--text-muted)' }} />
          <p style={{ marginTop: 12, fontSize: 14 }}>No se pudo cargar la información de graduación.</p>
          <button className="btn-ghost" style={{ marginTop: 12 }} onClick={() => cargar(true)} disabled={refreshing}>
            <i className="ti ti-refresh" /> Reintentar
          </button>
        </div>
      )}
    </div>
  )
}
