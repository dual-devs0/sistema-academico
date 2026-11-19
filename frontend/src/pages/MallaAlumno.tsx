// Alumno. Visualización de su avance en la malla curricular (5 estados de color). Depende de: /pensum/avance/*.
import { useState, useEffect, useCallback, useMemo } from 'react'
import { getUserId } from '../hooks/useRole'
import { obtenerAvanceAlumno, obtenerCreditosAlumno, type AvanceMateriaOut, type CreditosAlumnoOut } from '../services/pensumService'
import { Skeleton } from 'boneyard-js/react'

const POLL_MS = 30000

const estadoBadge: Record<string, { bg: string; color: string; label: string }> = {
  aprobada:  { bg: 'var(--success-subtle)', color: 'var(--success)', label: 'Aprobada' },
  cursando:  { bg: 'var(--accent-muted)', color: 'var(--accent-bright)', label: 'Cursando' },
  reprobada: { bg: 'var(--danger-subtle)', color: 'var(--danger)', label: 'Reprobada' },
  pendiente: { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', label: 'Disponible' },
  bloqueada: { bg: 'rgba(148,163,184,0.12)', color: 'var(--text-secondary)', label: 'Bloqueada' },
}

const css = `
  .malla-hero { display:flex; align-items:center; gap:48px; flex-wrap:wrap; padding:24px 26px; margin-bottom:24px; }
  .malla-hero-bar { height:10px; border-radius:999px; background:var(--bg-elevated); overflow:hidden; display:flex; }
  .malla-hero-legend { display:flex; gap:24px; flex-wrap:wrap; }
  .malla-hero-legend-item { display:flex; align-items:center; gap:9px; font-size:12.5px; color:var(--text-secondary); }
  .malla-semestre-header { display:flex; align-items:baseline; justify-content:space-between; cursor:pointer; user-select:none; }
  .malla-alumno-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:16px; }
  .malla-card { position:relative; padding:16px 18px; border-radius:14px; border:1px solid var(--border-subtle); border-left-width:3px; background:var(--bg-surface); }
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
  const conteoPorEstado = useMemo(() => {
    const c: Record<string, number> = { aprobada: 0, cursando: 0, pendiente: 0, bloqueada: 0, reprobada: 0 }
    avance.forEach(a => { c[a.estado] = (c[a.estado] ?? 0) + 1 })
    return c
  }, [avance])
  const creditosCursando = useMemo(() => avance.filter(a => a.estado === 'cursando').reduce((s, a) => s + a.creditos, 0), [avance])
  const pctCursando = creditos?.creditos_totales ? Math.round((creditosCursando / creditos.creditos_totales) * 100) : 0

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

      <div className="page-head">
        <div>
          <div className="page-eyebrow">Malla curricular · créditos acumulados</div>
          <h1 className="page-title">Mi progreso académico</h1>
        </div>
        <button type="button" className="btn-ghost" disabled={refreshing} onClick={() => cargar(true)}
          style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>
          <i className={`ti ti-refresh${refreshing ? ' ti-spin' : ''}`} />
          {lastUpdate ? lastUpdate.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' }) : refreshing ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: 12.5, color: 'var(--danger)', marginBottom: 16 }}>
          <i className="ti ti-alert-triangle" /> {error}
        </div>
      )}

      {creditos && (
        <div className="card malla-hero">
          <div style={{ flexShrink: 0 }}>
            <div className="mono-label" style={{ marginBottom: 14 }}>Créditos acumulados</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 56, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)', lineHeight: .9 }}>{creditos.creditos_acumulados}</span>
              <span style={{ fontSize: 16, color: 'var(--text-secondary)', fontWeight: 600, paddingBottom: 6 }}>/ {creditos.creditos_totales ?? '—'}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 800, color: 'var(--accent-bright)', paddingBottom: 8 }}>{pct}%</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="malla-hero-bar">
              <div style={{ width: `${pct}%`, background: 'var(--accent)' }} />
              <div style={{ width: `${pctCursando}%`, background: 'var(--accent-hover)' }} />
            </div>
            <div className="malla-hero-legend">
              {(['aprobada', 'cursando', 'pendiente', 'bloqueada', 'reprobada'] as const).map(estado => (
                <div key={estado} className="malla-hero-legend-item">
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: bordeEstado[estado], flexShrink: 0 }} />
                  {estadoBadge[estado].label} <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 700 }}>{String(conteoPorEstado[estado] ?? 0).padStart(2, '0')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Skeleton name="malla-alumno" loading={loading}>
      {avance.length === 0 ? (
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
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 800 }}>Semestre {sem}</h2>
                  <span className="mono-label">
                    {totalCreditos} créditos · {materias.length} materia{materias.length === 1 ? '' : 's'}
                    {materias.some(m => m.estado === 'cursando') ? ' · en curso' : todasBloqueadas ? ' · bloqueado' : materias.every(m => m.estado === 'aprobada') ? ' · completado' : ''}
                  </span>
                </div>
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
      </Skeleton>
    </>
  )
}
