import { useState, useEffect, useMemo } from 'react'
import { getUserId } from '../hooks/useRole'
import { obtenerAvanceAlumno, obtenerCreditosAlumno, type AvanceMateriaOut, type CreditosAlumnoOut } from '../services/pensumService'

const estadoBadge: Record<string, { bg: string; color: string; label: string }> = {
  aprobada:  { bg: 'var(--success-subtle)', color: 'var(--success)', label: 'Aprobada' },
  cursando:  { bg: 'var(--warning-subtle)', color: 'var(--warning)', label: 'Cursando' },
  pendiente: { bg: 'var(--accent-subtle)', color: 'var(--accent-bright)', label: 'Disponible' },
  bloqueada: { bg: 'rgba(148,163,184,0.12)', color: 'var(--text-secondary)', label: 'Bloqueada' },
}

const css = `
  .malla-alumno-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:16px; }
  .malla-card { position:relative; padding:14px 16px; border-radius:var(--radius-md); border:1px solid var(--border-subtle); background:var(--bg-surface); }
  .malla-card-tooltip {
    position:absolute; top:calc(100% + 6px); left:0; right:0; z-index:20;
    background:var(--bg-elevated); border:1px solid var(--border-subtle); border-radius:10px;
    padding:10px 12px; font-size:11.5px; color:var(--text-secondary); box-shadow:0 8px 24px rgba(0,0,0,.35);
  }
`

export default function MallaAlumno() {
  const alumnoId = getUserId()
  const [avance, setAvance] = useState<AvanceMateriaOut[]>([])
  const [creditos, setCreditos] = useState<CreditosAlumnoOut | null>(null)
  const [loading, setLoading] = useState(true)
  const [tooltipAbierto, setTooltipAbierto] = useState<number | null>(null)

  useEffect(() => {
    if (alumnoId === null) return
    setLoading(true)
    Promise.all([obtenerAvanceAlumno(alumnoId), obtenerCreditosAlumno(alumnoId)])
      .then(([a, c]) => { setAvance(a); setCreditos(c) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [alumnoId])

  const semestres = useMemo(() => {
    const grupos = new Map<number, AvanceMateriaOut[]>()
    avance.forEach(a => {
      if (!grupos.has(a.semestre)) grupos.set(a.semestre, [])
      grupos.get(a.semestre)!.push(a)
    })
    return [...grupos.entries()].sort((x, y) => x[0] - y[0])
  }, [avance])

  const pct = creditos?.creditos_totales ? Math.round((creditos.creditos_acumulados / creditos.creditos_totales) * 100) : 0

  return (
    <>
      <style>{css}</style>

      <h1 className="page-title">Mi Progreso Académico</h1>
      <p className="page-subtitle" style={{ marginBottom: 18 }}>Estado de tu malla curricular y créditos acumulados.</p>

      {creditos && (
        <div className="card" style={{ marginBottom: 24, padding: '18px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <span className="mono-label">Créditos acumulados</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 800 }}>
              {creditos.creditos_acumulados} / {creditos.creditos_totales ?? '—'}
            </span>
          </div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>Cargando…</div>
      ) : avance.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>
          Todavía no hay malla curricular cargada para tu carrera.
        </div>
      ) : (
        semestres.map(([sem, materias]) => (
          <div key={sem} style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>Semestre {sem}</h2>
            <div className="malla-alumno-grid">
              {materias.map(m => {
                const b = estadoBadge[m.estado] ?? estadoBadge.pendiente
                const bloqueada = m.estado === 'bloqueada'
                return (
                  <div
                    key={m.pensum_materia_id}
                    className="malla-card"
                    style={{ cursor: bloqueada ? 'pointer' : 'default', borderColor: bloqueada ? undefined : b.color }}
                    onMouseEnter={() => bloqueada && setTooltipAbierto(m.pensum_materia_id)}
                    onMouseLeave={() => setTooltipAbierto(null)}
                    onClick={() => bloqueada && setTooltipAbierto(prev => prev === m.pensum_materia_id ? null : m.pensum_materia_id)}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 6 }}>{m.materia_nombre}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="badge" style={{ background: b.bg, color: b.color }}>{b.label}</span>
                      <span className="mono-label" style={{ fontSize: 9.5 }}>{m.creditos} créd.</span>
                    </div>
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
          </div>
        ))
      )}
    </>
  )
}
