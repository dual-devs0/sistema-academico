import { useState, useEffect } from 'react'
import { api, emitToast } from '../lib/api'

type Apunte = {
  id: number; user_id: number; materia_id: number | null
  titulo: string; descripcion: string | null; archivo_url: string
  tags: string | null; aprobado: boolean
  tipo_contenido: string; visibilidad: string
  likes: number; descargas: number; fecha_subida: string | null
}
type Materia = { id: number; nombre: string }

const gradientes = [
  'linear-gradient(135deg,#0ea5e9,#1e3a8a)',
  'linear-gradient(135deg,#f59e0b,#7c2d12)',
  'linear-gradient(135deg,#ec4899,#581c87)',
  'linear-gradient(135deg,#10b981,#064e3b)',
  'linear-gradient(135deg,#8b5cf6,#1e1b4b)',
  'linear-gradient(135deg,#ef4444,#450a0a)',
]

const css = `
  .bib-hero {
    display:grid; grid-template-columns:1.6fr 1fr; gap:16px; margin-bottom:20px;
  }
  .bib-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:14px; }
  .bib-lista { display:flex; flex-direction:column; gap:10px; }
  .bib-book {
    background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:var(--radius);
    overflow:hidden; transition:transform .15s, border-color .15s;
  }
  .bib-book:hover { transform:translateY(-3px); border-color:var(--border-light); }
  .bib-cover { height:150px; position:relative; display:flex; align-items:center; justify-content:center; }
  .bib-tipo {
    position:absolute; top:8px; right:8px;
    font-family:var(--font-mono); font-size:9px; font-weight:800;
    background:rgba(0,0,0,.55); color:#fff; border-radius:5px; padding:3px 7px;
  }
  @media(max-width:900px){ .bib-hero { grid-template-columns:1fr; } }
`

export default function Biblioteca() {
  const [apuntes, setApuntes] = useState<Apunte[]>([])
  const [materias, setMaterias] = useState<Materia[]>([])
  const [q, setQ] = useState('')
  const [filtroMat, setFiltroMat] = useState<number | null>(null)
  const [vista, setVista] = useState<'grid' | 'lista'>('grid')
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState<Set<number>>(new Set())

  function cargar(query = '') {
    api.get<Apunte[]>(`/apuntes/${query ? `?q=${encodeURIComponent(query)}` : ''}`)
      .then(setApuntes)
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(() => {
    cargar()
    api.get<Materia[]>('/materias/').then(setMaterias).catch(() => {})
  }, [])

  async function like(a: Apunte) {
    if (liked.has(a.id)) return
    try {
      await api.patch(`/apuntes/${a.id}/like`, {})
      setLiked(prev => new Set(prev).add(a.id))
      setApuntes(prev => prev.map(x => x.id === a.id ? { ...x, likes: x.likes + 1 } : x))
    } catch { emitToast('No se pudo dar like', 'error') }
  }

  async function descargar(a: Apunte) {
    try {
      await api.patch(`/apuntes/${a.id}/descargar`, {})
      setApuntes(prev => prev.map(x => x.id === a.id ? { ...x, descargas: x.descargas + 1 } : x))
    } catch { /* contador es best-effort */ }
    window.open(a.archivo_url, '_blank', 'noopener')
  }

  const matNombre = (id: number | null) => materias.find(m => m.id === id)?.nombre ?? 'General'
  const visibles = apuntes.filter(a => a.aprobado !== false && (!filtroMat || a.materia_id === filtroMat))
  const ultimo = apuntes[0]

  return (
    <>
      <style>{css}</style>

      {/* Hero */}
      <div className="bib-hero">
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10, background: 'linear-gradient(110deg, var(--bg-surface) 60%, var(--accent-muted))' }}>
          <h1 className="page-title" style={{ fontSize: 28 }}>Biblioteca Digital</h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', maxWidth: 440 }}>
            Explora recursos académicos compartidos por alumnos y profesores: apuntes, guías, resúmenes e investigaciones.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => { setFiltroMat(null); setQ(''); setLoading(true); cargar() }}>Explorar Catálogo</button>
            <button className="btn-ghost" onClick={() => emitToast('Mis préstamos — próximamente', 'warning')}>Mis Préstamos</button>
          </div>
        </div>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span className="mono-label"><i className="ti ti-book" /> Seguir leyendo</span>
            <span className="mono-label" style={{ fontSize: 8.5 }}>Última vez: —</span>
          </div>
          {ultimo ? (
            <>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 52, height: 68, borderRadius: 8, background: gradientes[ultimo.id % gradientes.length], flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ultimo.titulo}</div>
                  <div className="mono-label" style={{ fontSize: 9, marginTop: 3 }}>{matNombre(ultimo.materia_id)}</div>
                  <div className="progress-track" style={{ marginTop: 10 }}><div className="progress-fill" style={{ width: '65%' }} /></div>
                </div>
              </div>
              <button className="btn-ghost" style={{ width: '100%' }} onClick={() => descargar(ultimo)}>Continuar lectura →</button>
            </>
          ) : <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Aún sin lecturas.</p>}
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className={`pill-tab${filtroMat === null ? ' active' : ''}`} onClick={() => setFiltroMat(null)}>Todos</button>
          {materias.slice(0, 4).map(mt => (
            <button key={mt.id} className={`pill-tab${filtroMat === mt.id ? ' active' : ''}`} onClick={() => setFiltroMat(mt.id)}>{mt.nombre}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-muted)' }} />
            <input className="input-uca" placeholder="Buscar libros, tesis o artículos…" value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && cargar(q)}
              style={{ width: 230, padding: '8px 12px 8px 30px', fontSize: 12.5 }} />
          </div>
          <button className={`btn-ghost${vista === 'grid' ? '' : ''}`} style={{ padding: '7px 10px', color: vista === 'grid' ? 'var(--accent-bright)' : undefined }} onClick={() => setVista('grid')} aria-label="Vista grid"><i className="ti ti-layout-grid" /></button>
          <button className="btn-ghost" style={{ padding: '7px 10px', color: vista === 'lista' ? 'var(--accent-bright)' : undefined }} onClick={() => setVista('lista')} aria-label="Vista lista"><i className="ti ti-list" /></button>
        </div>
      </div>

      {/* Grid / Lista */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Cargando recursos…</div>
      ) : visibles.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 46 }}>
          <i className="ti ti-books-off" style={{ fontSize: 36, color: 'var(--text-muted)' }} />
          <p style={{ marginTop: 10, color: 'var(--text-secondary)', fontSize: 13 }}>Sin recursos para este filtro.</p>
        </div>
      ) : vista === 'grid' ? (
        <div className="bib-grid">
          {visibles.map(a => (
            <div key={a.id} className="bib-book">
              <div className="bib-cover" style={{ background: gradientes[a.id % gradientes.length] }}>
                <i className="ti ti-book-2" style={{ fontSize: 34, color: 'rgba(255,255,255,.85)' }} />
                <span className="bib-tipo">{(a.tipo_contenido || 'pdf').toUpperCase()}</span>
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.3, marginBottom: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {a.titulo}
                </div>
                <div className="mono-label" style={{ fontSize: 9, marginBottom: 10 }}>{matNombre(a.materia_id)}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button onClick={() => like(a)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: liked.has(a.id) ? 'var(--danger)' : 'var(--text-secondary)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)' }}>
                    <i className={`ti ${liked.has(a.id) ? 'ti-heart-filled' : 'ti-heart'}`} /> {a.likes}
                  </button>
                  <button onClick={() => descargar(a)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-bright)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)' }}>
                    <i className="ti ti-download" /> {a.descargas}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bib-lista">
          {visibles.map(a => (
            <div key={a.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px' }}>
              <div style={{ width: 42, height: 56, borderRadius: 7, background: gradientes[a.id % gradientes.length], flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-book-2" style={{ color: 'rgba(255,255,255,.85)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800 }}>{a.titulo}</div>
                <div className="mono-label" style={{ fontSize: 9 }}>{matNombre(a.materia_id)} • {(a.tipo_contenido || 'pdf').toUpperCase()}{a.tags ? ` • ${a.tags}` : ''}</div>
              </div>
              <button className="btn-ghost" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => like(a)}>
                <i className={`ti ${liked.has(a.id) ? 'ti-heart-filled' : 'ti-heart'}`} style={{ color: liked.has(a.id) ? 'var(--danger)' : undefined }} /> {a.likes}
              </button>
              <button className="btn-primary" style={{ padding: '6px 12px', fontSize: 11 }} onClick={() => descargar(a)}>
                <i className="ti ti-download" /> {a.descargas}
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
