import { useState, useEffect, useCallback, useMemo } from 'react'
import { getUserId } from '../hooks/useRole'
import { obtenerAvanceAlumno, obtenerCreditosAlumno, type AvanceMateriaOut, type CreditosAlumnoOut } from '../services/pensumService'

const POLL_MS = 30000

const estadoBadge: Record<string, { bg: string; color: string; label: string }> = {
  aprobada:  { bg: 'var(--success-subtle)', color: 'var(--success)', label: 'Aprobada' },
  cursando:  { bg: 'var(--accent-muted)', color: 'var(--accent-bright)', label: 'Cursando' },
  reprobada: { bg: 'var(--danger-subtle)', color: 'var(--danger)', label: 'Reprobada' },
  pendiente: { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', label: 'Disponible' },
  bloqueada: { bg: 'rgba(148,163,184,0.12)', color: 'var(--text-secondary)', label: 'Bloqueada' },
}

const css = `
  .malla-leyenda { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:18px; }
  .malla-leyenda-chip { display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:999px; font-size:11px; font-weight:600; }
  .malla-semestre-header { display:flex; align-items:baseline; justify-content:space-between; cursor:pointer; user-select:none; }
  .malla-alumno-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:16px; }
  .malla-card { position:relative; padding:14px 16px; border-radius:var(--radius-md); border:1px solid var(--border-subtle); border-left-width:3px; background:var(--bg-surface); }
  .malla-card.bloqueada { opacity:0.6; background:var(--bg-base); }
  .malla-card-codigo { font-family:var(--font-mono); font-size:9.5px; color:var(--text-muted); letter-spacing:0.05em; margin-bottom:3px; display:block; }
  .malla-card-requiere { font-size:10.5px; color:var(--text-muted); margin-top:6px; }
  .malla-card-tooltip {
    position:absolute; top:calc(100% + 6px); left:0; right:0; z-index:20;
    background:var(--bg-elevated); border:1px solid var(--border-subtle); border-radius:10px;
    padding:10px 12px; font-size:11.5px; color:var(--text-secondary); box-shadow:0 8px 24px rgba(0,0,0,.35);
  }
  @keyframes malla-pulse { 0%,100% { opacity:1 } 50% { opacity:0.55 } }
  .malla-badge-cursando { animation: malla-pulse 1.6s infinite; }
`

const bordeEstado: Record<string, string> = {
  aprobada: '#22c55e',
  cursando: 'var(--accent)',
  reprobada: '#ef4444',
  pendiente: 'var(--border-light)',
  bloqueada: 'var(--border-subtle)',
}

export default function MallaAlumno() {
  const alumnoId = getUserId()
  const [avance, setAvance] = useState<AvanceMateriaOut[]>([])
  const [creditos, setCreditos] = useState<CreditosAlumnoOut | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [tooltipAbierto, setTooltipAbierto] = useState<number | null>(null)
  const [colapsados, setColapsados] = useState<Set<number>>(new Set())

  const cargar = useCallback((manual = false) => {
    if (alumnoId === null) return
    if (manual) setRefreshing(true)
    Promise.allSettled([obtenerAvanceAlumno(alumnoId), obtenerCreditosAlumno(alumnoId)])
      .then(([a, c]) => {
        const fails: string[] = []
        if (a.status === 'fulfilled') setAvance(a.value)
        else fails.push('malla curricular')
        if (c.status === 'fulfilled') setCreditos(c.value)
        else fails.push('créditos')
        setError(fails.length ? `No se pudo cargar: ${fails.join(', ')}. Mostrando último dato disponible.` : '')
        setLastUpdate(new Date())
      })
      .finally(() => { setLoading(false); setRefreshing(false) })
  }, [alumnoId])

  useEffect(() => {
    const load = () => cargar()
    load()
    const id = setInterval(() => cargar(), POLL_MS)
    return () => clearInterval(id)
  }, [cargar])

  const semestres = useMemo(() => {
    const grupos = new Map<number, AvanceMateriaOut[]>()
    avance.forEach(a => {
      if (!grupos.has(a.semestre)) grupos.set(a.semestre, [])
      grupos.get(a.semestre)!.push(a)
    })
    return [...grupos.entries()].sort((x, y) => x[0] - y[0])
  }, [avance])

  const pct = creditos?.creditos_totales ? Math.round((creditos.creditos_acumulados / creditos.creditos_totales) * 100) : 0

  function toggleColapsado(sem: number) {
    setColapsados(prev => {
      const next = new Set(prev)
      if (next.has(sem)) next.delete(sem); else next.add(sem)
      return next
    })
  }

  return (
    <>
      <style>{css}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Mi Progreso Académico</h1>
          <p className="page-subtitle" style={{ marginBottom: 18 }}>Estado de tu malla curricular y créditos acumulados.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {lastUpdate && (
            <span className="mono-label" style={{ fontSize: 10.5 }}>Actualizado {lastUpdate.toLocaleTimeString('es-PY')}</span>
          )}
          <button type="button" className="btn-ghost" disabled={refreshing} onClick={() => cargar(true)}>
            <i className={`ti ti-refresh${refreshing ? ' ti-spin' : ''}`} /> {refreshing ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: 12.5, color: 'var(--danger)', marginBottom: 16 }}>
          <i className="ti ti-alert-triangle" /> {error}
        </div>
      )}

      {creditos && (
        <div className="card" style={{ marginBottom: 24, padding: '18px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <span className="mono-label">Créditos acumulados</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 800 }}>
              {creditos.creditos_acumulados} / {creditos.creditos_totales ?? '—'}
              {creditos.creditos_totales ? <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}> ({pct}%)</span> : null}
            </span>
          </div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
        </div>
      )}

      {!loading && avance.length > 0 && (
        <div className="malla-leyenda">
          {(['aprobada', 'cursando', 'reprobada', 'pendiente', 'bloqueada'] as const).map(estado => (
            <span key={estado} className="malla-leyenda-chip" style={{ background: estadoBadge[estado].bg, color: estadoBadge[estado].color }}>
              {estadoBadge[estado].label}
            </span>
          ))}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>Cargando…</div>
      ) : avance.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>
          Todavía no hay malla curricular cargada para tu carrera.
        </div>
      ) : (
        semestres.map(([sem, materias]) => {
          const totalCreditos = materias.reduce((s, m) => s + m.creditos, 0)
          const todasBloqueadas = materias.every(m => m.estado === 'bloqueada')
          const colapsado = todasBloqueadas && colapsados.has(sem)
          return (
            <div key={sem} style={{ marginBottom: 22 }}>
              <div
                className="malla-semestre-header"
                style={{ marginBottom: 10 }}
                onClick={() => todasBloqueadas && toggleColapsado(sem)}
              >
                <h2 style={{ fontSize: 15, fontWeight: 800 }}>
                  Semestre {sem} — {totalCreditos} créditos ({materias.length} materias)
                </h2>
                {todasBloqueadas && (
                  <i className={`ti ${colapsado ? 'ti-chevron-down' : 'ti-chevron-up'}`} style={{ color: 'var(--text-muted)' }} />
                )}
              </div>
              {!colapsado && (
                <div className="malla-alumno-grid">
                  {materias.map(m => {
                    const b = estadoBadge[m.estado] ?? estadoBadge.pendiente
                    const bloqueada = m.estado === 'bloqueada'
                    return (
                      <div
                        key={m.pensum_materia_id}
                        className={`malla-card${bloqueada ? ' bloqueada' : ''}`}
                        style={{ cursor: bloqueada ? 'pointer' : 'default', borderLeftColor: bordeEstado[m.estado] ?? bordeEstado.pendiente }}
                        role={bloqueada ? 'button' : undefined}
                        tabIndex={bloqueada ? 0 : undefined}
                        onMouseEnter={() => bloqueada && setTooltipAbierto(m.pensum_materia_id)}
                        onMouseLeave={() => setTooltipAbierto(null)}
                        onClick={() => bloqueada && setTooltipAbierto(prev => prev === m.pensum_materia_id ? null : m.pensum_materia_id)}
                        onKeyDown={e => {
                          if (bloqueada && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault()
                            setTooltipAbierto(prev => prev === m.pensum_materia_id ? null : m.pensum_materia_id)
                          }
                        }}
                      >
                        {m.materia_codigo && <span className="malla-card-codigo">{m.materia_codigo}</span>}
                        <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {bloqueada && <i className="ti ti-lock" style={{ fontSize: 12, color: 'var(--text-muted)' }} />}
                          {m.materia_nombre}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span className={`badge${m.estado === 'cursando' ? ' malla-badge-cursando' : ''}`} style={{ background: b.bg, color: b.color }}>{b.label}</span>
                          <span className="mono-label" style={{ fontSize: 9.5 }}>{m.creditos} créd.</span>
                        </div>
                        {(m.estado === 'aprobada' || m.estado === 'reprobada') && m.nota !== null && (
                          <div className="mono-label" style={{ marginTop: 6, fontSize: 9.5, color: b.color }}>Nota: {m.nota}</div>
                        )}
                        {m.estado === 'pendiente' && m.prerequisitos.length > 0 && (
                          <div className="malla-card-requiere">Requiere: {m.prerequisitos.map(p => p.materia_nombre).join(', ')}</div>
                        )}
                        {bloqueada && tooltipAbierto === m.pensum_materia_id && (
                          <div className="malla-card-tooltip">
                            {m.pendientes.length === 0 ? 'Tenés prerrequisitos pendientes.' : (
                              <>
                                <b style={{ color: 'var(--text-primary)' }}>Falta:</b>{' '}
                                {m.pendientes.map((p, i) => (
                                  <span key={p.materia_id}>
                                    {i > 0 && ', '}
                                    {p.materia_nombre} ({p.tipo})
                                  </span>
                                ))}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })
      )}
    </>
  )
}
