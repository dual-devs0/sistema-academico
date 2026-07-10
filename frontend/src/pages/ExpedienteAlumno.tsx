import { useState, useEffect, useMemo } from 'react'
import { getUserId } from '../hooks/useRole'
import {
  obtenerPPA, obtenerExpediente, obtenerRegularidad,
  type PPAOut, type ExpedienteAlumnoOut, type RegularidadOut,
} from '../services/expedienteService'

const condicionBadge: Record<string, { bg: string; color: string; label: string }> = {
  aprobada: { bg: 'var(--success-subtle)', color: 'var(--success)', label: 'Aprobada' },
  reprobada: { bg: 'var(--danger-subtle)', color: 'var(--danger)', label: 'Reprobada' },
}

const regularidadBadge: Record<string, { bg: string; color: string; label: string }> = {
  activo: { bg: 'var(--success-subtle)', color: 'var(--success)', label: 'Activo' },
  en_riesgo: { bg: 'var(--warning-subtle)', color: 'var(--warning)', label: 'En riesgo' },
  irregular: { bg: 'var(--danger-subtle)', color: 'var(--danger)', label: 'Irregular' },
  de_baja: { bg: 'rgba(148,163,184,0.12)', color: 'var(--text-secondary)', label: 'De baja' },
}

const css = `
  .exp-semestre { margin-bottom: 20px; }
  .exp-materia-row { display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border-bottom:1px solid var(--border-subtle); }
  .exp-materia-row:last-child { border-bottom:none; }
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
    if (!expediente) return new Map()
    const map = new Map<string, typeof expediente.materias>()
    expediente.materias.forEach(m => {
      if (!map.has(m.periodo)) map.set(m.periodo, [])
      map.get(m.periodo)!.push(m)
    })
    return map
  }, [expediente])

  const rBadge = regularidad ? (regularidadBadge[regularidad.estado] ?? regularidadBadge.activo) : null

  return (
    <>
      <style>{css}</style>

      <h1 className="page-title">Expediente Académico</h1>
      <p className="page-subtitle" style={{ marginBottom: 18 }}>Historial oficial de materias cerradas, PPA y estado de regularidad.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="mono-label">PPA Acumulado</span>
          </div>
          <span className="kpi-value">{ppa?.ppa ?? '—'}</span>
          {ppa && <span className="kpi-unit" style={{ marginLeft: 8 }}>{ppa.creditos_computados} créd. computados</span>}
        </div>
        {rBadge && (
          <div className="kpi-card">
            <div className="kpi-top">
              <span className="mono-label">Regularidad</span>
            </div>
            <span className="badge" style={{ background: rBadge.bg, color: rBadge.color, fontSize: 13 }}>{rBadge.label}</span>
            {regularidad?.motivo && (
              <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 8 }}>{regularidad.motivo}</div>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>Cargando…</div>
      ) : !expediente || expediente.materias.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>
          Todavía no tenés materias cerradas en tu expediente.
        </div>
      ) : (
        [...materiasPorPeriodo.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([periodo, materias]) => {
          const sem = expediente.semestres.find(s => s.periodo === periodo)
          return (
            <div key={periodo} className="exp-semestre card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: 13 }}>Período {periodo}</span>
                {sem && (
                  <span className="mono-label" style={{ fontSize: 9.5 }}>
                    PPA {sem.ppa_periodo ?? '—'} · {sem.creditos_periodo} créd. · {sem.materias_aprobadas} aprob. / {sem.materias_reprobadas} reprob.
                  </span>
                )}
              </div>
              {materias.map(m => {
                const b = condicionBadge[m.condicion]
                return (
                  <div key={m.id} className="exp-materia-row">
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{m.materia_nombre}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className="mono-label" style={{ fontSize: 9.5 }}>{m.creditos} créd.</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 14 }}>{m.nota_final}</span>
                      <span className="badge" style={{ background: b.bg, color: b.color }}>{b.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })
      )}
    </>
  )
}
