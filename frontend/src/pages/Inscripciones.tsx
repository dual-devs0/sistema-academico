import { useState, useEffect } from 'react'
import { api, getCurrentUser, emitToast } from '../lib/api'

type Materia = { id: number; nombre: string; profesor_nombre?: string | null; creditos?: number | null; cupos?: number | null; horario?: string | null; secciones?: number | null; inscritos?: number | null }
type Inscripcion = { id: number; alumno_id: number; materia_id: number }
type UserApi = { id: number; username: string; role: string; nombre: string }

const css = `
  .ins-grid { display:grid; grid-template-columns:1fr 300px; gap:20px; align-items:start; }
  .ins-cards { display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:14px; }
  .ins-card { background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:var(--radius); padding:16px 18px; position:relative; transition:border-color .15s; }
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
  alumnos: AlumnoInscripto[]
}

function AdminView() {
  const [carreras, setCarreras] = useState<CarreraData[]>([])
  const [alumnos, setAlumnos] = useState<UserApi[]>([])
  const [carSelId, setCarSelId] = useState<number | null>(null)
  const [materiasConAlumnos, setMateriasConAlumnos] = useState<MateriaConAlumnos[]>([])
  const [loading, setLoading] = useState(false)
  const [alSearch, setAlSearch] = useState('')
  const [addOpenForMateria, setAddOpenForMateria] = useState<number | null>(null)

  useEffect(() => {
    Promise.all([
      api.get<CarreraData[]>('/carreras/').catch(() => [] as CarreraData[]),
      api.get<UserApi[]>('/users/').catch(() => [] as UserApi[]),
    ]).then(([cars, users]) => {
      setCarreras(cars)
      setAlumnos(users.filter(u => u.role === 'alumno'))
    })
  }, [])

  function cargar(carreraId: number) {
    setLoading(true)
    api.get<MateriaConAlumnos[]>(`/inscripciones/carrera/${carreraId}`)
      .then(rows => setMateriasConAlumnos(rows))
      .catch(() => setMateriasConAlumnos([]))
      .finally(() => setLoading(false))
  }

  async function inscribir(alumnoId: number, materiaId: number) {
    try {
      await api.post('/inscripciones/', { alumno_id: alumnoId, materia_id: materiaId })
      emitToast('Alumno inscripto')
      if (carSelId) cargar(carSelId)
      setAddOpenForMateria(null)
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al inscribir', 'error')
    }
  }

  async function darBaja(inscripcionId: number) {
    try {
      await api.delete(`/inscripciones/${inscripcionId}`)
      emitToast('Inscripción eliminada')
      if (carSelId) cargar(carSelId)
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al eliminar', 'error')
    }
  }

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <h1 className="page-title">Gestión de Inscripciones</h1>
        <p className="page-subtitle">Inscribí o dá de baja alumnos por carrera</p>
      </div>

      <div style={{ maxWidth: 420, marginBottom: 20 }}>
        <div className="mono-label" style={{ marginBottom: 6 }}>Carrera</div>
        <select className="input-uca" value={carSelId ?? ''} onChange={e => { const id = Number(e.target.value); setCarSelId(id || null); if (id) cargar(id) }}>
          <option value="">Seleccioná una carrera…</option>
          {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      {!carSelId ? (
        <div className="card" style={{ textAlign: 'center', padding: 56 }}>
          <i className="ti ti-clipboard-list" style={{ fontSize: 38, color: 'var(--text-muted)' }} />
          <p style={{ marginTop: 12, color: 'var(--text-secondary)', fontSize: 13 }}>Seleccioná una carrera para gestionar sus inscripciones.</p>
        </div>
      ) : loading ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Cargando…</div>
      ) : materiasConAlumnos.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 36 }}>
          <i className="ti ti-book-off" style={{ fontSize: 32, color: 'var(--text-muted)' }} />
          <p style={{ marginTop: 10, color: 'var(--text-secondary)', fontSize: 13 }}>Esta carrera no tiene materias o inscripciones.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {materiasConAlumnos.map(mca => (
            <div key={mca.materia_id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 800 }}>{mca.materia_nombre}</span>
                  <span className="badge" style={{ marginLeft: 10, background: 'var(--accent-muted)', color: 'var(--accent-bright)' }}>{mca.alumnos.length} inscriptos</span>
                </div>
                <button className="btn-primary" style={{ padding: '7px 14px', fontSize: 12 }} onClick={() => { setAddOpenForMateria(mca.materia_id); setAlSearch('') }}>
                  <i className="ti ti-user-plus" /> Inscribir alumno
                </button>
              </div>
              {mca.alumnos.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>Sin alumnos inscriptos.</div>
              ) : (
                <table className="table-uca">
                  <thead><tr><th>Alumno</th><th>Usuario</th><th style={{ textAlign: 'right' }}>Acciones</th></tr></thead>
                  <tbody>
                    {mca.alumnos.map(i => (
                      <tr key={i.inscripcion_id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span className="avatar-initials" style={{ width: 28, height: 28, fontSize: 10 }}>{(i.nombre || i.username).slice(0, 2)}</span>
                            <span style={{ fontWeight: 700, fontSize: 13 }}>{i.nombre || i.username}</span>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>@{i.username}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn-ghost" style={{ padding: '5px 12px', fontSize: 11, color: 'var(--danger)' }} onClick={() => darBaja(i.inscripcion_id)}>
                            <i className="ti ti-trash" /> Dar de baja
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {addOpenForMateria === mca.materia_id && (
                <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '14px 18px', background: 'var(--bg-elevated)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span className="mono-label">Inscribir alumno a {mca.materia_nombre}</span>
                    <button onClick={() => setAddOpenForMateria(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><i className="ti ti-x" /></button>
                  </div>
                  <input className="input-uca" autoFocus placeholder="Buscar alumno…" value={alSearch} onChange={e => setAlSearch(e.target.value)} style={{ marginBottom: 10 }} />
                  <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                    {(() => {
                      const idsInscriptos = new Set(mca.alumnos.map(a => a.alumno_id))
                      const noInscriptos = alumnos.filter(a =>
                        !idsInscriptos.has(a.id) &&
                        (a.nombre || a.username).toLowerCase().includes(alSearch.toLowerCase())
                      )
                      return noInscriptos.map(a => (
                        <div key={a.id} onClick={() => inscribir(a.id, mca.materia_id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, cursor: 'pointer' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                          <span className="avatar-initials" style={{ width: 28, height: 28, fontSize: 10 }}>{(a.nombre || a.username).slice(0, 2)}</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>{a.nombre || a.username}</div>
                            <div className="mono-label" style={{ fontSize: 9 }}>@{a.username}</div>
                          </div>
                        </div>
                      ))
                    })()}
                    {alumnos.filter(a =>
                      !new Set(mca.alumnos.map(x => x.alumno_id)).has(a.id) &&
                      (a.nombre || a.username).toLowerCase().includes(alSearch.toLowerCase())
                    ).length === 0 && <p style={{ fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center', padding: 14 }}>Sin resultados.</p>}
                  </div>
                </div>
              )}
            </div>
          ))}
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
