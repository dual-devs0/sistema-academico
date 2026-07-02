import { useState, useEffect } from 'react'
import { api, decodeToken } from '../lib/api'

interface Materia {
  id: number
  nombre: string
  carrera: string
  anio: number
  semestre: number
  profesor: string
  alumnos: number
}

const materiasIniciales: Materia[] = [
  { id: 1, nombre: 'Análisis Matemático I',     carrera: 'Ing. Informática', anio: 1, semestre: 1, profesor: 'Carlos Méndez', alumnos: 32 },
  { id: 2, nombre: 'Física I',                  carrera: 'Ing. Informática', anio: 1, semestre: 1, profesor: 'Ana Torres',    alumnos: 30 },
  { id: 3, nombre: 'Programación I',            carrera: 'Ing. Informática', anio: 1, semestre: 1, profesor: 'Luis Paredes',  alumnos: 35 },
  { id: 4, nombre: 'Matemática Discreta',       carrera: 'Ing. Informática', anio: 1, semestre: 2, profesor: 'Carlos Méndez', alumnos: 28 },
  { id: 5, nombre: 'Resistencia de Materiales', carrera: 'Ing. Civil',       anio: 2, semestre: 1, profesor: 'Pedro Rojas',   alumnos: 22 },
  { id: 6, nombre: 'Mecánica de Suelos',        carrera: 'Ing. Civil',       anio: 3, semestre: 1, profesor: 'Pedro Rojas',   alumnos: 18 },
]

const carrerasCfg = [
  { nombre: 'Ing. Informática', color: 'var(--accent)', bg: 'var(--accent-muted)', icon: '💻' },
  { nombre: 'Ing. Civil',       color: '#f59e0b', bg: '#f59e0b12', icon: '🏗️' },
]

const profesoresLista = ['Carlos Méndez', 'Ana Torres', 'Luis Paredes', 'Pedro Rojas']
const emptyDraft = { nombre: '', carrera: 'Ing. Informática', anio: 1, semestre: 1, profesor: 'Carlos Méndez', alumnos: 0 }

const profColors: Record<string, string> = {
  'Carlos Méndez': '#a855f7',
  'Ana Torres':    '#f59e0b',
  'Luis Paredes':  '#22c55e',
  'Pedro Rojas':   '#3b82f6',
}

const maxAlumnos = 40

const css = `
  * { box-sizing: border-box; }
  .m-root { display:flex; flex-direction:column; flex:1; font-family:'Inter',system-ui,sans-serif; background:#0b0f14; }

  /* Topbar — solo título, sin iconos */
  .topbar {
    display:flex; align-items:center; padding:0 24px; height:56px;
    border-bottom:1px solid #1e2d3d; background:#0b0f14;
    position:sticky; top:0; z-index:20;
  }
  .topbar h1 { font-size:17px; font-weight:700; color:#f0f4f8; letter-spacing:-.01em; }

  .content { padding:20px 24px; flex:1; overflow-y:auto; }

  /* Toolbar */
  .toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; gap:12px; flex-wrap:wrap; }
  .toolbar-sub { font-size:12px; color:#506070; }
  .btn-primary { display:inline-flex; align-items:center; gap:6px; padding:9px 16px; background:var(--accent); border:none; border-radius:9px; color:#000; font-size:13px; font-weight:700; font-family:inherit; cursor:pointer; transition:opacity .15s; white-space:nowrap; }
  .btn-primary:hover { opacity:.85; }
  .btn-primary svg { width:13px; height:13px; flex-shrink:0; }

  /* Carrera cards */
  .carreras-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:10px; margin-bottom:18px; }
  .carrera-card { border-radius:14px; padding:14px 16px 10px; cursor:pointer; transition:transform .15s; position:relative; overflow:hidden; border:1px solid; user-select:none; }
  .carrera-card:hover { transform:translateY(-2px); }
  .carrera-emoji { font-size:20px; margin-bottom:8px; }
  .carrera-nombre { font-size:13px; font-weight:700; color:#f0f4f8; margin-bottom:8px; }
  .carrera-pills { display:flex; gap:6px; flex-wrap:wrap; }
  .carrera-pill { font-size:10px; font-weight:600; padding:2px 8px; border-radius:20px; }
  .carrera-bar { position:absolute; bottom:0; left:0; right:0; height:3px; }

  /* Filters */
  .filters-bar { display:flex; gap:10px; margin-bottom:14px; flex-wrap:wrap; }
  .search-wrap { flex:1; min-width:180px; position:relative; }
  .search-wrap svg { position:absolute; left:11px; top:50%; transform:translateY(-50%); width:14px; height:14px; color:#506070; pointer-events:none; }
  .search-input { width:100%; background:#131920; border:1px solid #1e2d3d; border-radius:9px; color:#f0f4f8; font-size:13px; font-family:inherit; outline:none; padding:8px 14px 8px 34px; transition:border-color .15s; }
  .search-input:focus { border-color:var(--accent); }
  .search-input::placeholder { color:#506070; }
  .sel-wrap { position:relative; }
  .sel-wrap svg { position:absolute; right:9px; top:50%; transform:translateY(-50%); width:12px; height:12px; color:#506070; pointer-events:none; }
  .filter-sel { background:#131920; border:1px solid #1e2d3d; border-radius:9px; color:#f0f4f8; font-size:12px; font-family:inherit; outline:none; padding:8px 30px 8px 12px; cursor:pointer; appearance:none; }
  .filter-sel option { background:#1a2230; }

  /* Tabla desktop */
  .table-wrap { background:#131920; border:1px solid #1e2d3d; border-radius:14px; overflow:hidden; }
  table { width:100%; border-collapse:collapse; }
  thead th { padding:10px 16px; font-size:10px; font-weight:600; color:#506070; text-transform:uppercase; letter-spacing:.07em; text-align:left; border-bottom:1px solid #1e2d3d; white-space:nowrap; background:#0d1117; }
  tbody td { padding:13px 16px; border-bottom:1px solid #1e2d3d18; vertical-align:middle; }
  tbody tr:last-child td { border-bottom:none; }
  tbody tr:hover { background:#1a2230; }
  .m-nombre { font-size:13px; font-weight:600; color:#f0f4f8; }
  .badge { display:inline-flex; align-items:center; padding:3px 9px; border-radius:20px; font-size:11px; font-weight:600; white-space:nowrap; }
  .anio-badge { display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:8px; font-size:12px; font-weight:700; background:#1e2d3d; color:#8fa3b8; }
  .alumnos-val { font-size:13px; font-weight:700; color:#f0f4f8; }
  .alumnos-bar { width:56px; height:3px; background:#1e2d3d; border-radius:2px; margin-top:4px; overflow:hidden; }
  .alumnos-fill { height:100%; border-radius:2px; background:var(--accent); }
  .prof-chip { display:inline-flex; align-items:center; gap:6px; }
  .prof-dot { width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:700; color:#000; flex-shrink:0; }
  .icon-btn { background:none; border:none; cursor:pointer; color:#8fa3b8; padding:5px; border-radius:6px; display:flex; align-items:center; transition:background .12s,color .12s; }
  .icon-btn:hover { background:#1e2d3d; color:#f0f4f8; }
  .icon-btn svg { width:14px; height:14px; }
  .icon-btn.del:hover { color:#ef4444; background:#ef444418; }
  .actions-cell { display:flex; align-items:center; gap:4px; }
  .empty-state { text-align:center; padding:52px 20px; color:#506070; font-size:13px; }
  .empty-state svg { width:36px; height:36px; margin:0 auto 12px; display:block; opacity:.3; }

  /* Cards mobile */
  .cards-list { display:none; flex-direction:column; gap:10px; }
  .m-card { background:#131920; border:1px solid #1e2d3d; border-radius:14px; padding:16px; }
  .m-card-top { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; margin-bottom:10px; }
  .m-card-nombre { font-size:14px; font-weight:700; color:#f0f4f8; }
  .m-card-badges { display:flex; gap:6px; flex-wrap:wrap; margin-top:6px; }
  .m-card-meta { display:flex; flex-direction:column; gap:8px; padding-top:10px; border-top:1px solid #1e2d3d33; }
  .m-card-row { display:flex; align-items:center; justify-content:space-between; font-size:12px; }
  .m-card-lbl { color:#506070; }
  .m-card-val { color:#f0f4f8; font-weight:500; }
  .m-card-actions { display:flex; gap:8px; margin-top:12px; }
  .m-btn-edit { flex:1; padding:9px; background:#1a2230; border:1px solid #243447; border-radius:9px; color:var(--accent); font-size:12px; font-weight:600; font-family:inherit; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px; }
  .m-btn-edit svg { width:12px; height:12px; }
  .m-btn-edit:hover { border-color:var(--accent); }
  .m-btn-del { padding:9px 14px; background:#ef444410; border:1px solid #ef444430; border-radius:9px; color:#ef4444; font-size:12px; font-weight:600; font-family:inherit; cursor:pointer; }
  .m-btn-del:hover { background:#ef444420; }

  /* Modal crear/editar */
  .overlay { position:fixed; inset:0; background:rgba(0,0,0,.65); backdrop-filter:blur(4px); z-index:100; display:flex; align-items:center; justify-content:center; padding:16px; }
  .modal { background:#131920; border:1px solid #1e2d3d; border-radius:16px; width:100%; max-width:460px; max-height:90dvh; overflow-y:auto; box-shadow:0 24px 60px rgba(0,0,0,.6); }
  .modal-hdr { display:flex; align-items:center; justify-content:space-between; padding:18px 22px 14px; border-bottom:1px solid #1e2d3d; position:sticky; top:0; background:#131920; z-index:2; }
  .modal-hdr h2 { font-size:15px; font-weight:700; color:#f0f4f8; }
  .modal-close { background:none; border:none; color:#506070; cursor:pointer; padding:4px; border-radius:6px; display:flex; transition:color .15s; }
  .modal-close:hover { color:#f0f4f8; background:#1e2d3d; }
  .modal-close svg { width:18px; height:18px; }
  .modal-body { padding:20px 22px; display:flex; flex-direction:column; gap:14px; }
  .form-row2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .fg { display:flex; flex-direction:column; gap:5px; }
  .fg label { font-size:10px; color:#506070; text-transform:uppercase; letter-spacing:.07em; font-weight:600; }
  .fg input, .fg select { background:#0d1117; border:1px solid #243447; border-radius:8px; color:#f0f4f8; font-size:13px; font-family:inherit; outline:none; padding:9px 12px; width:100%; transition:border-color .15s; appearance:none; }
  .fg input:focus, .fg select:focus { border-color:var(--accent); }
  .fg select { background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' fill='%23506070' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 10px center; background-color:#0d1117; padding-right:30px; }
  .fg select option { background:#131920; }
  .modal-ftr { display:flex; gap:8px; padding:0 22px 20px; }
  .modal-ftr .btn-primary { flex:1; justify-content:center; }
  .btn-cancel { flex:1; padding:9px; background:#1a2230; border:1px solid #243447; border-radius:9px; color:#8fa3b8; font-size:13px; font-weight:600; font-family:inherit; cursor:pointer; transition:border-color .15s; }
  .btn-cancel:hover { border-color:#506070; color:#f0f4f8; }

  /* ── MODAL CONFIRMACIÓN ELIMINAR ── */
  .confirm-overlay {
    position:fixed; inset:0; background:rgba(0,0,0,.7);
    backdrop-filter:blur(6px); z-index:200;
    display:flex; align-items:center; justify-content:center; padding:16px;
  }
  .confirm-card {
    background:#131920; border:1px solid #2a1818;
    border-radius:16px; width:100%; max-width:340px;
    padding:28px 24px 22px;
    box-shadow:0 0 0 1px #ef444420, 0 24px 60px rgba(0,0,0,.7);
  }
  .confirm-icon-wrap {
    width:52px; height:52px; border-radius:14px;
    background:#ef444412; border:1px solid #ef444428;
    display:flex; align-items:center; justify-content:center;
    margin:0 auto 18px;
  }
  .confirm-icon-wrap svg { width:24px; height:24px; color:#ef4444; }
  .confirm-title {
    font-size:16px; font-weight:800; color:#f0f4f8;
    text-align:center; margin-bottom:8px; letter-spacing:-.02em;
  }
  .confirm-materia {
    text-align:center; font-size:13px; font-weight:600;
    color:var(--accent); background:var(--accent-muted); border:1px solid var(--accent-muted);
    border-radius:8px; padding:8px 14px; margin-bottom:10px;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  }
  .confirm-desc {
    font-size:12px; color:#506070; line-height:1.6;
    text-align:center; margin-bottom:22px;
  }
  .confirm-btns { display:flex; gap:8px; }
  .confirm-btns .btn-cancel { flex:1; padding:10px; }
  .btn-eliminar {
    flex:1; display:inline-flex; align-items:center; justify-content:center; gap:6px;
    padding:10px; background:#ef4444; border:none;
    border-radius:9px; color:#fff; font-size:13px; font-weight:700;
    font-family:inherit; cursor:pointer; transition:opacity .15s;
  }
  .btn-eliminar:hover { opacity:.85; }
  .btn-eliminar svg { width:13px; height:13px; }

  /* Toast */
  .toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:#22c55e; color:#000; font-size:13px; font-weight:700; padding:10px 22px; border-radius:999px; z-index:300; white-space:nowrap; animation:tin .25s ease; }
  @keyframes tin { from{opacity:0;transform:translateX(-50%) translateY(10px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }

  /* Responsive */
  @media(max-width:768px){
    .topbar  { padding:0 14px; }
    .content { padding:14px; }
    .table-wrap { display:none; }
    .cards-list { display:flex; }
    .carreras-grid { grid-template-columns:1fr 1fr; gap:8px; }
    .form-row2 { grid-template-columns:1fr; }
    .modal-ftr { flex-direction:column; }
    .overlay { align-items:flex-end; padding:0; }
    .modal { border-radius:20px 20px 0 0; max-width:100%; max-height:92dvh; }
    .confirm-overlay { align-items:flex-end; padding:0; }
    .confirm-card { border-radius:20px 20px 0 0; max-width:100%; }
  }
  @media(max-width:400px){
    .carreras-grid { grid-template-columns:1fr; }
  }
`

export default function Materias() {
  const [materias,      setMaterias]      = useState<Materia[]>([])
  const [busqueda,      setBusqueda]      = useState('')
  const [filtroCarrera, setFiltroCarrera] = useState('todas')
  const [modal,         setModal]         = useState<null | 'nuevo' | Materia>(null)
  const [draft,         setDraft]         = useState(emptyDraft)
  const [confirmar,     setConfirmar]     = useState<Materia | null>(null)
  const [toast,         setToast]         = useState('')
  const [loading,       setLoading]       = useState(true)
  const [profNameToId,  setProfNameToId]  = useState<Record<string, number>>({})

  type MateriaRaw = { id: number; nombre: string; profesor_id: number; carrera_id: number | null; anio: number; semestre: number; profesor_nombre?: string | null; carrera_nombre?: string | null }

  function mapMaterias(data: MateriaRaw[]): Materia[] {
    return data.map(m => ({
      id: m.id,
      nombre: m.nombre,
      carrera: m.carrera_nombre || 'Sin carrera',
      anio: m.anio || 1,
      semestre: m.semestre || 1,
      profesor: m.profesor_nombre || `Prof. #${m.profesor_id}`,
      alumnos: 0,
    }))
  }

  useEffect(() => {
    Promise.all([
      api.get<MateriaRaw[]>('/materias/'),
      api.get<{ id: number; username: string; nombre: string; role: string }[]>('/users/').catch(() => []),
    ]).then(([mData, uData]) => {
      const pNameId: Record<string, number> = {}
      uData.filter(u => u.role === 'profesor').forEach(u => {
        const name = u.nombre || u.username
        pNameId[name] = u.id
      })
      setProfNameToId(pNameId)
      setMaterias(mapMaterias(mData))
      setLoading(false)
    }).catch(() => {
      setMaterias(materiasIniciales)
      setLoading(false)
    })
  }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2200) }

  const filtradas = materias.filter(m => {
    const q = busqueda.toLowerCase()
    return (m.nombre.toLowerCase().includes(q) || m.profesor.toLowerCase().includes(q)) &&
      (filtroCarrera === 'todas' || m.carrera === filtroCarrera)
  })

  function abrirNuevo() { setDraft(emptyDraft); setModal('nuevo') }
  function abrirEditar(m: Materia) {
    setDraft({ nombre:m.nombre, carrera:m.carrera, anio:m.anio, semestre:m.semestre, profesor:m.profesor, alumnos:m.alumnos })
    setModal(m)
  }
  function cerrar() { setModal(null) }

  async function guardar() {
    if (!draft.nombre.trim()) return
    const profesor_id = profNameToId[draft.profesor] ?? 0
    try {
      if (modal === 'nuevo') {
        await api.post('/materias/', { nombre: draft.nombre, profesor_id, anio: draft.anio, semestre: draft.semestre })
        showToast('Materia creada')
      } else {
        showToast('Cambios guardados (solo offline)')
        setMaterias(prev => prev.map(m => m.id === (modal as Materia).id ? { ...m, ...draft } : m))
        cerrar()
        return
      }
      const data = await api.get<MateriaRaw[]>('/materias/')
      setMaterias(mapMaterias(data))
    } catch {
      if (modal === 'nuevo') {
        setMaterias(prev => [...prev, { ...draft, id: Date.now() }])
        showToast('Materia creada (offline)')
      }
    }
    cerrar()
  }

  function pedirEliminar(m: Materia) { setConfirmar(m) }

  function confirmarEliminar() {
    if (!confirmar) return
    setMaterias(prev => prev.filter(m => m.id !== confirmar.id))
    setConfirmar(null)
    showToast('Materia eliminada')
  }

  const carrerasStats = carrerasCfg.map(c => ({
    ...c,
    count:   materias.filter(m => m.carrera === c.nombre).length,
    alumnos: materias.filter(m => m.carrera === c.nombre).reduce((s, m) => s + m.alumnos, 0),
  }))

  return (
    <>
      <style>{css}</style>
      <div className="m-root">

        {/* Topbar — solo título */}
        <header className="topbar">
          <h1>Materias y carreras</h1>
        </header>

        <div className="content">

          {/* Toolbar */}
          <div className="toolbar">
            <p className="toolbar-sub">{loading ? 'Cargando...' : `${materias.length} registradas · ${carrerasStats.length} carreras`}</p>
            {(() => {
              const token = sessionStorage.getItem('token')
              const rol = token ? (decodeToken(token)?.role ?? '') : ''
              return rol !== 'profesor' ? (
                <button className="btn-primary" onClick={abrirNuevo}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Nueva materia
                </button>
              ) : null
            })()}
          </div>

          {/* Carrera cards — toggle filtro */}
          <div className="carreras-grid">
            {carrerasStats.map(c => (
              <div
                key={c.nombre}
                className="carrera-card"
                style={{
                  background: filtroCarrera===c.nombre ? c.bg : '#131920',
                  borderColor: filtroCarrera===c.nombre ? c.color : '#1e2d3d',
                }}
                onClick={() => setFiltroCarrera(prev => prev===c.nombre ? 'todas' : c.nombre)}
              >
                <div className="carrera-emoji">{c.icon}</div>
                <div className="carrera-nombre">{c.nombre}</div>
                <div className="carrera-pills">
                  <span className="carrera-pill" style={{color:c.color, background:`${c.color}22`}}>{c.count} materias</span>
                  <span className="carrera-pill" style={{color:'#8fa3b8', background:'#1e2d3d'}}>{c.alumnos} alumnos</span>
                </div>
                <div className="carrera-bar" style={{background:c.color, opacity:filtroCarrera===c.nombre?1:0.35}}/>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="filters-bar">
            <div className="search-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input className="search-input" placeholder="Buscar por materia o profesor..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            </div>
            <div className="sel-wrap">
              <select className="filter-sel" value={filtroCarrera} onChange={e => setFiltroCarrera(e.target.value)}>
                <option value="todas">Todas las carreras</option>
                {carrerasCfg.map(c => <option key={c.nombre} value={c.nombre}>{c.nombre}</option>)}
              </select>
              <svg viewBox="0 0 16 16" fill="#506070"><path d="M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/></svg>
            </div>
          </div>

          {/* ── TABLA DESKTOP ── */}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Materia</th>
                  <th>Carrera</th>
                  <th style={{textAlign:'center'}}>Año</th>
                  <th style={{textAlign:'center'}}>Sem.</th>
                  <th>Profesor</th>
                  <th>Alumnos</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.length === 0
                  ? <tr><td colSpan={7}>
                      <div className="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                        </svg>
                        No se encontraron materias
                      </div>
                    </td></tr>
                  : filtradas.map(m => {
                      const cc = carrerasCfg.find(c => c.nombre === m.carrera)
                      const pc = profColors[m.profesor] ?? 'var(--accent)'
                      return (
                        <tr key={m.id}>
                          <td><div className="m-nombre">{m.nombre}</div></td>
                          <td>
                            <span className="badge" style={{color:cc?.color??'#8fa3b8', background:cc?.bg??'#1e2d3d'}}>{m.carrera}</span>
                          </td>
                          <td style={{textAlign:'center'}}>
                            <span className="anio-badge">{m.anio}°</span>
                          </td>
                          <td style={{textAlign:'center'}}>
                            <span className="badge" style={{color:'var(--accent)',background:'var(--accent-muted)'}}>Sem. {m.semestre}</span>
                          </td>
                          <td>
                            <div className="prof-chip">
                              <div className="prof-dot" style={{background:pc}}>{m.profesor[0]}</div>
                              <span style={{fontSize:13,color:'#f0f4f8'}}>{m.profesor}</span>
                            </div>
                          </td>
                          <td>
                            <div className="alumnos-val">{m.alumnos}</div>
                            <div className="alumnos-bar">
                              <div className="alumnos-fill" style={{width:`${Math.min(100,m.alumnos/maxAlumnos*100)}%`}}/>
                            </div>
                          </td>
                          <td>
                            <div className="actions-cell">
                              <button className="icon-btn" title="Editar" onClick={() => abrirEditar(m)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                              </button>
                              <button className="icon-btn del" title="Eliminar" onClick={() => pedirEliminar(m)}>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                }
              </tbody>
            </table>
          </div>

          {/* ── CARDS MOBILE ── */}
          <div className="cards-list">
            {filtradas.length === 0
              ? <div className="empty-state">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                  </svg>
                  No se encontraron materias
                </div>
              : filtradas.map(m => {
                  const cc = carrerasCfg.find(c => c.nombre === m.carrera)
                  const pc = profColors[m.profesor] ?? 'var(--accent)'
                  return (
                    <div className="m-card" key={m.id}>
                      <div className="m-card-top">
                        <div>
                          <div className="m-card-nombre">{m.nombre}</div>
                          <div className="m-card-badges">
                            <span className="badge" style={{color:cc?.color??'#8fa3b8',background:cc?.bg??'#1e2d3d'}}>{m.carrera}</span>
                            <span className="badge" style={{color:'var(--accent)',background:'var(--accent-muted)'}}>Sem. {m.semestre}</span>
                          </div>
                        </div>
                        <button className="icon-btn del" onClick={() => pedirEliminar(m)}>
                        </button>
                      </div>
                      <div className="m-card-meta">
                        <div className="m-card-row">
                          <span className="m-card-lbl">Año</span>
                          <span className="m-card-val">{m.anio}° año</span>
                        </div>
                        <div className="m-card-row">
                          <span className="m-card-lbl">Profesor</span>
                          <div className="prof-chip">
                            <div className="prof-dot" style={{background:pc}}>{m.profesor[0]}</div>
                            <span style={{fontSize:12,color:'#f0f4f8'}}>{m.profesor}</span>
                          </div>
                        </div>
                        <div className="m-card-row">
                          <span className="m-card-lbl">Alumnos</span>
                          <span className="m-card-val">{m.alumnos}</span>
                        </div>
                      </div>
                      <div className="m-card-actions">
                        <button className="m-btn-edit" onClick={() => abrirEditar(m)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                          Editar materia
                        </button>
                        <button className="m-btn-del" onClick={() => pedirEliminar(m)}>
                          Eliminar
                        </button>
                      </div>
                    </div>
                  )
                })
            }
          </div>

        </div>

        {/* ── MODAL CREAR / EDITAR ── */}
        {modal !== null && (
          <div className="overlay" onClick={e => { if (e.target === e.currentTarget) cerrar() }}>
            <div className="modal">
              <div className="modal-hdr">
                <h2>{modal === 'nuevo' ? 'Nueva materia' : 'Editar materia'}</h2>
                <button className="modal-close" onClick={cerrar}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="modal-body">
                <div className="fg">
                  <label>Nombre de la materia</label>
                  <input value={draft.nombre} onChange={e => setDraft(d => ({...d, nombre:e.target.value}))} placeholder="Ej: Análisis Matemático I" />
                </div>
                <div className="fg">
                  <label>Carrera</label>
                  <select value={draft.carrera} onChange={e => setDraft(d => ({...d, carrera:e.target.value}))}>
                    {carrerasCfg.map(c => <option key={c.nombre} value={c.nombre}>{c.nombre}</option>)}
                  </select>
                </div>
                <div className="form-row2">
                  <div className="fg">
                    <label>Año</label>
                    <select value={draft.anio} onChange={e => setDraft(d => ({...d, anio:Number(e.target.value)}))}>
                      {[1,2,3,4,5].map(a => <option key={a} value={a}>{a}° año</option>)}
                    </select>
                  </div>
                  <div className="fg">
                    <label>Semestre</label>
                    <select value={draft.semestre} onChange={e => setDraft(d => ({...d, semestre:Number(e.target.value)}))}>
                      <option value={1}>Semestre 1</option>
                      <option value={2}>Semestre 2</option>
                    </select>
                  </div>
                </div>
                <div className="fg">
                  <label>Profesor</label>
                  <select value={draft.profesor} onChange={e => setDraft(d => ({...d, profesor:e.target.value}))}>
                    {profesoresLista.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="fg">
                  <label>Cantidad de alumnos</label>
                  <input type="number" min={0} value={draft.alumnos} onChange={e => setDraft(d => ({...d, alumnos:Number(e.target.value)}))} placeholder="0" />
                </div>
              </div>
              <div className="modal-ftr">
                <button className="btn-cancel" onClick={cerrar}>Cancelar</button>
                <button className="btn-primary" onClick={guardar}
                  disabled={!draft.nombre.trim()}
                  style={{opacity:!draft.nombre.trim()?.45:1}}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:13,height:13}}>
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                  </svg>
                  {modal === 'nuevo' ? 'Crear materia' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL CONFIRMACIÓN ELIMINAR ── */}
        {confirmar !== null && (
          <div className="confirm-overlay" onClick={() => setConfirmar(null)}>
            <div className="confirm-card" onClick={e => e.stopPropagation()}>
              <div className="confirm-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14H6L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4h6v2"/>
                </svg>
              </div>
              <div className="confirm-title">¿Eliminar materia?</div>
              <div className="confirm-materia">{confirmar.nombre}</div>
              <div className="confirm-desc">
                Esta acción no se puede deshacer.<br/>
                Se eliminarán todos los datos asociados a esta materia.
              </div>
              <div className="confirm-btns">
                <button className="btn-cancel" onClick={() => setConfirmar(null)}>Cancelar</button>
                <button className="btn-eliminar" onClick={confirmarEliminar}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14H6L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4h6v2"/>
                  </svg>
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && <div className="toast">✓ {toast}</div>}
      </div>
    </>
  )
}