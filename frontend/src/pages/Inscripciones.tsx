import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'

interface Materia { id: number; nombre: string; codigo?: string }
interface AlumnoRow { inscripcion_id: number; alumno_id: number; nombre: string; username: string; email: string }
interface AlumnoOpt  { id: number; nombre: string; email: string }

const css = `
  *, *::before, *::after { box-sizing:border-box; }
  .ins-root { display:flex; flex-direction:column; flex:1; font-family:'Inter',system-ui,sans-serif; color:#f0f4f8; }

  .topbar {
    display:flex; align-items:center; justify-content:space-between;
    padding:0 24px; height:56px;
    border-bottom:1px solid #1e2d3d; background:#0b0f14;
    position:sticky; top:0; z-index:20; flex-shrink:0;
  }
  .topbar h1 { font-size:17px; font-weight:700; color:#f0f4f8; letter-spacing:-.01em; }

  .content { padding:20px 24px; flex:1; }

  /* Selector de materia */
  .mat-bar {
    display:flex; align-items:center; gap:12px; flex-wrap:wrap;
    background:#131920; border:1px solid #1e2d3d; border-radius:12px; padding:14px 16px; margin-bottom:20px;
  }
  .mat-bar-lbl { font-size:12px; color:#506070; font-weight:600; white-space:nowrap; }
  .mat-select {
    flex:1; min-width:200px; background:#0d1117; border:1px solid #243447;
    border-radius:9px; color:#f0f4f8; font-size:13px; font-family:inherit;
    outline:none; padding:9px 12px; cursor:pointer; appearance:none;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' fill='%23506070' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E");
    background-repeat:no-repeat; background-position:right 12px center; padding-right:32px;
    transition:border-color .15s;
  }
  .mat-select:focus { border-color:#00b4d8; }
  .mat-select option { background:#131920; }

  /* Toolbar */
  .toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:14px; }
  .toolbar-info { font-size:12px; color:#506070; }
  .btn-primary {
    display:inline-flex; align-items:center; gap:6px;
    padding:9px 16px; background:#00b4d8; border:none;
    border-radius:9px; color:#000; font-size:13px; font-weight:700;
    font-family:inherit; cursor:pointer; transition:opacity .15s; white-space:nowrap;
  }
  .btn-primary:hover { opacity:.85; }
  .btn-primary svg { width:13px; height:13px; flex-shrink:0; }

  /* Search */
  .search-wrap { flex:1; min-width:160px; position:relative; }
  .search-wrap svg { position:absolute; left:11px; top:50%; transform:translateY(-50%); width:14px; height:14px; color:#506070; pointer-events:none; }
  .search-input {
    width:100%; background:#131920; border:1px solid #1e2d3d;
    border-radius:9px; color:#f0f4f8; font-size:13px; font-family:inherit;
    outline:none; padding:8px 14px 8px 34px; transition:border-color .15s;
  }
  .search-input:focus { border-color:#00b4d8; }
  .search-input::placeholder { color:#506070; }

  /* Tabla */
  .table-wrap { background:#131920; border:1px solid #1e2d3d; border-radius:14px; overflow:hidden; }
  table { width:100%; border-collapse:collapse; }
  thead th { padding:10px 16px; font-size:10px; font-weight:600; color:#506070; text-transform:uppercase; letter-spacing:.07em; text-align:left; border-bottom:1px solid #1e2d3d; background:#0d1117; white-space:nowrap; }
  tbody td { padding:13px 16px; border-bottom:1px solid #1e2d3d18; vertical-align:middle; }
  tbody tr:last-child td { border-bottom:none; }
  tbody tr:hover { background:#1a2230; }
  .u-av { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:#000; flex-shrink:0; background:linear-gradient(135deg,#00b4d8,#0ea5e9); }
  .u-nombre { font-size:13px; font-weight:600; color:#f0f4f8; }
  .u-email  { font-size:11px; color:#8fa3b8; margin-top:1px; }
  .icon-btn { background:none; border:none; cursor:pointer; color:#8fa3b8; padding:5px; border-radius:6px; display:flex; align-items:center; transition:background .12s,color .12s; }
  .icon-btn:hover { background:#1e2d3d; color:#f0f4f8; }
  .icon-btn.del:hover { color:#ef4444; background:#ef444418; }
  .icon-btn svg { width:14px; height:14px; }
  .empty-state { text-align:center; padding:52px; color:#506070; font-size:13px; }

  /* Cards mobile */
  .cards-list { display:none; flex-direction:column; gap:10px; }
  .ins-card { background:#131920; border:1px solid #1e2d3d; border-radius:12px; padding:14px 16px; display:flex; align-items:center; gap:12px; }
  .ins-card-info { flex:1; min-width:0; }
  .ins-card-nm  { font-size:14px; font-weight:700; color:#f0f4f8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .ins-card-em  { font-size:11px; color:#8fa3b8; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

  /* Empty (no materia seleccionada) */
  .ins-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:80px 20px; text-align:center; color:#506070; }
  .ins-empty-icon { width:56px; height:56px; margin-bottom:16px; opacity:.2; }
  .ins-empty-title { font-size:16px; font-weight:600; color:#8fa3b8; margin-bottom:6px; }
  .ins-empty-sub { font-size:13px; }

  /* Confirm modal */
  .modal-backdrop { position:fixed; inset:0; background:rgba(0,0,0,.65); backdrop-filter:blur(4px); z-index:100; display:flex; align-items:center; justify-content:center; padding:16px; }
  .modal-box { background:#131920; border:1px solid #1e2d3d; border-radius:16px; width:100%; max-width:440px; max-height:90dvh; overflow-y:auto; box-shadow:0 24px 60px rgba(0,0,0,.6); }
  .modal-head { display:flex; align-items:center; justify-content:space-between; padding:18px 22px 14px; border-bottom:1px solid #1e2d3d; position:sticky; top:0; background:#131920; z-index:2; }
  .modal-head h2 { font-size:15px; font-weight:700; color:#f0f4f8; }
  .modal-close { background:none; border:none; color:#506070; cursor:pointer; padding:4px; border-radius:6px; display:flex; transition:color .15s; }
  .modal-close:hover { color:#f0f4f8; background:#1e2d3d; }
  .modal-close svg { width:18px; height:18px; }
  .modal-body { padding:18px 22px; display:flex; flex-direction:column; gap:12px; }
  .modal-foot { display:flex; gap:8px; padding:0 22px 20px; }
  .modal-foot .btn-primary { flex:1; justify-content:center; }
  .btn-cancel { flex:1; padding:9px; background:#1a2230; border:1px solid #243447; border-radius:9px; color:#8fa3b8; font-size:13px; font-weight:600; font-family:inherit; cursor:pointer; transition:border-color .15s, color .15s; }
  .btn-cancel:hover { border-color:#506070; color:#f0f4f8; }
  .btn-danger { flex:1; display:inline-flex; align-items:center; justify-content:center; gap:6px; padding:9px 16px; background:#ef4444; border:none; border-radius:9px; color:#fff; font-size:13px; font-weight:700; font-family:inherit; cursor:pointer; transition:opacity .15s; }
  .btn-danger:hover { opacity:.85; }

  /* Selector alumno en modal */
  .al-search-wrap { position:relative; }
  .al-search-wrap svg { position:absolute; left:11px; top:50%; transform:translateY(-50%); width:14px; height:14px; color:#506070; pointer-events:none; }
  .al-search { width:100%; background:#0d1117; border:1px solid #243447; border-radius:9px; color:#f0f4f8; font-size:13px; font-family:inherit; outline:none; padding:9px 14px 9px 34px; transition:border-color .15s; }
  .al-search:focus { border-color:#00b4d8; }
  .al-search::placeholder { color:#506070; }
  .al-dropdown { background:#0d1117; border:1px solid #1e2d3d; border-radius:9px; max-height:180px; overflow-y:auto; margin-top:4px; }
  .al-opt { padding:10px 14px; cursor:pointer; font-size:13px; color:#8fa3b8; background:none; border:none; width:100%; text-align:left; font-family:inherit; display:flex; align-items:center; gap:10px; transition:background .12s; }
  .al-opt:hover, .al-opt.sel { background:#1a2230; color:#f0f4f8; }
  .al-opt-av { width:26px; height:26px; border-radius:50%; background:linear-gradient(135deg,#00b4d8,#0ea5e9); display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:#000; flex-shrink:0; }
  .al-opt-nm { font-size:13px; font-weight:600; color:#f0f4f8; }
  .al-opt-em { font-size:11px; color:#506070; }
  .al-selected { display:inline-flex; align-items:center; gap:8px; background:#00b4d818; border:1px solid #00b4d830; border-radius:8px; padding:6px 12px; font-size:12px; font-weight:600; color:#00b4d8; }
  .al-selected button { background:none; border:none; color:#00b4d8; cursor:pointer; padding:0; display:flex; line-height:1; }
  .al-selected button:hover { color:#f0f4f8; }

  /* Toast */
  @keyframes tin { from{opacity:0;transform:translateX(-50%) translateY(8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }

  @media(max-width:768px){
    .topbar  { padding:0 14px; }
    .content { padding:14px 14px 80px; }
    .table-wrap { display:none; }
    .cards-list { display:flex; }
    .mat-bar { flex-direction:column; align-items:stretch; }
    .toolbar { flex-direction:column; align-items:stretch; }
    .btn-primary { justify-content:center; }
    .modal-backdrop { align-items:flex-end; padding:0; }
    .modal-box { border-radius:20px 20px 0 0; max-width:100%; max-height:92dvh; }
    .modal-foot { flex-direction:column; }
  }
`

function initials(n: string) { return n.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase() }

export default function Inscripciones() {
  const [materias,    setMaterias]    = useState<Materia[]>([])
  const [alumnos,     setAlumnos]     = useState<AlumnoOpt[]>([])
  const [matSelId,    setMatSelId]    = useState<number|null>(null)
  const [inscriptos,  setInscriptos]  = useState<AlumnoRow[]>([])
  const [search,      setSearch]      = useState('')
  const [loadingRows, setLoadingRows] = useState(false)

  // Modal inscribir
  const [addModal,    setAddModal]    = useState(false)
  const [alSearch,    setAlSearch]    = useState('')
  const [alSelId,     setAlSelId]     = useState<number|null>(null)
  const [alSelNom,    setAlSelNom]    = useState('')
  const [saving,      setSaving]      = useState(false)

  // Modal confirmar baja
  const [delTarget,   setDelTarget]   = useState<AlumnoRow|null>(null)
  const [deleting,    setDeleting]    = useState(false)

  // Toast
  const [toast, setToast] = useState('')
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const dropRef = useRef<HTMLDivElement>(null)

  // Carga inicial
  useEffect(() => {
    Promise.all([
      api.get<Materia[]>('/materias/'),
      api.get<{id:number;username:string;role:string;nombre:string;email:string}[]>('/users/'),
    ]).then(([mats, users]) => {
      setMaterias(mats)
      setAlumnos(users.filter(u => u.role === 'alumno').map(u => ({
        id: u.id, nombre: u.nombre || u.username, email: u.email || u.username,
      })))
    }).catch(() => {})
  }, [])

  // Cerrar dropdown al clic afuera
  useEffect(() => {
    function h(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setAlSelId(prev => prev)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  function cargarInscriptos(matId: number) {
    setLoadingRows(true)
    api.get<AlumnoRow[]>(`/inscripciones/materia/${matId}`)
      .then(d => { setInscriptos(d); setLoadingRows(false) })
      .catch(() => setLoadingRows(false))
  }

  function onSelectMat(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = parseInt(e.target.value)
    setMatSelId(id)
    setSearch('')
    cargarInscriptos(id)
  }

  const filtrados = search.trim()
    ? inscriptos.filter(r => r.nombre.toLowerCase().includes(search.toLowerCase()) || r.email?.toLowerCase().includes(search.toLowerCase()))
    : inscriptos

  // ── Inscribir alumno ──
  function abrirAddModal() { setAddModal(true); setAlSearch(''); setAlSelId(null); setAlSelNom('') }

  async function confirmarInscripcion() {
    if (!matSelId || !alSelId) return
    setSaving(true)
    try {
      await api.post('/inscripciones/', { alumno_id: alSelId, materia_id: matSelId })
      showToast(`${alSelNom} inscripto/a correctamente`)
      setAddModal(false)
      cargarInscriptos(matSelId)
    } catch (err: any) {
      showToast(err?.message || 'Ya está inscripto en esta materia')
    } finally {
      setSaving(false)
    }
  }

  // ── Dar de baja ──
  async function confirmarBaja() {
    if (!delTarget || !matSelId) return
    setDeleting(true)
    try {
      await api.delete(`/inscripciones/${delTarget.inscripcion_id}`)
      showToast(`${delTarget.nombre} dado/a de baja`)
      setDelTarget(null)
      cargarInscriptos(matSelId)
    } catch {
      showToast('No se pudo dar de baja')
    } finally {
      setDeleting(false)
    }
  }

  const matSelected = materias.find(m => m.id === matSelId)

  const alFiltrados = alSearch.trim()
    ? alumnos.filter(a =>
        a.nombre.toLowerCase().includes(alSearch.toLowerCase()) ||
        a.email.toLowerCase().includes(alSearch.toLowerCase())
      )
    : alumnos

  // Excluir ya inscriptos del selector
  const yaInscritos = new Set(inscriptos.map(r => r.alumno_id))
  const disponibles = alFiltrados.filter(a => !yaInscritos.has(a.id))

  return (
    <>
      <style>{css}</style>
      <div className="ins-root">

        <header className="topbar">
          <h1>Gestión de Inscripciones</h1>
        </header>

        <div className="content">

          {/* Selector de materia */}
          <div className="mat-bar">
            <span className="mat-bar-lbl">Materia:</span>
            <select className="mat-select" value={matSelId ?? ''} onChange={onSelectMat}>
              <option value="" disabled>Seleccioná una materia…</option>
              {materias.map(m => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
          </div>

          {!matSelId ? (
            <div className="ins-empty">
              <svg className="ins-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <div className="ins-empty-title">Seleccioná una materia</div>
              <div className="ins-empty-sub">Elegí una materia para ver y gestionar sus inscripciones</div>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="toolbar">
                <div style={{display:'flex',alignItems:'center',gap:12,flex:1,flexWrap:'wrap'}}>
                  <div className="search-wrap" style={{maxWidth:340}}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input className="search-input" placeholder="Buscar alumno…" value={search} onChange={e=>setSearch(e.target.value)} />
                  </div>
                  <span className="toolbar-info">
                    {loadingRows ? 'Cargando…' : `${inscriptos.length} inscripto${inscriptos.length !== 1 ? 's' : ''}`}
                  </span>
                </div>
                <button className="btn-primary" onClick={abrirAddModal}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Inscribir alumno
                </button>
              </div>

              {/* TABLA DESKTOP */}
              <div className="table-wrap">
                {loadingRows ? (
                  <div className="empty-state">Cargando inscriptos…</div>
                ) : filtrados.length === 0 ? (
                  <div className="empty-state">
                    {inscriptos.length === 0 ? 'No hay alumnos inscriptos en esta materia.' : 'No se encontraron resultados.'}
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>N°</th>
                        <th>Alumno</th>
                        <th>Email / Usuario</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtrados.map((r, i) => (
                        <tr key={r.inscripcion_id}>
                          <td style={{color:'#506070',width:48}}>{i + 1}</td>
                          <td>
                            <div style={{display:'flex',alignItems:'center',gap:10}}>
                              <div className="u-av">{initials(r.nombre)}</div>
                              <div>
                                <div className="u-nombre">{r.nombre}</div>
                                <div className="u-email">@{r.username}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{color:'#8fa3b8',fontSize:13}}>{r.email || r.username}</td>
                          <td>
                            <button className="icon-btn del" title="Dar de baja" onClick={()=>setDelTarget(r)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>
                                <path d="M9 6V4h6v2"/>
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* CARDS MOBILE */}
              <div className="cards-list">
                {loadingRows ? (
                  <div style={{textAlign:'center',padding:40,color:'#506070',fontSize:13}}>Cargando…</div>
                ) : filtrados.length === 0 ? (
                  <div style={{textAlign:'center',padding:40,color:'#506070',fontSize:13}}>
                    {inscriptos.length === 0 ? 'No hay inscriptos.' : 'Sin resultados.'}
                  </div>
                ) : filtrados.map(r => (
                  <div key={r.inscripcion_id} className="ins-card">
                    <div className="u-av">{initials(r.nombre)}</div>
                    <div className="ins-card-info">
                      <div className="ins-card-nm">{r.nombre}</div>
                      <div className="ins-card-em">{r.email || r.username}</div>
                    </div>
                    <button className="icon-btn del" title="Dar de baja" onClick={()=>setDelTarget(r)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14H6L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── MODAL: Inscribir alumno ── */}
        {addModal && (
          <div className="modal-backdrop" onClick={e=>{ if(e.target===e.currentTarget) setAddModal(false) }}>
            <div className="modal-box">
              <div className="modal-head">
                <h2>Inscribir alumno</h2>
                <button className="modal-close" onClick={()=>setAddModal(false)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="modal-body">

                <div style={{fontSize:12,color:'#506070'}}>
                  Materia: <strong style={{color:'#00b4d8'}}>{matSelected?.nombre}</strong>
                </div>

                {alSelId ? (
                  <div className="al-selected">
                    {alSelNom}
                    <button onClick={()=>{ setAlSelId(null); setAlSelNom(''); setAlSearch('') }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div ref={dropRef}>
                    <div className="al-search-wrap">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                      <input
                        className="al-search"
                        placeholder="Buscar alumno por nombre o email…"
                        value={alSearch}
                        onChange={e=>setAlSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                    {disponibles.length > 0 && (
                      <div className="al-dropdown">
                        {disponibles.slice(0,15).map(a => (
                          <button key={a.id} className="al-opt" onMouseDown={()=>{ setAlSelId(a.id); setAlSelNom(a.nombre); setAlSearch('') }}>
                            <div className="al-opt-av">{initials(a.nombre)}</div>
                            <div>
                              <div className="al-opt-nm">{a.nombre}</div>
                              <div className="al-opt-em">{a.email}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {alSearch && disponibles.length === 0 && (
                      <div style={{padding:'12px 14px',fontSize:13,color:'#506070'}}>Sin resultados o ya inscripto</div>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-foot">
                <button className="btn-cancel" onClick={()=>setAddModal(false)}>Cancelar</button>
                <button className="btn-primary" onClick={confirmarInscripcion}
                  disabled={!alSelId || saving}
                  style={{opacity:!alSelId||saving?0.4:1}}>
                  {saving ? 'Guardando…' : 'Inscribir'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL: Confirmar baja ── */}
        {delTarget && (
          <div className="modal-backdrop" onClick={()=>setDelTarget(null)}>
            <div className="modal-box" style={{maxWidth:360,padding:0}} onClick={e=>e.stopPropagation()}>
              <div className="modal-body" style={{padding:24}}>
                <div style={{width:44,height:44,borderRadius:12,background:'#ef444418',border:'1px solid #ef444430',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16}}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </div>
                <div style={{fontSize:15,fontWeight:700,color:'#f0f4f8',marginBottom:6}}>¿Dar de baja?</div>
                <div style={{fontSize:13,color:'#8fa3b8',lineHeight:1.5,marginBottom:20}}>
                  Se eliminará la inscripción de <strong style={{color:'#f0f4f8'}}>{delTarget.nombre}</strong> en <strong style={{color:'#00b4d8'}}>{matSelected?.nombre}</strong>. Esta acción no se puede deshacer.
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button className="btn-cancel" onClick={()=>setDelTarget(null)}>Cancelar</button>
                  <button className="btn-danger" onClick={confirmarBaja} disabled={deleting} style={{opacity:deleting?0.5:1}}>
                    {deleting ? 'Eliminando…' : 'Dar de baja'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div style={{
            position:'fixed', bottom:24, right:24, zIndex:9999,
            background:'#131920', border:'1px solid #22c55e40', borderRadius:12, padding:'12px 20px',
            color:'#22c55e', fontSize:13, fontWeight:600, boxShadow:'0 8px 32px rgba(0,0,0,.5)',
            animation:'tin .25s ease',
          }}>✓ {toast}</div>
        )}
      </div>
    </>
  )
}
