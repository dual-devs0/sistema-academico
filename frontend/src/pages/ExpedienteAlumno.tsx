import { useState, useEffect, useMemo } from 'react'
import { getUserId } from '../hooks/useRole'
import {
  obtenerPPA, obtenerExpediente, obtenerRegularidad,
  type PPAOut, type ExpedienteAlumnoOut, type RegularidadOut,
  type ExpedienteMateriaOut as ExpMateria,
} from '../services/expedienteService'

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
`

export default function ExpedienteAlumno() {
  const alumnoId = getUserId()
  const [ppa, setPpa] = useState<PPAOut | null>(null)
  const [expediente, setExpediente] = useState<ExpedienteAlumnoOut | null>(null)
  const [regularidad, setRegularidad] = useState<RegularidadOut | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (alumnoId === null) return
    Promise.all([obtenerPPA(alumnoId), obtenerExpediente(alumnoId), obtenerRegularidad(alumnoId)])
      .then(([p, e, r]) => { setPpa(p); setExpediente(e); setRegularidad(r) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [alumnoId])

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
        <header style={{ marginBottom: 24 }}>
          <h1 className="page-title" style={{ fontSize: 28 }}>Mi Expediente</h1>
          <p className="page-subtitle">Historial oficial de materias cerradas, PPA y estado de regularidad.</p>
        </header>

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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
              <div className="kpi-card">
                <div className="kpi-top"><span className="mono-label">PPA Acumulado</span></div>
                <span className="kpi-value">{ppa?.ppa?.toFixed(2) ?? '—'}</span>
                {ppa && <span className="kpi-unit">{ppa.creditos_computados} créd. computados</span>}
              </div>
              {rBadge && (
                <div className="kpi-card">
                  <div className="kpi-top"><span className="mono-label">Regularidad</span></div>
                  <span className="badge" style={{ background: rBadge.bg, color: rBadge.color, fontSize: 13, fontWeight: 700 }}>{rBadge.label}</span>
                  {regularidad?.motivo && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>{regularidad.motivo}</div>}
                </div>
              )}
              {stats && (
                <>
                  <div className="kpi-card">
                    <div className="kpi-top"><span className="mono-label">Materias cursadas</span></div>
                    <span className="kpi-value">{stats.total}</span>
                    <span className="kpi-unit">{stats.aprobadas} aprob. · {stats.reprobadas} reprob.</span>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-top"><span className="mono-label">Créditos acumulados</span></div>
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
