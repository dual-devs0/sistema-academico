import { useState, useEffect, useRef } from 'react'
import { api, getCurrentUser, getAccessToken, emitToast, emitAvatarUpdated } from '../lib/api'
import { getBecasActivas, type BecaActiva } from '../services/finanzasService'
import { getCondicionEgreso, type CondicionEgreso } from '../services/graduacionService'
import { obtenerMiHistorico, type PeriodoHistorico } from '../services/historicoService'

type Tab = 'info' | 'seguridad' | 'preferencias'

const css = `
  .pf-hero { display:flex; gap:22px; align-items:center; flex-wrap:wrap; }
  .pf-stats { display:flex; gap:12px; flex-wrap:wrap; margin-top:14px; }
  .pf-stat { background:var(--bg-elevated); border:1px solid var(--border-subtle); border-radius:12px; padding:10px 18px; min-width:130px; }
  .pf-form { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .pf-kpis { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin:20px 0; }
  .pf-grid { display:grid; grid-template-columns:1.5fr 1fr; gap:18px; align-items:start; }
  .curso-row { display:flex; align-items:center; gap:14px; padding:12px 0; border-bottom:1px solid var(--border-subtle); }
  .curso-row:last-child { border-bottom:none; }
  .curso-badge {
    background:var(--bg-elevated); border:1px solid var(--border-subtle); border-radius:10px;
    padding:7px 10px; text-align:center; flex-shrink:0; min-width:64px;
  }
  .pf-error-banner {
    padding:10px 14px; border-radius:10px; background:rgba(239,68,68,.12); border:1px solid rgba(239,68,68,.3);
    color:#ef4444; font-size:12.5px; display:flex; align-items:center; gap:8px; margin-bottom:16px;
  }
  @media(max-width:900px){ .pf-form { grid-template-columns:1fr; } .pf-grid { grid-template-columns:1fr; } .pf-kpis { grid-template-columns:1fr; } }
`

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div className="pf-error-banner">
      <i className="ti ti-alert-triangle" /> {msg}
    </div>
  )
}

/* ═══ ALUMNO / ADMIN — Perfil personal ══════════════════════════ */

interface MeData {
  nombre: string
  email: string | null
  foto_url: string | null
  carrera_nombre: string | null
  legajo: string | null
  fecha_ingreso: string | null
}

function PerfilPersonal({ role, userId }: { role: string; userId: number }) {
  const [tab, setTab] = useState<Tab>('info')
  const [editing, setEditing] = useState(false)
  const [savingNombre, setSavingNombre] = useState(false)
  const [nombre, setNombre] = useState('')
  const [nombreOriginal, setNombreOriginal] = useState('')
  const [email, setEmail] = useState('')
  const [carreraNombre, setCarreraNombre] = useState<string | null>(null)
  const [legajo, setLegajo] = useState<string | null>(null)
  const [fechaIngreso, setFechaIngreso] = useState<string | null>(null)
  const [promedio, setPromedio] = useState<number | null>(null)
  const [asistencia, setAsistencia] = useState<number | null>(null)
  const [condicion, setCondicion] = useState<CondicionEgreso | null>(null)
  const [pwNew, setPwNew] = useState('')
  const [pwConf, setPwConf] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [becasActivas, setBecasActivas] = useState<BecaActiva[]>([])
  const [errorMe, setErrorMe] = useState<string | null>(null)
  const fotoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.get<MeData>('/users/me')
      .then(d => {
        setErrorMe(null)
        setNombre(d.nombre || '')
        setNombreOriginal(d.nombre || '')
        setEmail(d.email || '')
        setFotoUrl(d.foto_url || null)
        setCarreraNombre(d.carrera_nombre ?? null)
        setLegajo(d.legajo ?? null)
        setFechaIngreso(d.fecha_ingreso ?? null)
      })
      .catch(() => setErrorMe('No se pudieron cargar tus datos de perfil. Reintentá en unos minutos.'))
    if (role === 'alumno' && userId) {
      api.get<{ valor: number }[]>(`/puntajes/?user_id=${userId}`).then(pts => {
        const vals = pts.map(p => Number(p.valor)).filter(v => !isNaN(v))
        if (vals.length) setPromedio(Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10)
      }).catch(() => {})
      api.get<{ presente: boolean }[]>(`/asistencias/?user_id=${userId}`).then(as => {
        if (as.length) setAsistencia(Math.round(as.filter(a => a.presente).length / as.length * 100))
      }).catch(() => {})
      getBecasActivas(userId).then(setBecasActivas).catch(() => {})
      getCondicionEgreso(userId).then(setCondicion).catch(() => {})
    }
  }, [role, userId])

  async function guardar() {
    if (!nombre.trim()) { emitToast('El nombre no puede estar vacío', 'error'); return }
    if (nombre === nombreOriginal) { setEditing(false); return }
    setSavingNombre(true)
    try {
      if (role === 'admin') {
        await api.patch(`/users/${userId}`, { nombre })
      } else {
        await api.patch('/alumno/mi-perfil', { nombre })
      }
      setNombreOriginal(nombre)
      setEditing(false)
      emitToast('Cambios guardados')
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al guardar los cambios', 'error')
    } finally { setSavingNombre(false) }
  }

  async function subirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 3 * 1024 * 1024) { emitToast('La imagen supera 3MB', 'warning'); return }
    setSubiendoFoto(true)
    try {
      const form = new FormData()
      form.append('foto', file)
      const token = getAccessToken()
      const res = await fetch('/api/users/me/foto', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail || 'Error al subir la foto')
      const data = await res.json()
      setFotoUrl(data.url)
      emitAvatarUpdated(data.url)
      emitToast('Foto de perfil actualizada')
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al subir la foto', 'error')
    } finally { setSubiendoFoto(false) }
  }

  const roleBadge = role === 'admin' ? 'Administrador' : 'Alumno'

  return (
    <>
      {errorMe && <ErrorBanner msg={errorMe} />}
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
            {role === 'admin' ? 'Administración — UCA' : (carreraNombre || 'Sin carrera asignada')}
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
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 800, color: 'var(--accent-bright)' }}>
                  {condicion ? `${condicion.creditos_aprobados} / ${condicion.creditos_totales}` : '—'}
                </div>
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
                  <div className="mono-label" style={{ marginBottom: 6 }}>Correo Institucional</div>
                  <input className="input-uca" value={email} disabled style={{ opacity: 0.7 }} />
                </div>
                <div>
                  <div className="mono-label" style={{ marginBottom: 6 }}>Legajo</div>
                  <input className="input-uca" value={legajo || '—'} disabled style={{ opacity: 0.7 }} />
                </div>
                <div>
                  <div className="mono-label" style={{ marginBottom: 6 }}>Fecha de Ingreso</div>
                  <input className="input-uca" value={fechaIngreso || '—'} disabled style={{ opacity: 0.7 }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
                {editing ? (
                  <>
                    <button className="btn-ghost" disabled={savingNombre} onClick={() => { setNombre(nombreOriginal); setEditing(false) }}>Cancelar</button>
                    <button className="btn-primary" disabled={savingNombre} onClick={guardar}>
                      <i className={`ti ${savingNombre ? 'ti-loader-2' : 'ti-device-floppy'}`} style={savingNombre ? { animation: 'spin 1s linear infinite' } : {}} /> {savingNombre ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
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
              <button className="btn-primary" disabled={pwLoading} onClick={async () => {
                if (!pwNew || pwNew !== pwConf) { emitToast('Las contraseñas no coinciden', 'error'); return }
                if (pwNew.length < 8) { emitToast('La contraseña debe tener al menos 8 caracteres', 'error'); return }
                setPwLoading(true)
                try {
                  if (role === 'admin') {
                    await api.patch(`/users/${userId}`, { password: pwNew })
                  } else {
                    await api.patch('/alumno/mi-perfil', { password: pwNew })
                  }
                  emitToast('Contraseña actualizada correctamente')
                  setPwNew(''); setPwConf('')
                } catch (e: unknown) {
                  const msg = e instanceof Error ? e.message : 'Error al actualizar contraseña'
                  emitToast(msg, 'error')
                } finally { setPwLoading(false) }
              }}>
                <i className={`ti ${pwLoading ? 'ti-loader-2' : 'ti-lock-check'}`} style={pwLoading ? { animation: 'spin 1s linear infinite' } : {}} /> {pwLoading ? 'Actualizando...' : 'Actualizar contraseña'}
              </button>
            </div>
          )}

          {tab === 'preferencias' && (
            <div style={{ maxWidth: 460, textAlign: 'center', padding: '30px 0' }}>
              <i className="ti ti-bell" style={{ fontSize: 32, color: 'var(--accent)' }} />
              <p style={{ marginTop: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                La configuración de notificaciones estará disponible próximamente.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/* ═══ PROFESOR — Perfil académico ═══════════════════════════════ */

function PerfilProfesor({ userId }: { userId: number }) {
  const [tab, setTab] = useState<'academico' | 'seguridad'>('academico')
  const [editing, setEditing] = useState(false)
  const [savingNombre, setSavingNombre] = useState(false)
  const [nombre, setNombre] = useState('')
  const [nombreOriginal, setNombreOriginal] = useState('')
  const [historico, setHistorico] = useState<PeriodoHistorico[]>([])
  const [errorHistorico, setErrorHistorico] = useState<string | null>(null)
  const [errorMe, setErrorMe] = useState<string | null>(null)
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const fotoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.get<{ nombre: string; foto_url: string | null }>('/users/me')
      .then(d => { setNombre(d.nombre || ''); setNombreOriginal(d.nombre || ''); setFotoUrl(d.foto_url || null); setErrorMe(null) })
      .catch(() => setErrorMe('No se pudieron cargar tus datos de perfil. Reintentá en unos minutos.'))
    obtenerMiHistorico()
      .then(setHistorico)
      .catch(() => setErrorHistorico('No se pudo cargar tu histórico de cátedras.'))
  }, [userId])

  async function guardar() {
    if (!nombre.trim()) { emitToast('El nombre no puede estar vacío', 'error'); return }
    if (nombre === nombreOriginal) { setEditing(false); return }
    setSavingNombre(true)
    try {
      await api.patch(`/users/${userId}`, { nombre })
      setNombreOriginal(nombre)
      setEditing(false)
      emitToast('Cambios guardados')
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al guardar los cambios', 'error')
    } finally { setSavingNombre(false) }
  }

  async function subirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 3 * 1024 * 1024) { emitToast('La imagen supera 3MB', 'warning'); return }
    setSubiendoFoto(true)
    try {
      const form = new FormData()
      form.append('foto', file)
      const token = getAccessToken()
      const res = await fetch('/api/users/me/foto', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail || 'Error al subir la foto')
      const data = await res.json()
      setFotoUrl(data.url)
      emitAvatarUpdated(data.url)
      emitToast('Foto de perfil actualizada')
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al subir la foto', 'error')
    } finally { setSubiendoFoto(false) }
  }

  const catedrasActuales = historico[0]?.catedras ?? []
  const totalAlumnos = historico.length
    ? historico[0].catedras.reduce((sum, c) => sum + c.cantidad_alumnos, 0)
    : 0
  const promediosGrupo = catedrasActuales.map(c => c.promedio_grupo).filter((v): v is number => v !== null)
  const promedioGeneral = promediosGrupo.length
    ? Math.round(promediosGrupo.reduce((a, b) => a + b, 0) / promediosGrupo.length * 10) / 10
    : null

  return (
    <>
      {errorMe && <ErrorBanner msg={errorMe} />}
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
          <span className="badge" style={{ background: 'var(--accent-muted)', color: 'var(--accent-bright)', marginBottom: 8, display: 'inline-block' }}>Profesor</span>
          {editing ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '4px 0 6px' }}>
              <input className="input-uca" value={nombre} onChange={e => setNombre(e.target.value)} style={{ fontSize: 18, fontWeight: 800, maxWidth: 320 }} disabled={savingNombre} />
            </div>
          ) : (
            <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 6 }}>{nombre || 'Profesor'}</h1>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {editing ? (
            <>
              <button className="btn-primary" disabled={savingNombre} onClick={guardar}>
                <i className={`ti ${savingNombre ? 'ti-loader-2' : 'ti-device-floppy'}`} style={savingNombre ? { animation: 'spin 1s linear infinite' } : {}} /> {savingNombre ? 'Guardando...' : 'Guardar'}
              </button>
              <button className="btn-ghost" disabled={savingNombre} onClick={() => { setNombre(nombreOriginal); setEditing(false) }}>Cancelar</button>
            </>
          ) : (
            <button className="btn-primary" onClick={() => setEditing(true)}><i className="ti ti-pencil" /> Editar Perfil</button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="pf-kpis">
        <div className="kpi-card">
          <div className="kpi-top"><i className="ti ti-book" style={{ color: 'var(--accent)', fontSize: 16 }} /></div>
          <div className="mono-label" style={{ marginBottom: 4 }}>Cátedras Vigentes</div>
          <span className="kpi-value">{catedrasActuales.length || '—'}</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><i className="ti ti-users" style={{ color: 'var(--accent)', fontSize: 16 }} /></div>
          <div className="mono-label" style={{ marginBottom: 4 }}>Alumnos Totales</div>
          <span className="kpi-value">{catedrasActuales.length ? totalAlumnos : '—'}</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><i className="ti ti-chart-bar" style={{ color: 'var(--accent)', fontSize: 16 }} /></div>
          <div className="mono-label" style={{ marginBottom: 4 }}>Promedio de Grupo</div>
          <span className="kpi-value">{promedioGeneral ?? '—'}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="line-tabs" style={{ marginBottom: 20 }}>
        <button className={`line-tab${tab === 'academico' ? ' active' : ''}`} onClick={() => setTab('academico')}><i className="ti ti-book" /> Académico</button>
        <button className={`line-tab${tab === 'seguridad' ? ' active' : ''}`} onClick={() => setTab('seguridad')}><i className="ti ti-shield" /> Seguridad</button>
      </div>

      {tab === 'academico' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h2 style={{ fontSize: 19, fontWeight: 800 }}>Cátedras Vigentes</h2>
          </div>
          {errorHistorico && <ErrorBanner msg={errorHistorico} />}
          {catedrasActuales.length === 0 && !errorHistorico ? (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '14px 0' }}>Sin cátedras asignadas este ciclo.</p>
          ) : catedrasActuales.map(c => (
            <div key={c.materia_id} className="curso-row">
              <div className="curso-badge">
                <div className="mono-label" style={{ fontSize: 8.5 }}>Alumnos</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 800 }}>{c.cantidad_alumnos}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{c.materia_nombre}</div>
                <div className="mono-label" style={{ fontSize: 9.5 }}>{c.carrera_nombre || 'Sin carrera'} • {historico[0]?.periodo}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mono-label" style={{ fontSize: 9.5 }}>Aprobación</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-bright)' }}>{c.porcentaje_aprobacion !== null ? `${c.porcentaje_aprobacion}%` : '—'}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'seguridad' && (
        <div className="card" style={{ textAlign: 'center', padding: 42 }}>
          <i className="ti ti-shield-lock" style={{ fontSize: 36, color: 'var(--accent)' }} />
          <p style={{ marginTop: 10, fontSize: 13, color: 'var(--text-secondary)' }}>Gestión de contraseña y sesiones — próximamente.</p>
        </div>
      )}
    </>
  )
}

/* ═══ Router por rol ════════════════════════════════════════════ */

export default function Perfil() {
  const user = getCurrentUser()
  const role = (user?.role ?? 'alumno').toLowerCase().trim()
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
