import { useState, useEffect } from 'react'
import { api, getCurrentUser, emitToast } from '../lib/api'

type Materia = { id: number; nombre: string }
type Mensaje = { id: number; user_id: number; nombre_usuario: string | null; contenido: string; created_at: string | null }
type Hilo = { id: number; materia_id: number; titulo: string; descripcion: string | null; nombre_creador: string | null; fijado: boolean; cerrado: boolean; created_at: string | null }

const PAGE = 20
const VENTANA_EDICION_MS = 15 * 60 * 1000

const css = `
  .fo-grid { display:grid; grid-template-columns:280px 1fr; gap:16px; align-items:start; }
  .fo-hilo-item { padding:12px 14px; border-radius:10px; cursor:pointer; border:1px solid transparent; transition:all .15s; margin-bottom:6px; }
  .fo-hilo-item:hover { background:var(--bg-hover); }
  .fo-hilo-item.active { background:var(--accent-muted); border-color:var(--accent-hover); }
  .fo-msg { padding:11px 14px; border-radius:10px; background:var(--bg-input); margin-bottom:8px; }
  @media(max-width:900px){ .fo-grid { grid-template-columns:1fr; } }
`

export default function Foro() {
  const user = getCurrentUser()
  const [materias, setMaterias] = useState<Materia[]>([])
  const [matSelId, setMatSelId] = useState<number | null>(null)
  const [hilos, setHilos] = useState<Hilo[]>([])
  const [hiloSel, setHiloSel] = useState<Hilo | null>(null)
  const [loading, setLoading] = useState(false)
  const [nuevoOpen, setNuevoOpen] = useState(false)
  const [draft, setDraft] = useState({ titulo: '', descripcion: '' })
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)

  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [mensajesTotal, setMensajesTotal] = useState(0)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')

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

  async function cargarMensajes(hiloId: number, skip: number, append: boolean) {
    if (append) setCargandoMas(true)
    try {
      const res = await api.get<{ items: Mensaje[]; total: number }>(`/foro/hilos/${hiloId}/mensajes?skip=${skip}&limit=${PAGE}`)
      // El backend devuelve más nuevo -> más viejo; invertimos para mostrar cronológico.
      const ordenados = [...res.items].reverse()
      setMensajes(prev => append ? [...ordenados, ...prev] : ordenados)
      setMensajesTotal(res.total)
    } catch {
      if (!append) setMensajes([])
    } finally {
      if (append) setCargandoMas(false)
    }
  }

  function abrirHilo(h: Hilo) {
    setHiloSel(h)
    setEditId(null)
    cargarMensajes(h.id, 0, false)
  }

  function cargarMas() {
    if (!hiloSel) return
    cargarMensajes(hiloSel.id, mensajes.length, true)
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
      cargarMensajes(hiloSel.id, 0, false)
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al enviar mensaje', 'error')
    } finally { setEnviando(false) }
  }

  function puedeEditar(m: Mensaje) {
    if (!user || m.user_id !== user.user_id || !m.created_at) return false
    return Date.now() - new Date(m.created_at).getTime() <= VENTANA_EDICION_MS
  }

  function empezarEdicion(m: Mensaje) {
    setEditId(m.id)
    setEditValue(m.contenido)
  }

  async function guardarEdicion(id: number) {
    if (!editValue.trim()) return
    try {
      await api.patch(`/foro/mensajes/${id}`, { contenido: editValue.trim() })
      setMensajes(prev => prev.map(m => m.id === id ? { ...m, contenido: editValue.trim() } : m))
      setEditId(null)
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'No se pudo editar (¿venció la ventana de 15 min?)', 'error')
    }
  }

  const puedeModerar = user?.role === 'admin' || user?.role === 'profesor'

  async function toggleFijado() {
    if (!hiloSel) return
    try {
      const actualizado = await api.put<Hilo>(`/foro/hilos/${hiloSel.id}`, { fijado: !hiloSel.fijado })
      setHiloSel(actualizado)
      setHilos(prev => prev.map(h => h.id === actualizado.id ? actualizado : h))
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al fijar hilo', 'error')
    }
  }

  async function toggleCerrado() {
    if (!hiloSel) return
    try {
      const actualizado = await api.put<Hilo>(`/foro/hilos/${hiloSel.id}`, { cerrado: !hiloSel.cerrado })
      setHiloSel(actualizado)
      setHilos(prev => prev.map(h => h.id === actualizado.id ? actualizado : h))
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al cerrar hilo', 'error')
    }
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
                {h.cerrado && <i className="ti ti-lock" style={{ fontSize: 12, color: 'var(--text-muted)' }} />}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 4 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800 }}>{hiloSel.titulo}</h3>
                {puedeModerar && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn-ghost" style={{ padding: '4px 9px', fontSize: 11, color: hiloSel.fijado ? 'var(--warning)' : undefined }} onClick={toggleFijado}>
                      <i className="ti ti-pin" /> {hiloSel.fijado ? 'Fijado' : 'Fijar'}
                    </button>
                    <button className="btn-ghost" style={{ padding: '4px 9px', fontSize: 11, color: hiloSel.cerrado ? 'var(--danger)' : undefined }} onClick={toggleCerrado}>
                      <i className="ti ti-lock" /> {hiloSel.cerrado ? 'Cerrado' : 'Cerrar'}
                    </button>
                  </div>
                )}
              </div>
              {hiloSel.descripcion && <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 16 }}>{hiloSel.descripcion}</p>}
              <div style={{ marginBottom: 16 }}>
                {mensajesTotal > mensajes.length && (
                  <button className="btn-ghost" style={{ width: '100%', marginBottom: 10, fontSize: 11 }} disabled={cargandoMas} onClick={cargarMas}>
                    {cargandoMas ? 'Cargando…' : 'Cargar más'}
                  </button>
                )}
                {mensajes.length === 0 ? (
                  <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Sin respuestas todavía.</p>
                ) : mensajes.map(m => (
                  <div key={m.id} className="fo-msg">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{m.nombre_usuario || '—'}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="mono-label" style={{ fontSize: 8.5 }}>{m.created_at ? new Date(m.created_at).toLocaleDateString('es-PY') : ''}</span>
                        {puedeEditar(m) && editId !== m.id && (
                          <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }} onClick={() => empezarEdicion(m)}>
                            <i className="ti ti-pencil" style={{ fontSize: 12 }} />
                          </button>
                        )}
                      </div>
                    </div>
                    {editId === m.id ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input className="input-uca" style={{ fontSize: 12.5 }} value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && guardarEdicion(m.id)} autoFocus />
                        <button className="btn-primary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => guardarEdicion(m.id)}>Guardar</button>
                        <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setEditId(null)}>Cancelar</button>
                      </div>
                    ) : (
                      <p style={{ fontSize: 12.5 }}>{m.contenido}</p>
                    )}
                  </div>
                ))}
              </div>
              {!hiloSel.cerrado ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="input-uca" placeholder="Escribí una respuesta…" value={mensaje}
                    onChange={e => setMensaje(e.target.value)} onKeyDown={e => e.key === 'Enter' && enviarMensaje()} />
                  <button className="btn-primary" disabled={enviando} onClick={enviarMensaje}><i className="ti ti-send" /></button>
                </div>
              ) : (
                <input className="input-uca" placeholder="Este hilo está cerrado" disabled />
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
