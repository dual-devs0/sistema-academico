import { useState, useEffect, useRef } from 'react'
import { api, decodeToken, emitToast, emitAvatarUpdated } from '../lib/api'
import { getBecasActivas, type BecaActiva } from '../services/finanzasService'

type Tab = 'info' | 'seguridad' | 'preferencias'

const css = `
  .pf-hero { display:flex; gap:22px; align-items:center; flex-wrap:wrap; }
  .pf-stats { display:flex; gap:12px; flex-wrap:wrap; margin-top:14px; }
  .pf-stat { background:var(--bg-elevated); border:1px solid var(--border-subtle); border-radius:12px; padding:10px 18px; min-width:130px; }
  .pf-form { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .pf-map {
    height:190px; border-radius:14px; margin-top:10px; position:relative; overflow:hidden;
    background:
      linear-gradient(rgba(11,13,17,0.25), rgba(11,13,17,0.25)),
      repeating-linear-gradient(0deg, transparent 0 34px, rgba(255,255,255,0.05) 34px 35px),
      repeating-linear-gradient(90deg, transparent 0 34px, rgba(255,255,255,0.05) 34px 35px),
      var(--bg-elevated);
    border:1px solid var(--border-subtle);
  }
  .pf-kpis { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin:20px 0; }
  .pf-grid { display:grid; grid-template-columns:1.5fr 1fr; gap:18px; align-items:start; }
  .curso-row { display:flex; align-items:center; gap:14px; padding:12px 0; border-bottom:1px solid var(--border-subtle); }
  .curso-row:last-child { border-bottom:none; }
  .curso-badge {
    background:var(--bg-elevated); border:1px solid var(--border-subtle); border-radius:10px;
    padding:7px 10px; text-align:center; flex-shrink:0; min-width:64px;
  }
  .tag-inv { display:inline-block; background:var(--accent-muted); color:var(--accent-bright);
    font-family:var(--font-mono); font-size:10px; font-weight:700; border-radius:999px;
    padding:4px 11px; margin:0 6px 8px 0; }
  @media(max-width:900px){ .pf-form { grid-template-columns:1fr; } .pf-grid { grid-template-columns:1fr; } .pf-kpis { grid-template-columns:1fr; } }
`

/* ═══ ALUMNO / ADMIN — Perfil personal ══════════════════════════ */

function PerfilPersonal({ role, userId }: { role: string; userId: number }) {
  const [tab, setTab] = useState<Tab>('info')
  const [editing, setEditing] = useState(false)
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('+595 981 000 000')
  const [nacimiento] = useState('15/04/2001')
  const [promedio, setPromedio] = useState<number | null>(null)
  const [asistencia, setAsistencia] = useState<number | null>(null)
  const [pwNew, setPwNew] = useState('')
  const [pwConf, setPwConf] = useState('')
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [becasActivas, setBecasActivas] = useState<BecaActiva[]>([])
  const fotoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.get<{ nombre: string; email: string | null; foto_url: string | null }>('/users/me')
      .then(d => { if (d.nombre) setNombre(d.nombre); if (d.email) setEmail(d.email); if (d.foto_url) setFotoUrl(d.foto_url) })
      .catch(() => {})
    if (role === 'alumno' && userId) {
      api.get<{valor:number}[]>(`/puntajes/?user_id=${userId}`).then(pts => {
        const vals = pts.map(p => Number(p.valor)).filter(v => !isNaN(v))
        if (vals.length) setPromedio(Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10)
      }).catch(() => {})
      api.get<{presente:boolean}[]>(`/asistencias/?user_id=${userId}`).then(as => {
        if (as.length) setAsistencia(Math.round(as.filter(a => a.presente).length / as.length * 100))
      }).catch(() => {})
      
      getBecasActivas(userId)
        .then(setBecasActivas)
        .catch(() => {})
    }
  }, [role, userId])

  function guardar() {
    setEditing(false)
    emitToast('Cambios guardados')
  }

  async function subirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 3 * 1024 * 1024) { emitToast('La imagen supera 3MB', 'warning'); return }
    setSubiendoFoto(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const token = sessionStorage.getItem('token')
      const res = await fetch('/api/users/me/foto', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail || 'Error al subir la foto')
      const data = await res.json()
      setFotoUrl(data.foto_url)
      emitAvatarUpdated(data.foto_url)
      emitToast('Foto de perfil actualizada')
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al subir la foto', 'error')
    } finally { setSubiendoFoto(false) }
  }

  const roleBadge = role === 'admin' ? 'Administrador' : 'Alumno'

  return (
    <>
      {/* Hero */}
      <div className="card pf-hero" style={{ marginBottom: 20 }}>
        <div style={{ position: 'relative' }}>
          {fotoUrl ? (
            <img src={fotoUrl} alt={nombre} style={{ width: 96, height: 96, borderRadius: 22, objectFit: 'cover', display: 'block' }} />
          ) : (
            <div className="avatar-initials" style={{ width: 96, height: 96, borderRadius: 22, fontSize: 32 }}>
              {(nombre || '?').slice(0, 2)}
            </div>
          )}
          <input ref={fotoInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={subirFoto} />
          <button onClick={() => fotoInputRef.current?.click()} disabled={subiendoFoto} aria-label="Editar foto"
            style={{ position: 'absolute', bottom: -6, right: -6, width: 30, height: 30, borderRadius: 9, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className={`ti ${subiendoFoto ? 'ti-loader-2' : 'ti-pencil'}`} style={subiendoFoto ? { fontSize: 14, animation: 'spin 1s linear infinite' } : { fontSize: 14 }} />
          </button>
          <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 24, fontWeight: 900 }}>{nombre || 'Usuario'}</h1>
            <span className="badge" style={{ background: 'var(--accent-muted)', color: 'var(--accent-bright)' }}>{roleBadge}</span>
            {role === 'alumno' && becasActivas.map(b => (
              <span key={b.id} className="badge" style={{ 
                background: b.es_externa ? 'rgba(167,139,250,0.15)' : 'rgba(34,211,238,0.12)', 
                color: b.es_externa ? '#a78bfa' : '#22d3ee',
                border: `1px solid ${b.es_externa ? 'rgba(167,139,250,0.3)' : 'rgba(34,211,238,0.3)'}`
              }}>
                {b.es_externa ? '🏦 Becado ' : '🎓 Becado '}{b.fuente}
              </span>
            ))}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            {role === 'admin' ? 'División de Tecnologías — UCA' : 'Ingeniería en Tecnologías de la Información • 6to Semestre'}
          </p>
          {role === 'alumno' && (
            <div className="pf-stats">
              <div className="pf-stat">
                <div className="mono-label">Promedio General</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 800, color: 'var(--accent-bright)' }}>{promedio ?? '—'}</div>
              </div>
              <div className="pf-stat">
                <div className="mono-label">Asistencia</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 800, color: 'var(--accent-bright)' }}>{asistencia !== null ? `${asistencia}%` : '—'}</div>
              </div>
              <div className="pf-stat">
                <div className="mono-label">Créditos</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 800, color: 'var(--accent-bright)' }}>144 / 220</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="line-tabs">
          <button className={`line-tab${tab === 'info' ? ' active' : ''}`} onClick={() => setTab('info')}><i className="ti ti-user" /> Info Personal</button>
          <button className={`line-tab${tab === 'seguridad' ? ' active' : ''}`} onClick={() => setTab('seguridad')}><i className="ti ti-lock" /> Seguridad</button>
          <button className={`line-tab${tab === 'preferencias' ? ' active' : ''}`} onClick={() => setTab('preferencias')}><i className="ti ti-adjustments" /> Preferencias</button>
        </div>

        <div style={{ padding: 24 }}>
          {tab === 'info' && (
            <>
              {becasActivas.length > 0 && (
                <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-secondary)' }}>
                    Condiciones de Beca
                  </h3>
                  {becasActivas.map(b => (
                    <div key={b.id} style={{ 
                      background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', 
                      borderRadius: 14, padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'center'
                    }}>
                      <div style={{ fontSize: 24 }}>{b.es_externa ? '🏦' : '🎓'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                          {b.beca_nombre} — <span style={{ color: b.es_externa ? '#a78bfa' : '#22d3ee' }}>{b.fuente}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          Vigencia: {b.periodo_inicio} al {b.periodo_fin || 'Presente'} • Descuento: {parseFloat(b.porcentaje_descuento)}%
                        </div>
                      </div>
                      {(b.promedio_minimo_requerido || b.promedio_actual) && (
                        <div style={{ textAlign: 'right', borderLeft: '1px solid var(--border-subtle)', paddingLeft: 16 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Promedio Req.</div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15 }}>
                            {b.promedio_minimo_requerido || '—'}
                          </div>
                          <div style={{ fontSize: 11, marginTop: 4, color: b.promedio_actual && b.promedio_minimo_requerido && parseFloat(b.promedio_actual) >= parseFloat(b.promedio_minimo_requerido) ? '#10b981' : '#f59e0b' }}>
                            Actual: {b.promedio_actual || '—'}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="pf-form">
                <div>
                  <div className="mono-label" style={{ marginBottom: 6 }}>Nombre Completo</div>
                  <input className="input-uca" value={nombre} disabled={!editing} onChange={e => setNombre(e.target.value)} />
                </div>
                <div>
                  <div className="mono-label" style={{ marginBottom: 6 }}>Fecha de Nacimiento</div>
                  <input className="input-uca" value={nacimiento} disabled />
                </div>
                <div>
                  <div className="mono-label" style={{ marginBottom: 6 }}>Correo Institucional</div>
                  <input className="input-uca" value={email} disabled style={{ opacity: 0.7 }} />
                </div>
                <div>
                  <div className="mono-label" style={{ marginBottom: 6 }}>Teléfono</div>
                  <input className="input-uca" value={telefono} disabled={!editing} onChange={e => setTelefono(e.target.value)} />
                </div>
              </div>

              <h3 style={{ fontSize: 16, fontWeight: 800, marginTop: 24 }}>Ubicación</h3>
              <div className="pf-map">
                <span style={{ position: 'absolute', left: 14, bottom: 14, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.55)', borderRadius: 999, padding: '6px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700 }}>
                  <i className="ti ti-map-pin" style={{ color: 'var(--accent-bright)' }} /> Caacupé, Paraguay
                </span>
                <i className="ti ti-map-2" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42, color: 'var(--text-muted)', opacity: 0.5 }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
                {editing ? (
                  <>
                    <button className="btn-ghost" onClick={() => setEditing(false)}>Cancelar</button>
                    <button className="btn-primary" onClick={guardar}><i className="ti ti-device-floppy" /> Guardar Cambios</button>
                  </>
                ) : (
                  <button className="btn-ghost" onClick={() => setEditing(true)}><i className="ti ti-pencil" /> Editar</button>
                )}
              </div>
            </>
          )}

          {tab === 'seguridad' && (
            <div style={{ maxWidth: 380 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Cambiar contraseña</h3>
              <div className="mono-label" style={{ marginBottom: 6 }}>Nueva contraseña</div>
              <input className="input-uca" type="password" value={pwNew} onChange={e => setPwNew(e.target.value)} style={{ marginBottom: 12 }} />
              <div className="mono-label" style={{ marginBottom: 6 }}>Confirmar contraseña</div>
              <input className="input-uca" type="password" value={pwConf} onChange={e => setPwConf(e.target.value)} style={{ marginBottom: 16 }} />
              <button className="btn-primary" onClick={() => {
                if (!pwNew || pwNew !== pwConf) { emitToast('Las contraseñas no coinciden', 'error'); return }
                emitToast('Contraseña actualizada'); setPwNew(''); setPwConf('')
              }}>
                <i className="ti ti-lock-check" /> Actualizar contraseña
              </button>
            </div>
          )}

          {tab === 'preferencias' && (
            <div style={{ maxWidth: 460 }}>
              {['Notificaciones por email', 'Recordatorios de clases', 'Alertas de calificaciones'].map(p => (
                <label key={p} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: 13.5, cursor: 'pointer' }}>
                  {p}
                  <input type="checkbox" defaultChecked style={{ accentColor: 'var(--accent)', width: 17, height: 17 }} />
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/* ═══ PROFESOR — Perfil académico ═══════════════════════════════ */

function PerfilProfesor({ userId }: { userId: number }) {
  const [tab, setTab] = useState<'academico' | 'seguridad' | 'ajustes'>('academico')
  const [nombre, setNombre] = useState('')
  const [materias, setMaterias] = useState<{ id: number; nombre: string }[]>([])
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const fotoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.get<{ nombre: string; foto_url: string | null }>('/users/me').then(d => { if (d.nombre) setNombre(d.nombre); if (d.foto_url) setFotoUrl(d.foto_url) }).catch(() => {})
    api.get<{ id: number; nombre: string }[]>(`/materias/?profesor_id=${userId}`).then(setMaterias).catch(() => {})
  }, [userId])

  async function subirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 3 * 1024 * 1024) { emitToast('La imagen supera 3MB', 'warning'); return }
    setSubiendoFoto(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const token = sessionStorage.getItem('token')
      const res = await fetch('/api/users/me/foto', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail || 'Error al subir la foto')
      const data = await res.json()
      setFotoUrl(data.foto_url)
      emitAvatarUpdated(data.foto_url)
      emitToast('Foto de perfil actualizada')
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al subir la foto', 'error')
    } finally { setSubiendoFoto(false) }
  }

  const horarios = ['LUN-MIÉ 09:00', 'MAR-JUE 11:30', 'VIERNES 18:00', 'SÁB 08:00']

  return (
    <>
      {/* Hero */}
      <div className="card pf-hero" style={{ marginBottom: 20 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {fotoUrl ? (
            <img src={fotoUrl} alt={nombre} style={{ width: 104, height: 104, borderRadius: 24, objectFit: 'cover', border: '2px solid var(--accent-hover)', display: 'block' }} />
          ) : (
            <div className="avatar-initials" style={{ width: 104, height: 104, borderRadius: 24, fontSize: 34, border: '2px solid var(--accent-hover)' }}>
              {(nombre || '?').slice(0, 2)}
            </div>
          )}
          <input ref={fotoInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={subirFoto} />
          <button onClick={() => fotoInputRef.current?.click()} disabled={subiendoFoto} aria-label="Editar foto"
            style={{ position: 'absolute', bottom: -6, right: -6, width: 30, height: 30, borderRadius: 9, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className={`ti ${subiendoFoto ? 'ti-loader-2' : 'ti-pencil'}`} style={subiendoFoto ? { fontSize: 14, animation: 'spin 1s linear infinite' } : { fontSize: 14 }} />
          </button>
        </div>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <span className="badge" style={{ background: 'var(--accent-muted)', color: 'var(--accent-bright)' }}>Profesor Titular</span>
            <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>Facultad de Ingeniería y Ciencias</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 6 }}>{nombre || 'Profesor'}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 520 }}>
            Docente especializado con años de experiencia liderando cátedras y proyectos de innovación tecnológica en la región.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn-primary"><i className="ti ti-pencil" /> Editar Perfil</button>
          <button className="btn-ghost"><i className="ti ti-share" /> Compartir Perfil</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="pf-kpis">
        <div className="kpi-card">
          <div className="kpi-top"><span className="mono-label" style={{ color: 'var(--accent-bright)' }}>+2 este ciclo</span><i className="ti ti-book" style={{ color: 'var(--accent)', fontSize: 16 }} /></div>
          <div className="mono-label" style={{ marginBottom: 4 }}>Materias Dictadas</div>
          <span className="kpi-value">{materias.length || '—'}</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="mono-label" style={{ color: 'var(--accent-bright)' }}>Total acumulado</span><i className="ti ti-users" style={{ color: 'var(--accent)', fontSize: 16 }} /></div>
          <div className="mono-label" style={{ marginBottom: 4 }}>Alumnos Totales</div>
          <span className="kpi-value">1,248</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="mono-label" style={{ color: 'var(--accent-bright)' }}>Top 5% Facultad</span><i className="ti ti-star" style={{ color: 'var(--accent)', fontSize: 16 }} /></div>
          <div className="mono-label" style={{ marginBottom: 4 }}>Puntaje Feedback</div>
          <span className="kpi-value">4.92<span className="kpi-unit">/5</span></span>
        </div>
      </div>

      {/* Tabs */}
      <div className="line-tabs" style={{ marginBottom: 20 }}>
        <button className={`line-tab${tab === 'academico' ? ' active' : ''}`} onClick={() => setTab('academico')}><i className="ti ti-book" /> Académico</button>
        <button className={`line-tab${tab === 'seguridad' ? ' active' : ''}`} onClick={() => setTab('seguridad')}><i className="ti ti-shield" /> Seguridad</button>
        <button className={`line-tab${tab === 'ajustes' ? ' active' : ''}`} onClick={() => setTab('ajustes')}><i className="ti ti-adjustments" /> Ajustes</button>
      </div>

      {tab === 'academico' && (
        <div className="pf-grid">
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h2 style={{ fontSize: 19, fontWeight: 800 }}>Cursos Vigentes</h2>
              <span className="mono-label" style={{ color: 'var(--accent-bright)', cursor: 'pointer' }}>Ver Historial</span>
            </div>
            {materias.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '14px 0' }}>Sin materias asignadas este ciclo.</p>
            ) : materias.map((m, i) => (
              <div key={m.id} className="curso-row">
                <div className="curso-badge">
                  <div className="mono-label" style={{ fontSize: 8.5 }}>{horarios[i % horarios.length].split(' ')[0]}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 800 }}>{horarios[i % horarios.length].split(' ')[1]}</div>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{m.nombre}</div>
                  <div className="mono-label" style={{ fontSize: 9.5 }}>Código: CS-{400 + m.id} • Cátedra activa</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}><i className="ti ti-flask" style={{ color: 'var(--accent-bright)' }} /> Líneas de Investigación</h3>
              {['Machine Learning', 'Natural Language Processing', 'Data Ethics', 'Neural Networks'].map(t => <span key={t} className="tag-inv">{t}</span>)}
            </div>
            <div className="card">
              <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}><i className="ti ti-file-text" style={{ color: 'var(--accent-bright)' }} /> Publicaciones Recientes</h3>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>"Optimización de Redes Neuronales en entornos distribuidos"</div>
                <div className="mono-label" style={{ fontSize: 9 }}>IEEE Journal of AI • 2023</div>
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>"Ética en el despliegue de modelos de lenguaje masivos"</div>
                <div className="mono-label" style={{ fontSize: 9 }}>Academic Press • 2024</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'seguridad' && (
        <div className="card" style={{ textAlign: 'center', padding: 42 }}>
          <i className="ti ti-shield-lock" style={{ fontSize: 36, color: 'var(--accent)' }} />
          <p style={{ marginTop: 10, fontSize: 13, color: 'var(--text-secondary)' }}>Gestión de contraseña y sesiones — próximamente.</p>
        </div>
      )}
      {tab === 'ajustes' && (
        <div className="card" style={{ maxWidth: 460 }}>
          {['Notificaciones de inscripciones', 'Alertas de asistencia baja', 'Resumen semanal por email'].map(p => (
            <label key={p} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: 13.5, cursor: 'pointer' }}>
              {p}
              <input type="checkbox" defaultChecked style={{ accentColor: 'var(--accent)', width: 17, height: 17 }} />
            </label>
          ))}
        </div>
      )}
    </>
  )
}

/* ═══ Router por rol ════════════════════════════════════════════ */

export default function Perfil() {
  const token = sessionStorage.getItem('token')
  const user = token ? decodeToken(token) : null
  const role = user?.role ?? 'alumno'
  const userId = Number(user?.user_id ?? 0)

  return (
    <>
      <style>{css}</style>
      {role === 'profesor'
        ? <PerfilProfesor userId={userId} />
        : <PerfilPersonal role={role} userId={userId} />}
    </>
  )
}
