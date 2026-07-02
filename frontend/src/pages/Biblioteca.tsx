import { useState, useRef, useEffect } from 'react'
import { api, decodeToken } from '../lib/api'

interface Apunte {
  id: number
  titulo: string
  materia: string
  carrera: string
  anio: number
  semestre: number
  autor: string
  fecha: string
  tags: string[]
  paginas: number
  tipo: 'resumen' | 'ejercicios' | 'guia' | 'apuntes'
}

const apuntesMock: Apunte[] = [
  { id:1, titulo:'Resumen Análisis Matemático I — Unidad 1 y 2', materia:'Análisis Matemático I',    carrera:'Ing. Informática', anio:1, semestre:1, autor:'María González', fecha:'14/3/2026', tags:['limites','derivadas','resumen'],       paginas:12, tipo:'resumen'    },
  { id:2, titulo:'Ejercicios resueltos Física I — Cinemática',   materia:'Física I',                carrera:'Ing. Informática', anio:1, semestre:1, autor:'Luis Paredes',  fecha:'19/3/2026', tags:['cinemática','ejercicios','parcial'],   paginas:8,  tipo:'ejercicios' },
  { id:3, titulo:'Guía completa Programación I — Punteros',      materia:'Programación I',          carrera:'Ing. Informática', anio:1, semestre:1, autor:'Ana Torres',    fecha:'31/3/2026', tags:['punteros','C++','guía'],               paginas:20, tipo:'guia'       },
  { id:4, titulo:'Apuntes Matemática Discreta — Grafos',         materia:'Matemática Discreta',     carrera:'Ing. Informática', anio:1, semestre:2, autor:'Carlos Méndez', fecha:'9/4/2026',  tags:['grafos','teoría','apuntes'],           paginas:15, tipo:'apuntes'    },
  { id:5, titulo:'Resumen Resistencia de Materiales',            materia:'Resistencia de Mater.',   carrera:'Ing. Civil',       anio:2, semestre:1, autor:'Pedro Rojas',   fecha:'4/4/2026',  tags:['tensión','deformación','resumen'],     paginas:10, tipo:'resumen'    },
]

const materiaColor: Record<string,{color:string;bg:string}> = {
  'Análisis Matemático I':   { color:'var(--accent)', bg:'var(--accent-muted)' },
  'Física I':                { color:'#a855f7', bg:'#a855f715' },
  'Programación I':          { color:'#22c55e', bg:'#22c55e15' },
  'Matemática Discreta':     { color:'#f59e0b', bg:'#f59e0b15' },
  'Resistencia de Mater.':   { color:'#3b82f6', bg:'#3b82f615' },
}
function getMC(m:string){ return materiaColor[m] ?? {color:'var(--text-secondary)',bg:'#2a3040'} }

const tipoCfg: Record<string,{label:string;color:string;bg:string}> = {
  resumen:    { label:'Resumen',    color:'var(--accent)', bg:'var(--accent-muted)' },
  ejercicios: { label:'Ejercicios', color:'#a855f7', bg:'#a855f715' },
  guia:       { label:'Guía',       color:'#22c55e', bg:'#22c55e15' },
  apuntes:    { label:'Apuntes',    color:'#f59e0b', bg:'#f59e0b15' },
}

const carreras   = ['Ing. Informática','Ing. Civil','Ing. Electrónica','Administración']
const materias   = ['Análisis Matemático I','Física I','Programación I','Matemática Discreta','Resistencia de Mater.']
const autoresLst = ['María González','Luis Paredes','Ana Torres','Carlos Méndez','Pedro Rojas']

const emptyDraft = { titulo:'', materia:materias[0], carrera:carreras[0], anio:1, semestre:1, autor:autoresLst[0], tags:'', tipo:'resumen' as const }

const css = `
  *, *::before, *::after { box-sizing:border-box; }
  .bib-root { display:flex; flex-direction:column; flex:1; font-family:'Inter',system-ui,sans-serif; color:var(--text-primary); }

  /* Topbar */
  .topbar {
    display:flex; align-items:center; padding:0 24px; height:56px;
    border-bottom:1px solid #2a3040; background:var(--bg-base);
    position:sticky; top:0; z-index:20; flex-shrink:0;
  }
  .topbar h1 { font-size:17px; font-weight:700; color:var(--text-primary); letter-spacing:-.01em; }

  .content { padding:20px 24px; flex:1; overflow-y:auto; }

  /* Toolbar */
  .toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; gap:12px; flex-wrap:wrap; }
  .toolbar-sub { font-size:12px; color:var(--text-muted); }
  .btn-primary {
    display:inline-flex; align-items:center; gap:6px;
    padding:9px 16px; background:var(--accent); border:none;
    border-radius:9px; color:#000; font-size:13px; font-weight:700;
    font-family:inherit; cursor:pointer; transition:opacity .15s; white-space:nowrap;
  }
  .btn-primary:hover { opacity:.85; }
  .btn-primary svg { width:13px; height:13px; flex-shrink:0; }

  /* Stats */
  .stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:18px; }
  .stat-card { background:var(--bg-surface); border:1px solid #2a3040; border-radius:12px; padding:13px 14px; display:flex; align-items:center; gap:10px; }
  .stat-icon { width:34px; height:34px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .stat-icon svg { width:15px; height:15px; }
  .stat-val { font-size:18px; font-weight:800; line-height:1; }
  .stat-lbl { font-size:11px; color:var(--text-muted); margin-top:2px; }

  /* Tipo chips (filtro horizontal) */
  .tipo-bar { display:flex; gap:6px; margin-bottom:14px; flex-wrap:wrap; }
  .tipo-chip {
    display:inline-flex; align-items:center; gap:5px;
    padding:5px 12px; border-radius:20px; border:1px solid;
    font-size:12px; font-weight:600; cursor:pointer;
    transition:opacity .15s, border-color .15s;
    background:transparent;
  }
  .tipo-chip.active {}
  .tipo-chip.inactive { opacity:.45; }
  .tipo-chip:hover { opacity:1; }

  /* Filters */
  .filters-bar { display:flex; gap:8px; margin-bottom:18px; flex-wrap:wrap; }
  .search-wrap { flex:1; min-width:180px; position:relative; }
  .search-wrap svg { position:absolute; left:11px; top:50%; transform:translateY(-50%); width:14px; height:14px; color:var(--text-muted); pointer-events:none; }
  .search-input {
    width:100%; background:var(--bg-surface); border:1px solid #2a3040;
    border-radius:9px; color:var(--text-primary); font-size:13px;
    font-family:inherit; outline:none; padding:8px 14px 8px 34px; transition:border-color .15s;
  }
  .search-input:focus { border-color:var(--accent); }
  .search-input::placeholder { color:var(--text-muted); }

  /* Custom dropdown */
  .csel-wrap { position:relative; }
  .csel-btn {
    display:flex; align-items:center; gap:8px;
    background:var(--bg-surface); border:1px solid #2a3040;
    border-radius:9px; padding:0 10px; height:36px;
    color:var(--text-primary); font-size:12px; font-family:inherit;
    cursor:pointer; white-space:nowrap; min-width:140px;
    justify-content:space-between; transition:border-color .15s;
  }
  .csel-btn:hover, .csel-btn.open { border-color:var(--accent); }
  .csel-btn svg { width:11px; height:11px; color:var(--text-muted); flex-shrink:0; transition:transform .2s; }
  .csel-btn.open svg { transform:rotate(180deg); }
  .csel-drop {
    position:absolute; top:calc(100% + 5px); left:0; min-width:100%;
    background:var(--bg-surface); border:1px solid #2a3040;
    border-radius:10px; overflow:hidden;
    box-shadow:0 12px 32px rgba(0,0,0,.5); z-index:50;
  }
  .csel-opt {
    display:flex; align-items:center; justify-content:space-between;
    padding:10px 14px; font-size:12px; color:var(--text-secondary);
    cursor:pointer; border:none; background:none;
    width:100%; text-align:left; font-family:inherit;
    transition:background .12s; gap:12px; white-space:nowrap;
  }
  .csel-opt:hover { background:var(--bg-hover); color:var(--text-primary); }
  .csel-opt.sel { color:var(--accent); background:var(--accent-muted); }
  .csel-opt svg { width:13px; height:13px; color:var(--accent); flex-shrink:0; }

  /* Grid de cards */
  .cards-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }

  /* Apunte card */
  .a-card {
    background:var(--bg-surface); border:1px solid #2a3040;
    border-radius:14px; overflow:hidden;
    display:flex; flex-direction:column;
    transition:border-color .15s, transform .12s;
    cursor:pointer;
  }
  .a-card:hover { border-color:var(--border-light); transform:translateY(-2px); }
  .a-bar { height:3px; width:100%; flex-shrink:0; }
  .a-body { padding:14px 15px 10px; flex:1; display:flex; flex-direction:column; gap:10px; }
  .a-head { display:flex; align-items:flex-start; gap:10px; }
  .a-icon { width:34px; height:34px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .a-icon svg { width:15px; height:15px; }
  .a-titulo  { font-size:13px; font-weight:700; color:var(--text-primary); line-height:1.35; }
  .a-materia { font-size:11px; font-weight:600; margin-top:3px; }
  .a-tipo-badge { display:inline-flex; align-items:center; padding:2px 8px; border-radius:20px; font-size:10px; font-weight:700; margin-top:4px; border:1px solid; }
  .a-meta { display:flex; flex-direction:column; gap:3px; }
  .a-meta-row { display:flex; align-items:center; gap:5px; font-size:11px; color:var(--text-muted); }
  .a-meta-row svg { width:11px; height:11px; flex-shrink:0; }
  .tags-row { display:flex; flex-wrap:wrap; gap:4px; }
  .tag { padding:2px 7px; border-radius:5px; font-size:10px; font-weight:600; border:1px solid; }
  .a-foot { padding:10px 15px 13px; display:flex; gap:7px; border-top:1px solid #2a304022; margin-top:auto; }
  .btn-ver {
    flex:1; padding:8px; background:var(--bg-hover); border:1px solid var(--border-light);
    border-radius:8px; color:var(--accent); font-size:12px; font-weight:700;
    font-family:inherit; cursor:pointer; transition:border-color .15s, background .15s;
    display:flex; align-items:center; justify-content:center; gap:5px;
  }
  .btn-ver svg { width:12px; height:12px; }
  .btn-ver:hover { border-color:var(--accent); background:var(--accent-muted); }
  .btn-fav {
    width:34px; height:34px; background:var(--bg-hover); border:1px solid var(--border-light);
    border-radius:8px; display:flex; align-items:center; justify-content:center;
    cursor:pointer; flex-shrink:0; color:var(--text-muted); transition:all .15s;
  }
  .btn-fav:hover { border-color:#f59e0b; color:#f59e0b; }
  .btn-fav.on { border-color:#f59e0b; color:#f59e0b; background:#f59e0b12; }
  .btn-fav svg { width:13px; height:13px; }

  /* Empty */
  .empty { text-align:center; padding:60px 20px; color:var(--text-muted); font-size:13px; }
  .empty svg { width:40px; height:40px; margin:0 auto 14px; display:block; opacity:.2; }

  /* ── MODAL SUBIR ── */
  .modal-backdrop {
    position:fixed; inset:0; background:rgba(0,0,0,.65);
    backdrop-filter:blur(4px); z-index:100;
    display:flex; align-items:center; justify-content:center; padding:16px;
  }
  .modal-box {
    background:var(--bg-surface); border:1px solid #2a3040;
    border-radius:16px; width:100%; max-width:460px;
    max-height:90dvh; overflow-y:auto;
    box-shadow:0 24px 60px rgba(0,0,0,.6);
  }
  .modal-head {
    display:flex; align-items:center; justify-content:space-between;
    padding:17px 22px 13px; border-bottom:1px solid #2a3040;
    position:sticky; top:0; background:var(--bg-surface); z-index:2;
  }
  .modal-head h2 { font-size:15px; font-weight:700; color:var(--text-primary); }
  .modal-close { background:none; border:none; color:var(--text-muted); cursor:pointer; padding:4px; border-radius:6px; display:flex; transition:color .15s; }
  .modal-close:hover { color:var(--text-primary); background:#2a3040; }
  .modal-close svg { width:18px; height:18px; }
  .modal-body { padding:18px 22px; display:flex; flex-direction:column; gap:13px; }
  .modal-foot { display:flex; gap:8px; padding:0 22px 18px; }
  .modal-foot .btn-primary { flex:1; justify-content:center; }
  .btn-cancel {
    flex:1; padding:9px; background:var(--bg-hover); border:1px solid var(--border-light);
    border-radius:9px; color:var(--text-secondary); font-size:13px; font-weight:600;
    font-family:inherit; cursor:pointer; transition:border-color .15s;
  }
  .btn-cancel:hover { border-color:var(--text-muted); color:var(--text-primary); }
  .form-row2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .fg { display:flex; flex-direction:column; gap:5px; }
  .fg label { font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.07em; font-weight:600; }
  .fg input, .fg select {
    background:var(--bg-input); border:1px solid var(--border-light);
    border-radius:8px; color:var(--text-primary); font-size:13px;
    font-family:inherit; outline:none; padding:9px 12px; width:100%; transition:border-color .15s;
  }
  .fg input:focus, .fg select:focus { border-color:var(--accent); }
  .fg select {
    appearance:none; cursor:pointer;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' fill='%23506070' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E");
    background-repeat:no-repeat; background-position:right 10px center;
    background-color:var(--bg-input); padding-right:30px;
  }
  .fg select option { background:var(--bg-surface); }

  /* Upload zone */
  .upload-zone {
    border:2px dashed var(--border-light); border-radius:10px;
    padding:24px; text-align:center; cursor:pointer;
    transition:border-color .15s, background .15s;
  }
  .upload-zone:hover { border-color:var(--accent); background:var(--accent-muted); }
  .upload-zone svg { width:28px; height:28px; color:var(--text-muted); margin:0 auto 8px; display:block; }
  .upload-zone p { font-size:12px; color:var(--text-muted); margin:0; }
  .upload-zone span { font-size:11px; color:#3a4f6a; }

  /* ── MODAL PREVIEW ── */
  .preview-backdrop {
    position:fixed; inset:0; background:rgba(0,0,0,.72);
    backdrop-filter:blur(6px); z-index:100;
    display:flex; align-items:center; justify-content:center; padding:16px;
  }
  .preview-box {
    background:var(--bg-surface); border:1px solid #2a3040;
    border-radius:16px; width:100%; max-width:520px;
    max-height:90dvh; overflow-y:auto;
    box-shadow:0 24px 60px rgba(0,0,0,.7);
  }
  .preview-head {
    display:flex; align-items:flex-start; justify-content:space-between; gap:12px;
    padding:18px 22px 14px; border-bottom:1px solid #2a3040;
    position:sticky; top:0; background:var(--bg-surface); z-index:2;
  }
  .preview-tipo { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; margin-bottom:4px; }
  .preview-titulo { font-size:15px; font-weight:800; color:var(--text-primary); line-height:1.3; }
  .preview-body { padding:18px 22px; display:flex; flex-direction:column; gap:14px; }
  .preview-info-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .preview-info-cell { background:var(--bg-input); border:1px solid #2a3040; border-radius:8px; padding:10px 12px; }
  .preview-info-lbl { font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; margin-bottom:3px; }
  .preview-info-val { font-size:13px; font-weight:600; color:var(--text-primary); }
  .preview-tags { display:flex; flex-wrap:wrap; gap:5px; }
  .preview-foot { display:flex; gap:8px; padding:0 22px 18px; }
  .btn-download {
    flex:1; display:inline-flex; align-items:center; justify-content:center; gap:7px;
    padding:10px; background:var(--accent); border:none;
    border-radius:9px; color:#000; font-size:13px; font-weight:700;
    font-family:inherit; cursor:pointer; transition:opacity .15s;
  }
  .btn-download:hover { opacity:.85; }
  .btn-download svg { width:14px; height:14px; }
  .preview-doc {
    background:var(--bg-input); border:1px solid #2a3040;
    border-radius:10px; padding:20px 24px; margin-top:4px;
    max-height:320px; overflow-y:auto;
    font-size:13px; line-height:1.7; color:#c8d6e5;
  }
  .preview-doc h3 {
    font-size:15px; font-weight:700; color:var(--text-primary);
    margin:0 0 12px; padding-bottom:8px;
    border-bottom:1px solid #2a3040;
  }
  .preview-doc p { margin:0 0 10px; }
  .preview-doc .doc-section {
    margin-bottom:14px; padding:12px 14px;
    background:var(--bg-base); border-left:3px solid;
    border-radius:0 6px 6px 0;
  }
  .preview-doc .doc-formula {
    font-family:'Courier New',monospace; font-size:13px;
    background:var(--bg-base); padding:10px 14px; border-radius:6px;
    color:var(--accent); margin:8px 0; text-align:center;
  }

  /* Toast */
  .toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:#22c55e; color:#000; font-size:13px; font-weight:700; padding:10px 22px; border-radius:999px; z-index:200; white-space:nowrap; animation:tin .25s ease; }
  @keyframes tin { from{opacity:0;transform:translateX(-50%) translateY(8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }

  /* Responsive */
  @media(max-width:1024px){ .cards-grid { grid-template-columns:repeat(2,1fr); } .stats-row { grid-template-columns:repeat(2,1fr); } }
  @media(max-width:768px){
    .topbar  { padding:0 14px; }
    .content { padding:14px; }
    .cards-grid { grid-template-columns:1fr; }
    .stats-row  { grid-template-columns:repeat(2,1fr); gap:8px; }
    .stat-val   { font-size:16px; }
    .form-row2  { grid-template-columns:1fr; }
    .modal-backdrop  { align-items:flex-end; padding:0; }
    .modal-box       { border-radius:20px 20px 0 0; max-width:100%; max-height:92dvh; }
    .modal-foot      { flex-direction:column; }
    .preview-backdrop{ align-items:flex-end; padding:0; }
    .preview-box     { border-radius:20px 20px 0 0; max-width:100%; }
    .preview-info-grid { grid-template-columns:1fr; }
  }
`

export default function Biblioteca() {
  const token = sessionStorage.getItem('token')
  const userRole = token ? (decodeToken(token)?.role || '') : ''
  const puedeSubir = userRole === 'admin' || userRole === 'profesor'

  const [apuntes, setApuntes] = useState<Apunte[]>([])
  const [busqueda,      setBusqueda]      = useState('')
  const [filtroCarrera, setFiltroCarrera] = useState('todas')
  const [filtroMateria, setFiltroMateria] = useState('todas')
  const [filtroTipo,    setFiltroTipo]    = useState('todos')
  const [dropCar,       setDropCar]       = useState(false)
  const [dropMat,       setDropMat]       = useState(false)
  const [favs,          setFavs]          = useState<Set<number>>(new Set())
  const [modalSubir,    setModalSubir]    = useState(false)
  const [preview,       setPreview]       = useState<Apunte|null>(null)
  const [draft,         setDraft]         = useState(emptyDraft)
  const [toast,         setToast]         = useState('')
  const carRef = useRef<HTMLDivElement>(null)
  const matRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function h(e:MouseEvent){
      if(carRef.current && !carRef.current.contains(e.target as Node)) setDropCar(false)
      if(matRef.current && !matRef.current.contains(e.target as Node)) setDropMat(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (filtroMateria !== 'todas' && !materiasDisp.includes(filtroMateria)) {
      setFiltroMateria('todas')
    }
  }, [filtroCarrera])

  useEffect(() => {
    (async () => {
      try {
        const apuntesData: any[] = await api.get('/apuntes/') || []
        const materiasData: any[] = await api.get('/materias/') || []
        if (apuntesData.length > 0) {
          const materiaMap: Record<number, string> = {}
          materiasData.forEach((m: any) => { materiaMap[m.id] = m.nombre })
          setApuntes(apuntesData.map((a: any) => ({
            id: a.id,
            titulo: a.titulo || a.descripcion || `Apunte #${a.id}`,
            materia: materiaMap[a.materia_id] || `Materia #${a.materia_id}`,
            carrera: 'Ing. Informática',
            anio: 1,
            semestre: 1,
            autor: `Usuario #${a.user_id}`,
            fecha: a.created_at?.slice(0, 10).replace(/-/g, '/') || '—',
            tags: [],
            paginas: 0,
            tipo: 'apuntes' as const,
          })))
        } else {
          setApuntes(apuntesMock)
        }
      } catch {
        setApuntes(apuntesMock)
      }
    })()
  }, [])

  function showToast(msg:string){ setToast(msg); setTimeout(()=>setToast(''),2200) }

  const materiasDisp = ['todas', ...Array.from(new Set(
    apuntes
      .filter(a => filtroCarrera === 'todas' || a.carrera === filtroCarrera)
      .map(a => a.materia)
  ))]

  const filtrados = apuntes.filter(a => {
    const q = busqueda.toLowerCase()
    const mQ = a.titulo.toLowerCase().includes(q) || a.tags.some(t=>t.toLowerCase().includes(q)) || a.autor.toLowerCase().includes(q)
    const mC = filtroCarrera==='todas' || a.carrera===filtroCarrera
    const mM = filtroMateria==='todas' || a.materia===filtroMateria
    const mT = filtroTipo==='todos' || a.tipo===filtroTipo
    return mQ && mC && mM && mT
  })

  function toggleFav(id:number){
    setFavs(prev=>{ const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n })
  }

  function guardarApunte(){
    if(!draft.titulo.trim()) return
    const nuevo: Apunte = {
      id: Date.now(), titulo:draft.titulo, materia:draft.materia,
      carrera:draft.carrera, anio:draft.anio, semestre:Number(draft.semestre) as 1|2,
      autor:draft.autor, fecha:new Date().toLocaleDateString('es-PY'),
      tags:draft.tags.split(',').map(t=>t.trim()).filter(Boolean),
      paginas:1, tipo:draft.tipo,
    }
    setApuntes(prev=>[nuevo,...prev])
    setModalSubir(false)
    setDraft(emptyDraft)
    showToast('Apunte subido correctamente')
  }

  const stats = {
    total:   apuntes.length,
    materias:new Set(apuntes.map(a=>a.materia)).size,
    autores: new Set(apuntes.map(a=>a.autor)).size,
    favs:    favs.size,
  }

  const carrerasDisp = Array.from(new Set(apuntes.map(a=>a.carrera)))
  const carLabel = filtroCarrera==='todas'?'Todas las carreras':filtroCarrera
  const matLabel = filtroMateria==='todas'?'Todas las materias':filtroMateria.length>18?filtroMateria.slice(0,16)+'…':filtroMateria

  return (
    <>
      <style>{css}</style>
      <div className="bib-root">

        <header className="topbar">
          <h1>Biblioteca de apuntes</h1>
        </header>

        <div className="content">

          {/* Toolbar */}
          <div className="toolbar">
            <p className="toolbar-sub">{filtrados.length} de {apuntes.length} apuntes disponibles</p>
            {puedeSubir && (
              <button className="btn-primary" onClick={()=>setModalSubir(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Subir apunte
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="stats-row">
            {[
              { val:stats.total,   lbl:'Total apuntes', color:'var(--accent)', bg:'var(--accent-muted)', icon:<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></> },
              { val:stats.materias,lbl:'Materias',       color:'#a855f7', bg:'#a855f715', icon:<><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></> },
              { val:stats.autores, lbl:'Autores',        color:'#22c55e', bg:'#22c55e15', icon:<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></> },
              { val:stats.favs,    lbl:'Guardados',      color:'#f59e0b', bg:'#f59e0b15', icon:<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/> },
            ].map(s=>(
              <div key={s.lbl} className="stat-card">
                <div className="stat-icon" style={{background:s.bg}}>
                  <svg viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2">{s.icon}</svg>
                </div>
                <div>
                  <div className="stat-val" style={{color:s.color}}>{s.val}</div>
                  <div className="stat-lbl">{s.lbl}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Filtro por tipo */}
          <div className="tipo-bar">
            {[{v:'todos',l:'Todos'}, ...Object.entries(tipoCfg).map(([v,c])=>({v,l:c.label}))].map(t=>(
              <button key={t.v}
                className={`tipo-chip ${filtroTipo===t.v?'active':'inactive'}`}
                style={filtroTipo===t.v
                  ? {color: t.v==='todos'?'var(--text-primary)':tipoCfg[t.v].color, background: t.v==='todos'?'var(--bg-hover)':tipoCfg[t.v].bg, borderColor: t.v==='todos'?'var(--border-light)':tipoCfg[t.v].color+'40'}
                  : {color:'var(--text-muted)', background:'transparent', borderColor:'#2a3040'}
                }
                onClick={()=>setFiltroTipo(t.v)}
              >
                {t.l}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="filters-bar">
            <div className="search-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input className="search-input" placeholder="Buscar por título, tag o autor..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} />
            </div>

            <div className="csel-wrap" ref={carRef}>
              <button className={`csel-btn${dropCar?' open':''}`} onClick={()=>{setDropCar(v=>!v);setDropMat(false)}}>
                <span>{carLabel.length>16?carLabel.slice(0,14)+'…':carLabel}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {dropCar && (
                <div className="csel-drop">
                  {(['todas',...carrerasDisp]).map(opt=>(
                    <button key={opt} className={`csel-opt${filtroCarrera===opt?' sel':''}`}
                      onClick={()=>{setFiltroCarrera(opt);setDropCar(false)}}>
                      <span>{opt==='todas'?'Todas las carreras':opt}</span>
                      {filtroCarrera===opt && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="csel-wrap" ref={matRef}>
              <button className={`csel-btn${dropMat?' open':''}`} onClick={()=>{setDropMat(v=>!v);setDropCar(false)}}>
                <span>{matLabel}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {dropMat && (
                <div className="csel-drop">
                  {materiasDisp.map(opt=>(
                    <button key={opt} className={`csel-opt${filtroMateria===opt?' sel':''}`}
                      onClick={()=>{setFiltroMateria(opt);setDropMat(false)}}>
                      <span>{opt==='todas'?'Todas las materias':opt}</span>
                      {filtroMateria===opt && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Grid */}
          {filtrados.length===0
            ? <div className="empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                No se encontraron apuntes con esos filtros.
              </div>
            : <div className="cards-grid">
                {filtrados.map(a => {
                  const mc  = getMC(a.materia)
                  const tc  = tipoCfg[a.tipo]
                  const fav = favs.has(a.id)
                  return (
                    <div key={a.id} className="a-card" onClick={()=>setPreview(a)}>
                      <div className="a-bar" style={{background:mc.color}}/>
                      <div className="a-body">
                        <div className="a-head">
                          <div className="a-icon" style={{background:mc.bg}}>
                            <svg viewBox="0 0 24 24" fill="none" stroke={mc.color} strokeWidth="2">
                              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                            </svg>
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div className="a-titulo">{a.titulo}</div>
                            <div className="a-materia" style={{color:mc.color}}>{a.materia}</div>
                            <div className="a-tipo-badge" style={{color:tc.color,background:tc.bg,borderColor:tc.color+'30'}}>
                              {tc.label}
                            </div>
                          </div>
                        </div>
                        <div className="a-meta">
                          <div className="a-meta-row">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
                            </svg>
                            {a.carrera} · {a.anio}° año · Sem. {a.semestre}
                          </div>
                          <div className="a-meta-row">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                            </svg>
                            {a.autor} · {a.fecha}
                          </div>
                          <div className="a-meta-row">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                            </svg>
                            {a.paginas} páginas
                          </div>
                        </div>
                        <div className="tags-row">
                          {a.tags.map(t=>(
                            <span key={t} className="tag" style={{color:mc.color,background:mc.bg,borderColor:mc.color+'30'}}>
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="a-foot" onClick={e=>e.stopPropagation()}>
                        <button className="btn-ver" onClick={()=>setPreview(a)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                          Ver / Descargar
                        </button>
                        <button className={`btn-fav${fav?' on':''}`} onClick={()=>toggleFav(a.id)} title={fav?'Quitar':'Guardar'}>
                          <svg viewBox="0 0 24 24" fill={fav?'currentColor':'none'} stroke="currentColor" strokeWidth="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
          }
        </div>

        {/* ── MODAL SUBIR APUNTE ── */}
        {modalSubir && (
          <div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)setModalSubir(false)}}>
            <div className="modal-box">
              <div className="modal-head">
                <h2>Subir apunte</h2>
                <button className="modal-close" onClick={()=>setModalSubir(false)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="modal-body">
                {/* Zona de carga */}
                <div className="upload-zone">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <p>Arrastrá tu archivo PDF aquí</p>
                  <span>o hacé click para seleccionar · Máx. 10 MB</span>
                </div>
                <div className="fg">
                  <label>Título del apunte</label>
                  <input value={draft.titulo} onChange={e=>setDraft(d=>({...d,titulo:e.target.value}))} placeholder="Ej: Resumen Unidad 1 — Derivadas" />
                </div>
                <div className="form-row2">
                  <div className="fg">
                    <label>Materia</label>
                    <select value={draft.materia} onChange={e=>setDraft(d=>({...d,materia:e.target.value}))}>
                      {materias.map(m=><option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="fg">
                    <label>Tipo</label>
                    <select value={draft.tipo} onChange={e=>setDraft(d=>({...d,tipo:e.target.value as any}))}>
                      {Object.entries(tipoCfg).map(([v,c])=><option key={v} value={v}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row2">
                  <div className="fg">
                    <label>Carrera</label>
                    <select value={draft.carrera} onChange={e=>setDraft(d=>({...d,carrera:e.target.value}))}>
                      {carreras.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="fg">
                    <label>Autor</label>
                    <select value={draft.autor} onChange={e=>setDraft(d=>({...d,autor:e.target.value}))}>
                      {autoresLst.map(a=><option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row2">
                  <div className="fg">
                    <label>Año</label>
                    <select value={draft.anio} onChange={e=>setDraft(d=>({...d,anio:Number(e.target.value)}))}>
                      {[1,2,3,4,5].map(n=><option key={n} value={n}>{n}° año</option>)}
                    </select>
                  </div>
                  <div className="fg">
                    <label>Semestre</label>
                    <select value={draft.semestre} onChange={e=>setDraft(d=>({...d,semestre:Number(e.target.value)}))}>
                      <option value={1}>Semestre 1</option>
                      <option value={2}>Semestre 2</option>
                    </select>
                  </div>
                </div>
                <div className="fg">
                  <label>Tags (separados por coma)</label>
                  <input value={draft.tags} onChange={e=>setDraft(d=>({...d,tags:e.target.value}))} placeholder="derivadas, resumen, parcial" />
                </div>
              </div>
              <div className="modal-foot">
                <button className="btn-cancel" onClick={()=>setModalSubir(false)}>Cancelar</button>
                <button className="btn-primary" onClick={guardarApunte}
                  disabled={!draft.titulo.trim()}
                  style={{opacity:!draft.titulo.trim()?.4:1}}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:13,height:13}}>
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Subir apunte
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL PREVIEW ── */}
        {preview && (
          <div className="preview-backdrop" onClick={e=>{if(e.target===e.currentTarget)setPreview(null)}}>
            <div className="preview-box">
              {(() => {
                const mc = getMC(preview.materia)
                const tc = tipoCfg[preview.tipo]
                const fav = favs.has(preview.id)
                return (
                  <>
                    <div style={{height:4,background:mc.color}}/>
                    <div className="preview-head">
                      <div style={{flex:1,minWidth:0}}>
                        <div className="preview-tipo" style={{color:mc.color}}>{preview.materia}</div>
                        <div className="preview-titulo">{preview.titulo}</div>
                      </div>
                      <button className="modal-close" onClick={()=>setPreview(null)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                    <div className="preview-body">
                      <div className="preview-info-grid">
                        {[
                          {l:'Tipo',     v:<span style={{color:tc.color,fontWeight:700}}>{tc.label}</span>},
                          {l:'Páginas',  v:preview.paginas+' páginas'},
                          {l:'Autor',    v:preview.autor},
                          {l:'Fecha',    v:preview.fecha},
                          {l:'Carrera',  v:preview.carrera},
                          {l:'Año · Sem.',v:`${preview.anio}° año · Sem. ${preview.semestre}`},
                        ].map(i=>(
                          <div key={i.l} className="preview-info-cell">
                            <div className="preview-info-lbl">{i.l}</div>
                            <div className="preview-info-val">{i.v}</div>
                          </div>
                        ))}
                      </div>
                      <div>
                        <div style={{fontSize:10,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.07em',fontWeight:600,marginBottom:8}}>Tags</div>
                        <div className="preview-tags">
                          {preview.tags.map(t=>(
                            <span key={t} className="tag" style={{color:mc.color,background:mc.bg,borderColor:mc.color+'30',padding:'4px 10px',fontSize:11}}>
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Vista previa del documento */}
                      <div className="preview-doc">
                        <h3>Vista previa</h3>
                        {preview.tipo === 'resumen' && (
                          <>
                            <p><strong>{preview.materia}</strong> — Unidad 1: Fundamentos</p>
                            <div className="doc-section" style={{borderColor:mc.color}}>
                              <strong>Definición:</strong> Se define como el estudio de los conceptos fundamentales que permiten modelar y resolver problemas en el ámbito de la ingeniería.
                            </div>
                            <p>Los conceptos clave incluyen la identificación de variables, la formulación de hipótesis y la aplicación de métodos sistemáticos para la resolución de problemas. A continuación se presentan los principales teoremas y propiedades:</p>
                            <div className="doc-section" style={{borderColor:mc.color}}>
                              <strong>Teorema 1:</strong> Dada una función continua en un intervalo cerrado, existe al menos un punto donde la función alcanza su valor máximo.
                            </div>
                            <div className="doc-section" style={{borderColor:mc.color}}>
                              <strong>Teorema 2:</strong> La derivada de una función en un punto representa la pendiente de la recta tangente en ese punto.
                            </div>
                            <p>Estos conceptos sientan las bases para el desarrollo de temas más avanzados en unidades posteriores.</p>
                          </>
                        )}
                        {preview.tipo === 'ejercicios' && (
                          <>
                            <p><strong>Ejercicios resueltos — {preview.materia}</strong></p>
                            <div className="doc-section" style={{borderColor:mc.color}}>
                              <strong>Ejercicio 1:</strong> Resolver la siguiente ecuación:<br/>
                              <div className="doc-formula">f(x) = 2x² + 3x - 5</div>
                              <strong>Solución:</strong> Aplicando la fórmula cuadrática, obtenemos x₁ = 1 y x₂ = -2.5.
                            </div>
                            <div className="doc-section" style={{borderColor:mc.color}}>
                              <strong>Ejercicio 2:</strong> Calcular la derivada de:<br/>
                              <div className="doc-formula">f(x) = 3x³ - 2x² + 5x - 7</div>
                              <strong>Solución:</strong> f'(x) = 9x² - 4x + 5
                            </div>
                            <p>Los ejercicios restantes se encuentran disponibles en el archivo completo para descargar.</p>
                          </>
                        )}
                        {preview.tipo === 'guia' && (
                          <>
                            <p><strong>Guía de estudio — {preview.materia}</strong></p>
                            <p>Esta guía cubre los temas esenciales para el examen parcial. Se recomienda seguir el orden propuesto:</p>
                            <div className="doc-section" style={{borderColor:mc.color}}>
                              1. Repasar los conceptos teóricos de la Unidad 1 y 2.<br/>
                              2. Resolver los ejercicios de práctica al final de cada sección.<br/>
                              3. Revisar los ejemplos resueltos antes de intentar los ejercicios.<br/>
                              4. Consultar la bibliografía recomendada para profundizar.
                            </div>
                            <p>La guía incluye ejemplos paso a paso y consejos para evitar errores comunes en el examen.</p>
                          </>
                        )}
                        {preview.tipo === 'apuntes' && (
                          <>
                            <p><strong>Apuntes de clase — {preview.materia}</strong></p>
                            <p>Resumen de lo visto en clase durante la semana del {preview.fecha}:</p>
                            <div className="doc-section" style={{borderColor:mc.color}}>
                              📌 Se introdujo el concepto de variable compleja y su representación en el plano de Argand.<br/><br/>
                              📌 Se demostraron las propiedades básicas de los números complejos: conmutatividad, asociatividad y distributividad.<br/><br/>
                              📌 Se resolvieron ejercicios de aplicación en el pizarrón.
                            </div>
                            <p>Próxima clase: aplicaciones en ingeniería eléctrica.</p>
                          </>
                        )}
                        <div style={{textAlign:'center',marginTop:14,padding:'10px',background:'var(--accent-muted)',borderRadius:8,border:'1px dashed var(--accent-hover)',fontSize:12,color:'var(--text-secondary)'}}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" style={{width:20,height:20,display:'inline',verticalAlign:'middle',marginRight:6}}>
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                          Mostrando vista previa de {preview.paginas} páginas — descargá el PDF completo abajo
                        </div>
                      </div>
                    </div>
                    <div className="preview-foot">
                      <button className={`btn-fav${fav?' on':''}`}
                        style={{width:42,height:42,borderRadius:9,background:fav?'#f59e0b12':'var(--bg-hover)',border:`1px solid ${fav?'#f59e0b':'var(--border-light)'}`,color:fav?'#f59e0b':'var(--text-muted)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}
                        onClick={()=>toggleFav(preview.id)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill={fav?'currentColor':'none'} stroke="currentColor" strokeWidth="2">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                      </button>
                      <button className="btn-download" onClick={() => showToast('Descargando «' + preview.titulo + '»')}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Descargar PDF
                      </button>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        )}

        {toast && <div className="toast">✓ {toast}</div>}
      </div>
    </>
  )
}