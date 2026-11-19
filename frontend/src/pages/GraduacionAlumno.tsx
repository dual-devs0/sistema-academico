// Alumno. Condición de egreso propia (créditos+PPA+pasantía) y estado del proceso de tesis. Depende de: /graduacion/alumno/{id}/*.
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser, emitToast } from '../lib/api'
import { Skeleton } from 'boneyard-js/react'
import { getCondicionEgreso, type CondicionEgreso } from '../services/graduacionService'

const POLL_MS = 30000

type Requisito = { label: string; sub: string; cumplido: boolean; parcial?: boolean; metric: string; metricColor?: string }

export default function GraduacionAlumno() {
  const navigate = useNavigate()
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
    const load = () => cargar()
    load()
    const id = setInterval(() => cargar(true), POLL_MS)
    return () => clearInterval(id)
  }, [cargar])

  const creditosPct = condicion?.creditos_totales
    ? Math.round(((condicion.creditos_aprobados ?? 0) / condicion.creditos_totales) * 100)
    : 0

  const requisitos: Requisito[] = condicion ? [
    {
      label: 'Créditos aprobados', sub: `${condicion.creditos_aprobados ?? 0}/${condicion.creditos_totales ?? '?'}`,
      cumplido: condicion.cumple_creditos, parcial: !condicion.cumple_creditos && creditosPct > 0,
      metric: `${condicion.creditos_aprobados ?? 0}/${condicion.creditos_totales ?? '—'}`,
    },
    {
      label: 'PPA mínimo', sub: `mín. ${condicion.ppa_minimo ?? '—'}`,
      cumplido: condicion.cumple_ppa, metric: String(condicion.ppa_actual ?? '—'),
      metricColor: condicion.cumple_ppa ? 'var(--success)' : 'var(--danger)',
    },
    {
      label: 'Pasantía', sub: condicion.pasantia_exigida ? 'exigida por el plan' : 'no exigida por el plan',
      cumplido: !!condicion.pasantia_completada, metric: condicion.pasantia_completada ? 'Completada' : condicion.pasantia_exigida ? 'Pendiente' : 'N/A',
    },
    {
      label: 'Tesina / TFG', sub: condicion.tesina_aprobada ? 'aprobada' : 'sin iniciar',
      cumplido: !!condicion.tesina_aprobada, metric: condicion.tesina_aprobada ? 'Aprobada' : 'Pendiente',
    },
  ] : []
  const cumplidos = requisitos.filter(r => r.cumplido).length

  const faltantes: string[] = []
  if (condicion && !condicion.cumple_creditos) faltantes.push(`${(condicion.creditos_totales ?? 0) - (condicion.creditos_aprobados ?? 0)} créditos`)
  if (condicion && !condicion.cumple_ppa) faltantes.push('alcanzar el PPA mínimo')
  if (condicion && condicion.pasantia_exigida && !condicion.pasantia_completada) faltantes.push('la pasantía obligatoria')
  if (condicion && !condicion.tesina_aprobada) faltantes.push('la tesina')

  return (
    <Skeleton name="graduacion-alumno" loading={loading}>
    <div>
      <style>{'@keyframes gaSpin{to{transform:rotate(360deg)}}'}</style>

      <div className="page-head">
        <div>
          <div className="page-eyebrow">Condición de egreso</div>
          <h1 className="page-title">Mi graduación</h1>
        </div>
        <button type="button" className="btn-ghost" onClick={() => cargar(true)} disabled={refreshing}
          style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>
          <i className="ti ti-refresh" style={refreshing ? { animation: 'gaSpin 1s linear infinite' } : {}} />
          {lastUpdate ? lastUpdate.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' }) : refreshing ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 12.5, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-alert-triangle" />{error}
        </div>
      )}

      {condicion ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, alignItems: 'stretch', marginBottom: 24 }}>
            <div className="kpi-dominant">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="mono-label">Requisitos cumplidos</span>
                <span className="badge" style={{
                  background: condicion.puede_graduarse ? 'var(--success-subtle)' : 'var(--danger-subtle)',
                  color: condicion.puede_graduarse ? 'var(--success)' : 'var(--danger)',
                }}>
                  {condicion.puede_graduarse ? 'ELEGIBLE' : 'NO ELEGIBLE'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
                <span className="kpi-dominant-value">{cumplidos}</span>
                <span style={{ fontSize: 20, color: 'var(--text-secondary)', fontWeight: 600, paddingBottom: 10 }}>de {requisitos.length}</span>
              </div>
              <div>
                {requisitos.map(r => (
                  <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderTop: '1px solid var(--border-subtle)' }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      background: r.cumplido ? 'var(--success-subtle)' : r.parcial ? 'var(--warning-subtle)' : 'rgba(255,255,255,.04)',
                      color: r.cumplido ? 'var(--success)' : r.parcial ? 'var(--warning)' : 'var(--text-muted)',
                    }}>
                      <i className={`ti ${r.cumplido ? 'ti-check' : 'ti-minus'}`} style={{ fontSize: 13 }} />
                    </span>
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>{r.label}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.sub}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 800, color: r.metricColor ?? (r.cumplido ? 'var(--success)' : 'var(--text-muted)'), width: 90, textAlign: 'right' }}>{r.metric}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {condicion.puede_graduarse ? (
                <div className="card" style={{ borderColor: 'rgba(34,197,94,.28)', padding: '20px 22px', flex: 1 }}>
                  <div className="mono-label" style={{ color: 'var(--success)', marginBottom: 12 }}>Próximos pasos</div>
                  <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                    Acercate a la oficina de graduaciones para iniciar el trámite formal de egreso. Necesitás tu documento
                    de identidad, el formulario de solicitud y el comprobante de pago de los aranceles correspondientes.
                  </p>
                </div>
              ) : (
                <div className="card" style={{ borderColor: 'rgba(239,68,68,.28)', padding: '20px 22px', flex: 1 }}>
                  <div className="mono-label" style={{ color: 'var(--danger)', marginBottom: 12 }}>Qué te falta</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    {faltantes.length ? faltantes.join(', ') + '.' : condicion.motivo || 'Consultá con administración.'}
                  </div>
                </div>
              )}
              <button type="button" disabled={!condicion.puede_graduarse} onClick={() => navigate('/tramites')}
                className={condicion.puede_graduarse ? 'btn-primary' : 'btn-ghost'}
                style={{ padding: 16, fontSize: 13, cursor: condicion.puede_graduarse ? 'pointer' : 'not-allowed', opacity: condicion.puede_graduarse ? 1 : 0.6 }}>
                <i className="ti ti-certificate" style={{ fontSize: 17 }} /> Solicitar graduación
              </button>
            </div>
          </div>
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
    </Skeleton>
  )
}
