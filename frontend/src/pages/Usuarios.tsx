import { useState, useRef, useEffect } from 'react'
import { api } from '../lib/api'

type Rol = 'alumno' | 'profesor' | 'admin'

interface Usuario {
  id: number
  nombre: string
  email: string
  rol: Rol
  carrera: string
  becado: boolean
  activo: boolean
}

const usuariosIniciales: Usuario[] = [
  { id:1, nombre:'Carlos Méndez',  email:'carlos.mendez@uca.edu.py',  rol:'profesor', carrera:'Ing. Informática', becado:false, activo:true  },
  { id:2, nombre:'María González', email:'maria.gonzalez@uca.edu.py', rol:'alumno',   carrera:'Ing. Informática', becado:true,  activo:true  },
  { id:3, nombre:'Luis Paredes',   email:'luis.paredes@uca.edu.py',   rol:'alumno',   carrera:'Ing. Civil',       becado:false, activo:true  },
  { id:4, nombre:'Ana Torres',     email:'ana.torres@uca.edu.py',     rol:'alumno',   carrera:'Ing. Informática', becado:true,  activo:false },
  { id:5, nombre:'Pedro Rojas',    email:'pedro.rojas@uca.edu.py',    rol:'profesor', carrera:'Ing. Civil',       becado:false, activo:true  },
]

const rolCfg: Record<Rol,{color:string;bg:string;label:string}> = {
  profesor: { color:'#3b82f6', bg:'#3b82f618', label:'Profesor' },
  alumno:   { color:'var(--accent)', bg:'var(--accent-muted)', label:'Alumno'   },
  admin:    { color:'#f59e0b', bg:'#f59e0b18', label:'Admin'    },
}
function getRolCfg(rol: string) {
  return rolCfg[rol as Rol] ?? { color:'#506070', bg:'#50607018', label: rol }
}

const carreras = ['Ing. Informática','Ing. Civil','Ing. Electrónica','Administración']

function initials(n:string){ return n.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase() }
function avatarColor(n:string){
  const cols = ['var(--accent)','#a855f7','#3b82f6','#f59e0b','#22c55e','#ec4899']
  let h = 0; for(const c of n) h += c.charCodeAt(0)
  return cols[h % cols.length]
}

const emptyDraft: Omit<Usuario,'id'> = { nombre:'', email:'', rol:'alumno', carrera:'Ing. Informática', becado:false, activo:true }

const css = `
  *, *::before, *::after { box-sizing:border-box; }
  .u-root { display:flex; flex-direction:column; flex:1; font-family:'Inter',system-ui,sans-serif; color:#f0f4f8; }

  /* Topbar */
  .topbar {
    display:flex; align-items:center; justify-content:space-between;
    padding:0 24px; height:56px;
    border-bottom:1px solid #1e2d3d; background:#0b0f14;
    position:sticky; top:0; z-index:20; flex-shrink:0;
  }
  .topbar h1 { font-size:17px; font-weight:700; color:#f0f4f8; letter-spacing:-.01em; }

  /* Content */
  .content { padding:20px 24px; flex:1; overflow-y:auto; }

  /* Toolbar */
  .toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; gap:12px; flex-wrap:wrap; }
  .toolbar-sub { font-size:12px; color:#506070; }
  .btn-primary {
    display:inline-flex; align-items:center; gap:6px;
    padding:9px 16px; background:var(--accent); border:none;
    border-radius:9px; color:#000; font-size:13px; font-weight:700;
    font-family:inherit; cursor:pointer; transition:opacity .15s; white-space:nowrap;
  }
  .btn-primary:hover { opacity:.85; }
  .btn-primary:disabled { opacity:.4; cursor:not-allowed; }
  .btn-primary svg { width:13px; height:13px; flex-shrink:0; }

  /* Stats */
  .stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:18px; }
  .stat-card { background:#131920; border:1px solid #1e2d3d; border-radius:12px; padding:14px 16px; display:flex; align-items:center; gap:12px; }
  .stat-icon { width:36px; height:36px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .stat-icon svg { width:16px; height:16px; }
  .stat-val { font-size:20px; font-weight:800; line-height:1; }
  .stat-lbl { font-size:11px; color:#506070; margin-top:2px; }

  /* Filters */
  .filters-bar { display:flex; gap:10px; margin-bottom:14px; flex-wrap:wrap; }
  .search-wrap { flex:1; min-width:180px; position:relative; }
  .search-wrap svg { position:absolute; left:11px; top:50%; transform:translateY(-50%); width:14px; height:14px; color:#506070; pointer-events:none; }
  .search-input {
    width:100%; background:#131920; border:1px solid #1e2d3d;
    border-radius:9px; color:#f0f4f8; font-size:13px;
    font-family:inherit; outline:none; padding:8px 14px 8px 34px; transition:border-color .15s;
  }
  .search-input:focus { border-color:var(--accent); }
  .search-input::placeholder { color:#506070; }

  /* Custom dropdown */
  .csel-wrap { position:relative; }
  .csel-btn {
    display:flex; align-items:center; gap:8px;
    background:#131920; border:1px solid #1e2d3d;
    border-radius:9px; padding:0 10px; height:36px;
    color:#f0f4f8; font-size:12px; font-family:inherit;
    cursor:pointer; white-space:nowrap; min-width:140px;
    justify-content:space-between; transition:border-color .15s;
  }
  .csel-btn:hover,.csel-btn.open { border-color:var(--accent); }
  .csel-btn svg { width:11px; height:11px; color:#506070; flex-shrink:0; transition:transform .2s; }
  .csel-btn.open svg { transform:rotate(180deg); }
  .csel-drop {
    position:absolute; top:calc(100% + 5px); left:0; min-width:100%;
    background:#131920; border:1px solid #1e2d3d;
    border-radius:10px; overflow:hidden;
    box-shadow:0 12px 32px rgba(0,0,0,.5); z-index:50;
  }
  .csel-opt {
    display:flex; align-items:center; justify-content:space-between;
    padding:10px 14px; font-size:12px; color:#8fa3b8;
    cursor:pointer; border:none; background:none;
    width:100%; text-align:left; font-family:inherit;
    transition:background .12s; white-space:nowrap; gap:12px;
  }
  .csel-opt:hover { background:#1a2230; color:#f0f4f8; }
  .csel-opt.sel { color:var(--accent); background:var(--accent-muted); }
  .csel-opt svg { width:13px; height:13px; color:var(--accent); flex-shrink:0; }

  /* Tabla desktop */
  .table-wrap { background:#131920; border:1px solid #1e2d3d; border-radius:14px; overflow:hidden; }
  table { width:100%; border-collapse:collapse; }
  thead th {
    padding:10px 16px; font-size:10px; font-weight:600;
    color:#506070; text-transform:uppercase; letter-spacing:.07em;
    text-align:left; border-bottom:1px solid #1e2d3d;
    background:#0d1117; white-space:nowrap;
  }
  tbody td { padding:13px 16px; border-bottom:1px solid #1e2d3d18; vertical-align:middle; }
  tbody tr:last-child td { border-bottom:none; }
  tbody tr:hover { background:#1a2230; }
  .u-av { width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; color:#000; flex-shrink:0; }
  .u-nombre { font-size:13px; font-weight:600; color:#f0f4f8; }
  .u-email  { font-size:11px; color:#8fa3b8; margin-top:1px; }
  .badge { display:inline-flex; align-items:center; padding:3px 9px; border-radius:20px; font-size:11px; font-weight:600; white-space:nowrap; }
  .toggle-btn { width:36px; height:20px; border-radius:10px; border:none; cursor:pointer; position:relative; transition:background .2s; flex-shrink:0; }
  .toggle-btn::after { content:''; position:absolute; top:3px; width:14px; height:14px; border-radius:50%; background:#fff; transition:left .2s; }
  .toggle-btn.on  { background:#22c55e; }
  .toggle-btn.off { background:#374151; }
  .toggle-btn.on::after  { left:19px; }
  .toggle-btn.off::after { left:3px; }
  .icon-btn { background:none; border:none; cursor:pointer; color:#8fa3b8; padding:5px; border-radius:6px; display:flex; align-items:center; transition:background .12s,color .12s; }
  .icon-btn:hover { background:#1e2d3d; color:#f0f4f8; }
  .icon-btn svg { width:14px; height:14px; }
  .icon-btn.del:hover { color:#ef4444; background:#ef444418; }
  .actions-cell { display:flex; align-items:center; gap:4px; }
  .empty-state { text-align:center; padding:52px; color:#506070; font-size:13px; }

  /* Cards mobile */
  .cards-list { display:none; flex-direction:column; gap:10px; }
  .u-card { background:#131920; border:1px solid #1e2d3d; border-radius:14px; overflow:hidden; }
  .u-card-top { display:flex; align-items:center; gap:12px; padding:14px 16px 10px; }
  .u-card-info { flex:1; min-width:0; }
  .u-card-name  { font-size:14px; font-weight:700; color:#f0f4f8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .u-card-email { font-size:11px; color:#8fa3b8; margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .u-card-body { padding:0 16px 10px; display:flex; flex-direction:column; gap:7px; }
  .u-card-badges { display:flex; gap:6px; flex-wrap:wrap; }
  .u-card-row { display:flex; align-items:center; justify-content:space-between; font-size:12px; }
  .u-card-lbl { color:#506070; }
  .u-card-val { color:#f0f4f8; font-weight:500; }
  .u-card-footer { display:flex; align-items:center; gap:8px; padding:10px 16px 14px; border-top:1px solid #1e2d3d33; }
  .btn-edit-card {
    flex:1; padding:8px; background:#1a2230; border:1px solid #243447;
    border-radius:8px; color:var(--accent); font-size:12px; font-weight:600;
    font-family:inherit; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px;
    transition:border-color .15s;
  }
  .btn-edit-card:hover { border-color:var(--accent); }
  .btn-edit-card svg { width:12px; height:12px; }

  /* Modal */
  .modal-backdrop {
    position:fixed; inset:0; background:rgba(0,0,0,.65);
    backdrop-filter:blur(4px); z-index:100;
    display:flex; align-items:center; justify-content:center; padding:16px;
  }
  .modal-box {
    background:#131920; border:1px solid #1e2d3d;
    border-radius:16px; width:100%; max-width:460px;
    max-height:90dvh; overflow-y:auto;
    box-shadow:0 24px 60px rgba(0,0,0,.6);
  }
  .modal-head {
    display:flex; align-items:center; justify-content:space-between;
    padding:18px 22px 14px; border-bottom:1px solid #1e2d3d;
    position:sticky; top:0; background:#131920; z-index:2;
  }
  .modal-head h2 { font-size:15px; font-weight:700; color:#f0f4f8; }
  .modal-close { background:none; border:none; color:#506070; cursor:pointer; padding:4px; border-radius:6px; display:flex; transition:color .15s; }
  .modal-close:hover { color:#f0f4f8; background:#1e2d3d; }
  .modal-close svg { width:18px; height:18px; }
  .modal-body { padding:20px 22px; display:flex; flex-direction:column; gap:14px; }
  .modal-foot { display:flex; gap:8px; padding:0 22px 20px; }
  .modal-foot .btn-primary { flex:1; justify-content:center; }
  .btn-cancel {
    flex:1; padding:9px; background:#1a2230; border:1px solid #243447;
    border-radius:9px; color:#8fa3b8; font-size:13px; font-weight:600;
    font-family:inherit; cursor:pointer; transition:border-color .15s, color .15s;
  }
  .btn-cancel:hover { border-color:#506070; color:#f0f4f8; }

  /* Form */
  .form-row2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .fg { display:flex; flex-direction:column; gap:5px; }
  .fg label { font-size:10px; color:#506070; text-transform:uppercase; letter-spacing:.07em; font-weight:600; }
  .fg input, .fg select {
    background:#0d1117; border:1px solid #243447;
    border-radius:8px; color:#f0f4f8; font-size:13px;
    font-family:inherit; outline:none; padding:9px 12px; width:100%; transition:border-color .15s;
  }
  .fg input:focus, .fg select:focus { border-color:var(--accent); }
  .fg select {
    appearance:none; cursor:pointer;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' fill='%23506070' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E");
    background-repeat:no-repeat; background-position:right 10px center;
    background-color:#0d1117; padding-right:30px;
  }
  .fg select option { background:#131920; }
  .check-row {
    display:flex; align-items:center; gap:10px;
    padding:10px 13px; background:#0d1117; border:1px solid #1e2d3d;
    border-radius:8px; cursor:pointer;
  }
  .check-row input[type=checkbox] { width:15px; height:15px; accent-color:var(--accent); cursor:pointer; }
  .check-row span { font-size:13px; color:#f0f4f8; }

  /* Modal confirmación */
  .confirm-backdrop {
    position:fixed; inset:0; background:rgba(0,0,0,.65);
    backdrop-filter:blur(4px); z-index:150;
    display:flex; align-items:center; justify-content:center; padding:16px;
  }
  .confirm-box {
    background:#131920; border:1px solid #1e2d3d;
    border-radius:16px; width:100%; max-width:360px;
    padding:24px; box-shadow:0 24px 60px rgba(0,0,0,.6);
  }
  .confirm-icon {
    width:44px; height:44px; border-radius:12px;
    background:#ef444418; border:1px solid #ef444430;
    display:flex; align-items:center; justify-content:center;
    margin-bottom:16px;
  }
  .confirm-icon svg { width:20px; height:20px; color:#ef4444; }
  .confirm-title { font-size:15px; font-weight:700; color:#f0f4f8; margin-bottom:6px; }
  .confirm-desc  { font-size:13px; color:#8fa3b8; line-height:1.5; margin-bottom:20px; }
  .confirm-btns  { display:flex; gap:8px; }
  .confirm-btns .btn-cancel { flex:1; }
  .btn-danger {
    flex:1; display:inline-flex; align-items:center; justify-content:center; gap:6px;
    padding:9px 16px; background:#ef4444; border:none;
    border-radius:9px; color:#fff; font-size:13px; font-weight:700;
    font-family:inherit; cursor:pointer; transition:opacity .15s;
  }
  .btn-danger:hover { opacity:.85; }
  .btn-danger svg { width:13px; height:13px; }

  /* Toast */
  .toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:#22c55e; color:#000; font-size:13px; font-weight:700; padding:10px 22px; border-radius:999px; z-index:200; white-space:nowrap; animation:tin .25s ease; }
  @keyframes tin { from{opacity:0;transform:translateX(-50%) translateY(8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }

  /* Reset modal tabs */
  .reset-tabs { display:flex; gap:0; border:1px solid #1e2d3d; border-radius:10px; overflow:hidden; margin-bottom:16px; }
  .reset-tab {
    flex:1; padding:9px 12px; font-size:12px; font-weight:600;
    background:#0d1117; color:#506070; border:none; cursor:pointer; font-family:inherit;
    transition:background .15s, color .15s;
  }
  .reset-tab.active { background:#131920; color:#f0f4f8; }
  .reset-tab:first-child { border-right:1px solid #1e2d3d; }
  .reset-user-chip {
    display:flex; align-items:center; gap:10px;
    background:#0d1117; border:1px solid #1e2d3d; border-radius:10px; padding:10px 14px; margin-bottom:16px;
  }
  .reset-user-av {
    width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center;
    font-size:12px; font-weight:700; color:#000; flex-shrink:0;
  }
  .reset-user-nm { font-size:13px; font-weight:600; color:#f0f4f8; }
  .reset-user-em { font-size:11px; color:#506070; margin-top:1px; }
  .reset-notice {
    display:flex; align-items:flex-start; gap:8px; padding:10px 12px;
    background:#f59e0b08; border:1px solid #f59e0b20; border-radius:8px; font-size:12px; color:#f59e0b; line-height:1.5;
    margin-top:4px;
  }
  .reset-notice svg { flex-shrink:0; margin-top:1px; }

  /* Responsive */
  @media(max-width:900px){ .stats-row { grid-template-columns:repeat(2,1fr); } }
  @media(max-width:768px){
    .topbar  { padding:0 14px; }
    .content { padding:14px; }
    .table-wrap { display:none; }
    .cards-list { display:flex; }
    .stats-row { grid-template-columns:repeat(2,1fr); gap:8px; margin-bottom:14px; }
    .stat-card { padding:12px 14px; }
    .stat-val  { font-size:18px; }
    .filters-bar { gap:8px; }
    .form-row2 { grid-template-columns:1fr; }
    .modal-backdrop { align-items:flex-end; padding:0; }
    .modal-box { border-radius:20px 20px 0 0; max-width:100%; max-height:92dvh; }
    .modal-foot { flex-direction:column; }
    .csel-drop { position:fixed; left:14px; right:14px; }
  }
`

export default function Usuarios() {
  const [usuarios,  setUsuarios]  = useState<Usuario[]>([])
  const [search,    setSearch]    = useState('')
  const [filtroRol, setFiltroRol] = useState<Rol|'todos'>('todos')
  const [dropRol,   setDropRol]   = useState(false)
  const [modal,     setModal]     = useState<null|'nuevo'|Usuario>(null)
  const [draft,     setDraft]     = useState<Omit<Usuario,'id'>>(emptyDraft)
  const [toast,     setToast]     = useState('')
  const [confirm,   setConfirm]   = useState<number|null>(null)
  const [loading,   setLoading]   = useState(true)
  const [resetting, _setResetting] = useState<number|null>(null)
  const [resetModal, setResetModal] = useState<Usuario|null>(null)
  const [resetPw,    setResetPw]    = useState('')
  const [resetTab,   setResetTab]   = useState<'direct'|'auto'>('direct')
  const [resetSaving,setResetSaving]= useState(false)
  const rolRef = useRef<HTMLDivElement>(null)

  // Cargar usuarios del backend al montar
  useEffect(() => {
    api.get<{ id: number; username: string; role: string; nombre: string; email: string; carrera_id: number | null; es_becado: boolean }[]>('/users/')
      .then(data => {
        setUsuarios(data.map(u => ({
          id: u.id,
          nombre: u.nombre || u.username,
          email: u.email || u.username,
          rol: u.role as Rol,
          carrera: '',
          becado: u.es_becado || false,
          activo: true,
        })))
        setLoading(false)
      })
      .catch(() => {
        setUsuarios(usuariosIniciales)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    function h(e:MouseEvent){
      if(rolRef.current && !rolRef.current.contains(e.target as Node)) setDropRol(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  function showToast(msg:string){ setToast(msg); setTimeout(()=>setToast(''),2200) }

  const filtrados = usuarios.filter(u => {
    const q = search.toLowerCase()
    const matchQ = u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    const matchR = filtroRol==='todos' || u.rol===filtroRol
    return matchQ && matchR
  })

  function abrirNuevo(){ setDraft(emptyDraft); setModal('nuevo') }
  function abrirEditar(u:Usuario){ setDraft({nombre:u.nombre,email:u.email,rol:u.rol,carrera:u.carrera,becado:u.becado,activo:u.activo}); setModal(u) }
  function cerrar(){ setModal(null) }

  async function guardar(){
    if(!draft.nombre.trim()||!draft.email.trim()) return
    try {
      if(modal==='nuevo'){
        await api.post('/users/', { username: draft.email, password: 'default123', role: draft.rol, nombre: draft.nombre, email: draft.email, es_becado: draft.becado })
        showToast('Usuario creado')
      } else {
        await api.patch(`/users/${(modal as Usuario).id}`, { nombre: draft.nombre, email: draft.email, role: draft.rol, es_becado: draft.becado })
        showToast('Cambios guardados')
      }
      const data = await api.get<{ id: number; username: string; role: string; nombre: string; email: string; es_becado: boolean }[]>('/users/')
      setUsuarios(data.map(u => ({
        id: u.id,
        nombre: u.nombre || u.username,
        email: u.email || u.username,
        rol: u.role as Rol,
        carrera: '',
        becado: u.es_becado || false,
        activo: true,
      })))
    } catch {
      if(modal==='nuevo'){
        setUsuarios(prev=>[...prev,{...draft,id:Date.now()}])
        showToast('Usuario creado (offline)')
      } else {
        setUsuarios(prev=>prev.map(u=>u.id===(modal as Usuario).id?{...u,...draft}:u))
        showToast('Cambios guardados (offline)')
      }
    }
    cerrar()
  }

  function toggleActivo(id:number){ setUsuarios(prev=>prev.map(u=>u.id===id?{...u,activo:!u.activo}:u)) }
  function pedirEliminar(id:number){ setConfirm(id) }
  async function confirmarEliminar(){
    if(confirm===null) return
    try {
      await api.delete(`/users/${confirm}`)
    } catch { /* ignore, remove from local state anyway */ }
    setUsuarios(prev=>prev.filter(u=>u.id!==confirm))
    setConfirm(null)
    showToast('Usuario eliminado')
  }

  function abrirResetModal(u: Usuario) {
    setResetModal(u); setResetPw(''); setResetTab('direct'); setResetSaving(false)
  }

  async function confirmarReset() {
    if (!resetModal) return
    setResetSaving(true)
    const nuevaClave = resetTab === 'auto'
      ? 'UCA' + Math.random().toString(36).slice(2,8).toUpperCase()
      : resetPw.trim()
    if (!nuevaClave) { setResetSaving(false); return }
    try {
      await api.patch(`/users/${resetModal.id}`, { password: nuevaClave })
      if (resetTab === 'direct') {
        showToast(`Contraseña cambiada correctamente`)
      } else {
        showToast(`Contraseña restablecida y notificación enviada a ${resetModal.email}`)
      }
    } catch {
      showToast(`Nueva contraseña: ${nuevaClave} (guardala)`)
    } finally {
      setResetSaving(false)
      setResetModal(null)
    }
  }

  function exportarCSV() {
    const rows = [
      ['ID','Nombre','Email','Rol','Carrera','Becado','Estado'],
      ...usuarios.map(u => [u.id, u.nombre, u.email, u.rol, u.carrera, u.becado?'Sí':'No', u.activo?'Activo':'Inactivo'])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'})
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `usuarios_uca_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
    showToast('Archivo CSV descargado')
  }

  const totales = {
    total:   usuarios.length,
    alumnos: usuarios.filter(u=>u.rol==='alumno').length,
    profes:  usuarios.filter(u=>u.rol==='profesor').length,
    activos: usuarios.filter(u=>u.activo).length,
  }

  const rolLabel = filtroRol==='todos' ? 'Todos los roles' : rolCfg[filtroRol].label

  return (
    <>
      <style>{css}</style>
      <div className="u-root">

        {/* Topbar — solo una vez "Usuarios" */}
        <header className="topbar">
          <div>
            <h1>Usuarios</h1>
          </div>
        </header>

        <div className="content">

          {/* Toolbar */}
          <div className="toolbar">
            <p className="toolbar-sub">{loading ? 'Cargando...' : `${usuarios.length} registrados · ${totales.activos} activos`}</p>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <button className="btn-secondary" onClick={exportarCSV} style={{background:'#131920',border:'1px solid #1e2d3d',color:'#8fa3b8',borderRadius:8,padding:'0 14px',height:34,fontSize:12,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontFamily:'inherit'}}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:13,height:13}}>
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Exportar CSV
              </button>
              <button className="btn-primary" onClick={abrirNuevo}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Nuevo usuario
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="stats-row">
            {[
              { lbl:'Total',      val:totales.total,   color:'var(--accent)', bg:'var(--accent-muted)', icon:<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></> },
              { lbl:'Alumnos',    val:totales.alumnos, color:'#a855f7', bg:'#a855f718', icon:<><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></> },
              { lbl:'Profesores', val:totales.profes,  color:'#3b82f6', bg:'#3b82f618', icon:<><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></> },
              { lbl:'Activos',    val:totales.activos, color:'#22c55e', bg:'#22c55e18', icon:<><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></> },
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

          {/* Filters */}
          <div className="filters-bar">
            <div className="search-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input className="search-input" placeholder="Buscar por nombre o email..." value={search} onChange={e=>setSearch(e.target.value)} />
            </div>

            {/* Dropdown rol — mismo estilo que Puntajes/Asistencia */}
            <div className="csel-wrap" ref={rolRef}>
              <button className={`csel-btn${dropRol?' open':''}`} onClick={()=>setDropRol(v=>!v)}>
                <span>{rolLabel}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {dropRol && (
                <div className="csel-drop">
                  {([
                    {v:'todos',   l:'Todos los roles'},
                    {v:'alumno',  l:'Alumno'},
                    {v:'profesor',l:'Profesor'},
                    {v:'admin',   l:'Admin'},
                  ] as {v:Rol|'todos';l:string}[]).map(o=>(
                    <button key={o.v} className={`csel-opt${filtroRol===o.v?' sel':''}`}
                      onClick={()=>{setFiltroRol(o.v);setDropRol(false)}}>
                      <span>{o.l}</span>
                      {filtroRol===o.v && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── TABLA DESKTOP ── */}
          <div className="table-wrap">
            {filtrados.length === 0
              ? <div className="empty-state">No se encontraron usuarios</div>
              : <table>
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Rol</th>
                      <th>Carrera</th>
                      <th style={{textAlign:'center'}}>Becado</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map(u => (
                      <tr key={u.id}>
                        <td>
                          <div style={{display:'flex',alignItems:'center',gap:10}}>
                            <div className="u-av" style={{background:avatarColor(u.nombre)}}>{initials(u.nombre)}</div>
                            <div>
                              <div className="u-nombre">{u.nombre}</div>
                              <div className="u-email">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge" style={{color:getRolCfg(u.rol).color,background:getRolCfg(u.rol).bg}}>
                            {getRolCfg(u.rol).label}
                          </span>
                        </td>
                        <td><span style={{fontSize:13,color:'#8fa3b8'}}>{u.carrera}</span></td>
                        <td style={{textAlign:'center'}}>
                          {u.becado
                            ? <span style={{color:'#22c55e',fontWeight:700,fontSize:15}}>✓</span>
                            : <span style={{color:'#506070'}}>—</span>}
                        </td>
                        <td>
                          <div style={{display:'flex',alignItems:'center',gap:7}}>
                            <button className={`toggle-btn ${u.activo?'on':'off'}`}
                              onClick={()=>toggleActivo(u.id)}
                              title={u.activo?'Desactivar':'Activar'}
                            />
                            <span style={{fontSize:12,color:u.activo?'#22c55e':'#506070',fontWeight:600}}>
                              {u.activo?'Activo':'Inactivo'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="actions-cell">
                            <button className="icon-btn" title="Editar" onClick={()=>abrirEditar(u)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button className="icon-btn" title="Restablecer contraseña" onClick={()=>abrirResetModal(u)}
                              style={{color:'#f59e0b',opacity:resetting===u.id?0.5:1}}
                              disabled={resetting===u.id}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="11" width="18" height="11" rx="2"/>
                                <path d="M7 11V7a5 5 0 0110 0v4"/>
                                <line x1="12" y1="15" x2="12" y2="17"/>
                              </svg>
                            </button>
                            <button className="icon-btn del" title="Eliminar" onClick={()=>pedirEliminar(u.id)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>
                                <path d="M9 6V4h6v2"/>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            }
          </div>

          {/* ── CARDS MOBILE ── */}
          <div className="cards-list">
            {filtrados.length === 0
              ? <div style={{textAlign:'center',padding:'40px',color:'#506070',fontSize:13}}>No se encontraron usuarios</div>
              : filtrados.map(u => (
                <div key={u.id} className="u-card">
                  <div className="u-card-top">
                    <div className="u-av" style={{width:42,height:42,background:avatarColor(u.nombre),borderRadius:'50%',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:'#000',flexShrink:0}}>
                      {initials(u.nombre)}
                    </div>
                    <div className="u-card-info">
                      <div className="u-card-name">{u.nombre}</div>
                      <div className="u-card-email">{u.email}</div>
                    </div>
                    <button className="icon-btn del" onClick={()=>pedirEliminar(u.id)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                        <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </div>

                  <div className="u-card-body">
                    <div className="u-card-badges">
                      <span className="badge" style={{color:getRolCfg(u.rol).color,background:getRolCfg(u.rol).bg}}>
                        {getRolCfg(u.rol).label}
                      </span>
                      {u.becado && <span className="badge" style={{color:'#22c55e',background:'#22c55e18'}}>★ Becado</span>}
                    </div>
                    <div className="u-card-row">
                      <span className="u-card-lbl">Carrera</span>
                      <span className="u-card-val">{u.carrera}</span>
                    </div>
                  </div>

                  <div className="u-card-footer">
                    <button className="btn-edit-card" onClick={()=>abrirEditar(u)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      Editar
                    </button>
                    <button className="btn-edit-card" onClick={()=>abrirResetModal(u)}
                      style={{color:'#f59e0b',borderColor:'#f59e0b30'}}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:12,height:12}}>
                        <rect x="3" y="11" width="18" height="11" rx="2"/>
                        <path d="M7 11V7a5 5 0 0110 0v4"/>
                      </svg>
                      Clave
                    </button>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <button className={`toggle-btn ${u.activo?'on':'off'}`}
                        onClick={()=>toggleActivo(u.id)}
                        title={u.activo?'Desactivar':'Activar'}
                      />
                      <span style={{fontSize:12,color:u.activo?'#22c55e':'#506070',fontWeight:600}}>
                        {u.activo?'Activo':'Inactivo'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>

        </div>

        {/* ── MODAL ── */}
        {modal !== null && (
          <div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)cerrar()}}>
            <div className="modal-box">
              <div className="modal-head">
                <h2>{modal==='nuevo'?'Nuevo usuario':'Editar usuario'}</h2>
                <button className="modal-close" onClick={cerrar}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <div className="modal-body">
                <div className="form-row2">
                  <div className="fg">
                    <label>Nombre</label>
                    <input value={draft.nombre.split(' ')[0]} onChange={e=>setDraft(d=>({...d,nombre:e.target.value+' '+d.nombre.split(' ').slice(1).join(' ')}))} placeholder="Nombre" />
                  </div>
                  <div className="fg">
                    <label>Apellido</label>
                    <input value={draft.nombre.split(' ').slice(1).join(' ')} onChange={e=>setDraft(d=>({...d,nombre:d.nombre.split(' ')[0]+' '+e.target.value}))} placeholder="Apellido" />
                  </div>
                </div>
                <div className="fg">
                  <label>Email institucional</label>
                  <input type="email" value={draft.email} onChange={e=>setDraft(d=>({...d,email:e.target.value}))} placeholder="usuario@uca.edu.py" />
                </div>
                <div className="form-row2">
                  <div className="fg">
                    <label>Rol</label>
                    <select value={draft.rol} onChange={e=>setDraft(d=>({...d,rol:e.target.value as Rol}))}>
                      <option value="alumno">Alumno</option>
                      <option value="profesor">Profesor</option>

                    </select>
                  </div>
                  <div className="fg">
                    <label>Carrera</label>
                    <select value={draft.carrera} onChange={e=>setDraft(d=>({...d,carrera:e.target.value}))}>
                      {carreras.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <label className="check-row">
                  <input type="checkbox" checked={draft.becado} onChange={e=>setDraft(d=>({...d,becado:e.target.checked}))} />
                  <span>★ Becado/a</span>
                </label>
                <label className="check-row">
                  <input type="checkbox" checked={draft.activo} onChange={e=>setDraft(d=>({...d,activo:e.target.checked}))} />
                  <span>Usuario activo</span>
                </label>
              </div>

              <div className="modal-foot">
                <button className="btn-cancel" onClick={cerrar}>Cancelar</button>
                <button className="btn-primary" onClick={guardar}
                  disabled={!draft.nombre.trim()||!draft.email.trim()}
                  style={{opacity:!draft.nombre.trim()||!draft.email.trim()?0.4:1}}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:13,height:13}}>
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                  </svg>
                  {modal==='nuevo'?'Crear usuario':'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal confirmación eliminar */}
        {confirm !== null && (
          <div className="confirm-backdrop" onClick={()=>setConfirm(null)}>
            <div className="confirm-box" onClick={e=>e.stopPropagation()}>
              <div className="confirm-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4h6v2"/>
                </svg>
              </div>
              <div className="confirm-title">¿Eliminar usuario?</div>
              <div className="confirm-desc">
                Esta acción no se puede deshacer. El usuario será eliminado permanentemente del sistema.
              </div>
              <div className="confirm-btns">
                <button className="btn-cancel" onClick={()=>setConfirm(null)}>Cancelar</button>
                <button className="btn-danger" onClick={confirmarEliminar}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4h6v2"/>
                  </svg>
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL RESET CONTRASEÑA ── */}
        {resetModal && (
          <div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)setResetModal(null)}}>
            <div className="modal-box">
              <div className="modal-head">
                <h2>Restablecer contraseña</h2>
                <button className="modal-close" onClick={()=>setResetModal(null)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="modal-body">

                {/* Usuario chip */}
                <div className="reset-user-chip">
                  <div className="reset-user-av" style={{background:avatarColor(resetModal.nombre)}}>
                    {initials(resetModal.nombre)}
                  </div>
                  <div>
                    <div className="reset-user-nm">{resetModal.nombre}</div>
                    <div className="reset-user-em">{resetModal.email}</div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="reset-tabs">
                  <button className={`reset-tab${resetTab==='direct'?' active':''}`} onClick={()=>setResetTab('direct')}>
                    Establecer directamente
                  </button>
                  <button className={`reset-tab${resetTab==='auto'?' active':''}`} onClick={()=>setResetTab('auto')}>
                    Generar y notificar
                  </button>
                </div>

                {resetTab === 'direct' ? (
                  <>
                    <div className="fg">
                      <label>Nueva contraseña</label>
                      <input
                        type="text"
                        value={resetPw}
                        onChange={e=>setResetPw(e.target.value)}
                        placeholder="Ingresá la nueva contraseña"
                        autoComplete="new-password"
                      />
                    </div>
                    <div className="reset-notice">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      La contraseña se actualiza de inmediato. Comunicale la nueva clave al usuario.
                    </div>
                  </>
                ) : (
                  <div className="reset-notice" style={{flexDirection:'column',gap:6}}>
                    <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0,marginTop:1}}>
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                      </svg>
                      Se generará una contraseña temporal y se enviará automáticamente al email del usuario.
                    </div>
                    <div style={{color:'#8fa3b8',fontSize:11}}>
                      Destinatario: <strong style={{color:'#f59e0b'}}>{resetModal.email}</strong>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-foot">
                <button className="btn-cancel" onClick={()=>setResetModal(null)}>Cancelar</button>
                <button className="btn-primary"
                  onClick={confirmarReset}
                  disabled={resetSaving || (resetTab==='direct' && !resetPw.trim())}
                  style={{opacity:resetSaving||(resetTab==='direct'&&!resetPw.trim())?0.4:1}}>
                  {resetSaving ? 'Guardando…' : resetTab==='direct' ? 'Cambiar contraseña' : 'Generar y enviar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className="toast" style={{
            position:'fixed', bottom:24, right:24, zIndex:9999,
            background:'#131920', border:'1px solid #22c55e40', borderRadius:12, padding:'12px 20px',
            color:'#22c55e', fontSize:13, fontWeight:600, boxShadow:'0 8px 32px rgba(0,0,0,.5)',
            maxWidth: 400, wordBreak: 'break-all', lineHeight: 1.5,
          }}>✓ {toast}</div>
        )}
      </div>
    </>
  )
}