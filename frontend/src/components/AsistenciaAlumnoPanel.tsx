// Panel de asistencia del alumno (tarjetas circulares + panel acordeón fijo a semestres anteriores + selector de período).
// Compartido entre pages/Asistencia.tsx (ruta /asistencia) y la pestaña Asistencia de pages/Programa.tsx.
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

type MateriaAsistRow = { materia_id: number; materia_nombre: string; total_clases: number; presentes: number; porcentaje: number }
type PeriodoRow = { anio: number; semestre: number }

const cssAlumno = `
  .aa-err-banner {
    display:flex; align-items:center; gap:8px; background:rgba(239,68,68,0.10);
    border:1px solid rgba(239,68,68,0.35); border-radius:var(--radius);
    padding:10px 14px; font-size:12.5px; color:var(--danger); margin-bottom:16px;
  }
  .aa-refresh-btn { display:flex; align-items:center; gap:6px; }
  .aa-refresh-btn svg.spin { animation:aa-spin 1s linear infinite; }
  @keyframes aa-spin { to { transform:rotate(360deg); } }

  /* Chip período junto al título — clickeable, abre selector */
  .aa-chip-periodo-wrap { position:relative; }
  .aa-chip-periodo {
    display:inline-flex; align-items:center; gap:7px; padding:6px 12px;
    border:1px solid var(--border-subtle); border-radius:999px; background:var(--bg-input);
    font-size:11.5px; font-weight:700; color:var(--text-secondary); white-space:nowrap;
    cursor:pointer; font-family:inherit; transition:border-color .15s;
  }
  .aa-chip-periodo:hover { border-color:var(--accent-hover); }
  .aa-chip-periodo.open { border-color:var(--accent); color:var(--text-primary); }
  .aa-chip-periodo svg { width:11px; height:11px; color:var(--text-muted); transition:transform .15s; }
  .aa-chip-periodo.open svg { transform:rotate(180deg); }
  .aa-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }

  .aa-periodo-menu {
    position:absolute; top:calc(100% + 6px); left:0; min-width:190px;
    background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:12px;
    overflow:hidden; box-shadow:0 12px 32px rgba(0,0,0,.45); z-index:30;
  }
  .aa-periodo-opt {
    display:flex; align-items:center; justify-content:space-between; width:100%;
    padding:9px 13px; font-size:12px; font-weight:600; color:var(--text-secondary);
    background:none; border:none; cursor:pointer; font-family:inherit; transition:background .12s;
  }
  .aa-periodo-opt:hover { background:var(--bg-hover); color:var(--text-primary); }
  .aa-periodo-opt.sel { color:var(--accent); background:var(--accent-muted); }

  /* Grid de tarjetas circulares por materia (escala solo si hay más) */
  .aa-chips-grid {
    display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px;
  }
  .aa-chip-card {
    position:relative; background:var(--bg-surface); border:1px solid var(--border-subtle);
    border-radius:14px; padding:16px 12px 13px; text-align:center; cursor:pointer;
    display:flex; flex-direction:column; align-items:center; gap:7px;
    transition:border-color .15s,transform .12s,box-shadow .15s;
  }
  .aa-chip-card:hover { border-color:var(--accent-hover); transform:translateY(-2px); box-shadow:0 6px 18px rgba(0,0,0,.18); }
  .aa-chip-card.riesgo { border-color:rgba(239,68,68,.55); }
  .aa-chip-card.riesgo:hover { border-color:#ef4444; }
  .aa-chip-card.open { border-color:var(--accent); }
  .aa-chip-alerta {
    position:absolute; top:7px; right:7px; width:19px; height:19px; border-radius:50%;
    background:rgba(239,68,68,.16); color:#ef4444; display:flex; align-items:center; justify-content:center;
  }
  .aa-chip-nombre { font-size:12px; font-weight:700; line-height:1.3; min-height:32px; display:flex; align-items:center; }
  .aa-chip-clases { font-size:10px; color:var(--text-muted); font-family:var(--font-mono); }

  /* Panel detalle acordeón — fijo, solo semestres anteriores */
  .aa-panel {
    margin-top:14px; border:1px solid var(--border-subtle); border-radius:14px;
    background:var(--bg-surface); padding:16px; animation:aa-panel-in .16s ease-out;
  }
  @keyframes aa-panel-in { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:none; } }
  .aa-panel-title {
    font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.07em;
    font-weight:700; margin-bottom:10px;
  }

  .aa-hist-anio { font-size:12px; font-weight:800; color:var(--accent-bright); margin:10px 0 2px; }
  .aa-hist-anio:first-child { margin-top:0; }
  .aa-hist-row {
    display:flex; justify-content:space-between; align-items:center;
    padding:7px 0; font-size:12.5px; color:var(--text-secondary);
    border-bottom:1px solid rgba(42,48,64,.15);
  }
  .aa-hist-row:last-child { border-bottom:none; }

  /* Stat cards chicas — resumen superior */
  .aa-stat-row { display:flex; gap:10px; margin-bottom:18px; }
  .aa-stat {
    flex:1; background:var(--bg-surface); border:1px solid var(--border-subtle);
    border-radius:12px; padding:10px 12px; text-align:center; min-width:0;
  }
  .aa-stat-label {
    font-size:11px; color:var(--text-muted); font-weight:600;
    text-transform:uppercase; letter-spacing:.04em; white-space:nowrap;
  }
  .aa-stat-value { font-size:17px; font-weight:800; margin-top:3px; font-family:var(--font-mono); }
`

function donutColor(pct: number): string {
  if (pct >= 90) return '#22c55e'
  if (pct >= 75) return 'var(--accent)'
  if (pct >= 60) return '#f59e0b'
  return '#ef4444'
}

function periodoLabel(sel: string): string {
  if (sel === 'actual') return `${new Date().getMonth() < 6 ? 'Primer' : 'Segundo'} semestre ${new Date().getFullYear()}`
  const [anio, semestre] = sel.split('-')
  return `${semestre === '1' ? 'Primer' : 'Segundo'} semestre ${anio}`
}

const AA_POLL_MS = 30000

export default function AsistenciaAlumnoPanel() {
  const navigate = useNavigate()
  const [porMateria, setPorMateria] = useState<MateriaAsistRow[]>([])
  const [periodos, setPeriodos] = useState<PeriodoRow[]>([])
  const [periodoSel, setPeriodoSel] = useState('actual')
  const [periodoOpen, setPeriodoOpen] = useState(false)
  const periodoRef = useRef<HTMLDivElement>(null)
  const [historial, setHistorial] = useState<Record<number, { anio: number; semestre: number; porcentaje: number }[]>>({})
  const [historialLoading, setHistorialLoading] = useState(false)
  const [carreraNombre, setCarreraNombre] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)
  const firstLoad = useRef(true)
  const LIMITE = 80

  const cargar = useCallback((manual = false) => {
    if (manual) setRefreshing(true)
    Promise.allSettled([
      api.get<MateriaAsistRow[]>('/alumno/mi-asistencia'),
      api.get<{ carrera_id: number | null }>('/users/me'),
      api.get<{ id: number; nombre: string }[]>('/carreras/'),
      api.get<PeriodoRow[]>('/alumno/mis-periodos'),
    ]).then(([porMat, me, carreras, per]) => {
      const fails: string[] = []
      if (porMat.status === 'fulfilled') setPorMateria(porMat.value)
      else fails.push('resumen por materia')
      if (me.status === 'fulfilled' && me.value?.carrera_id && carreras.status === 'fulfilled') {
        const c = carreras.value.find(c => c.id === me.value!.carrera_id)
        if (c) setCarreraNombre(c.nombre)
      }
      if (per.status === 'fulfilled') setPeriodos(per.value)
      setError(fails.length ? `No se pudo cargar: ${fails.join(', ')}. Mostrando último dato disponible.` : '')
      setLastUpdate(new Date())
    }).finally(() => { setLoading(false); setRefreshing(false); firstLoad.current = false })
  }, [])

  useEffect(() => {
    const load = () => cargar()
    load()
    const id = setInterval(() => { if (periodoSel === 'actual') cargar() }, AA_POLL_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargar])

  const cargarPeriodo = useCallback((sel: string) => {
    setPeriodoSel(sel)
    setOpenId(null)
    if (sel === 'actual') { cargar(); return }
    const [anio, semestre] = sel.split('-')
    setLoading(true)
    api.get<MateriaAsistRow[]>(`/alumno/mi-asistencia?anio=${anio}&semestre=${semestre}`)
      .then(d => { setPorMateria(d); setError('') })
      .catch(() => setError('No se pudo cargar el período seleccionado.'))
      .finally(() => setLoading(false))
  }, [cargar])

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (periodoRef.current && !periodoRef.current.contains(e.target as Node)) setPeriodoOpen(false)
    }
    document.addEventListener('mousedown', onClickAway)
    return () => document.removeEventListener('mousedown', onClickAway)
  }, [])

  const cargarHistorial = useCallback(async (matId: number) => {
    if (!periodos.length) return
    setHistorialLoading(true)
    try {
      const results = await Promise.allSettled(
        periodos.map(p => api.get<MateriaAsistRow[]>(`/alumno/mi-asistencia?anio=${p.anio}&semestre=${p.semestre}`))
      )
      const filas: { anio: number; semestre: number; porcentaje: number }[] = []
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          const m = r.value.find(x => x.materia_id === matId)
          if (m) filas.push({ anio: periodos[i].anio, semestre: periodos[i].semestre, porcentaje: m.porcentaje })
        }
      })
      filas.sort((a, b) => b.anio - a.anio || b.semestre - a.semestre)
      setHistorial(h => ({ ...h, [matId]: filas }))
    } finally {
      setHistorialLoading(false)
    }
  }, [periodos])

  const totalClases = porMateria.reduce((s, m) => s + m.total_clases, 0)
  const totalPresentes = porMateria.reduce((s, m) => s + m.presentes, 0)
  const promedioTotal = totalClases > 0 ? Math.round((totalPresentes / totalClases) * 100) : 0
  const inasistencias = totalClases - totalPresentes
  const alertasCount = porMateria.filter(m => m.porcentaje < LIMITE).length

  const materiaAbierta = openId !== null ? porMateria.find(m => m.materia_id === openId) : null

  function toggleMateria(matId: number) {
    const abierta = openId === matId
    const next = abierta ? null : matId
    setOpenId(next)
    if (next !== null && !historial[next]) cargarHistorial(next)
  }

  return (
    <>
      <style>{cssAlumno}</style>

      {/* 1) Header: título + chip período (clickeable) | Escanear QR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h1 className="page-title" style={{ margin: 0 }}>Asistencia</h1>
          <div className="aa-chip-periodo-wrap" ref={periodoRef}>
            <button type="button" className={`aa-chip-periodo${periodoOpen ? ' open' : ''}`} onClick={() => setPeriodoOpen(v => !v)}>
              <span className="aa-dot" style={{ background: '#22c55e' }} />
              {periodoLabel(periodoSel)}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
            </button>
            {periodoOpen && (
              <div className="aa-periodo-menu">
                <button className={`aa-periodo-opt${periodoSel === 'actual' ? ' sel' : ''}`}
                  onClick={() => { cargarPeriodo('actual'); setPeriodoOpen(false) }}>
                  Período actual
                </button>
                {periodos.map(p => {
                  const val = `${p.anio}-${p.semestre}`
                  return (
                    <button key={val} className={`aa-periodo-opt${periodoSel === val ? ' sel' : ''}`}
                      onClick={() => { cargarPeriodo(val); setPeriodoOpen(false) }}>
                      {p.semestre}° Semestre {p.anio}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {lastUpdate && (
            <span className="mono-label" style={{ fontSize: 10 }}>Actualizado {lastUpdate.toLocaleTimeString('es-PY')}</span>
          )}
          <button type="button" className="btn-ghost aa-refresh-btn" disabled={refreshing} onClick={() => cargarPeriodo(periodoSel)}>
            <svg className={refreshing ? 'spin' : ''} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
          </button>
          <button type="button" onClick={() => navigate('/asistencia/scan')}
            style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
            <i className="ti ti-qrcode" style={{ fontSize: 15 }} /> Escanear QR
          </button>
        </div>
      </div>

      {carreraNombre && <p className="page-subtitle" style={{ marginTop: -10, marginBottom: 16 }}>{carreraNombre}</p>}

      {error && (
        <div className="aa-err-banner">
          <i className="ti ti-alert-triangle" /> {error}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Cargando asistencia…</div>
      ) : (
        <>
          {/* 2) Stat cards chicas (resumen) */}
          <div className="aa-stat-row">
            <div className="aa-stat">
              <div className="aa-stat-label">Promedio total</div>
              <div className="aa-stat-value" style={{ color: totalClases === 0 ? 'var(--text-muted)' : promedioTotal >= LIMITE ? '#22c55e' : '#ef4444' }}>{totalClases === 0 ? '—' : `${promedioTotal}%`}</div>
            </div>
            <div className="aa-stat">
              <div className="aa-stat-label">Inasistencias</div>
              <div className="aa-stat-value" style={{ color: inasistencias > 3 ? '#ef4444' : '#f59e0b' }}>{inasistencias}</div>
            </div>
            <div className="aa-stat">
              <div className="aa-stat-label">Alertas</div>
              <div className="aa-stat-value" style={{ color: alertasCount > 0 ? '#ef4444' : '#22c55e' }}>{alertasCount}</div>
            </div>
          </div>

          {/* 3) Grid de tarjetas circulares por materia */}
          {porMateria.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: 28 }}>Sin registros de asistencia aún.</div>
          ) : (
            <div className="aa-chips-grid">
              {porMateria.map(m => {
                const pct = m.porcentaje
                const riesgo = pct < LIMITE
                const color = donutColor(pct)
                const c = 2 * Math.PI * 30
                const abierta = openId === m.materia_id
                return (
                  <div key={m.materia_id}
                    className={`aa-chip-card${riesgo ? ' riesgo' : ''}${abierta ? ' open' : ''}`}
                    onClick={() => toggleMateria(m.materia_id)}>
                    {riesgo && (
                      <span className="aa-chip-alerta" title="Materia en riesgo"><i className="ti ti-alert-triangle" style={{ fontSize: 11 }} /></span>
                    )}
                    <div style={{ position: 'relative', width: 72, height: 72 }}>
                      <svg width="72" height="72" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="36" cy="36" r="30" stroke="var(--bg-elevated)" strokeWidth="6" fill="none" />
                        <circle cx="36" cy="36" r="30" stroke={color} strokeWidth="6" fill="none"
                          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} strokeLinecap="round" />
                      </svg>
                      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 15, color }}>{pct}%</span>
                    </div>
                    <div className="aa-chip-nombre">{m.materia_nombre}</div>
                    <div className="aa-chip-clases">{m.presentes}/{m.total_clases} clases</div>
                  </div>
                )
              })}
            </div>
          )}

          {/* 4) Panel de detalle (acordeón) — fijo, solo semestres anteriores */}
          {materiaAbierta && (
            <div className="aa-panel">
              <div className="aa-panel-title">Semestres anteriores — {materiaAbierta.materia_nombre}</div>
              {historialLoading ? (
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center', padding: 14 }}>Cargando historial…</p>
              ) : (historial[materiaAbierta.materia_id] || []).length === 0 ? (
                <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', textAlign: 'center', padding: 14 }}>Sin datos de semestres anteriores.</p>
              ) : (
                (() => {
                  const hist = historial[materiaAbierta.materia_id] || []
                  const porAnio: Record<number, { semestre: number; porcentaje: number }[]> = {}
                  hist.forEach(h => {
                    if (!porAnio[h.anio]) porAnio[h.anio] = []
                    porAnio[h.anio].push({ semestre: h.semestre, porcentaje: h.porcentaje })
                  })
                  return Object.keys(porAnio).map(Number).sort((a, b) => b - a).map(anio => (
                    <div key={anio}>
                      <div className="aa-hist-anio">Año {anio}</div>
                      {porAnio[anio].sort((a, b) => b.semestre - a.semestre).map(p => (
                        <div key={p.semestre} className="aa-hist-row">
                          <span>{p.semestre === 1 ? 'Primer' : 'Segundo'} semestre</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: p.porcentaje >= LIMITE ? '#22c55e' : '#ef4444' }}>{p.porcentaje}%</span>
                        </div>
                      ))}
                    </div>
                  ))
                })()
              )}
            </div>
          )}
        </>
      )}
    </>
  )
}
