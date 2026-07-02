import { useState, useEffect } from 'react'
import { api, emitToast } from '../lib/api'

type MateriaRaw = { id: number; nombre: string; profesor_id: number | null; carrera_id: number | null; anio: number | null; semestre: number | null; profesor_nombre?: string | null; carrera_nombre?: string | null }
type Profe = { id: number; username: string; nombre: string; role: string }

const facultadCfg = [
  { label: 'INGENIERÍA', color: 'var(--info)', bg: 'var(--info-subtle)' },
  { label: 'HUMANIDADES', color: 'var(--warning)', bg: 'var(--warning-subtle)' },
  { label: 'ECONOMÍA', color: 'var(--success)', bg: 'var(--success-subtle)' },
]

const css = `
  .of-periodos { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:20px; }
  .of-periodo { background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:var(--radius); padding:16px 18px; }
  .of-nuevo { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; border-style:dashed; cursor:pointer; color:var(--text-secondary); transition:border-color .15s; }
  .of-nuevo:hover { border-color:var(--accent); color:var(--text-primary); }
  .switch { position:relative; width:40px; height:22px; border-radius:999px; background:var(--bg-elevated); cursor:pointer; transition:background .2s; border:none; }
  .switch.on { background:var(--accent); }
  .switch::after { content:''; position:absolute; top:3px; left:3px; width:16px; height:16px; border-radius:50%; background:#fff; transition:transform .2s; }
  .switch.on::after { transform:translateX(18px); }
  .sec-chip { display:inline-flex; align-items:center; justify-content:center; min-width:24px; height:22px; padding:0 6px; border-radius:7px; background:var(--bg-elevated); font-family:var(--font-mono); font-size:10px; font-weight:700; color:var(--text-secondary); margin-right:5px; }
  @media(max-width:900px){ .of-periodos { grid-template-columns:1fr; } }
`

export default function Materias() {
  const [materias, setMaterias] = useState<MateriaRaw[]>([])
  const [profes, setProfes] = useState<Profe[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('Todos')
  const [insActiva, setInsActiva] = useState(true)
  const [modActiva, setModActiva] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [draft, setDraft] = useState({ nombre: '', profesorId: '', anio: new Date().getFullYear(), semestre: 1 })
  const [saving, setSaving] = useState(false)

  function cargar() {
    Promise.all([
      api.get<MateriaRaw[]>('/materias/'),
      api.get<Profe[]>('/users/').catch(() => [] as Profe[]),
    ]).then(([mats, users]) => {
      setMaterias(mats)
      setProfes(users.filter(u => u.role === 'profesor'))
    }).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(cargar, [])

  async function crear() {
    if (!draft.nombre) { emitToast('Ingresá el nombre de la materia', 'warning'); return }
    setSaving(true)
    try {
      await api.post('/materias/', {
        nombre: draft.nombre,
        profesor_id: draft.profesorId ? Number(draft.profesorId) : null,
        anio: draft.anio,
        semestre: draft.semestre,
      })
      emitToast('Materia creada')
      setModalOpen(false)
      setDraft({ nombre: '', profesorId: '', anio: new Date().getFullYear(), semestre: 1 })
      cargar()
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al crear materia', 'error')
    } finally { setSaving(false) }
  }

  const fac = (id: number) => facultadCfg[id % facultadCfg.length]
  const cupo = (id: number) => { const o = (id * 13) % 120; const t = 120; return { o, t, pct: Math.round(o / t * 100) } }

  const filtradas = filtro === 'Todos' ? materias : materias.filter(m => fac(m.id).label.toLowerCase().startsWith(filtro.toLowerCase().slice(0, 4)))

  return (
    <>
      <style>{css}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Oferta Académica</h1>
          <p className="page-subtitle">Gestiona el catálogo de materias, secciones y periodos de inscripción para el ciclo actual.</p>
        </div>
        <button className="btn-primary" onClick={() => setModalOpen(true)}><i className="ti ti-plus" /> Nueva Materia</button>
      </div>

      {/* Períodos */}
      <div className="of-periodos">
        <div className="of-periodo">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="mono-label">Período {new Date().getFullYear()}-{new Date().getMonth() < 6 ? '01' : '02'}</span>
            <i className="ti ti-calendar-check" style={{ color: 'var(--accent-bright)' }} />
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 12 }}>Inscripción Ordinaria</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="badge" style={{ background: insActiva ? 'var(--success-subtle)' : 'var(--bg-elevated)', color: insActiva ? 'var(--success)' : 'var(--text-muted)' }}>
              {insActiva ? '● ACTIVO' : 'INACTIVO'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="mono-label">Habilitar</span>
              <button className={`switch${insActiva ? ' on' : ''}`} onClick={() => setInsActiva(v => !v)} aria-label="Habilitar inscripción" />
            </span>
          </div>
        </div>
        <div className="of-periodo">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="mono-label">Período {new Date().getFullYear()}-{new Date().getMonth() < 6 ? '01' : '02'}</span>
            <i className="ti ti-calendar-cog" style={{ color: 'var(--text-muted)' }} />
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 12 }}>Modificación de Carga</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="badge" style={{ background: modActiva ? 'var(--success-subtle)' : 'var(--bg-elevated)', color: modActiva ? 'var(--success)' : 'var(--text-muted)' }}>
              {modActiva ? '● ACTIVO' : 'INACTIVO'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="mono-label">Habilitar</span>
              <button className={`switch${modActiva ? ' on' : ''}`} onClick={() => setModActiva(v => !v)} aria-label="Habilitar modificación" />
            </span>
          </div>
        </div>
        <div className="of-periodo of-nuevo" onClick={() => emitToast('Programación de períodos — próximamente', 'warning')}>
          <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-plus" />
          </span>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Programar Nuevo Período</span>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Todos', 'Ingeniería', 'Humanidades', 'Economía'].map(f => (
            <button key={f} className={`pill-tab${filtro === f ? ' active' : ''}`} onClick={() => setFiltro(f)}>{f}</button>
          ))}
        </div>
        <span className="mono-label">Mostrando {filtradas.length} materias de {materias.length}</span>
      </div>

      {/* Tabla */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Cargando catálogo…</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table-uca">
              <thead>
                <tr><th>Materia / Código</th><th>Facultad</th><th>Secciones</th><th>Cupos (Ocup/Total)</th><th style={{ textAlign: 'right' }}>Acciones</th></tr>
              </thead>
              <tbody>
                {filtradas.map(m => {
                  const f = fac(m.id)
                  const c = cupo(m.id)
                  return (
                    <tr key={m.id}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{m.nombre}</div>
                        <div className="mono-label" style={{ fontSize: 9.5 }}>INF-{String(m.id).padStart(3, '0')}{m.profesor_nombre ? ` • ${m.profesor_nombre}` : ''}</div>
                      </td>
                      <td><span className="badge" style={{ background: f.bg, color: f.color }}>{f.label}</span></td>
                      <td>
                        <span className="sec-chip">S1</span><span className="sec-chip">S2</span>
                        {m.id % 3 === 0 && <span className="sec-chip" style={{ background: 'var(--accent-muted)', color: 'var(--accent-bright)' }}>+1</span>}
                      </td>
                      <td style={{ minWidth: 160 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{c.o} / {c.t}</span>
                          <div className="progress-track" style={{ flex: 1 }}>
                            <div className="progress-fill" style={{ width: `${c.pct}%`, background: c.pct >= 95 ? 'var(--danger)' : undefined }} />
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: c.pct >= 95 ? 'var(--danger)' : 'var(--text-muted)' }}>{c.pct}%</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn-ghost" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => emitToast('Edición de materia — próximamente', 'warning')}>
                          <i className="ti ti-dots" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal nueva materia */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card card-elevated" style={{ width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>Nueva Materia</h3>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><i className="ti ti-x" /></button>
            </div>
            <div className="mono-label" style={{ marginBottom: 6 }}>Nombre</div>
            <input className="input-uca" value={draft.nombre} onChange={e => setDraft(d => ({ ...d, nombre: e.target.value }))} style={{ marginBottom: 12 }} autoFocus />
            <div className="mono-label" style={{ marginBottom: 6 }}>Profesor</div>
            <select className="input-uca" value={draft.profesorId} onChange={e => setDraft(d => ({ ...d, profesorId: e.target.value }))} style={{ marginBottom: 12 }}>
              <option value="">Sin asignar</option>
              {profes.map(p => <option key={p.id} value={p.id}>{p.nombre || p.username}</option>)}
            </select>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
              <div>
                <div className="mono-label" style={{ marginBottom: 6 }}>Año</div>
                <input className="input-uca" type="number" value={draft.anio} onChange={e => setDraft(d => ({ ...d, anio: Number(e.target.value) }))} />
              </div>
              <div>
                <div className="mono-label" style={{ marginBottom: 6 }}>Semestre</div>
                <select className="input-uca" value={draft.semestre} onChange={e => setDraft(d => ({ ...d, semestre: Number(e.target.value) }))}>
                  <option value={1}>1</option><option value={2}>2</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" disabled={saving} onClick={crear}>{saving ? 'Creando…' : 'Crear Materia'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
