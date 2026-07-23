import { useState, useEffect, useRef } from 'react'
import { api, emitToast } from '../lib/api'

type Apunte = {
  id: number; user_id: number; materia_id: number | null
  titulo: string; descripcion: string | null; archivo_url: string
  tags: string | null; aprobado: boolean
  tipo_contenido: string; visibilidad: string
  likes: number; descargas: number; fecha_subida: string | null
}
type Materia = { id: number; nombre: string }

const GRADIENTES = [
  'linear-gradient(135deg,#0ea5e9,#1e3a8a)',
  'linear-gradient(135deg,#f59e0b,#7c2d12)',
  'linear-gradient(135deg,#ec4899,#581c87)',
  'linear-gradient(135deg,#10b981,#064e3b)',
  'linear-gradient(135deg,#8b5cf6,#1e1b4b)',
  'linear-gradient(135deg,#ef4444,#450a0a)',
  'linear-gradient(135deg,#3b82f6,#172554)',
  'linear-gradient(135deg,#a855f7,#3b0764)',
]

const ICONO_TIPO: Record<string, string> = {
  pdf: 'ti ti-file-type-pdf',
  video: 'ti ti-video',
  imagen: 'ti ti-photo',
  link: 'ti ti-link',
  documento: 'ti ti-file-text',
  otro: 'ti ti-file',
}

const css = `
  .bib-hero {
    display:grid; grid-template-columns:1.6fr 1fr; gap:16px; margin-bottom:24px;
  }
  .bib-glass {
    background:var(--bg-surface); border:1px solid var(--border-subtle);
    border-radius:var(--radius-lg); padding:20px;
    backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
    transition:border-color .25s, box-shadow .25s;
  }
  .bib-glass:hover { border-color:var(--border-light); }

  .bib-hero-glow {
    position:relative; overflow:hidden;
  }
  .bib-hero-glow::before {
    content:''; position:absolute; top:-40%; left:-20%;
    width:70%; height:140%;
    background:radial-gradient(ellipse, var(--accent-muted) 0%, transparent 70%);
    pointer-events:none;
  }

  .bib-grid {
    display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:14px;
  }
  .bib-lista { display:flex; flex-direction:column; gap:10px; }

  .bib-book {
    background:var(--bg-surface); border:1px solid var(--border-subtle);
    border-radius:var(--radius); overflow:hidden;
    transition:transform .2s, border-color .2s, box-shadow .2s;
    cursor:pointer;
  }
  .bib-book:hover {
    transform:translateY(-5px); border-color:var(--border-light);
    box-shadow:0 12px 32px rgba(0,0,0,.4);
  }

  .bib-cover {
    height:160px; position:relative;
    display:flex; align-items:center; justify-content:center;
  }
  .bib-cover-icon { font-size:38px; color:rgba(255,255,255,.8); transition:transform .25s; }
  .bib-book:hover .bib-cover-icon { transform:scale(1.08); }

  .bib-tipo-badge {
    position:absolute; top:8px; right:8px;
    font-family:var(--font-mono); font-size:9px; font-weight:800;
    background:rgba(0,0,0,.55); color:#fff; border-radius:6px;
    padding:3px 8px; backdrop-filter:blur(4px);
    display:inline-flex; align-items:center; gap:4px;
  }

  .bib-book-body { padding:12px 14px 14px; }
  .bib-book-title {
    font-size:13px; font-weight:800; line-height:1.3; margin-bottom:3px;
    display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;
    overflow:hidden;
  }

  .bib-row {
    display:flex; align-items:center; gap:14px;
    background:var(--bg-surface); border:1px solid var(--border-subtle);
    border-radius:var(--radius); padding:10px 16px;
    transition:border-color .2s, transform .15s;
  }
  .bib-row:hover { border-color:var(--border-light); transform:translateX(3px); }

  .bib-seguir-cover {
    width:54px; height:70px; border-radius:9px; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
  }
  .bib-seguir-progress { margin-top:10px; }

  .bib-filters {
    display:flex; align-items:center; justify-content:space-between;
    margin-bottom:18px; flex-wrap:wrap; gap:12px;
  }

  .bib-search-wrap { position:relative; }
  .bib-search-icon {
    position:absolute; left:11px; top:50%; transform:translateY(-50%);
    font-size:13px; color:var(--text-muted); pointer-events:none;
  }
  .bib-search-input {
    width:240px; padding:9px 12px 9px 32px; font-size:12.5px;
  }

  .bib-skeleton { height:300px; border-radius:var(--radius); background:var(--bg-surface); border:1px solid var(--border-subtle); }
  .bib-skeleton-pulse { animation:pulse 1.5s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
  @keyframes spin { to { transform:rotate(360deg) } }

  .bib-empty {
    text-align:center; padding:52px 20px;
    background:var(--bg-surface); border:1px solid var(--border-subtle);
    border-radius:var(--radius);
  }

  .bib-modal-overlay {
    position:fixed; inset:0; background:rgba(0,0,0,.55);
    display:flex; align-items:center; justify-content:center;
    z-index:999; padding:16px;
    backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px);
  }
  .bib-modal {
    background:var(--bg-surface); border:1px solid var(--border-light);
    border-radius:var(--radius-lg); width:100%; max-width:520px;
    max-height:90vh; overflow-y:auto; padding:28px 24px;
  }
  .bib-modal-title { font-size:18px; font-weight:800; }
  .bib-form-group { margin-bottom:18px; }
  .bib-form-label {
    display:block; font-family:var(--font-mono); font-size:10px;
    font-weight:700; letter-spacing:.08em; text-transform:uppercase;
    color:var(--text-muted); margin-bottom:6px;
  }
  .bib-form-row { display:flex; gap:12px; }
  .bib-form-row > * { flex:1; }
  .bib-file-zone {
    border:1px dashed var(--border-light); border-radius:var(--radius);
    padding:18px; text-align:center; cursor:pointer;
    transition:border-color .2s, background .2s;
  }
  .bib-file-zone:hover { border-color:var(--accent); background:var(--accent-subtle); }
  .bib-file-zone.has-file { border-color:var(--accent); background:var(--accent-subtle); }
  .bib-valid-err {
    background:var(--danger-subtle); border:1px solid var(--danger); border-radius:var(--radius);
    padding:12px 14px; margin-bottom:18px;
  }
  .bib-valid-err-title { font-weight:700; font-size:12.5px; color:var(--danger); margin-bottom:6px; display:flex; align-items:center; gap:6px; }
  .bib-valid-err-item { font-size:12px; color:var(--text-secondary); padding:3px 0 3px 20px; position:relative; }
  .bib-valid-err-item::before { content:'•'; position:absolute; left:6px; color:var(--danger); }

  @media(max-width:900px){
    .bib-hero { grid-template-columns:1fr; }
    .bib-grid { grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); }
    .bib-form-row { flex-direction:column; }
  }
`

export default function Biblioteca() {
  const [apuntes, setApuntes] = useState<Apunte[]>([])
  const [materias, setMaterias] = useState<Materia[]>([])
  const [q, setQ] = useState('')
  const [filtroMat, setFiltroMat] = useState<number | null>(null)
  const [vista, setVista] = useState<'grid' | 'lista'>('grid')
  const [orden, setOrden] = useState<'reciente' | 'likes' | 'descargas'>('reciente')
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState<Set<number>>(new Set())
  const [showSubir, setShowSubir] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [fTitulo, setFTitulo] = useState('')
  const [fMateria, setFMateria] = useState<number | ''>('')
  const [fTipo, setFTipo] = useState('pdf')
  const [fDesc, setFDesc] = useState('')
  const [fTags, setFTags] = useState('')
  const [fVis, setFVis] = useState('publico')
  const [fUrl, setFUrl] = useState('')
  const [fArchivo, setFArchivo] = useState<File | null>(null)
  const [validando, setValidando] = useState(false)
  const [erroresValidacion, setErroresValidacion] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  function resetForm() {
    setFTitulo(''); setFMateria(''); setFTipo('pdf')
    setFDesc(''); setFTags(''); setFVis('publico')
    setFUrl(''); setFArchivo(null); setErroresValidacion([]); setValidando(false)
    if (fileRef.current) fileRef.current.value = ''
  }

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
    } catch { /* best-effort */ }
    if (a.archivo_url) window.open(a.archivo_url, '_blank', 'noopener')
  }

  async function handleSubir() {
    if (!fTitulo.trim() || fMateria === '') {
      emitToast('Completá el título y la materia', 'error')
      return
    }
    setValidando(true)
    setErroresValidacion([])
    try {
      const resp = await api.post<{ valido: boolean; advertencias: string[] }>('/apuntes/validar', {
        titulo: fTitulo.trim(),
        descripcion: fDesc.trim() || null,
        tags: fTags.trim() || null,
        tipo_contenido: fTipo,
        materia_id: Number(fMateria),
      })
      if (!resp.valido) {
        setErroresValidacion(resp.advertencias)
        setValidando(false)
        return
      }
    } catch {
      setValidando(false)
      emitToast('Error al validar el contenido', 'error')
      return
    }

    setSubiendo(true)
    try {
      const payload = {
        materia_id: Number(fMateria),
        titulo: fTitulo.trim(),
        descripcion: fDesc.trim() || null,
        tags: fTags.trim() || null,
        tipo_contenido: fTipo,
        visibilidad: fVis,
        archivo_url: fUrl || '',
      }
      const creado = await api.post<Apunte>('/apuntes/', payload)
      if (fArchivo) {
        const fd = new FormData()
        fd.append('archivo', fArchivo)
        try { await api.upload(`/apuntes/${creado.id}/archivo`, fd) } catch { /* best-effort */ }
      }
      emitToast('Recurso subido correctamente', 'success')
      setShowSubir(false)
      resetForm()
      setLoading(true)
      cargar(q)
    } catch {
      emitToast('Error al subir el recurso', 'error')
    } finally {
      setSubiendo(false)
    }
  }

  const matNombre = (id: number | null) => materias.find(m => m.id === id)?.nombre ?? 'General'
  const visibles = apuntes
    .filter(a => a.aprobado !== false && (!filtroMat || a.materia_id === filtroMat))
    .sort((a, b) => {
      if (orden === 'reciente') return new Date(b.fecha_subida || 0).getTime() - new Date(a.fecha_subida || 0).getTime()
      if (orden === 'likes') return b.likes - a.likes
      return b.descargas - a.descargas
    })
  const ultimo = apuntes.sort((a, b) => new Date(b.fecha_subida || 0).getTime() - new Date(a.fecha_subida || 0).getTime())[0]

  return (
    <>
      <style>{css}</style>

      {/* Hero */}
      <div className="bib-hero">
        <div className="bib-glass bib-hero-glow" style={{ display:'flex', flexDirection:'column', justifyContent:'center', gap:10 }}>
          <h1 className="page-title" style={{ fontSize:28 }}>Biblioteca Digital</h1>
          <p style={{ fontSize:13.5, color:'var(--text-secondary)', maxWidth:440, lineHeight:1.6 }}>
            Explora recursos académicos compartidos por alumnos y profesores: apuntes, guías, resúmenes e investigaciones.
          </p>
          <div style={{ display:'flex', gap:10, marginTop:6, flexWrap:'wrap' }}>
            <button className="btn-primary" onClick={() => { setFiltroMat(null); setQ(''); setLoading(true); cargar() }}>
              <i className="ti ti-compass" /> Explorar Catálogo
            </button>
          </div>
        </div>

        {/* Seguir leyendo */}
        <div className="bib-glass">
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
            <span className="mono-label"><i className="ti ti-book-2" /> Seguir leyendo</span>
            {ultimo && (
              <span className="mono-label" style={{ fontSize:8.5 }}>
                Subido {ultimo.fecha_subida ? new Date(ultimo.fecha_subida).toLocaleDateString('es') : '—'}
              </span>
            )}
          </div>
          {ultimo ? (
            <>
              <div style={{ display:'flex', gap:14, marginBottom:12 }}>
                <div className="bib-seguir-cover" style={{ background:GRADIENTES[ultimo.id % GRADIENTES.length] }}>
                  <i className="ti ti-book-2" style={{ fontSize:24, color:'rgba(255,255,255,.85)' }} />
                </div>
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{ fontSize:13.5, fontWeight:800, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ultimo.titulo}</div>
                  <div className="mono-label" style={{ fontSize:9, marginTop:3 }}>{matNombre(ultimo.materia_id)}</div>
                  <div className="progress-track bib-seguir-progress"><div className="progress-fill" style={{ width:'65%' }} /></div>
                </div>
              </div>
              <button className="btn-ghost" style={{ width:'100%' }} onClick={() => descargar(ultimo)}>
                Continuar lectura <i className="ti ti-arrow-right" />
              </button>
            </>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'16px 0' }}>
              <i className="ti ti-books-off" style={{ fontSize:28, color:'var(--text-muted)' }} />
              <p style={{ fontSize:12.5, color:'var(--text-muted)' }}>Aún sin lecturas activas.</p>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bib-filters">
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <button className={`pill-tab${filtroMat === null ? ' active' : ''}`} onClick={() => setFiltroMat(null)}>Todos</button>
          {materias.slice(0, 6).map(mt => (
            <button key={mt.id} className={`pill-tab${filtroMat === mt.id ? ' active' : ''}`} onClick={() => setFiltroMat(mt.id)}>{mt.nombre}</button>
          ))}
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <div className="bib-search-wrap">
            <i className="ti ti-search bib-search-icon" />
            <input className="input-uca bib-search-input" placeholder="Buscar por título, tags…" value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && cargar(q)} />
          </div>
          <div className="pill-tab" style={{ padding:'6px 10px', cursor:'default', display:'flex', gap:4 }}>
            <button className="btn-ghost" style={{ padding:'5px 8px', fontSize:12, color: orden === 'reciente' ? 'var(--accent-bright)' : undefined }} onClick={() => setOrden('reciente')} title="Más recientes"><i className="ti ti-clock" /></button>
            <button className="btn-ghost" style={{ padding:'5px 8px', fontSize:12, color: orden === 'likes' ? 'var(--accent-bright)' : undefined }} onClick={() => setOrden('likes')} title="Más likes"><i className="ti ti-heart" /></button>
            <button className="btn-ghost" style={{ padding:'5px 8px', fontSize:12, color: orden === 'descargas' ? 'var(--accent-bright)' : undefined }} onClick={() => setOrden('descargas')} title="Más descargados"><i className="ti ti-download" /></button>
          </div>
          <div style={{ display:'flex', gap:4 }}>
            <button className={`btn-ghost${vista === 'grid' ? '' : ''}`} style={{ padding:'7px 10px', color: vista === 'grid' ? 'var(--accent-bright)' : undefined }} onClick={() => setVista('grid')} aria-label="Grid"><i className="ti ti-layout-grid" /></button>
            <button className="btn-ghost" style={{ padding:'7px 10px', color: vista === 'lista' ? 'var(--accent-bright)' : undefined }} onClick={() => setVista('lista')} aria-label="Lista"><i className="ti ti-list" /></button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bib-grid">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bib-skeleton bib-skeleton-pulse" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && visibles.length === 0 && (
        <div className="bib-empty">
          <i className="ti ti-books-off" style={{ fontSize:40, color:'var(--text-muted)' }} />
          <p style={{ marginTop:12, color:'var(--text-secondary)', fontSize:13 }}>No encontramos recursos para este filtro.</p>
          <button className="btn-ghost" style={{ marginTop:12 }} onClick={() => { setFiltroMat(null); setQ(''); setLoading(true); cargar() }}>
            <i className="ti ti-refresh" /> Ver todos
          </button>
        </div>
      )}

      {/* Grid */}
      {!loading && visibles.length > 0 && vista === 'grid' && (
        <div className="bib-grid">
          {visibles.map(a => (
            <div key={a.id} className="bib-book">
              <div className="bib-cover" style={{ background:GRADIENTES[a.id % GRADIENTES.length] }}>
                <i className={`ti ${ICONO_TIPO[a.tipo_contenido] || 'ti-book-2'} bib-cover-icon`} />
                <span className="bib-tipo-badge"><i className={ICONO_TIPO[a.tipo_contenido] || 'ti-file'} style={{ fontSize:7 }} /> {(a.tipo_contenido || 'pdf').toUpperCase()}</span>
              </div>
              <div className="bib-book-body">
                <div className="bib-book-title">{a.titulo}</div>
                <div className="mono-label" style={{ fontSize:9, marginBottom:10 }}>{matNombre(a.materia_id)}</div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <button onClick={() => like(a)} style={{ background:'none', border:'none', cursor:'pointer', color: liked.has(a.id) ? 'var(--danger)' : 'var(--text-secondary)', fontSize:12, display:'inline-flex', alignItems:'center', gap:4, fontFamily:'var(--font-mono)', padding:0 }}>
                    <i className={`ti ${liked.has(a.id) ? 'ti-heart-filled' : 'ti-heart'}`} /> {a.likes}
                  </button>
                  <button onClick={() => descargar(a)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--accent-bright)', fontSize:12, display:'inline-flex', alignItems:'center', gap:4, fontFamily:'var(--font-mono)', padding:0 }}>
                    <i className="ti ti-download" /> {a.descargas}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lista */}
      {!loading && visibles.length > 0 && vista === 'lista' && (
        <div className="bib-lista">
          {visibles.map(a => (
            <div key={a.id} className="bib-row">
              <div className="bib-seguir-cover" style={{ background:GRADIENTES[a.id % GRADIENTES.length] }}>
                <i className={`ti ${ICONO_TIPO[a.tipo_contenido] || 'ti-book-2'}`} style={{ color:'rgba(255,255,255,.85)', fontSize:20 }} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13.5, fontWeight:800 }}>{a.titulo}</div>
                <div className="mono-label" style={{ fontSize:9 }}>
                  {matNombre(a.materia_id)} • {(a.tipo_contenido || 'pdf').toUpperCase()}
                  {a.tags ? ` • ${a.tags}` : ''}
                </div>
              </div>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <button className="btn-ghost" style={{ padding:'5px 10px', fontSize:11 }} onClick={() => like(a)}>
                  <i className={`ti ${liked.has(a.id) ? 'ti-heart-filled' : 'ti-heart'}`} style={{ color: liked.has(a.id) ? 'var(--danger)' : undefined }} /> {a.likes}
                </button>
                <button className="btn-primary" style={{ padding:'6px 12px', fontSize:11 }} onClick={() => descargar(a)}>
                  <i className="ti ti-download" /> {a.descargas}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB — todos los roles pueden subir (con validación) */}
      <button className="fab" onClick={() => { resetForm(); setShowSubir(true) }} title="Subir recurso">
        <i className="ti ti-cloud-upload" />
      </button>

      {/* Modal Subir */}
      {showSubir && (
        <div className="bib-modal-overlay" onClick={e => { if (e.target === e.currentTarget && !subiendo && !validando) setShowSubir(false) }}>
          <div className="bib-modal">
            <div className="bib-modal-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <span className="bib-modal-title"><i className="ti ti-cloud-upload" style={{ marginRight:8 }} /> Subir recurso</span>
              <button onClick={() => { if (!subiendo && !validando) { setShowSubir(false); resetForm() } }} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:20, padding:4 }} disabled={subiendo || validando}>
                <i className="ti ti-x" />
              </button>
            </div>

            {/* Errores de validación */}
            {erroresValidacion.length > 0 && (
              <div className="bib-valid-err">
                <div className="bib-valid-err-title"><i className="ti ti-shield-off" /> Contenido no válido</div>
                {erroresValidacion.map((e, i) => <div key={i} className="bib-valid-err-item">{e}</div>)}
              </div>
            )}

            <div className="bib-form-row">
              <div className="bib-form-group" style={{ flex:2 }}>
                <label className="bib-form-label">Título *</label>
                <input className="input-uca" placeholder="Ej: Álgebra Lineal — Resumen parcial 1" value={fTitulo} onChange={e => setFTitulo(e.target.value)} disabled={subiendo || validando} />
              </div>
              <div className="bib-form-group">
                <label className="bib-form-label">Materia *</label>
                <select className="input-uca" value={fMateria} onChange={e => setFMateria(e.target.value ? Number(e.target.value) : '')} disabled={subiendo || validando}>
                  <option value="">Seleccionar…</option>
                  {materias.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>
            </div>

            <div className="bib-form-row">
              <div className="bib-form-group">
                <label className="bib-form-label">Tipo</label>
                <select className="input-uca" value={fTipo} onChange={e => setFTipo(e.target.value)} disabled={subiendo || validando}>
                  <option value="pdf">PDF</option>
                  <option value="documento">Documento</option>
                  <option value="video">Video</option>
                  <option value="imagen">Imagen</option>
                  <option value="link">Enlace</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div className="bib-form-group">
                <label className="bib-form-label">Visibilidad</label>
                <select className="input-uca" value={fVis} onChange={e => setFVis(e.target.value)} disabled={subiendo || validando}>
                  <option value="publico">Público</option>
                  <option value="solo_materia">Solo materia</option>
                  <option value="privado">Privado</option>
                </select>
              </div>
            </div>

            <div className="bib-form-group">
              <label className="bib-form-label">Descripción</label>
              <textarea className="input-uca" rows={3} placeholder="Descripción breve del recurso…" value={fDesc} onChange={e => setFDesc(e.target.value)} disabled={subiendo || validando} style={{ resize:'vertical' }} />
            </div>

            <div className="bib-form-group">
              <label className="bib-form-label">Tags</label>
              <input className="input-uca" placeholder="separados por coma, ej: resumen, parcial, matemática" value={fTags} onChange={e => setFTags(e.target.value)} disabled={subiendo || validando} />
            </div>

            <div className="bib-form-group">
              <label className="bib-form-label">Archivo o URL</label>
              <input type="file" ref={fileRef} style={{ display:'none' }} onChange={e => setFArchivo(e.target.files?.[0] || null)} disabled={subiendo || validando} />
              <div className={`bib-file-zone${fArchivo ? ' has-file' : ''}`} onClick={() => fileRef.current?.click()}>
                {fArchivo ? (
                  <><i className="ti ti-file-check" style={{ color:'var(--success)', fontSize:20 }} /><p style={{ fontSize:12.5, marginTop:6 }}>{fArchivo.name}</p></>
                ) : (
                  <><i className="ti ti-upload" style={{ fontSize:20, color:'var(--text-muted)' }} /><p style={{ fontSize:12.5, color:'var(--text-muted)', marginTop:6 }}>Hacé clic para seleccionar un archivo</p></>
                )}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:8 }}>
                <div style={{ flex:1, height:1, background:'var(--border-subtle)' }} />
                <span className="mono-label" style={{ fontSize:9 }}>O</span>
                <div style={{ flex:1, height:1, background:'var(--border-subtle)' }} />
              </div>
              <input className="input-uca" style={{ marginTop:8 }} placeholder="https://ejemplo.com/recurso.pdf" value={fUrl} onChange={e => setFUrl(e.target.value)} disabled={subiendo || validando} />
            </div>

            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
              <button className="btn-ghost" onClick={() => { setShowSubir(false); resetForm() }} disabled={subiendo || validando}>Cancelar</button>
              <button className="btn-primary" onClick={handleSubir} disabled={subiendo || validando}>
                {validando ? <><i className="ti ti-loader" style={{ animation:'spin 1s linear infinite' }} /> Validando…</> : subiendo ? <><i className="ti ti-loader" style={{ animation:'spin 1s linear infinite' }} /> Subiendo…</> : <><i className="ti ti-cloud-upload" /> Subir recurso</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
