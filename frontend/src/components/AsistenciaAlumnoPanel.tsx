// Panel de asistencia del alumno (tarjetas circulares + detalle por materia con calificaciones y bitácora + selector de período).
// Compartido entre pages/Asistencia.tsx (ruta /asistencia) y la pestaña Asistencia de pages/Programa.tsx.
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, getCurrentUser } from '../lib/api'

type MateriaAsistRow = { materia_id: number; materia_nombre: string; total_clases: number; presentes: number; porcentaje: number }
type PeriodoRow = { anio: number; semestre: number }
type MateriaConProfesor = { id: number; nombre: string; profesor: string | null }
type NotaMateria = {
  materia_id: number; materia_nombre: string
  parcial1: number | null; parcial2: number | null; practico: number | null
  final1: number | null; final2: number | null; final3: number | null
  directa?: number | null; felicitado?: boolean
  promedio: number | null
  pesos: { parcial1: number; parcial2: number; practico: number; final: number }
}
type SesionRow = { materia_id: number; materia_nombre: string; fecha: string; presente: boolean }

const PESOS_DEFAULT = { parcial1: 20, parcial2: 20, practico: 10, final: 50 }

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
  .aa-chip-alerta {
    position:absolute; top:7px; right:7px; width:19px; height:19px; border-radius:50%;
    background:rgba(239,68,68,.16); color:#ef4444; display:flex; align-items:center; justify-content:center;
  }
  .aa-chip-nombre { font-size:12px; font-weight:700; line-height:1.3; min-height:32px; display:flex; align-items:center; }
  .aa-chip-clases { font-size:10px; color:var(--text-muted); font-family:var(--font-mono); }

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

  /* ── Detalle de materia (swap de vista) ── */
  .aa-back-btn {
    display:inline-flex; align-items:center; gap:6px; margin-bottom:16px;
    padding:7px 14px; border-radius:8px; font-size:12px; font-weight:600;
    background:var(--bg-surface); border:1px solid var(--border-subtle); cursor:pointer;
    color:var(--text-secondary); font-family:inherit; transition:all .15s;
  }
  .aa-back-btn:hover { color:var(--text-primary); border-color:var(--accent-hover); }
  .aa-det-head {
    display:flex; justify-content:space-between; flex-wrap:wrap; gap:16px; align-items:center;
    padding:20px; border-radius:14px; margin-bottom:20px;
  }
  .aa-det-stat {
    background:transparent; border:1px solid var(--border-subtle); border-radius:10px;
    padding:8px 16px; text-align:center;
  }
  .aa-det-stat-val { font-family:var(--font-mono); font-size:22px; font-weight:800; }
  .aa-det-stat-lbl { font-size:10px; color:var(--text-muted); font-weight:600; text-transform:uppercase; letter-spacing:.05em; margin-top:2px; }
  .aa-det-grid { display:grid; gap:16px; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); }
  .aa-det-card-title { font-size:13px; font-weight:800; margin-bottom:10px; display:flex; align-items:center; gap:6px; }
  .aa-det-row {
    display:flex; justify-content:space-between; align-items:center;
    padding:9px 0; border-bottom:1px solid rgba(42,48,64,.15); font-size:13px;
  }
  .aa-det-row:last-child { border-bottom:none; }
  .aa-det-row b { font-family:var(--font-mono); }
  .aa-det-stats-row { display:flex; gap:16px; flex-wrap:wrap; margin-bottom:14px; }
  .aa-det-mini { background:var(--bg-elevated); border-radius:10px; padding:12px 16px; flex:1; min-width:100px; text-align:center; }
  .aa-det-mini-val { font-family:var(--font-mono); font-size:22px; font-weight:800; }
  .aa-det-mini-lbl { font-size:10px; color:var(--text-muted); font-weight:600; text-transform:uppercase; letter-spacing:.05em; margin-top:2px; }
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
  const uid = Number(getCurrentUser()?.user_id || 0)
  const [porMateria, setPorMateria] = useState<MateriaAsistRow[]>([])
  const [materias, setMaterias] = useState<MateriaConProfesor[]>([])
  const [notas, setNotas] = useState<Record<number, NotaMateria>>({})
  const [sesiones, setSesiones] = useState<SesionRow[]>([])
  const [periodos, setPeriodos] = useState<PeriodoRow[]>([])
  const [periodoSel, setPeriodoSel] = useState('actual')
  const [periodoOpen, setPeriodoOpen] = useState(false)
  const periodoRef = useRef<HTMLDivElement>(null)
  const [carreraNombre, setCarreraNombre] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [detalle, setDetalle] = useState<number | null>(null)
  const firstLoad = useRef(true)
  const LIMITE = 80

  const cargar = useCallback((manual = false) => {
    if (manual) setRefreshing(true)
    Promise.allSettled([
      api.get<MateriaAsistRow[]>('/alumno/mi-asistencia'),
      api.get<{ carrera_id: number | null }>('/users/me'),
      api.get<{ id: number; nombre: string }[]>('/carreras/'),
      api.get<PeriodoRow[]>('/alumno/mis-periodos'),
      api.get<MateriaConProfesor[]>('/alumno/mis-materias'),
      api.get<NotaMateria[]>('/alumno/mis-notas'),
      api.get<SesionRow[]>(`/asistencias/?user_id=${uid}`),
    ]).then(([porMat, me, carreras, per, mats, notasData, sesData]) => {
      const fails: string[] = []
      if (porMat.status === 'fulfilled') setPorMateria(porMat.value)
      else fails.push('resumen por materia')
      if (me.status === 'fulfilled' && me.value?.carrera_id && carreras.status === 'fulfilled') {
        const c = carreras.value.find(c => c.id === me.value!.carrera_id)
        if (c) setCarreraNombre(c.nombre)
      }
      if (per.status === 'fulfilled') setPeriodos(per.value)
      if (mats.status === 'fulfilled') setMaterias(mats.value)
      if (notasData.status === 'fulfilled') setNotas(Object.fromEntries(notasData.value.map(n => [n.materia_id, n])))
      if (sesData.status === 'fulfilled') setSesiones(sesData.value)
      setError(fails.length ? `No se pudo cargar: ${fails.join(', ')}. Mostrando último dato disponible.` : '')
      setLastUpdate(new Date())
    }).finally(() => { setLoading(false); setRefreshing(false); firstLoad.current = false })
  }, [uid])

  useEffect(() => {
    const load = () => cargar()
    load()
    const id = setInterval(() => { if (periodoSel === 'actual') cargar() }, AA_POLL_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargar])

  const cargarPeriodo = useCallback((sel: string) => {
    setPeriodoSel(sel)
    setDetalle(null)
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

  const totalClases = porMateria.reduce((s, m) => s + m.total_clases, 0)
  const totalPresentes = porMateria.reduce((s, m) => s + m.presentes, 0)
  const promedioTotal = totalClases > 0 ? Math.round((totalPresentes / totalClases) * 100) : 0
  const inasistencias = totalClases - totalPresentes
  const alertasCount = porMateria.filter(m => m.porcentaje < LIMITE).length

  /* ── Vista de detalle por materia (Calificaciones + Asistencia detallada) ── */
  if (detalle !== null) {
    const asis = porMateria.find(x => x.materia_id === detalle)
    const mat = materias.find(x => x.id === detalle)
    const notaM = notas[detalle]
    const pesos = notaM?.pesos || PESOS_DEFAULT
    const sesM = sesiones.filter(s => s.materia_id === detalle)
    const pct = asis?.porcentaje ?? 0
    const color = donutColor(pct)
    const c = 2 * Math.PI * 34

    return (
      <>
        <style>{cssAlumno}</style>
        <button className="aa-back-btn" onClick={() => setDetalle(null)}>
          <i className="ti ti-arrow-left" /> Volver a Asistencia
        </button>

        <div className="aa-det-head" style={{ background: `linear-gradient(135deg,${color}08,transparent 70%)`, border: `1px solid ${color}25` }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17 }}>{mat?.nombre ?? asis?.materia_nombre ?? '—'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Prof. {mat?.profesor || '—'}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div className="aa-det-stat">
              <div className="aa-det-stat-val" style={{ color }}>{asis ? `${pct}%` : '—'}</div>
              <div className="aa-det-stat-lbl">Asistencia</div>
            </div>
            <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
              <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="40" cy="40" r="34" stroke="var(--bg-elevated)" strokeWidth="7" fill="none" />
                <circle cx="40" cy="40" r="34" stroke={color} strokeWidth="7" fill="none"
                  strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} strokeLinecap="round" />
              </svg>
              <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 800, color }}>{asis ? `${pct}%` : '—'}</span>
            </div>
          </div>
        </div>

        <div className="aa-det-grid">
          <div className="card" style={{ padding: 20 }}>
            <div className="aa-det-card-title"><i className="ti ti-certificate" style={{ color: 'var(--accent-bright)' }} /> Calificaciones</div>
            {notaM?.directa != null ? (
              <div className="aa-det-row"><span>Nota final (carga directa)</span><b>{notaM.felicitado ? `${notaM.directa}F` : notaM.directa} / 5</b></div>
            ) : (
              <>
                <div className="aa-det-row"><span>Parcial 1</span><b>{notaM?.parcial1 ?? '—'} / {pesos.parcial1}</b></div>
                <div className="aa-det-row"><span>Parcial 2</span><b>{notaM?.parcial2 ?? '—'} / {pesos.parcial2}</b></div>
                <div className="aa-det-row"><span>Trabajo Práctico</span><b>{notaM?.practico ?? '—'} / {pesos.practico}</b></div>
                <div className="aa-det-row"><span>Final (1ª oport.)</span><b>{notaM?.final1 ?? '—'} / {pesos.final}</b></div>
                <div className="aa-det-row"><span>Final (2ª oport.)</span><b>{notaM?.final2 ?? '—'} / {pesos.final}</b></div>
                <div className="aa-det-row"><span>Final (3ª oport.)</span><b>{notaM?.final3 ?? '—'} / {pesos.final}</b></div>
              </>
            )}
            <div className="aa-det-row" style={{ marginTop: 6, borderTop: '2px solid var(--border-subtle)', paddingTop: 12 }}>
              <span style={{ fontWeight: 700 }}>Promedio</span>
              <b style={{ fontSize: 18, color: notaM?.felicitado ? '#fbbf24' : 'var(--accent-bright)' }}>{notaM?.promedio == null ? '—' : notaM.felicitado ? `${notaM.promedio}F` : notaM.promedio} / 5</b>
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div className="aa-det-card-title"><i className="ti ti-clipboard-check" style={{ color: 'var(--accent-bright)' }} /> Asistencia detallada</div>
            {asis ? (
              <>
                <div className="aa-det-stats-row">
                  <div className="aa-det-mini"><div className="aa-det-mini-val" style={{ color: '#22c55e' }}>{asis.presentes}</div><div className="aa-det-mini-lbl">Presentes</div></div>
                  <div className="aa-det-mini"><div className="aa-det-mini-val" style={{ color: '#ef4444' }}>{asis.total_clases - asis.presentes}</div><div className="aa-det-mini-lbl">Ausentes</div></div>
                  <div className="aa-det-mini"><div className="aa-det-mini-val">{asis.total_clases}</div><div className="aa-det-mini-lbl">Total</div></div>
                </div>
                <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                  {sesM.length === 0 ? (
                    <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', textAlign: 'center', padding: 20 }}>Sin sesiones registradas.</p>
                  ) : sesM.map((s, i) => (
                    <div key={i} className="aa-det-row">
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className="ti ti-calendar-event" style={{ fontSize: 14, color: 'var(--text-muted)' }} />
                        {s.fecha}
                      </span>
                      <span className="badge" style={{
                        background: s.presente ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                        color: s.presente ? '#22c55e' : '#ef4444',
                        border: `1px solid ${s.presente ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        padding: '4px 12px',
                      }}>
                        {s.presente ? '✓ Presente' : '✗ Ausente'}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', textAlign: 'center', padding: 20 }}>Sin datos de asistencia.</p>
            )}
          </div>
        </div>
      </>
    )
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
                return (
                  <div key={m.materia_id}
                    className={`aa-chip-card${riesgo ? ' riesgo' : ''}`}
                    onClick={() => setDetalle(m.materia_id)}>
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
        </>
      )}
    </>
  )
}
