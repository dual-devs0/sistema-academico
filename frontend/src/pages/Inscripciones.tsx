import { useState, useEffect, useCallback } from 'react'
import { api, getCurrentUser, emitToast } from '../lib/api'

type Materia = { id: number; nombre: string; codigo?: string | null; profesor_nombre?: string | null; creditos?: number | null; cupos?: number | null; horario?: string | null; secciones?: number | null; inscritos?: number | null; anio?: number | null; semestre?: number | null }
type Inscripcion = { id: number; alumno_id: number; materia_id: number }
type UserApi = { id: number; username: string; role: string; nombre: string }

const POLL_MS = 30000

const css = `
  .ins-grid { display:grid; grid-template-columns:1fr 300px; gap:20px; align-items:start; }
  .ins-cards { display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:14px; }
  .ins-card { background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:var(--radius); padding:16px 18px; position:relative; transition:border-color .15s, box-shadow .15s; }
  .ins-card.sel { border-color:var(--accent); box-shadow:0 0 0 1px var(--accent); }
  .ins-meta { display:flex; align-items:center; gap:7px; font-size:12.5px; color:var(--text-secondary); margin-bottom:7px; }
  .ins-meta i { font-size:14px; color:var(--text-muted); }
  .ins-sel-btn {
    width:100%; padding:9px; border-radius:10px; margin-top:12px;
    border:1px solid var(--accent-hover); background:transparent; color:var(--accent-bright);
    font-family:var(--font-sans); font-size:12.5px; font-weight:700; cursor:pointer; transition:all .15s;
  }
  .ins-sel-btn:hover { background:var(--accent-muted); }
  .ins-sel-btn.sel { background:var(--accent); color:#fff; border-color:var(--accent); }
  .ins-resumen { position:sticky; top:0; }
  .ins-bottombar { display:none; }
  @media(max-width:1024px){
    .ins-grid { grid-template-columns:1fr; }
    .ins-resumen { position:static; }
  }
  @media(max-width:768px){
    .ins-resumen { display:none; }
    .ins-bottombar {
      display:flex; position:fixed; left:0; right:0; bottom:62px; z-index:80;
      background:var(--bg-elevated); border-top:1px solid var(--border-light);
      padding:12px 16px; align-items:center; justify-content:space-between; gap:12px;
    }
  }
  .stat-card {
    background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:var(--radius);
    padding:14px 20px; min-width:120px; border-left:4px solid var(--accent);
  }
  .stat-value { display:block; font-family:var(--font-mono); font-size:22px; font-weight:800; color:var(--accent-bright); }
  .stat-label { display:block; font-size:11.5px; font-weight:600; color:var(--text-secondary); margin-top:2px; text-transform:uppercase; letter-spacing:.04em; }
  .adm-card { transition:opacity .2s; }
  .adm-card.entering { animation:fadeSlideIn .25s ease-out both; }

  .sem-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:12px; }
  .sem-section { margin-bottom:24px; }
  .sem-header { font-size:13px; font-weight:800; margin-bottom:10px; text-transform:uppercase; letter-spacing:.04em; display:flex; align-items:center; gap:8px; }
  .sem-header i { color:var(--accent-bright); font-size:16px; }
  .materia-card {
    background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:12px;
    padding:12px 14px; cursor:pointer; transition:all .15s;
  }
  .materia-card:hover { border-color:var(--accent-hover); background:var(--bg-hover); }
  .materia-card.expanded { border-color:var(--accent); }
  .materia-card .inscritos-count { font-family:var(--font-mono); font-size:12px; }
  .materia-card .roll { max-height:0; overflow:hidden; transition:max-height .25s ease; }
  .materia-card.expanded .roll { max-height:400px; }

  @keyframes fadeSlideIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  .modal-overlay {
    position:fixed; inset:0; z-index:200;
    background:rgba(0,0,0,0.55); backdrop-filter:blur(3px);
    display:flex; align-items:center; justify-content:center;
    animation:fadeIn .15s ease-out;
  }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  .modal-content {
    background:var(--bg-elevated); border:1px solid var(--border-light); border-radius:var(--radius-lg);
    width:90%; max-width:680px; max-height:85vh; overflow-y:auto;
    padding:24px;
  }
  .sel-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:10px; margin:14px 0; }
  .sel-item {
    padding:1px; border-radius:10px; cursor:pointer; position:relative;
    background:var(--bg-surface); border:2px solid var(--border-subtle); transition:all .12s;
  }
  .sel-item:hover { border-color:var(--accent-hover); }
  .sel-item.checked { border-color:var(--accent); background:var(--accent-muted); }
  .sel-item.disabled { cursor:not-allowed; opacity:.55; }
  .sel-item .check { position:absolute; top:6px; right:6px; width:18px; height:18px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; }
  .sel-item.checked .check { background:var(--accent); color:#fff; }
  .sel-item.disabled .check { background:var(--success); color:#fff; }
  .sticky-modal-footer {
    position:sticky; bottom:0; background:var(--bg-elevated);
    border-top:1px solid var(--border-subtle); padding:12px 0 0; margin-top:8px;
    display:flex; justify-content:space-between; align-items:center;
  }
`

const CRED_MAX = 18
const CRED_POR_MATERIA = 4

/* ═══ ALUMNO — Proceso de Inscripción ═══════════════════════════ */

function AlumnoView({ userId }: { userId: number }) {
  const [materias, setMaterias] = useState<Materia[]>([])
  const [inscriptas, setInscriptas] = useState<Inscripcion[]>([])
  const [seleccion, setSeleccion] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    api.get<{ carrera_id: number | null }>('/users/me').then(me => {
      const carreraQuery = me.carrera_id ? `?carrera_id=${me.carrera_id}` : ''
      return Promise.all([
        api.get<Materia[]>(`/materias/${carreraQuery}`).catch(() => [] as Materia[]),
        api.get<Inscripcion[]>('/inscripciones/').catch(() => [] as Inscripcion[]),
      ])
    }).then(([mats, ins]) => {
      setMaterias(mats)
      setInscriptas(ins.filter(i => i.alumno_id === userId))
    }).finally(() => setLoading(false))
  }, [userId])

  const idsInscriptas = new Set(inscriptas.map(i => i.materia_id))
  const disponibles = materias.filter(m => !idsInscriptas.has(m.id))
  const creditos = seleccion.length * CRED_POR_MATERIA

  function toggle(id: number) {
    setSeleccion(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length * CRED_POR_MATERIA >= CRED_MAX) {
        emitToast('Alcanzaste el máximo de créditos', 'warning')
        return prev
      }
      return [...prev, id]
    })
  }

  async function preInscribir() {
    if (!seleccion.length) return
    setEnviando(true)
    let ok = 0
    for (const materia_id of seleccion) {
      try {
        await api.post('/inscripciones/', { alumno_id: userId, materia_id })
        ok++
      } catch { /* sigue con el resto */ }
    }
    setEnviando(false)
    if (ok > 0) {
      emitToast(`${ok} materia${ok > 1 ? 's' : ''} inscripta${ok > 1 ? 's' : ''} correctamente`)
      const ins = await api.get<Inscripcion[]>('/inscripciones/').catch(() => [] as Inscripcion[])
      setInscriptas(ins.filter(i => i.alumno_id === userId))
      setSeleccion([])
    } else {
      emitToast('No se pudo completar la inscripción', 'error')
    }
  }

  const cupoDe = (m: Materia) => {
    const total = m.cupos ?? 38
    const ocup = m.inscritos ?? 0
    return { ocup, total, lleno: ocup >= total * 0.8 }
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Proceso de Inscripción</h1>
          <p className="page-subtitle">Selecciona tus materias para el ciclo lectivo {new Date().getFullYear()}-{new Date().getMonth() < 6 ? 'I' : 'II'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="btn-ghost" style={{ cursor: 'default' }}><i className="ti ti-clock" /> Turno: Mañana</span>
          <span className="btn-ghost" style={{ cursor: 'default' }}><i className="ti ti-school" /> Con cupos disponibles</span>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Cargando oferta…</div>
      ) : (
        <div className="ins-grid">
          <div>
            {idsInscriptas.size > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div className="mono-label" style={{ marginBottom: 8 }}>Ya inscriptas ({idsInscriptas.size})</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[...idsInscriptas].map(id => {
                    const m = materias.find(x => x.id === id)
                    return m ? <span key={id} className="badge" style={{ background: 'var(--success-subtle)', color: 'var(--success)' }}>{m.nombre}</span> : null
                  })}
                </div>
              </div>
            )}
            {disponibles.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 46 }}>
                <i className="ti ti-circle-check" style={{ fontSize: 36, color: 'var(--success)' }} />
                <p style={{ marginTop: 10, color: 'var(--text-secondary)', fontSize: 13 }}>Ya estás inscripto en todas las materias disponibles.</p>
              </div>
            ) : (
              <div className="ins-cards">
                {disponibles.map(m => {
                  const sel = seleccion.includes(m.id)
                  const cupo = cupoDe(m)
                  return (
                    <div key={m.id} className={`ins-card${sel ? ' sel' : ''}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, paddingRight: 8 }}>{m.nombre}</div>
                        <span className="badge" style={{ background: 'var(--accent-muted)', color: 'var(--accent-bright)', flexShrink: 0 }}>{m.creditos ?? CRED_POR_MATERIA} créditos</span>
                      </div>
                      <div className="mono-label" style={{ marginBottom: 12 }}>MAT-{String(m.id).padStart(3, '0')}</div>
                      <div className="ins-meta"><i className="ti ti-user" /> {m.profesor_nombre || 'Profesor a asignar'}</div>
                      <div className="ins-meta"><i className="ti ti-calendar" /> {m.horario || 'Horario a confirmar'}</div>
                      <div style={{ marginTop: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span className="mono-label">Cupos disponibles</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: cupo.lleno ? 'var(--danger)' : 'var(--accent-bright)' }}>
                            {cupo.ocup} / {cupo.total}
                          </span>
                        </div>
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${cupo.ocup / cupo.total * 100}%`, background: cupo.lleno ? 'var(--danger)' : undefined }} />
                        </div>
                      </div>
                      <button className={`ins-sel-btn${sel ? ' sel' : ''}`} onClick={() => toggle(m.id)}>
                        {sel ? '✓ Seleccionada' : 'Seleccionar Materia'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Resumen desktop */}
          <div className="card ins-resumen">
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>Resumen de Inscripción</h3>
            <div style={{ borderRadius: 12, padding: '12px 14px', marginBottom: 14, border: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
              <div className="mono-label" style={{ marginBottom: 4 }}>Créditos Seleccionados</div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 800, color: 'var(--accent-bright)' }}>{creditos}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)' }}> /{CRED_MAX}</span>
              <div className="progress-track" style={{ marginTop: 8 }}><div className="progress-fill" style={{ width: `${creditos / CRED_MAX * 100}%` }} /></div>
            </div>
            {seleccion.length === 0 ? (
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', margin: '18px 0' }}>
                No has seleccionado materias aún.
              </p>
            ) : (
              <div style={{ marginBottom: 14 }}>
                {seleccion.map(id => {
                  const m = materias.find(x => x.id === id)
                  return (
                    <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: 12.5 }}>
                      <span style={{ fontWeight: 600 }}>{m?.nombre}</span>
                      <button onClick={() => toggle(id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex' }}>
                        <i className="ti ti-x" style={{ fontSize: 13 }} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 12 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Materias</span>
              <b style={{ fontFamily: 'var(--font-mono)' }}>{seleccion.length}</b>
            </div>
            <button className="btn-primary" style={{ width: '100%', padding: 13, letterSpacing: '0.04em' }}
              disabled={!seleccion.length || enviando} onClick={preInscribir}>
              {enviando ? 'Procesando…' : 'PRE-INSCRIBIR MATERIAS'}
            </button>
            <p style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.5 }}>
              Al hacer clic en pre-inscribir, reservás un cupo temporal por 15 minutos mientras completás el proceso.
            </p>
            <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 10, background: 'var(--info-subtle)', display: 'flex', gap: 8 }}>
              <i className="ti ti-info-circle" style={{ color: 'var(--info)', fontSize: 15, flexShrink: 0 }} />
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <b style={{ color: 'var(--text-primary)' }}>Recordatorio Académico:</b> el cupo máximo es de {CRED_MAX} créditos.
                No podés inscribir materias con solapamiento de horarios.
              </p>
            </div>
          </div>

          {/* Barra fija mobile */}
          <div className="ins-bottombar">
            <div>
              <div className="mono-label">Seleccionadas</div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{seleccion.length} Materias ({creditos} UV)</div>
            </div>
            <button className="btn-primary" disabled={!seleccion.length || enviando} onClick={preInscribir}>
              <i className="ti ti-circle-check" /> Pre-inscribir
            </button>
          </div>
        </div>
      )}
    </>
  )
}

/* ═══ ADMIN — Gestión de inscripciones ══════════════════════════ */

type AlumnoInscripto = { inscripcion_id: number; alumno_id: number; nombre: string; username: string }

type CarreraData = { id: number; nombre: string }

type MateriaConAlumnos = {
  materia_id: number
  materia_nombre: string
  codigo?: string | null
  anio?: number | null
  semestre?: number | null
  creditos?: number | null
  alumnos: AlumnoInscripto[]
}

function Skeleton({ width = '100%', height }: { width?: string | number; height: number }) {
  return (
    <div style={{
      width, height, borderRadius: 8,
      background: 'rgba(255,255,255,0.06)',
      animation: 'shimmer 1.4s ease-in-out infinite',
      backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 100%)',
      backgroundSize: '200% 100%',
    }} />
  )
}

function LoadingSkeletonAdmin() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1, 2, 3].map(i => (
        <div key={i} className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)' }}>
            <Skeleton width={180} height={18} />
          </div>
          <div style={{ padding: '12px 18px' }}>
            {[1, 2].map(j => (
              <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                <Skeleton width={28} height={28} />
                <Skeleton width={140} height={14} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 16px', borderRadius: 20, border: '1px solid var(--border-subtle)',
      background: active ? 'var(--accent)' : 'var(--bg-surface)',
      color: active ? '#fff' : 'var(--text-secondary)',
      fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
      transition: 'all .15s',
    }}>
      {children}
    </button>
  )
}

function PagControls({ total, pagina, pageSize, onChange }: { total: number; pagina: number; pageSize: number; onChange: (p: number) => void }) {
  const paginas = Math.ceil(total / pageSize)
  if (paginas <= 1) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', borderTop: '1px solid var(--border-subtle)' }}>
      <span className="mono-label">{pagina * pageSize + 1}–{Math.min((pagina + 1) * pageSize, total)} de {total}</span>
      <div style={{ display: 'flex', gap: 4 }}>
        <button className="btn-ghost" disabled={pagina === 0} onClick={() => onChange(pagina - 1)}
          style={{ padding: '5px 10px', fontSize: 11, opacity: pagina === 0 ? 0.4 : 1 }}>
          <i className="ti ti-chevron-left" />
        </button>
        {Array.from({ length: paginas }, (_, i) => (
          <button key={i} onClick={() => onChange(i)}
            style={{
              padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: i === pagina ? 'var(--accent)' : 'var(--bg-surface)',
              color: i === pagina ? '#fff' : 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, transition: 'all .12s',
            }}>
            {i + 1}
          </button>
        ))}
        <button className="btn-ghost" disabled={pagina >= paginas - 1} onClick={() => onChange(pagina + 1)}
          style={{ padding: '5px 10px', fontSize: 11, opacity: pagina >= paginas - 1 ? 0.4 : 1 }}>
          <i className="ti ti-chevron-right" />
        </button>
      </div>
    </div>
  )
}

function AdminView() {
  const [carreras, setCarreras] = useState<CarreraData[]>([])
  const [alumnos, setAlumnos] = useState<UserApi[]>([])
  const [carSelId, setCarSelId] = useState<number | null>(null)
  const [materiasConAlumnos, setMateriasConAlumnos] = useState<MateriaConAlumnos[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [anioActivo, setAnioActivo] = useState<number | null>(null)
  const [detalleMateria, setDetalleMateria] = useState<MateriaConAlumnos | null>(null)
  const [pagina, setPagina] = useState(0)
  const PAGE_SIZE = 10

  /* ── Modal enrollment ─────────────────────────────────────── */
  const [modalOpen, setModalOpen] = useState(false)
  const [modalStudent, setModalStudent] = useState<UserApi | null>(null)
  const [modalChecked, setModalChecked] = useState<Set<number>>(new Set())
  const [modalSearch, setModalSearch] = useState('')
  const [enrolling, setEnrolling] = useState(false)

  /* ── Global stats ─────────────────────────────────────────── */
  const [globalStats, setGlobalStats] = useState<{ materias: number; inscriptos: number }>({ materias: 0, inscriptos: 0 })

  async function fetchGlobalStats() {
    try {
      const [s, allIns] = await Promise.all([
        api.get<{ total_materias?: number }>('/materias/stats'),
        api.get<unknown[]>('/inscripciones/'),
      ])
      setGlobalStats({
        materias: s.total_materias ?? 0,
        inscriptos: Array.isArray(allIns) ? allIns.length : 0,
      })
    } catch { /* ignore */ }
  }

  useEffect(() => {
    Promise.all([
      api.get<CarreraData[]>('/carreras/').catch(() => [] as CarreraData[]),
      api.get<UserApi[]>('/users/').catch(() => [] as UserApi[]),
      fetchGlobalStats(),
    ]).then(([cars, users]) => {
      setCarreras(cars)
      setAlumnos(users.filter(u => u.role === 'alumno'))
    })
  }, [])

  /* Refresh global stats periodically */
  useEffect(() => {
    const timer = setInterval(fetchGlobalStats, POLL_MS)
    return () => clearInterval(timer)
  }, [])

  const cargar = useCallback(async (carreraId: number, silent?: boolean) => {
    if (!silent) setLoading(true)
    try {
      const rows = await api.get<MateriaConAlumnos[]>(`/inscripciones/carrera/${carreraId}`)
      setMateriasConAlumnos(rows)
      setLastUpdate(new Date())
      const aniosUnicos = [...new Set(rows.map(r => r.anio ?? 1))].sort((a, b) => a - b)
      setAnioActivo(prev => (prev && aniosUnicos.includes(prev)) ? prev : aniosUnicos[0] ?? null)
    } catch {
      setMateriasConAlumnos([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!carSelId) return
    const timer = setInterval(() => cargar(carSelId, true), POLL_MS)
    return () => clearInterval(timer)
  }, [carSelId, cargar])

  async function handleRefresh() {
    if (!carSelId) return
    setRefreshing(true)
    await cargar(carSelId, true)
    setRefreshing(false)
  }

  async function darBaja(inscripcionId: number) {
    try {
      await api.delete(`/inscripciones/${inscripcionId}`)
      emitToast('Inscripción eliminada')
      if (carSelId) cargar(carSelId, true)
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al eliminar', 'error')
    }
  }

  /* ── Enrollment modal ─────────────────────────────────────── */
  function abrirModal() {
    setModalSearch('')
    setModalStudent(null)
    setModalChecked(new Set())
    setModalOpen(true)
  }

  function toggleMateria(materiaId: number) {
    setModalChecked(prev => {
      const next = new Set(prev)
      if (next.has(materiaId)) next.delete(materiaId)
      else next.add(materiaId)
      return next
    })
  }

  async function ejecutarInscripcion() {
    if (!modalStudent || modalChecked.size === 0) return
    setEnrolling(true)
    let ok = 0
    for (const materiaId of modalChecked) {
      try {
        await api.post('/inscripciones/', {
          alumno_id: modalStudent.id,
          materia_id: materiaId,
        })
        ok++
      } catch { /* non-blocking */ }
    }
    setEnrolling(false)
    if (ok > 0) {
      emitToast(`${ok} materia${ok > 1 ? 's' : ''} asignada${ok > 1 ? 's' : ''} a ${modalStudent.nombre || modalStudent.username}`)
      if (carSelId) cargar(carSelId, true)
      setModalOpen(false)
    } else {
      emitToast('No se pudo completar la inscripción', 'error')
    }
  }

  const materiasFiltradas = modalSearch
    ? alumnos.filter(a =>
        (a.nombre || a.username).toLowerCase().includes(modalSearch.toLowerCase())
      ).slice(0, 10)
    : []

  const totalInscriptos = materiasConAlumnos.reduce((a, m) => a + m.alumnos.length, 0)

  /* ── Agrupar por año → semestre ──────────────────────────── */
  const grupos = new Map<number, Map<number, MateriaConAlumnos[]>>()
  for (const m of materiasConAlumnos) {
    const anio = m.anio ?? 1
    const sem = m.semestre ?? 1
    if (!grupos.has(anio)) grupos.set(anio, new Map())
    const g = grupos.get(anio)!
    if (!g.has(sem)) g.set(sem, [])
    g.get(sem)!.push(m)
  }
  const anios = [...grupos.entries()].sort(([a], [b]) => a - b)
  const semMapActual = anioActivo ? grupos.get(anioActivo) : null

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Gestión de Inscripciones</h1>
          <p className="page-subtitle">Inscribí o dá de baja alumnos por carrera</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastUpdate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-muted)' }}>
              <i className="ti ti-refresh" style={{ fontSize: 14 }} />
              <span>{lastUpdate.toLocaleTimeString()}</span>
            </div>
          )}
          {carSelId && (
            <button className="btn-ghost" onClick={handleRefresh} disabled={refreshing} style={{ padding: '9px 14px', fontSize: 12 }}>
              <i className={`ti ti-refresh${refreshing ? ' ti-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260, maxWidth: 380 }}>
          <div className="mono-label" style={{ marginBottom: 6 }}>Carrera</div>
          <select className="input-uca" value={carSelId ?? ''}
            onChange={e => { const id = Number(e.target.value); setCarSelId(id || null); setDetalleMateria(null); setAnioActivo(null); if (id) cargar(id) }}>
            <option value="">Seleccioná una carrera…</option>
            {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        {carSelId && (
          <button className="btn-primary" onClick={abrirModal} style={{ padding: '9px 18px', fontSize: 12.5 }}>
            <i className="ti ti-user-plus" /> Inscribir Alumno
          </button>
        )}
      </div>

      {/* ── Stats siempre visibles ── */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="stat-card">
          <span className="stat-value">{carSelId ? materiasConAlumnos.length : globalStats.materias}</span>
          <span className="stat-label">Materias</span>
        </div>
        <div className="stat-card" style={{ borderLeftColor: 'var(--info)' }}>
          <span className="stat-value" style={{ color: 'var(--info)' }}>{carSelId ? totalInscriptos : globalStats.inscriptos}</span>
          <span className="stat-label">Inscriptos totales</span>
        </div>
        <div className="stat-card" style={{ borderLeftColor: 'var(--success)' }}>
          <span className="stat-value" style={{ color: 'var(--success)' }}>
            {carSelId
              ? (totalInscriptos > 0 ? (totalInscriptos / materiasConAlumnos.length).toFixed(1) : '0')
              : (globalStats.materias > 0 ? (globalStats.inscriptos / globalStats.materias).toFixed(1) : '0')}
          </span>
          <span className="stat-label">Prom. por materia</span>
        </div>
      </div>

      {!carSelId ? (
        <div className="card" style={{ textAlign: 'center', padding: 56 }}>
          <i className="ti ti-clipboard-list" style={{ fontSize: 38, color: 'var(--text-muted)' }} />
          <p style={{ marginTop: 12, color: 'var(--text-secondary)', fontSize: 13 }}>Seleccioná una carrera para gestionar sus inscripciones.</p>
        </div>
      ) : loading ? (
        <LoadingSkeletonAdmin />
      ) : materiasConAlumnos.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 36 }}>
          <i className="ti ti-book-off" style={{ fontSize: 32, color: 'var(--text-muted)' }} />
          <p style={{ marginTop: 10, color: 'var(--text-secondary)', fontSize: 13 }}>Esta carrera no tiene materias o inscripciones.</p>
        </div>
      ) : detalleMateria ? null : (
        <>

          {/* ── Pills de navegación por año ── */}
          {anios.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
              {anios.map(([anio]) => (
                <Pill key={anio} active={anioActivo === anio} onClick={() => { setAnioActivo(anio); setDetalleMateria(null) }}>
                  <i className="ti ti-calendar-stats" style={{ marginRight: 5, fontSize: 12 }} />{anio}° Año
                </Pill>
              ))}
            </div>
          )}

          {/* ── Semestres del año activo ── */}
          {semMapActual && [...semMapActual.entries()].sort(([a], [b]) => a - b).map(([sem, materias]) => {
            return (
              <div key={sem} className="sem-section entering adm-card" style={{ animationDelay: `${sem * 60}ms` }}>
                <div className="sem-header" style={{ margin: 0, marginBottom: 10 }}>
                  <i className="ti ti-bookmark" />
                  {sem}° Semestre
                  <span className="mono-label" style={{ fontSize: 10, fontWeight: 400 }}>{materias.length} materias</span>
                </div>
                  <div className="sem-grid">
                    {materias.map(m => (
                        <div key={m.materia_id}
                          className="materia-card"
                          onClick={() => { setDetalleMateria(m); setPagina(0) }}
                          style={{ cursor: 'pointer' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.3 }}>{m.materia_nombre}</span>
                            <span className="inscritos-count badge"
                              style={{
                                background: m.alumnos.length > 0 ? 'var(--accent-muted)' : 'var(--bg-hover)',
                                color: m.alumnos.length > 0 ? 'var(--accent-bright)' : 'var(--text-muted)',
                                flexShrink: 0, marginLeft: 6
                              }}>
                              {m.alumnos.length}
                            </span>
                          </div>
                          <div className="mono-label" style={{ fontSize: 10 }}>
                            {m.codigo || `MAT-${String(m.materia_id).padStart(3, '0')}`}
                          </div>
                          <div style={{ fontSize: 10.5, color: 'var(--accent-bright)', marginTop: 6, fontWeight: 600 }}>
                            <i className="ti ti-arrow-right" style={{ fontSize: 10 }} /> Ver inscriptos
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )
            }
          )}
        </>
      )}

      {/* ── Detalle de materia (en lugar de vista de grid) ──────── */}
      {detalleMateria && (
        <div className="card entering adm-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
            <button className="btn-ghost" onClick={() => { setDetalleMateria(null); setPagina(0) }} style={{ padding: '6px 12px', fontSize: 12 }}>
              <i className="ti ti-arrow-left" /> Volver
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 15, fontWeight: 800 }}>{detalleMateria.materia_nombre}</span>
              <span className="mono-label" style={{ marginLeft: 8, fontSize: 10 }}>
                {detalleMateria.codigo || `MAT-${String(detalleMateria.materia_id).padStart(3, '0')}`}
              </span>
              <span className="badge" style={{ marginLeft: 8, background: 'var(--accent-muted)', color: 'var(--accent-bright)', fontSize: 10 }}>
                {detalleMateria.anio || '?'}° Año · {detalleMateria.semestre || '?'}° Semestre
              </span>
            </div>
            <button className="btn-primary" onClick={() => { setModalOpen(true); setModalSearch(''); setModalStudent(null); setModalChecked(new Set()) }}
              style={{ padding: '7px 16px', fontSize: 12, whiteSpace: 'nowrap' }}>
              <i className="ti ti-user-plus" /> Inscribir alumno
            </button>
          </div>
          {detalleMateria.alumnos.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <i className="ti ti-users" style={{ fontSize: 28, color: 'var(--text-muted)' }} />
              <p style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: 13 }}>Esta materia no tiene alumnos inscriptos.</p>
            </div>
          ) : (
            <>
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                <table className="table-uca">
                  <thead><tr><th style={{ width: 40 }}>#</th><th>Alumno</th><th>Usuario</th><th style={{ textAlign: 'right' }}>Acción</th></tr></thead>
                  <tbody>
                    {detalleMateria.alumnos.slice(pagina * PAGE_SIZE, (pagina + 1) * PAGE_SIZE).map((i, idx) => (
                      <tr key={i.inscripcion_id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{pagina * PAGE_SIZE + idx + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span className="avatar-initials" style={{ width: 28, height: 28, fontSize: 10 }}>{(i.nombre || i.username).slice(0, 2).toUpperCase()}</span>
                            <span style={{ fontWeight: 700, fontSize: 13 }}>{i.nombre || i.username}</span>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>@{i.username}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn-ghost" style={{ padding: '5px 12px', fontSize: 11, color: 'var(--danger)' }}
                            onClick={() => darBaja(i.inscripcion_id)}>
                            <i className="ti ti-trash" /> Dar de baja
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PagControls total={detalleMateria.alumnos.length} pagina={pagina} pageSize={PAGE_SIZE} onChange={setPagina} />
            </>
          )}
        </div>
      )}

      {/* ── Modal de Inscripción Individual ─────────────────────── */}
      {modalOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}>
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Inscribir Alumno</h2>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, display: 'flex' }}>
                <i className="ti ti-x" />
              </button>
            </div>

            <div style={{ marginBottom: modalStudent ? 14 : 0 }}>
              <div className="mono-label" style={{ marginBottom: 6 }}>Buscar alumno</div>
              <input className="input-uca" autoFocus
                placeholder="Nombre o usuario…"
                value={modalSearch}
                onChange={e => setModalSearch(e.target.value)}
                style={{ marginBottom: 6 }} />
              {!modalStudent && materiasFiltradas.length > 0 && (
                <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 8 }}>
                  {materiasFiltradas.map(a => (
                    <div key={a.id} onClick={() => { setModalStudent(a); setModalSearch(''); setModalChecked(new Set()) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                      <span className="avatar-initials" style={{ width: 26, height: 26, fontSize: 9 }}>{(a.nombre || a.username).slice(0, 2).toUpperCase()}</span>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 700 }}>{a.nombre || a.username}</div>
                        <div className="mono-label" style={{ fontSize: 9 }}>@{a.username}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {modalStudent && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', marginBottom: 14 }}>
                  <span className="avatar-initials" style={{ width: 28, height: 28, fontSize: 10 }}>{modalStudent.nombre?.slice(0, 2).toUpperCase() || modalStudent.username.slice(0, 2).toUpperCase()}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{modalStudent.nombre || modalStudent.username}</div>
                    <div className="mono-label" style={{ fontSize: 9 }}>@{modalStudent.username}</div>
                  </div>
                  <button onClick={() => { setModalStudent(null); setModalChecked(new Set()) }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>
                    Cambiar
                  </button>
                </div>

                <div className="mono-label" style={{ marginBottom: 8 }}>
                  Seleccioná las materias para inscribir
                </div>

                <div className="sel-grid">
                  {materiasConAlumnos.map(m => {
                    const yaInscripto = m.alumnos.some(a => a.alumno_id === modalStudent.id)
                    const checked = modalChecked.has(m.materia_id)
                    return (
                      <div key={m.materia_id}
                        className={`sel-item${checked ? ' checked' : ''}${yaInscripto ? ' disabled' : ''}`}
                        onClick={() => { if (!yaInscripto) toggleMateria(m.materia_id) }}>
                        <div className="check">
                          {yaInscripto ? <i className="ti ti-check" /> : checked ? <i className="ti ti-check" /> : null}
                        </div>
                        <div style={{ padding: '10px 10px 8px' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.3, paddingRight: 22 }}>{m.materia_nombre}</div>
                          <div className="mono-label" style={{ fontSize: 9, marginTop: 3 }}>
                            {m.codigo || `MAT-${String(m.materia_id).padStart(3, '0')}`} · {m.anio || '?'}° {m.semestre || '?'}S
                          </div>
                          {yaInscripto && (
                            <div style={{ fontSize: 10, color: 'var(--success)', fontWeight: 600, marginTop: 4 }}>
                              <i className="ti ti-circle-check" style={{ fontSize: 10 }} /> Ya inscripto
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="sticky-modal-footer">
                  <span className="mono-label">{modalChecked.size} materia{modalChecked.size !== 1 ? 's' : ''} seleccionada{modalChecked.size !== 1 ? 's' : ''}</span>
                  <button className="btn-primary" disabled={modalChecked.size === 0 || enrolling}
                    style={{ padding: '10px 22px' }}
                    onClick={ejecutarInscripcion}>
                    {enrolling ? (
                      <><i className="ti ti-loader ti-spin" /> Inscribiendo…</>
                    ) : (
                      <><i className="ti ti-circle-check" /> Inscribir {modalChecked.size} materia{modalChecked.size !== 1 ? 's' : ''}</>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

/* ═══ Router por rol ════════════════════════════════════════════ */

export default function Inscripciones() {
  const user = getCurrentUser()

  return (
    <>
      <style>{css}</style>
      {user?.role === 'alumno'
        ? <AlumnoView userId={Number(user.user_id)} />
        : <AdminView />}
    </>
  )
}
