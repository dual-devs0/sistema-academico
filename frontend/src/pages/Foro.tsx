import { useState, useEffect } from 'react'
import { api, decodeToken, emitToast } from '../lib/api'

type Materia = { id: number; nombre: string }
type Mensaje = { id: number; user_id: number; nombre_usuario: string | null; contenido: string; created_at: string | null }
type Hilo = { id: number; materia_id: number; titulo: string; descripcion: string | null; nombre_creador: string | null; fijado: boolean; cerrado: boolean; created_at: string | null; mensajes: Mensaje[] }

const css = `
  .fo-grid { display:grid; grid-template-columns:280px 1fr; gap:16px; align-items:start; }
  .fo-hilo-item { padding:12px 14px; border-radius:10px; cursor:pointer; border:1px solid transparent; transition:all .15s; margin-bottom:6px; }
  .fo-hilo-item:hover { background:var(--bg-hover); }
  .fo-hilo-item.active { background:var(--accent-muted); border-color:var(--accent-hover); }
  .fo-msg { padding:11px 14px; border-radius:10px; background:var(--bg-input); margin-bottom:8px; }
  @media(max-width:900px){ .fo-grid { grid-template-columns:1fr; } }
`

export default function Foro() {
  const user = decodeToken(sessionStorage.getItem('token') || '')
  const [materias, setMaterias] = useState<Materia[]>([])
  const [matSelId, setMatSelId] = useState<number | null>(null)
  const [hilos, setHilos] = useState<Hilo[]>([])
  const [hiloSel, setHiloSel] = useState<Hilo | null>(null)
  const [loading, setLoading] = useState(false)
  const [nuevoOpen, setNuevoOpen] = useState(false)
  const [draft, setDraft] = useState({ titulo: '', descripcion: '' })
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    const isProfesor = user?.role === 'profesor'
    api.get<Materia[]>(isProfesor ? `/materias/?profesor_id=${user?.user_id}` : '/materias/')
      .then(mats => { setMaterias(mats); if (mats.length) setMatSelId(mats[0].id) })
      .catch(() => {})
  }, [])

  function cargarHilos(matId: number) {
    setLoading(true)
    api.get<Hilo[]>(`/foro/hilos?materia_id=${matId}`)
      .then(setHilos)
      .catch(() => setHilos([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { if (matSelId) { cargarHilos(matSelId); setHiloSel(null) } }, [matSelId])

  function abrirHilo(h: Hilo) {
    api.get<Hilo>(`/foro/hilos/${h.id}`).then(setHiloSel).catch(() => setHiloSel(h))
  }

  async function crearHilo() {
    if (!draft.titulo || !matSelId) { emitToast('Ingresá un título', 'warning'); return }
    try {
      await api.post('/foro/hilos', { materia_id: matSelId, titulo: draft.titulo, descripcion: draft.descripcion || null })
      emitToast('Hilo creado')
      setNuevoOpen(false)
      setDraft({ titulo: '', descripcion: '' })
      cargarHilos(matSelId)
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al crear hilo', 'error')
    }
  }

  async function enviarMensaje() {
    if (!mensaje.trim() || !hiloSel) return
    setEnviando(true)
    try {
      await api.post(`/foro/hilos/${hiloSel.id}/mensajes`, { contenido: mensaje.trim() })
      setMensaje('')
      const actualizado = await api.get<Hilo>(`/foro/hilos/${hiloSel.id}`)
      setHiloSel(actualizado)
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al enviar mensaje', 'error')
    } finally { setEnviando(false) }
  }

  return (
    <>
      <style>{css}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Foro por Materia</h1>
          <p className="page-subtitle">Preguntas y discusión entre alumnos y profesores.</p>
        </div>
        <select className="input-uca" style={{ width: 240 }} value={matSelId ?? ''} onChange={e => setMatSelId(Number(e.target.value) || null)}>
          {materias.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>
      </div>

      <div className="fo-grid">
        {/* Lista de hilos */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800 }}>Hilos</h3>
            <button className="btn-ghost" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => setNuevoOpen(true)}>
              <i className="ti ti-plus" /> Nuevo
            </button>
          </div>
          {loading ? (
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Cargando…</p>
          ) : hilos.length === 0 ? (
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>Sin hilos aún. Creá el primero.</p>
          ) : hilos.map(h => (
            <div key={h.id} className={`fo-hilo-item${hiloSel?.id === h.id ? ' active' : ''}`} onClick={() => abrirHilo(h)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                {h.fijado && <i className="ti ti-pin" style={{ fontSize: 12, color: 'var(--warning)' }} />}
                <span style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.titulo}</span>
              </div>
              <div className="mono-label" style={{ fontSize: 9 }}>{h.nombre_creador || '—'}</div>
            </div>
          ))}
        </div>

        {/* Detalle hilo */}
        <div className="card" style={{ minHeight: 300 }}>
          {!hiloSel ? (
            <div style={{ textAlign: 'center', padding: 50, color: 'var(--text-secondary)' }}>
              <i className="ti ti-messages" style={{ fontSize: 34, color: 'var(--text-muted)' }} />
              <p style={{ marginTop: 10, fontSize: 13 }}>Seleccioná un hilo para ver la conversación.</p>
            </div>
          ) : (
            <>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>{hiloSel.titulo}</h3>
              {hiloSel.descripcion && <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 16 }}>{hiloSel.descripcion}</p>}
              <div style={{ marginBottom: 16 }}>
                {hiloSel.mensajes.length === 0 ? (
                  <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Sin respuestas todavía.</p>
                ) : hiloSel.mensajes.map(m => (
                  <div key={m.id} className="fo-msg">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{m.nombre_usuario || '—'}</span>
                      <span className="mono-label" style={{ fontSize: 8.5 }}>{m.created_at ? new Date(m.created_at).toLocaleDateString('es-PY') : ''}</span>
                    </div>
                    <p style={{ fontSize: 12.5 }}>{m.contenido}</p>
                  </div>
                ))}
              </div>
              {!hiloSel.cerrado && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="input-uca" placeholder="Escribí una respuesta…" value={mensaje}
                    onChange={e => setMensaje(e.target.value)} onKeyDown={e => e.key === 'Enter' && enviarMensaje()} />
                  <button className="btn-primary" disabled={enviando} onClick={enviarMensaje}><i className="ti ti-send" /></button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {nuevoOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card card-elevated" style={{ width: '100%', maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>Nuevo Hilo</h3>
              <button onClick={() => setNuevoOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><i className="ti ti-x" /></button>
            </div>
            <div className="mono-label" style={{ marginBottom: 6 }}>Título</div>
            <input className="input-uca" value={draft.titulo} onChange={e => setDraft(d => ({ ...d, titulo: e.target.value }))} style={{ marginBottom: 12 }} autoFocus />
            <div className="mono-label" style={{ marginBottom: 6 }}>Descripción (opcional)</div>
            <input className="input-uca" value={draft.descripcion} onChange={e => setDraft(d => ({ ...d, descripcion: e.target.value }))} style={{ marginBottom: 18 }} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setNuevoOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={crearHilo}>Crear</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
