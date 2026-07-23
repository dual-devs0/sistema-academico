import { useState, useEffect, useMemo, useCallback } from 'react'
import { getUserId } from '../hooks/useRole'
import {
  obtenerPPA, obtenerExpediente, obtenerRegularidad,
  type PPAOut, type ExpedienteAlumnoOut, type RegularidadOut,
  type ExpedienteMateriaOut as ExpMateria,
} from '../services/expedienteService'

const POLL_MS = 30000

const condicionBadge: Record<string, { bg: string; color: string }> = {
  aprobada: { bg: 'var(--success-subtle)', color: 'var(--success)' },
  reprobada: { bg: 'var(--danger-subtle)', color: 'var(--danger)' },
}

const regBadge: Record<string, { bg: string; color: string; label: string }> = {
  activo: { bg: 'var(--success-subtle)', color: 'var(--success)', label: 'Activo' },
  en_riesgo: { bg: 'var(--warning-subtle)', color: 'var(--warning)', label: 'En riesgo' },
  irregular: { bg: 'var(--danger-subtle)', color: 'var(--danger)', label: 'Irregular' },
  de_baja: { bg: 'rgba(148,163,184,0.12)', color: 'var(--text-secondary)', label: 'De baja' },
}

const css = `
  @keyframes shimmer { 0%,100%{opacity:.3} 50%{opacity:.7} }
  .ea-skeleton { background:rgba(255,255,255,0.06); border-radius:var(--radius-md); animation:shimmer 1.5s ease-in-out infinite; }
  .ea-kpi-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(190px, 1fr)); gap:14px; margin-bottom:24px; }
  .ea-kpi-card { transition:border-color .15s; }
  .ea-kpi-card:hover { border-color:var(--accent-hover); }
  .ea-kpi-icon { width:30px; height:30px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0; }
  .ea-kpi-unit-block { display:block; margin-top:6px; font-size:11.5px; color:var(--text-secondary); font-weight:600; }
`

function ppaColor(v: number | null | undefined): string {
  if (v === null || v === undefined) return 'var(--text-muted)'
  if (v >= 9) return 'var(--accent-bright)'
  if (v >= 6) return 'var(--success)'
  return 'var(--danger)'
}

export default function ExpedienteAlumno() {
  const alumnoId = getUserId()
  const [ppa, setPpa] = useState<PPAOut | null>(null)
  const [expediente, setExpediente] = useState<ExpedienteAlumnoOut | null>(null)
  const [regularidad, setRegularidad] = useState<RegularidadOut | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const cargar = useCallback((manual = false) => {
    if (alumnoId === null) return
    if (manual) setRefreshing(true)
    Promise.allSettled([obtenerPPA(alumnoId), obtenerExpediente(alumnoId), obtenerRegularidad(alumnoId)])
      .then(([p, e, r]) => {
        const fails: string[] = []
        if (p.status === 'fulfilled') setPpa(p.value)
        else fails.push('PPA')
        if (e.status === 'fulfilled') setExpediente(e.value)
        else fails.push('expediente')
        if (r.status === 'fulfilled') setRegularidad(r.value)
        else fails.push('regularidad')
        setError(fails.length ? `No se pudo cargar: ${fails.join(', ')}. Mostrando último dato disponible.` : '')
        setLastUpdate(new Date())
      })
      .finally(() => { setLoading(false); setRefreshing(false) })
  }, [alumnoId])

  useEffect(() => {
    cargar()
    const id = setInterval(() => cargar(), POLL_MS)
    return () => clearInterval(id)
  }, [cargar])

  const materiasPorPeriodo = useMemo(() => {
    if (!expediente) return new Map<string, ExpMateria[]>()
    const map = new Map<string, ExpMateria[]>()
    expediente.materias.forEach(m => {
      if (!map.has(m.periodo)) map.set(m.periodo, [])
      map.get(m.periodo)!.push(m)
    })
    return map
  }, [expediente])

  const rBadge = regularidad ? (regBadge[regularidad.estado] ?? regBadge.activo) : null

  const stats = useMemo(() => {
    if (!expediente) return null
    const aprobadas = expediente.materias.filter(m => m.condicion === 'aprobada').length
    const reprobadas = expediente.materias.filter(m => m.condicion === 'reprobada').length
    const creditos = expediente.materias.filter(m => m.condicion === 'aprobada').reduce((s, m) => s + m.creditos, 0)
    return { total: expediente.materias.length, aprobadas, reprobadas, creditos }
  }, [expediente])

  return (
    <>
      <style>{css}</style>
      <div className="w-full">
        <header style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title" style={{ fontSize: 28 }}>Mi Expediente</h1>
            <p className="page-subtitle">Historial oficial de materias cerradas, PPA y estado de regularidad.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {lastUpdate && (
              <span className="mono-label" style={{ fontSize: 10.5 }}>Actualizado {lastUpdate.toLocaleTimeString('es-PY')}</span>
            )}
            <button type="button" className="btn-ghost" disabled={refreshing} onClick={() => cargar(true)}>
              <i className={`ti ti-refresh${refreshing ? ' ti-spin' : ''}`} /> {refreshing ? 'Actualizando…' : 'Actualizar'}
            </button>
          </div>
        </header>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: 12.5, color: 'var(--danger)', marginBottom: 16 }}>
            <i className="ti ti-alert-triangle" /> {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: 4 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
              {[1, 2, 3].map(i => <div key={i} className="ea-skeleton" style={{ height: 80 }} />)}
            </div>
            <div className="ea-skeleton" style={{ height: 200 }} />
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="ea-kpi-grid">
              <div className="card ea-kpi-card">
                <div className="kpi-top">
                  <span className="mono-label">PPA Acumulado</span>
                  <span className="ea-kpi-icon" style={{ background: 'var(--accent-muted)', color: 'var(--accent-bright)' }}>
                    <i className="ti ti-chart-bar" />
                  </span>
                </div>
                <span className="kpi-value" style={{ color: ppaColor(ppa?.ppa) }}>{ppa?.ppa?.toFixed(2) ?? '—'}</span>
                <span className="ea-kpi-unit-block">{ppa ? `${ppa.creditos_computados} créd. computados` : 'Sin materias aprobadas aún'}</span>
              </div>

              {rBadge && (
                <div className="card ea-kpi-card">
                  <div className="kpi-top">
                    <span className="mono-label">Regularidad</span>
                    <span className="ea-kpi-icon" style={{ background: rBadge.bg, color: rBadge.color }}>
                      <i className="ti ti-shield-check" />
                    </span>
                  </div>
                  <span className="badge" style={{ background: rBadge.bg, color: rBadge.color, fontSize: 13, fontWeight: 700 }}>{rBadge.label}</span>
                  {regularidad?.motivo && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.5 }}>{regularidad.motivo}</div>}
                </div>
              )}

              {stats && (
                <>
                  <div className="card ea-kpi-card">
                    <div className="kpi-top">
                      <span className="mono-label">Materias cursadas</span>
                      <span className="ea-kpi-icon" style={{ background: 'rgba(148,163,184,0.12)', color: 'var(--text-secondary)' }}>
                        <i className="ti ti-list-check" />
                      </span>
                    </div>
                    <span className="kpi-value">{stats.total}</span>
                    <span className="ea-kpi-unit-block">
                      <span style={{ color: 'var(--success)' }}>{stats.aprobadas} aprob.</span> · <span style={{ color: 'var(--danger)' }}>{stats.reprobadas} reprob.</span>
                    </span>
                  </div>
                  <div className="card ea-kpi-card">
                    <div className="kpi-top">
                      <span className="mono-label">Créditos acumulados</span>
                      <span className="ea-kpi-icon" style={{ background: 'var(--accent-muted)', color: 'var(--accent-bright)' }}>
                        <i className="ti ti-certificate" />
                      </span>
                    </div>
                    <span className="kpi-value">{stats.creditos}</span>
                  </div>
                </>
              )}
            </div>

            {/* Expediente */}
            {!expediente || expediente.materias.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                <i className="ti ti-file-certificate" style={{ fontSize: 36, color: 'var(--text-muted)', marginBottom: 10, display: 'block' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
                  Todavía no tenés materias cerradas en tu expediente.
                </p>
              </div>
            ) : (
              [...materiasPorPeriodo.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([periodo, materias]) => {
                const sem = expediente.semestres.find(s => s.periodo === periodo)
                return (
                  <div key={periodo} className="card" style={{ marginBottom: 14, padding: 0, overflow: 'hidden' }}>
                    <div style={{
                      padding: '12px 18px', borderBottom: '1px solid var(--border-subtle)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: 'var(--bg-elevated)',
                    }}>
                      <span style={{ fontWeight: 800, fontSize: 13 }}>Período {periodo}</span>
                      {sem && (
                        <span className="mono-label" style={{ fontSize: 10 }}>
                          PPA <span style={{ fontWeight: 700, color: 'var(--accent-bright)' }}>{sem.ppa_periodo ?? '—'}</span>
                          {' · '}{sem.creditos_periodo} créd. · {sem.materias_aprobadas} aprob. / {sem.materias_reprobadas} reprob.
                        </span>
                      )}
                    </div>
                    {materias.sort((a, b) => a.materia_nombre.localeCompare(b.materia_nombre)).map(m => {
                      const b = condicionBadge[m.condicion] ?? condicionBadge.reprobada
                      return (
                        <div key={m.id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 18px', borderBottom: '1px solid var(--border-subtle)',
                        }}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{m.materia_nombre}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <span className="mono-label" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{m.creditos} créd.</span>
                            <span style={{
                              fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 15,
                              color: m.condicion === 'aprobada' ? 'var(--success)' : 'var(--danger)',
                            }}>{m.nota_final}</span>
                            <span className="badge" style={{ background: b.bg, color: b.color }}>
                              {m.condicion === 'aprobada' ? 'Aprobada' : 'Reprobada'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })
            )}
          </>
        )}
      </div>
    </>
  )
}
