import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, getCurrentUser } from '../lib/api'
import { setDocTitle } from '../lib/docTitle'
import QRModal from '../components/QRModal'

type View = 'carreras' | 'materias' | 'alumnos'

interface Carrera { id: number; nombre: string }
interface Materia { id: number; nombre: string; codigo: string }
interface AlumnoAsist {
  id: number; nombre: string; documento: string
  asistencia_id: number | null; presente: boolean | null; es_becado: boolean
  motivo?: string | null
}

const css = `
  @keyframes pulse-dot { 0%,100% { opacity: 1 } 50% { opacity: 0.35 } }
  .as-btn {
    height: 34px; padding: 0 16px; border-radius: 8px; border: 1px solid var(--border-subtle);
    background: var(--bg-input); color: var(--text-primary); font-size: 12px; font-weight: 500;
    cursor: pointer; font-family: inherit; display: flex; align-items: center; gap: 6px;
    transition: all 0.15s;
  }
  .as-btn:hover { border-color: var(--accent); }
  .as-btn-primary { background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 600; }
  .as-btn-primary:hover { opacity: 0.88; }
  .as-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 600;
  }
  .as-badge-presente { background: #34d39915; color: #34d399; }
  .as-badge-ausente  { background: #2a3040; color: var(--text-muted); }
  .as-badge-becado   { background: #fbbf2415; color: #fbbf24; }
`

/* Diseño Web Adaptable — mobile-first, exclusivo del rol profesor (NO admin) */
const cssProfesorResponsive = `
  .ap-wrap { padding:16px 16px 60px; }
  @media(min-width:768px){ .ap-wrap { padding:22px 26px 60px; } }
  @media(min-width:1024px){ .ap-wrap { padding:28px 36px 60px; } }

  .ap-kpi-grid { display:grid; grid-template-columns:1fr; gap:12px; }
  @media(min-width:640px){ .ap-kpi-grid { grid-template-columns:repeat(3,1fr); } }

  .ap-rt-grid { display:grid; grid-template-columns:1fr; gap:16px; margin-bottom:18px; }
  @media(min-width:900px){ .ap-rt-grid { grid-template-columns:minmax(280px,1fr) 1.2fr; } }

  .ap-chip { display:flex; align-items:center; gap:8px; padding:8px 14px; border-radius:10px; border:1px solid var(--border-subtle); background:var(--bg-input); cursor:pointer; transition:all .15s; flex-shrink:0; }
  .ap-chip:hover { border-color:var(--accent); background:var(--accent-muted); }
  .ap-chip.active { border-color:var(--accent-bright); background:var(--accent-muted); }
  .ap-chip-strip { display:flex; gap:8px; flex-wrap:wrap; }
`

export default function Asistencia() {
  const user = getCurrentUser()
  const rol = user?.role || ''

  useEffect(() => {
    setDocTitle(rol, user?.username || '')
  }, [rol, user?.username])

  if (rol === 'alumno') return <AlumnoView />
  if (rol === 'profesor') return <ProfesorView />
  return <AdminView />
}

/* ─── ALUMNO: Control de Asistencia (rediseño) ─── */
type MateriaAsistRow = { materia_id: number; materia_nombre: string; total_clases: number; presentes: number; porcentaje: number }
type SesionRow = { materia_id: number; materia_nombre: string; fecha: string; presente: boolean }

/* Alumno: estilos mínimos que no están en design-tokens */
const cssAlumno = `
  .aa-alerta { background:rgba(239,68,68,0.10); border:1px solid rgba(239,68,68,0.35); border-radius:var(--radius); padding:14px 16px; }
  .aa-fab-qr {
    position:fixed; bottom:26px; right:26px; z-index:60;
    display:flex; align-items:center; gap:8px;
    background:var(--accent); color:#fff; border:none; border-radius:999px;
    padding:13px 22px; font-family:var(--font-sans); font-weight:700; font-size:13px;
    cursor:pointer; box-shadow:0 10px 30px var(--accent-hover); transition:transform .15s;
  }
  .aa-fab-qr:hover { transform:scale(1.05); }
  @media(max-width:768px){ .aa-fab-qr { bottom:80px; } }

  /* Diseño Web Adaptable — mobile-first (solo alumno) */
  .aa-kpi-grid { display:grid; grid-template-columns:1fr; gap:14px; margin-bottom:20px; }
  @media(min-width:640px){ .aa-kpi-grid { grid-template-columns:repeat(2,1fr); } }
  @media(min-width:1024px){ .aa-kpi-grid { grid-template-columns:repeat(4,1fr); } }

  .aa-main-grid { display:grid; grid-template-columns:1fr; gap:18px; align-items:start; }
  @media(min-width:1024px){ .aa-main-grid { grid-template-columns:1fr 300px; } }

  .aa-err-banner {
    display:flex; align-items:center; gap:8px; background:rgba(239,68,68,0.10);
    border:1px solid rgba(239,68,68,0.35); border-radius:var(--radius);
    padding:10px 14px; font-size:12.5px; color:var(--danger); margin-bottom:16px;
  }
  .aa-refresh-btn { display:flex; align-items:center; gap:6px; }
  .aa-refresh-btn svg.spin { animation:aa-spin 1s linear infinite; }
  @keyframes aa-spin { to { transform:rotate(360deg); } }
  .aa-mat-row { padding:12px 14px; border:1px solid var(--border-subtle); border-radius:10px; margin-bottom:0; transition:border-color .15s,transform .1s,box-shadow .15s; cursor:default; background:var(--bg-surface); }
  .aa-mat-row:hover { border-color:var(--accent-hover); transform:translateX(2px); box-shadow:0 4px 14px rgba(0,0,0,.15); }
`

interface AsistenciaApiRow {
  materia_id: number
  materia_nombre?: string
  fecha: string
  presente: boolean
}

const AA_POLL_MS = 30000

function AlumnoView() {
  const navigate = useNavigate()
  const uid = Number(getCurrentUser()?.user_id || 0)
  const [porMateria, setPorMateria] = useState<MateriaAsistRow[]>([])
  const [sesiones, setSesiones] = useState<SesionRow[]>([])
  const [carreraNombre, setCarreraNombre] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const firstLoad = useRef(true)
  const LIMITE = 80

  const cargar = useCallback((manual = false) => {
    if (manual) setRefreshing(true)
    Promise.allSettled([
      api.get<MateriaAsistRow[]>('/alumno/mi-asistencia'),
      api.get<AsistenciaApiRow[]>(`/asistencias/?user_id=${uid}`),
      api.get<{ carrera_id: number | null }>('/users/me'),
      api.get<{ id: number; nombre: string }[]>('/carreras/'),
    ]).then(([porMat, asis, me, carreras]) => {
      const fails: string[] = []
      if (porMat.status === 'fulfilled') setPorMateria(porMat.value)
      else fails.push('resumen por materia')
      if (asis.status === 'fulfilled') {
        setSesiones(
          asis.value.slice(-12).reverse().map((a: AsistenciaApiRow) => ({
            materia_id: a.materia_id, materia_nombre: a.materia_nombre || `Materia #${a.materia_id}`,
            fecha: a.fecha, presente: a.presente,
          }))
        )
      } else fails.push('bitácora de sesiones')
      if (me.status === 'fulfilled' && me.value?.carrera_id && carreras.status === 'fulfilled') {
        const c = carreras.value.find(c => c.id === me.value!.carrera_id)
        if (c) setCarreraNombre(c.nombre)
      }
      setError(fails.length ? `No se pudo cargar: ${fails.join(', ')}. Mostrando último dato disponible.` : '')
      setLastUpdate(new Date())
    }).finally(() => { setLoading(false); setRefreshing(false); firstLoad.current = false })
  }, [uid])

  useEffect(() => {
    const load = () => cargar()
    load()
    const id = setInterval(() => cargar(), AA_POLL_MS)
    return () => clearInterval(id)
  }, [cargar])

  const totalClases = porMateria.reduce((s, m) => s + m.total_clases, 0)
  const totalPresentes = porMateria.reduce((s, m) => s + m.presentes, 0)
  const promedioTotal = totalClases > 0 ? Math.round((totalPresentes / totalClases) * 100) : 0
  const inasistencias = totalClases - totalPresentes
  const critica = porMateria.filter(m => m.porcentaje < LIMITE).sort((a, b) => a.porcentaje - b.porcentaje)[0]

  return (
    <>
      <style>{cssAlumno}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Control de Asistencia</h1>
          <p className="page-subtitle">
            {carreraNombre || 'Visualiza tu registro de asistencia por materia y semestre.'} Mantén un seguimiento preciso para cumplir con los requisitos académicos.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {lastUpdate && (
            <span className="mono-label" style={{ fontSize: 10.5 }}>
              Actualizado {lastUpdate.toLocaleTimeString('es-PY')}
            </span>
          )}
          <button type="button" className="btn-ghost aa-refresh-btn" disabled={refreshing} onClick={() => cargar(true)}>
            <svg className={refreshing ? 'spin' : ''} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            {refreshing ? 'Actualizando…' : 'Actualizar'}
          </button>
          <span className="badge" style={{
            background: totalClases === 0 ? 'var(--bg-elevated)' : promedioTotal >= LIMITE ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
            color: totalClases === 0 ? 'var(--text-muted)' : promedioTotal >= LIMITE ? '#22c55e' : '#ef4444',
            border: `1px solid ${totalClases === 0 ? 'var(--border-subtle)' : promedioTotal >= LIMITE ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            padding: '5px 14px', fontSize: 11.5,
          }}>
            <i className={`ti ${totalClases === 0 ? 'ti-minus' : promedioTotal >= LIMITE ? 'ti-shield-check' : 'ti-alert-triangle'}`} /> Estado: {totalClases === 0 ? 'Sin datos aún' : promedioTotal >= LIMITE ? 'Alumno Regular' : 'En Riesgo'}
          </span>
        </div>
      </div>

      {error && (
        <div className="aa-err-banner">
          <i className="ti ti-alert-triangle" /> {error}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Cargando asistencia…</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="aa-kpi-grid">
            <div className="kpi-card" style={{ borderLeft: `3px solid ${totalClases === 0 ? 'var(--text-muted)' : promedioTotal >= LIMITE ? '#22c55e' : '#ef4444'}` }}>
              <div className="kpi-top"><span className="mono-label">Promedio Total</span><i className="ti ti-percentage" style={{ color: totalClases === 0 ? 'var(--text-muted)' : promedioTotal >= LIMITE ? '#22c55e' : '#ef4444', fontSize: 15 }} /></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="kpi-value" style={{ fontSize: 26, color: totalClases === 0 ? 'var(--text-muted)' : promedioTotal >= LIMITE ? '#22c55e' : '#ef4444' }}>{totalClases === 0 ? '—' : `${promedioTotal}%`}</span>
              </div>
              <div className="progress-track" style={{ marginTop: 8 }}>
                <div className="progress-fill" style={{ width: `${promedioTotal}%`, background: totalClases === 0 ? 'var(--text-muted)' : promedioTotal >= LIMITE ? '#22c55e' : '#ef4444' }} />
              </div>
            </div>
            <div className="kpi-card" style={{ borderLeft: '3px solid var(--accent-bright)' }}>
              <div className="kpi-top"><span className="mono-label">Clases Totales</span><i className="ti ti-calendar-stats" style={{ color: 'var(--accent)', fontSize: 15 }} /></div>
              <span className="kpi-value" style={{ fontSize: 26 }}>{totalClases}</span>
              <div className="mono-label" style={{ marginTop: 6, fontSize: 9 }}>Sesiones registradas</div>
            </div>
            <div className="kpi-card" style={{ borderLeft: `3px solid ${inasistencias > 3 ? '#ef4444' : '#f59e0b'}` }}>
              <div className="kpi-top"><span className="mono-label">Inasistencias</span><i className="ti ti-calendar-off" style={{ color: '#ef4444', fontSize: 15 }} /></div>
              <span className="kpi-value" style={{ fontSize: 26, color: '#ef4444' }}>{inasistencias}</span>
              <div className="mono-label" style={{ marginTop: 6, fontSize: 9 }}>Días no asistidos</div>
            </div>
            {critica ? (
              <div className="aa-alerta" style={{ borderLeft: '3px solid #ef4444' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="mono-label" style={{ color: '#ef4444' }}>Alerta Crítica</span>
                  <i className="ti ti-alert-triangle" style={{ color: '#ef4444' }} />
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 4 }}>{critica.materia_nombre}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>A {Math.max(0, Math.ceil((LIMITE - critica.porcentaje) / 100 * critica.total_clases))} faltas del límite permitido ({LIMITE}% req.)</div>
                <div className="progress-track" style={{ marginTop: 8, height: 4 }}><div className="progress-fill" style={{ width: `${critica.porcentaje}%`, background: '#ef4444', height: 4 }} /></div>
              </div>
            ) : (
              <div className="kpi-card" style={{ borderLeft: '3px solid #22c55e' }}>
                <div className="kpi-top"><span className="mono-label">Alertas</span><i className="ti ti-shield-check" style={{ color: '#22c55e', fontSize: 15 }} /></div>
                <span className="kpi-value" style={{ fontSize: 26, color: '#22c55e' }}>0</span>
                <div className="mono-label" style={{ marginTop: 6, fontSize: 9 }}>Todo en regla ✓</div>
              </div>
            )}
          </div>

          <div className="aa-main-grid">
            <div>
              {/* Cumplimiento por materia */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 800 }}><i className="ti ti-list-check" style={{ color: 'var(--accent-bright)' }} /> Cumplimiento por Materia</h3>
                  <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600 }}>{porMateria.length} materias</span>
                </div>
                {porMateria.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', padding: 24 }}>Sin registros de asistencia aún.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {porMateria.map(m => {
                      const pct = m.porcentaje
                      const ok = pct >= LIMITE
                      const color = pct >= 90 ? '#22c55e' : pct >= 75 ? 'var(--accent-bright)' : pct >= 60 ? '#f59e0b' : '#ef4444'
                      const c = 2 * Math.PI * 18
                      return (
                        <div key={m.materia_id} className="aa-mat-row">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
                              <svg width="48" height="48" style={{ transform: 'rotate(-90deg)' }}>
                                <circle cx="24" cy="24" r="18" stroke="var(--bg-elevated)" strokeWidth="4" fill="none" />
                                <circle cx="24" cy="24" r="18" stroke={color} strokeWidth="4" fill="none"
                                  strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} strokeLinecap="round" />
                              </svg>
                              <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 10, color }}>{pct}%</span>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 13.5, fontWeight: 700 }}>{m.materia_nombre}</span>
                                <span className="badge" style={{
                                  background: ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                                  color: ok ? '#22c55e' : '#ef4444',
                                  border: `1px solid ${ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                  padding: '2px 10px', fontSize: 10, whiteSpace: 'nowrap',
                                }}>
                                  <i className={`ti ${ok ? 'ti-shield-check' : 'ti-alert-triangle'}`} style={{ fontSize: 10, marginRight: 3 }} />
                                  {ok ? 'Regular' : 'En riesgo'}
                                </span>
                              </div>
                              <div className="progress-track" style={{ marginTop: 6, height: 5 }}>
                                <div className="progress-fill" style={{ width: `${pct}%`, background: color, height: 5 }} />
                              </div>
                              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4 }}>{m.presentes}/{m.total_clases} Sesiones</div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: 10.5, color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                  <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#22c55e', marginRight: 5 }} />Óptimo (≥90%)</span>
                  <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-bright)', marginRight: 5 }} />Bueno (≥75%)</span>
                  <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', marginRight: 5 }} />Mínimo (≥60%)</span>
                  <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#ef4444', marginRight: 5 }} />Crítico (&lt;60%)</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card" style={{ borderLeft: '3px solid var(--accent-bright)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <i className="ti ti-calendar" style={{ color: 'var(--accent-bright)', fontSize: 16 }} />
                  <h3 style={{ fontSize: 14, fontWeight: 800 }}>Periodo Académico</h3>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{new Date().getMonth() < 6 ? 'Primer' : 'Segundo'} Semestre {new Date().getFullYear()}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                  Periodo académico en curso
                </div>
              </div>

              <div className="card" style={{ borderLeft: `3px solid ${critica ? '#ef4444' : '#22c55e'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <i className="ti ti-alert-triangle" style={{ color: critica ? '#ef4444' : '#22c55e', fontSize: 16 }} />
                  <h3 style={{ fontSize: 14, fontWeight: 800 }}>Resumen de Alertas</h3>
                </div>
                {critica ? (
                  <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4, color: '#ef4444' }}>{critica.materia_nombre}</div>
                    <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                      Riesgo de pérdida de regularidad. Se requieren asistencias consecutivas para salir de zona crítica.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                    <i className="ti ti-shield-check" style={{ color: '#22c55e', fontSize: 18 }} />
                    <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: 0 }}>Sin alertas activas. Todo en orden.</p>
                  </div>
                )}
              </div>

              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="ti ti-history" style={{ color: 'var(--accent-bright)', fontSize: 16 }} />
                    <h3 style={{ fontSize: 14, fontWeight: 800 }}>Bitácora de Sesiones</h3>
                  </div>
                  <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', fontSize: 10 }}>{sesiones.length} últimas</span>
                </div>
                {sesiones.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Sin sesiones registradas.</p>
                ) : (
                  <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                    {sesiones.slice(0, 8).map((s, i) => (
                      <div key={i} className="det-row" style={{ padding: '8px 0', borderBottom: i < 7 ? '1px solid rgba(42,48,64,0.2)' : 'none', fontSize: 11.5 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: s.presente ? '#22c55e' : '#ef4444' }} />
                          {s.materia_nombre}
                        </span>
                        <span style={{ color: s.presente ? '#22c55e' : '#ef4444', fontWeight: 700, flexShrink: 0, fontSize: 11 }}>
                          {s.presente ? 'Presente' : 'Ausente'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <button className="aa-fab-qr" onClick={() => navigate('/asistencia/scan')}>
        <i className="ti ti-qrcode" style={{ fontSize: 18 }} /> Escanear QR
      </button>
    </>
  )
}

/* ─── PROFESOR: carreras → materias → alumnos ─── */
function ProfesorView() {
  const [view, setView]         = useState<View>('carreras')
  const [carreras, setCarr]     = useState<Carrera[]>([])
  const [materias, setMat]      = useState<Materia[]>([])
  const [alumnos, setAlumn]     = useState<AlumnoAsist[]>([])
  const [selCarr, setSelCarr]   = useState<Carrera | null>(null)
  const [selMat, setSelMat]     = useState<Materia | null>(null)
  const [loading, setLoading]   = useState(true)
  const [qrMatId, setQrMatId]   = useState<number | null>(null)
  const [fecha, setFecha]       = useState(() => new Date().toISOString().slice(0, 10))
  const [, setFechaL] = useState(() => {
    const d = new Date()
    return d.toLocaleDateString('es-PY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  })
  // QR session timer (visible in toolbar without keeping modal open)
  const [qrSeg, setQrSeg]       = useState(0)
  const [qrActive, setQrActive] = useState(false)
  const qrTimerRef              = useRef<ReturnType<typeof setInterval> | null>(null)
  // Motivo modal for absent
  const [motivoModal, setMotivoModal] = useState<AlumnoAsist | null>(null)
  const [motivoText, setMotivoText]   = useState('')
  // Batch edit mode
  const [modoEdicion, setModoEdicion] = useState(false)
  // Staged changes per student { [id]: boolean | null } (null = sin registro)
  const [staged, setStaged] = useState<Record<number, boolean | null>>({})
  // Polling ref
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    api.get<Carrera[]>('/asistencias/profesor/carreras')
      .then(d => { setCarr(d || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function selectCarrera(c: Carrera) {
    setSelCarr(c); setLoading(true)
    api.get<Materia[]>(`/asistencias/profesor/materias?carrera_id=${c.id}`)
      .then(d => { setMat(d || []); setLoading(false); setView('materias') })
      .catch(() => setLoading(false))
  }

  const refreshAlumnos = useCallback((matId: number, f: string) => {
    api.get<{ fecha: string; materia: string; alumnos: AlumnoAsist[] }>(`/asistencias/profesor/alumnos?materia_id=${matId}&fecha=${f}`)
      .then(d => setAlumn(d.alumnos || []))
      .catch(() => {})
  }, [])

  function selectMateria(m: Materia) {
    setSelMat(m); setLoading(true)
    // stop old poll
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    api.get<{ fecha: string; materia: string; alumnos: AlumnoAsist[] }>(`/asistencias/profesor/alumnos?materia_id=${m.id}&fecha=${fecha}`)
      .then(d => {
        setAlumn(d.alumnos || [])
        setLoading(false)
        setView('alumnos')
        // start polling every 5s
        pollRef.current = setInterval(() => refreshAlumnos(m.id, fecha), 5000)
      })
      .catch(() => setLoading(false))
  }

  // cleanup poll on unmount or view change
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])
  useEffect(() => {
    if (view !== 'alumnos' && pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }, [view])

  // QR inline (panel REGISTRO EN TIEMPO REAL)
  const [qrImg, setQrImg] = useState<string | null>(null)
  const [qrToken, setQrToken] = useState<string | null>(null)
  const [qrCargando, setQrCargando] = useState(false)
  async function generarQrInline() {
    if (!selMat) return
    setQrCargando(true)
    try {
      const data = await api.get<{ qr_base64: string; token: string; scan_url: string; expira_en: number }>(`/asistencias/qr/${selMat.id}`)
      setQrImg(data.qr_base64)
      setQrToken(data.token)
      startQrTimer(data.expira_en)
    } catch { setQrImg(null); setQrToken(null) }
    finally { setQrCargando(false) }
  }

  // QR timer countdown
  function startQrTimer(expiraEn: number) {
    setQrSeg(expiraEn); setQrActive(true)
    if (qrTimerRef.current) clearInterval(qrTimerRef.current)
    qrTimerRef.current = setInterval(() => {
      setQrSeg(s => {
        if (s <= 1) {
          clearInterval(qrTimerRef.current!)
          setQrActive(false)
          return 0
        }
        return s - 1
      })
    }, 1000)
  }
  useEffect(() => { return () => { if (qrTimerRef.current) clearInterval(qrTimerRef.current) } }, [])

  function cambiarFecha(nf: string) {
    setFecha(nf)
    const d = new Date(nf + 'T12:00:00')
    setFechaL(d.toLocaleDateString('es-PY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
    if (selMat) {
      setLoading(true)
      api.get<{ fecha: string; materia: string; alumnos: AlumnoAsist[] }>(`/asistencias/profesor/alumnos?materia_id=${selMat.id}&fecha=${nf}`)
        .then(d => { setAlumn(d.alumnos || []); setLoading(false) })
        .catch(() => setLoading(false))
      // restart poll with new date
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      pollRef.current = setInterval(() => refreshAlumnos(selMat.id, nf), 5000)
    }
  }

  async function marcarPresente(alumno: AlumnoAsist) {
    if (alumno.asistencia_id) {
      await api.put(`/asistencias/profesor/toggle/${alumno.asistencia_id}?presente=true`, {})
      setAlumn(prev => prev.map(a => a.id === alumno.id ? { ...a, presente: true, motivo: null } : a))
    } else {
      await api.post(`/asistencias/profesor/marcar?materia_id=${selMat!.id}&alumno_id=${alumno.id}&fecha=${fecha}&presente=true`, {})
      refreshAlumnos(selMat!.id, fecha)
    }
  }

  async function confirmarAusente() {
    if (!motivoModal) return
    const a = motivoModal
    const q = motivoText.trim() ? `&motivo=${encodeURIComponent(motivoText.trim())}` : ''
    if (a.asistencia_id) {
      await api.put(`/asistencias/profesor/toggle/${a.asistencia_id}?presente=false${q}`, {})
      setAlumn(prev => prev.map(x => x.id === a.id ? { ...x, presente: false, motivo: motivoText.trim() || null } : x))
    } else {
      await api.post(`/asistencias/profesor/marcar?materia_id=${selMat!.id}&alumno_id=${a.id}&fecha=${fecha}&presente=false${q}`, {})
      refreshAlumnos(selMat!.id, fecha)
    }
    setMotivoModal(null); setMotivoText('')
  }

  const presentes = alumnos.filter(a => a.presente === true).length
  const total     = alumnos.length
  const qrMin = Math.floor(qrSeg / 60)
  const qrS   = qrSeg % 60
  const qrClr = qrSeg > 300 ? 'var(--accent)' : qrSeg > 60 ? '#f59e0b' : '#ef4444'

  return (
    <>
      <style>{css}</style>
      <style>{cssProfesorResponsive}</style>
      <div className="ap-wrap">
        {/* Header compacto con breadcrumb inline */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700 }}>
            <span>Control de Asistencia</span>
            {selCarr && view !== 'carreras' && (
              <>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>▸</span>
                {view === 'materias' ? (
                  <span style={{ color: 'var(--accent-bright)', fontSize: 13 }}>{selCarr.nombre}</span>
                ) : (
                  <button onClick={() => { setView('materias'); setSelMat(null) }} style={{ background:'none', border:'none', color:'var(--text-secondary)', cursor:'pointer', fontFamily:'inherit', fontSize:13, padding:0 }}>
                    {selCarr.nombre}
                  </button>
                )}
              </>
            )}
            {selMat && view === 'alumnos' && (
              <>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>▸</span>
                <span style={{ color: 'var(--accent-bright)', fontSize: 13 }}>{selMat.nombre}</span>
              </>
            )}
          </div>
          {view === 'alumnos' && <div />}
        </div>

        {view === 'carreras' && (
          loading ? <div style={{ textAlign:'center', padding:'32px 20px', color:'var(--text-muted)', fontSize:13 }}>Cargando carreras…</div>
          : carreras.length === 0
            ? <div className="card" style={{ textAlign:'center', padding:32, color:'var(--text-muted)', fontSize:13 }}>No tenés carreras asignadas</div>
            : <div className="ap-chip-strip">{carreras.map(c => (
                <div key={c.id} className="ap-chip" onClick={() => selectCarrera(c)}>
                  <i className="ti ti-building-community" style={{ fontSize:14, color:'var(--accent-bright)' }} />
                  <span style={{ fontWeight:600 }}>{c.nombre}</span>
                </div>
              ))}</div>
        )}

        {view === 'materias' && (
          loading ? <div style={{ textAlign:'center', padding:'32px 20px', color:'var(--text-muted)', fontSize:13 }}>Cargando materias…</div>
          : materias.length === 0
            ? <div className="card" style={{ textAlign:'center', padding:32, color:'var(--text-muted)', fontSize:13 }}>No hay materias en esta carrera</div>
            : <div className="ap-chip-strip">{materias.map(m => (
                <div key={m.id} className="ap-chip" onClick={() => selectMateria(m)}>
                  <i className="ti ti-book-2" style={{ fontSize:14, color:'var(--accent-bright)' }} />
                  <span style={{ fontWeight:600 }}>{m.nombre}</span>
                  {m.codigo && <span className="mono-label" style={{ fontSize:10, color:'var(--text-muted)' }}>{m.codigo}</span>}
                </div>
              ))}</div>
        )}

        {view === 'alumnos' && (
          <>
            {/* Grid: QR en tiempo real + KPIs/Historial */}
            <div className="ap-rt-grid">

              {/* Panel REGISTRO EN TIEMPO REAL */}
              <div className="card" style={{ textAlign: 'center' }}>
                <div className="mono-label" style={{ letterSpacing: '0.18em', marginBottom: 14 }}>Registro en Tiempo Real</div>
                <div style={{ width: 190, height: 190, margin: '0 auto', borderRadius: 18, background: '#fff', padding: 10, border: '4px solid var(--bg-elevated)', boxShadow: '0 0 40px var(--accent-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {qrImg
                    ? <img src={`data:image/png;base64,${qrImg}`} alt="QR asistencia" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    : <i className="ti ti-qrcode" style={{ fontSize: 70, color: '#0b0d11' }} />}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 30, fontWeight: 800, marginTop: 14, color: qrActive ? (qrSeg > 60 ? 'var(--accent-bright)' : 'var(--danger)') : 'var(--text-muted)' }}>
                  {qrActive ? `${String(qrMin).padStart(2, '0')}:${String(qrS).padStart(2, '0')}` : '--:--'}
                </div>
                <div className="mono-label" style={{ marginBottom: 14 }}>
                  {qrActive ? (qrSeg <= 60 ? 'CÓDIGO EXPIRA PRONTO' : 'CÓDIGO ACTIVO') : 'SIN CÓDIGO ACTIVO'}
                </div>
                <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                  <button className="btn-primary" style={{ width: '100%' }} disabled={qrCargando} onClick={generarQrInline}>
                    <i className="ti ti-refresh" /> {qrCargando ? 'Generando…' : qrActive ? 'Regenerar QR' : 'Generar QR'}
                  </button>
                  {qrActive && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => {
                        const a = document.createElement('a')
                        a.href = `data:image/png;base64,${qrImg}`
                        a.download = `QR-${selMat?.nombre.replace(/\s+/g, '-') || 'asistencia'}.png`
                        a.click()
                      }}
                        style={{ flex: 1, padding: '7px 0', borderRadius: 8, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Descargar
                      </button>
                      <button onClick={() => {
                        const url = `${window.location.origin}/asistencia/scan?token=${encodeURIComponent(qrToken || '')}`
                        if (navigator.share) {
                          navigator.share({ title: `QR Asistencia - ${selMat?.nombre}`, text: `Escaneá este QR para registrar asistencia a ${selMat?.nombre}`, url }).catch(() => {})
                        } else {
                          navigator.clipboard.writeText(url).then(() => {
                            const el = document.createElement('div')
                            el.textContent = '¡Link copiado! Compartilo en tu grupo de WhatsApp'
                            el.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:var(--accent);color:#000;padding:10px 20px;border-radius:12px;font-size:13px;font-weight:700;z-index:999;font-family:sans-serif'
                            document.body.appendChild(el)
                            setTimeout(() => el.remove(), 3000)
                          }).catch(() => {})
                        }
                      }}
                        style={{ flex: 1, padding: '7px 0', borderRadius: 8, background: 'rgba(0,180,216,0.15)', color: '#00b4d8', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                        Compartir
                      </button>
                      <button onClick={() => {
                        if (qrTimerRef.current) clearInterval(qrTimerRef.current)
                        setQrActive(false)
                        setQrImg(null)
                        setQrToken(null)
                      }}
                        style={{ flex: 1, padding: '7px 0', borderRadius: 8, background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        Cancelar QR
                      </button>
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 14 }}>
                  <div className="progress-track"><div className="progress-fill" style={{ width: `${total ? presentes / total * 100 : 0}%` }} /></div>
                  <div className="mono-label" style={{ marginTop: 6 }}>Escaneos detectados: {presentes}/{total} alumnos</div>
                </div>
              </div>

              {/* KPIs + Historial Mensual */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="ap-kpi-grid">
                  <div className="kpi-card">
                    <div className="mono-label" style={{ marginBottom: 6 }}>Asistencia Hoy</div>
                    <span className="kpi-value" style={{ fontSize: 22 }}>{total > 0 ? Math.round(presentes / total * 100) : 0}%</span>
                  </div>
                  <div className="kpi-card">
                    <div className="mono-label" style={{ marginBottom: 6 }}>Inasistencias</div>
                    <span className="kpi-value" style={{ fontSize: 22 }}>{alumnos.filter(a => a.presente === false).length}</span>
                  </div>
                  <div className="kpi-card">
                    <div className="mono-label" style={{ marginBottom: 6 }}>Sin Registro</div>
                    <span className="kpi-value" style={{ fontSize: 22 }}>{alumnos.filter(a => a.presente === null).length}</span>
                  </div>
                </div>
                <div className="card" style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 800 }}>Historial Mensual</h3>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <button onClick={() => {
                        const d = new Date(fecha + 'T12:00:00')
                        d.setMonth(d.getMonth() - 1)
                        const y = d.getFullYear(), m = d.getMonth() + 1
                        cambiarFecha(`${y}-${String(m).padStart(2,'0')}-01`)
                      }} style={{ background:'none', border:'none', color:'var(--text-secondary)', cursor:'pointer', padding:2, display:'flex' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                      </button>
                      <span className="mono-label" style={{ minWidth:90, textAlign:'center' }}>{new Date(fecha + 'T12:00:00').toLocaleDateString('es-PY', { month: 'long', year: 'numeric' })}</span>
                      <button onClick={() => {
                        const d = new Date(fecha + 'T12:00:00')
                        d.setMonth(d.getMonth() + 1)
                        const y = d.getFullYear(), m = d.getMonth() + 1
                        cambiarFecha(`${y}-${String(m).padStart(2,'0')}-01`)
                      }} style={{ background:'none', border:'none', color:'var(--text-secondary)', cursor:'pointer', padding:2, display:'flex' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
                    {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                      <div key={i} style={{ textAlign:'center', fontSize:9, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', padding:'3px 0', letterSpacing:'.03em' }}>{d}</div>
                    ))}
                    {(() => {
                      const base = new Date(fecha + 'T12:00:00')
                      const y = base.getFullYear(), mo = base.getMonth()
                      const first = (new Date(y, mo, 1).getDay() + 6) % 7
                      const dias = new Date(y, mo + 1, 0).getDate()
                      const hoyNum = new Date().getDate()
                      const hoyMes = new Date().getMonth()
                      const hoyAno = new Date().getFullYear()
                      const cells = []
                      for (let i = 0; i < first; i++) cells.push(<span key={`e${i}`} />)
                      for (let d = 1; d <= dias; d++) {
                        const esSel = d === base.getDate()
                        const esHoy = d === hoyNum && mo === hoyMes && y === hoyAno
                        const esFinDe = new Date(y, mo, d).getDay() === 0 || new Date(y, mo, d).getDay() === 6
                        const tieneDatos = alumnos.length > 0 && d === base.getDate()
                        const pctDia = tieneDatos && alumnos.length > 0 ? Math.round(alumnos.filter(a => a.presente === true).length / alumnos.length * 100) : null
                        cells.push(
                          <button key={d} onClick={() => cambiarFecha(`${y}-${String(mo + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`)}
                            style={{
                              aspectRatio:'1', borderRadius:7, cursor:'pointer', position:'relative',
                              fontFamily:'var(--font-mono)', fontSize:10, fontWeight: esSel || esHoy ? 700 : 400,
                              border: esSel ? '1.5px solid var(--accent-bright)' : esHoy ? '1.5px solid var(--accent)' : '1px solid transparent',
                              background: esSel ? 'var(--accent)' : esHoy ? 'var(--accent-muted)' : 'transparent',
                              color: esSel ? '#fff' : esFinDe ? 'var(--text-muted)' : esHoy ? 'var(--accent-bright)' : 'var(--text-secondary)',
                              transition:'all .12s',
                            }}
                            onMouseEnter={e => { if (!esSel && !esHoy) { e.currentTarget.style.background = 'var(--accent-muted)'; e.currentTarget.style.borderColor = 'var(--border-light)' } }}
                            onMouseLeave={e => { if (!esSel && !esHoy) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' } }}>
                            {d}
                            {pctDia !== null && pctDia >= 50 && (
                              <span style={{ position:'absolute', bottom:2, left:'50%', transform:'translateX(-50%)', width:4, height:4, borderRadius:'50%', background: pctDia >= 80 ? '#22c55e' : pctDia >= 50 ? '#f59e0b' : '#ef4444' }} />
                            )}
                          </button>
                        )
                      }
                      return cells
                    })()}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className="btn-ghost" style={{ padding:'4px 8px', fontSize:11 }} onClick={() => { setView('materias'); setSelMat(null) }}>
                  <i className="ti ti-arrow-left" />
                </button>
                <input type="date" value={fecha} onChange={e => cambiarFecha(e.target.value)}
                  style={{ height: 30, padding: '0 10px', borderRadius: 7, border: '1px solid #2a3040', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 12, fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {qrActive && (
                  <div style={{ display:'flex', alignItems:'center', gap:4, background:'var(--bg-surface)', border:`1px solid ${qrClr}30`, borderRadius:6, padding:'3px 8px' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={qrClr} strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span style={{ fontFamily:'monospace', fontSize:12, fontWeight:700, color:qrClr }}>
                      {String(qrMin).padStart(2,'0')}:{String(qrS).padStart(2,'0')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {loading ? <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>Cargando alumnos…</div>
            : alumnos.length === 0 ? <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}><div style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.3 }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>No hay alumnos inscriptos en esta materia</div>
            : <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 12 }}><table className="table-uca">
              <thead><tr>
                <th>N°</th>
                <th>Alumno</th>
                <th>Asistencia</th>
              </tr></thead>
              <tbody>
                {alumnos.map((a, i) => (
                  <tr key={a.id}>
                    <td style={{ color:'var(--text-muted)', width:32, fontSize:11 }}>{i + 1}</td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontSize:13 }}>{a.nombre}</span>
                        {a.es_becado && <span className="as-badge as-badge-becado" style={{ fontSize:9, padding:'1px 6px' }}>B</span>}
                      </div>
                      {a.presente === false && a.motivo && (
                        <div style={{ fontSize:10, color:'#f59e0b', marginTop:1 }}>{a.motivo}</div>
                      )}
                    </td>
                    <td>
                      {modoEdicion ? (
                        <div style={{ display:'flex', gap:4 }}>
                          <button onClick={() => setStaged(s => ({ ...s, [a.id]: true }))}
                            className={`as-btn ${staged[a.id] === true ? 'as-btn-primary' : ''}`}
                            style={{ padding:'2px 8px', fontSize:10, borderColor: staged[a.id] === true ? 'var(--accent)' : '#22c55e30', background: staged[a.id] === true ? 'var(--accent)' : 'transparent', color: staged[a.id] === true ? '#fff' : '#22c55e' }}>
                            Presente
                          </button>
                          <button onClick={() => {
                            setStaged(s => ({ ...s, [a.id]: null }))
                          }}
                            className={`as-btn ${staged[a.id] === null ? 'as-btn-primary' : ''}`}
                            style={{ padding:'2px 8px', fontSize:10, borderColor: staged[a.id] === null ? 'var(--text-muted)' : 'var(--border-subtle)', background: staged[a.id] === null ? 'var(--bg-hover)' : 'transparent', color: 'var(--text-muted)' }}>
                            —
                          </button>
                          <button onClick={() => {
                            setStaged(s => ({ ...s, [a.id]: false }))
                            setMotivoModal(a); setMotivoText('')
                          }}
                            className={`as-btn ${staged[a.id] === false ? 'as-btn-primary' : ''}`}
                            style={{ padding:'2px 8px', fontSize:10, borderColor: staged[a.id] === false ? '#ef4444' : '#ef444430', background: staged[a.id] === false ? '#ef4444' : 'transparent', color: staged[a.id] === false ? '#fff' : '#ef4444' }}>
                            Ausente
                          </button>
                        </div>
                      ) : (
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          {a.presente === true && <span className="as-badge as-badge-presente" style={{ fontSize:10, padding:'2px 8px' }}>Presente</span>}
                          {a.presente === false && <span className="as-badge as-badge-ausente" style={{ fontSize:10, padding:'2px 8px' }}>Ausente</span>}
                          {a.presente === null && <span style={{ fontSize:10, color:'var(--text-muted)' }}>—</span>}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>}

            {alumnos.length > 0 && (
              <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:10 }}>
                {modoEdicion ? (
                  <>
                    <button className="btn-ghost" onClick={() => { setModoEdicion(false); setStaged({}) }}>
                      Cancelar
                    </button>
                    <button className="btn-primary" onClick={async () => {
                      for (const [idStr, val] of Object.entries(staged)) {
                        const a = alumnos.find(x => x.id === Number(idStr))
                        if (!a || a.presente === val) continue
                        if (val === true) await marcarPresente(a)
                        else if (val === null && a.asistencia_id) await api.delete(`/asistencias/${a.asistencia_id}`)
                      }
                      setModoEdicion(false)
                      setStaged({})
                      refreshAlumnos(selMat!.id, fecha)
                    }}>
                      <i className="ti ti-device-floppy" /> Guardar todo
                    </button>
                  </>
                ) : (
                  <button className="btn-ghost" onClick={() => {
                    setModoEdicion(true)
                    const init: Record<number, boolean | null> = {}
                    alumnos.forEach(a => { init[a.id] = a.presente })
                    setStaged(init)
                  }}>
                    <i className="ti ti-edit" /> Editar
                  </button>
                )}
              </div>
            )}

            {/* Mapa de Calor */}
            <div className="card" style={{ marginTop: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 800 }}>Mapa de Calor: Compromiso Académico</h3>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Frecuencia de asistencia por alumno (sesión actual)</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="mono-label">Baja</span>
                  {[0.15, 0.35, 0.6, 0.85, 1].map(o => (
                    <span key={o} style={{ width: 14, height: 10, borderRadius: 3, background: 'var(--accent)', opacity: o }} />
                  ))}
                  <span className="mono-label">Alta</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                {alumnos.map(a => (
                  <span key={a.id} title={a.nombre}
                    style={{ width: 42, height: 26, borderRadius: 7, background: 'var(--accent)', opacity: a.presente === true ? 0.95 : a.presente === false ? 0.15 : 0.35 }} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {qrMatId !== null && (
        <QRModal
          materiaId={qrMatId}
          materiaNombre={selMat?.nombre || ''}
          onClose={() => setQrMatId(null)}
          onQrActive={startQrTimer}
        />
      )}

      {/* Motivo ausencia modal */}
      {motivoModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', backdropFilter:'blur(4px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'var(--bg-surface)', border:'1px solid #2a3040', borderRadius:16, width:'100%', maxWidth:360, padding:24, boxShadow:'0 24px 60px rgba(0,0,0,.6)' }}>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', marginBottom:6 }}>Marcar ausente</div>
            <div style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:16 }}>{motivoModal.nombre}</div>
            <label style={{ display:'block', fontSize:10, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>Motivo de ausencia (opcional)</label>
            <input
              autoFocus
              value={motivoText}
              onChange={e => setMotivoText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmarAusente()}
              placeholder="Ej: Enfermedad, falta justificada..."
              style={{ width:'100%', background:'var(--bg-input)', border:'1px solid var(--border-light)', borderRadius:8, color:'var(--text-primary)', fontSize:13, fontFamily:'inherit', padding:'9px 12px', outline:'none', marginBottom:16 }}
            />
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => { setMotivoModal(null); setMotivoText('') }}
                style={{ flex:1, padding:10, background:'var(--bg-hover)', border:'1px solid var(--border-light)', borderRadius:9, color:'var(--text-secondary)', fontSize:13, fontWeight:600, fontFamily:'inherit', cursor:'pointer' }}>
                Cancelar
              </button>
              <button onClick={confirmarAusente}
                style={{ flex:1, padding:10, background:'#ef4444', border:'none', borderRadius:9, color:'#fff', fontSize:13, fontWeight:700, fontFamily:'inherit', cursor:'pointer' }}>
                Confirmar ausente
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ─── ADMIN: resumen global por materia ─── */
function AdminView() {
  interface ResumenRow {
    materia_id: number
    materia: string
    total: number
    presentes: number
    ausentes: number
    pct: number
  }

  const [rows, setRows]       = useState<ResumenRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  useEffect(() => {
    api.get<ResumenRow[]>('/reportes/asistencia-por-materia')
      .then(d => { setRows(d.sort((a, b) => b.total - a.total)); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtradas = search.trim()
    ? rows.filter(r => r.materia.toLowerCase().includes(search.toLowerCase()))
    : rows

  const totalRegistros = rows.reduce((s, r) => s + r.total, 0)
  const totalPresentes = rows.reduce((s, r) => s + r.presentes, 0)
  const pctGlobal = totalRegistros > 0 ? Math.round((totalPresentes / totalRegistros) * 100) : 0

  return (
    <>
      <style>{css}</style>
      <div style={{ padding: '28px 36px 60px' }}>
        <div style={{ marginBottom: 28 }}>
          <div className="page-title">Asistencia — Resumen institucional</div>
          <div className="page-subtitle">Estadísticas de asistencia por materia en todo el sistema</div>
        </div>

        {/* KPI cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12, marginBottom:24 }}>
          {[
            { lbl:'Total registros', val:totalRegistros, color:'var(--accent)', bg:'var(--accent-muted)' },
            { lbl:'Presencias',      val:totalPresentes, color:'#22c55e', bg:'#22c55e18' },
            { lbl:'Ausencias',       val:totalRegistros-totalPresentes, color:'#ef4444', bg:'#ef444418' },
            { lbl:'% Global',        val:`${pctGlobal}%`, color: pctGlobal>=75?'#22c55e':pctGlobal>=50?'#f59e0b':'#ef4444', bg:'var(--bg-hover)' },
          ].map(k => (
            <div key={k.lbl} style={{ background:'var(--bg-input)', border:'1px solid #2a3040', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6, fontWeight:600, textTransform:'uppercase', letterSpacing:'.04em' }}>{k.lbl}</div>
              <div style={{ fontSize:22, fontWeight:800, color:k.color }}>{k.val}</div>
            </div>
          ))}
        </div>

        {/* Buscador */}
        <div style={{ position:'relative', marginBottom:14, maxWidth:360 }}>
          <svg style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', width:14, height:14, color:'var(--text-muted)', pointerEvents:'none' }}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar materia…"
            style={{ width:'100%', background:'var(--bg-input)', border:'1px solid #2a3040', borderRadius:9, color:'var(--text-primary)', fontSize:13, fontFamily:'inherit', outline:'none', padding:'8px 14px 8px 34px' }}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>Cargando datos de asistencia…</div>
        ) : filtradas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <div style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.3 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            No se encontraron materias
          </div>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 12 }}>
            <table className="table-uca">
              <thead>
                <tr>
                  <th>Materia</th>
                  <th style={{ textAlign:'center' }}>Registros</th>
                  <th style={{ textAlign:'center' }}>Presentes</th>
                  <th style={{ textAlign:'center' }}>Ausentes</th>
                  <th style={{ textAlign:'center' }}>Asistencia</th>
                  <th>Nivel</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map(r => {
                  const pctColor = r.pct >= 75 ? '#22c55e' : r.pct >= 50 ? '#f59e0b' : '#ef4444'
                  return (
                    <tr key={r.materia_id}>
                      <td style={{ fontWeight:600, color:'var(--text-primary)' }}>{r.materia}</td>
                      <td style={{ textAlign:'center', color:'var(--text-secondary)' }}>{r.total}</td>
                      <td style={{ textAlign:'center', color:'#22c55e', fontWeight:600 }}>{r.presentes}</td>
                      <td style={{ textAlign:'center', color:'#ef4444', fontWeight:600 }}>{r.ausentes}</td>
                      <td style={{ textAlign:'center', fontWeight:800, color:pctColor }}>{r.pct}%</td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ flex:1, height:6, background:'#2a3040', borderRadius:3, overflow:'hidden', minWidth:60 }}>
                            <div style={{ height:'100%', width:`${r.pct}%`, background:pctColor, borderRadius:3, transition:'width .3s' }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
