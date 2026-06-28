import { useState, useRef } from 'react'

type Tab = 'perfil' | 'contrasena'

const css = `
  *, *::before, *::after { box-sizing:border-box; }
  .perfil-root { display:flex; flex-direction:column; flex:1; font-family:'Inter',system-ui,sans-serif; color:#f0f4f8; }

  /* Topbar */
  .topbar {
    display:flex; align-items:center; justify-content:space-between;
    padding:0 24px; height:56px;
    border-bottom:1px solid #1e2d3d; background:#0b0f14;
    position:sticky; top:0; z-index:20; flex-shrink:0;
  }
  .topbar h1 { font-size:17px; font-weight:700; color:#f0f4f8; letter-spacing:-.01em; }
  .topbar p  { font-size:11px; color:#506070; margin-top:1px; }
  .topbar-right { display:flex; align-items:center; gap:8px; }
  .topbar-btn {
    display:flex; align-items:center; justify-content:center;
    width:34px; height:34px; background:#131920;
    border:1px solid #243447; border-radius:8px;
    color:#8fa3b8; cursor:pointer; transition:border-color .15s; flex-shrink:0;
  }
  .topbar-btn svg { width:15px; height:15px; }
  .topbar-btn:hover { border-color:#00b4d8; color:#f0f4f8; }
  .notif-dot { position:absolute; top:6px; right:6px; width:7px; height:7px; background:#ef4444; border-radius:50%; border:2px solid #0b0f14; }
  .topbar-avatar {
    width:34px; height:34px;
    background:linear-gradient(135deg,#00b4d8,#0ea5e9);
    border-radius:50%; display:flex; align-items:center; justify-content:center;
    font-size:12px; font-weight:700; color:#000; cursor:pointer; overflow:hidden; flex-shrink:0;
  }
  .topbar-avatar img { width:100%; height:100%; object-fit:cover; }

  /* Content */
  .content { padding:20px 24px; flex:1; overflow-y:auto; }

  /* ── HERO CARD ── */
  .hero-card {
    background:#131920; border:1px solid #1e2d3d; border-radius:16px;
    overflow:hidden; margin-bottom:18px; position:relative;
  }
  .hero-banner {
    height:80px;
    background:linear-gradient(135deg,#0ea5e915 0%,#00b4d820 50%,#0b0f14 100%);
    position:relative;
  }
  .hero-banner::after {
    content:''; position:absolute; inset:0;
    background:repeating-linear-gradient(90deg,#00b4d808 0,#00b4d808 1px,transparent 1px,transparent 40px),
               repeating-linear-gradient(0deg,#00b4d808 0,#00b4d808 1px,transparent 1px,transparent 40px);
  }
  /* Desktop: hero-body = banner colapsado + contenido en fila */
  .hero-body {
    padding:0 24px 22px; display:flex; align-items:flex-end;
    gap:18px; margin-top:-36px; position:relative; z-index:1;
    flex-wrap:wrap;
  }
  /* Desktop: primer div (avatar+info) en fila */
  .hero-body > div:first-child {
    display:flex; align-items:flex-end; gap:18px; flex:1; min-width:0;
  }
  /* Botones en desktop: inline con el bloque info */
  .hero-actions {
    display:flex; align-items:center; gap:8px; margin-top:16px; flex-wrap:wrap;
  }
  .avatar-wrap { position:relative; flex-shrink:0; }
  .avatar-big {
    width:80px; height:80px;
    background:linear-gradient(135deg,#00b4d8,#0ea5e9);
    border-radius:50%; display:flex; align-items:center; justify-content:center;
    font-size:26px; font-weight:800; color:#000;
    border:3px solid #131920; overflow:hidden;
  }
  .avatar-big img { width:100%; height:100%; object-fit:cover; }
  .avatar-cam {
    position:absolute; bottom:1px; right:1px;
    width:24px; height:24px; background:#00b4d8;
    border-radius:50%; border:2px solid #131920;
    display:flex; align-items:center; justify-content:center;
    cursor:pointer; transition:background .15s;
  }
  .avatar-cam:hover { background:#0ea5e9; }
  .avatar-cam svg { width:11px; height:11px; color:#000; }
  .hero-info { flex:1; padding-top:36px; min-width:0; }
  .hero-name { font-size:18px; font-weight:800; color:#f0f4f8; letter-spacing:-.02em; margin-bottom:3px; }
  .hero-meta { font-size:12px; color:#8fa3b8; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .hero-meta span { display:flex; align-items:center; gap:4px; }
  .dot-sep { width:3px; height:3px; border-radius:50%; background:#2a3a55; flex-shrink:0; }
  .beca-badge {
    display:inline-flex; align-items:center; gap:4px;
    padding:2px 10px; border-radius:20px;
    font-size:11px; font-weight:700;
    background:#22c55e18; color:#22c55e; border:1px solid #22c55e30;
  }
  .hero-actions { display:flex; align-items:center; gap:8px; margin-top:16px; flex-wrap:wrap; }

  /* Buttons */
  .btn-primary {
    display:inline-flex; align-items:center; gap:6px;
    padding:8px 16px; background:#00b4d8; border:none;
    border-radius:8px; color:#000; font-size:13px; font-weight:700;
    font-family:inherit; cursor:pointer; transition:opacity .15s;
  }
  .btn-primary:hover { opacity:.85; }
  .btn-primary:disabled { opacity:.4; cursor:not-allowed; }
  .btn-primary svg { width:13px; height:13px; flex-shrink:0; }
  .btn-secondary {
    display:inline-flex; align-items:center; gap:6px;
    padding:8px 16px; background:#1a2230; border:1px solid #243447;
    border-radius:8px; color:#8fa3b8; font-size:13px; font-weight:500;
    font-family:inherit; cursor:pointer; transition:border-color .15s, color .15s;
  }
  .btn-secondary:hover { border-color:#00b4d8; color:#f0f4f8; }
  .btn-secondary svg { width:13px; height:13px; flex-shrink:0; }

  /* ── GRID ── */
  .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px; }
  .info-grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }

  /* Cards */
  .card { background:#131920; border:1px solid #1e2d3d; border-radius:14px; overflow:hidden; }
  .card-header { display:flex; align-items:center; justify-content:space-between; padding:14px 18px 12px; border-bottom:1px solid #1e2d3d; }
  .card-header h3 { font-size:13px; font-weight:700; color:#f0f4f8; }
  .card-edit { font-size:11px; color:#00b4d8; background:none; border:none; cursor:pointer; font-family:inherit; }
  .card-edit:hover { opacity:.7; }

  /* Field list */
  .field-list {}
  .field-item { display:flex; align-items:flex-start; gap:12px; padding:12px 18px; border-bottom:1px solid #1e2d3d33; }
  .field-item:last-child { border-bottom:none; }
  .field-icon { width:30px; height:30px; background:#00b4d810; border-radius:7px; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:1px; }
  .field-icon svg { width:13px; height:13px; color:#00b4d8; }
  .field-label { font-size:10px; color:#506070; text-transform:uppercase; letter-spacing:.07em; margin-bottom:3px; }
  .field-val   { font-size:13px; font-weight:600; color:#f0f4f8; }
  .field-val.muted { color:#8fa3b8; font-weight:400; }

  /* Grid 2col fields */
  .field-grid2 { display:grid; grid-template-columns:1fr 1fr; }
  .fg-cell { padding:14px 18px; border-right:1px solid #1e2d3d33; border-bottom:1px solid #1e2d3d33; }
  .fg-cell:nth-child(even) { border-right:none; }
  .fg-cell:nth-last-child(-n+2) { border-bottom:none; }

  /* Stat mini */
  .stat-mini-card {
    background:#131920; border:1px solid #1e2d3d;
    border-radius:14px; padding:16px 14px; text-align:center;
    display:flex; flex-direction:column; align-items:center; gap:6px;
  }
  .stat-mini-icon { width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; }
  .stat-mini-icon svg { width:15px; height:15px; }
  .stat-mini-val   { font-size:22px; font-weight:800; line-height:1; }
  .stat-mini-label { font-size:10px; color:#506070; text-transform:uppercase; letter-spacing:.05em; }

  /* ── MODAL ── */
  .modal-backdrop {
    position:fixed; inset:0; background:rgba(0,0,0,.65);
    backdrop-filter:blur(4px); z-index:100;
    display:flex; align-items:center; justify-content:center; padding:16px;
  }
  .modal-box {
    background:#131920; border:1px solid #1e2d3d;
    border-radius:18px; width:100%; max-width:460px;
    max-height:90dvh; overflow-y:auto;
    box-shadow:0 24px 60px rgba(0,0,0,.6);
  }
  .modal-head {
    display:flex; align-items:center; justify-content:space-between;
    padding:18px 22px 14px; border-bottom:1px solid #1e2d3d;
    position:sticky; top:0; background:#131920; z-index:2;
  }
  .modal-head h2 { font-size:15px; font-weight:700; color:#f0f4f8; }
  .modal-close {
    background:none; border:none; color:#506070; cursor:pointer;
    padding:4px; border-radius:6px; display:flex; transition:color .15s;
  }
  .modal-close:hover { color:#f0f4f8; background:#1e2d3d; }
  .modal-close svg { width:18px; height:18px; }
  .modal-body { padding:20px 22px; display:flex; flex-direction:column; gap:16px; }
  .modal-foot { display:flex; gap:8px; padding:0 22px 20px; }
  .modal-foot .btn-primary  { flex:1; justify-content:center; }
  .modal-foot .btn-secondary{ flex:1; justify-content:center; }

  /* Modal avatar */
  .modal-avatar-wrap { display:flex; flex-direction:column; align-items:center; gap:8px; }
  .modal-avatar {
    width:72px; height:72px;
    background:linear-gradient(135deg,#00b4d8,#0ea5e9);
    border-radius:50%; display:flex; align-items:center; justify-content:center;
    font-size:22px; font-weight:800; color:#000; overflow:hidden;
    position:relative; cursor:pointer; border:2px solid #243447;
  }
  .modal-avatar img { width:100%; height:100%; object-fit:cover; }
  .modal-avatar-ov {
    position:absolute; inset:0; background:rgba(0,0,0,.55);
    display:flex; align-items:center; justify-content:center;
    opacity:0; transition:opacity .15s; border-radius:50%;
  }
  .modal-avatar:hover .modal-avatar-ov { opacity:1; }
  .modal-avatar-ov svg { width:20px; height:20px; color:#fff; }
  .upload-hint { font-size:11px; color:#506070; }
  .modal-divider { height:1px; background:#1e2d3d; }

  /* Form */
  .form-group { display:flex; flex-direction:column; gap:5px; }
  .form-label { font-size:10px; color:#506070; text-transform:uppercase; letter-spacing:.07em; font-weight:600; }
  .form-input {
    background:#1a2230; border:1px solid #243447;
    border-radius:8px; color:#f0f4f8; font-size:13px;
    font-family:inherit; outline:none; padding:9px 12px; width:100%;
    transition:border-color .15s;
  }
  .form-input:focus { border-color:#00b4d8; }
  .form-input:disabled { opacity:.4; cursor:not-allowed; }
  .form-hint { font-size:11px; color:#506070; }
  .form-row  { display:grid; grid-template-columns:1fr 1fr; gap:12px; }

  /* Modal tabs */
  .modal-tabs { display:flex; gap:3px; background:#0b0f14; border-radius:9px; padding:3px; }
  .modal-tab {
    flex:1; padding:7px; border:none; border-radius:7px;
    font-size:12px; font-weight:600; font-family:inherit;
    cursor:pointer; color:#506070; background:none; transition:all .15s;
  }
  .modal-tab.active { background:#131920; color:#f0f4f8; border:1px solid #1e2d3d; }

  /* Toast */
  .toast {
    position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
    background:#22c55e; color:#000; font-size:13px; font-weight:700;
    padding:10px 22px; border-radius:999px; z-index:200; white-space:nowrap;
    animation:toastIn .25s ease;
  }
  @keyframes toastIn { from{opacity:0;transform:translateX(-50%) translateY(8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }

  /* Responsive */
  @media(max-width:768px){
    .topbar  { padding:0 14px; }
    .content { padding:14px; }
    .info-grid   { grid-template-columns:1fr; }
    .info-grid-3 { grid-template-columns:repeat(3,1fr); gap:8px; }

    /* ── HERO MOBILE ── */
    /* Ocultar banner en mobile */
    .hero-banner { display:none !important; }

    /* hero-body: column, sin margin-top negativo */
    .hero-body {
      margin-top:0 !important;
      padding:16px !important;
      flex-direction:column !important;
      align-items:stretch !important;
      gap:0 !important;
    }

    /* Primera sección: avatar + info en fila */
    .hero-body > div:first-child {
      display:flex;
      align-items:center;
      gap:12px;
      margin-bottom:12px;
    }

    /* Avatar más pequeño en mobile */
    .avatar-big { width:60px !important; height:60px !important; font-size:20px !important; }
    .avatar-cam { bottom:0 !important; right:0 !important; }

    /* hero-info: sin padding-top en mobile */
    .hero-info { padding-top:0 !important; flex:1; min-width:0; }
    .hero-name  { font-size:16px !important; }
    .hero-meta  { font-size:11px; gap:4px; }

    /* Botones: columna, ancho completo */
    .hero-actions {
      flex-direction:column !important;
      margin-top:0 !important;
      gap:8px !important;
      width:100% !important;
    }
    .hero-actions .btn-primary,
    .hero-actions .btn-secondary { width:100% !important; justify-content:center !important; }

    /* Resto */
    .stat-mini-val { font-size:18px; }
    .modal-backdrop { align-items:flex-end; padding:0; }
    .modal-box { border-radius:20px 20px 0 0; max-width:100%; max-height:92dvh; }
    .form-row { grid-template-columns:1fr; }
    .field-grid2 { grid-template-columns:1fr; }
    .fg-cell { border-right:none !important; }
    .fg-cell:nth-last-child(-n+2) { border-bottom:1px solid #1e2d3d33; }
    .fg-cell:last-child { border-bottom:none; }
  }
`

export default function Perfil() {
  const [modal, setModal]       = useState(false)
  const [tab, setTab]           = useState<Tab>('perfil')
  const [toast, setToast]       = useState(false)
  const fileRef     = useRef<HTMLInputElement>(null)
  const modalRef    = useRef<HTMLInputElement>(null)

  // Estado real
  const [foto,      setFoto]      = useState<string|null>(null)
  const [nombre,    setNombre]    = useState('María González')
  const [telefono,  setTelefono]  = useState('0981-123456')
  const [direccion, setDireccion] = useState('Caacupé, Paraguay')

  // Draft (para cancelar)
  const [dFoto,  setDFoto]  = useState<string|null>(null)
  const [dNom,   setDNom]   = useState(nombre)
  const [dTel,   setDTel]   = useState(telefono)
  const [dDir,   setDDir]   = useState(direccion)

  // Contraseña
  const [pwAct,  setPwAct]  = useState('')
  const [pwNew,  setPwNew]  = useState('')
  const [pwConf, setPwConf] = useState('')

  const initials = nombre.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()

  function abrirModal(t: Tab = 'perfil') {
    setDFoto(foto); setDNom(nombre); setDTel(telefono); setDDir(direccion)
    setPwAct(''); setPwNew(''); setPwConf('')
    setTab(t); setModal(true)
  }

  function showToast() {
    setModal(false); setToast(true)
    setTimeout(() => setToast(false), 2500)
  }

  function guardar() {
    setFoto(dFoto); setNombre(dNom); setTelefono(dTel); setDireccion(dDir)
    showToast()
  }

  function guardarPwd() {
    if (!pwAct || !pwNew || pwNew !== pwConf) return
    showToast()
  }

  function handleFoto(e: React.ChangeEvent<HTMLInputElement>, draft: boolean) {
    const f = e.target.files?.[0]
    if (!f) return
    const url = URL.createObjectURL(f)
    draft ? setDFoto(url) : setFoto(url)
  }

  const pwValid = pwAct && pwNew && pwNew === pwConf

  return (
    <>
      <style>{css}</style>
      <div className="perfil-root">

        {/* Topbar */}
        <header className="topbar">
          <div>
            <h1>Mi perfil</h1>
            <p>Datos personales y académicos</p>
          </div>
        </header>

        <div className="content">

          {/* ── HERO CARD ── */}
          <div className="hero-card">
            <div className="hero-banner" />
            <div className="hero-body">

              {/* div:first-child — avatar + info en fila (mobile lo convierte en flex-row) */}
              <div>
                <div className="avatar-wrap" style={{flexShrink:0}}>
                  <div className="avatar-big">
                    {foto ? <img src={foto} alt="avatar"/> : initials}
                  </div>
                  <div className="avatar-cam" onClick={() => fileRef.current?.click()} title="Cambiar foto">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>handleFoto(e,false)} />
                </div>

                <div className="hero-info">
                  <div className="hero-name">{nombre}</div>
                  <div className="hero-meta">
                    <span>Ing. Informática</span>
                    <div className="dot-sep"/>
                    <span>2° año</span>
                    <div className="dot-sep"/>
                    <span style={{color:'#00b4d8', fontWeight:600}}>2024-0123</span>
                    <div className="dot-sep"/>
                    <span className="beca-badge">★ Becada</span>
                  </div>
                </div>
              </div>

              {/* Botones — en desktop van dentro del hero-info, en mobile como fila separada */}
              <div className="hero-actions">
                <button className="btn-primary" onClick={() => abrirModal('perfil')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Editar perfil
                </button>
                <button className="btn-secondary" onClick={() => abrirModal('contrasena')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                  Cambiar contraseña
                </button>
              </div>

            </div>
          </div>

          {/* ── STATS ── */}
          <div className="info-grid-3" style={{marginBottom:14}}>
            {[
              { val:'8.4', label:'Promedio',   color:'#22c55e', bg:'#22c55e18', icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
              { val:'92%', label:'Asistencia', color:'#f59e0b', bg:'#f59e0b18', icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg> },
              { val:'5',   label:'Materias',   color:'#00b4d8', bg:'#00b4d818', icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg> },
            ].map(s => (
              <div key={s.label} className="stat-mini-card">
                <div className="stat-mini-icon" style={{background:s.bg, color:s.color}}>{s.icon}</div>
                <div className="stat-mini-val" style={{color:s.color}}>{s.val}</div>
                <div className="stat-mini-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── INFO GRID ── */}
          <div className="info-grid">

            {/* Académica */}
            <div className="card">
              <div className="card-header"><h3>Información académica</h3></div>
              <div className="field-grid2">
                {[
                  { l:'Carrera',   v:'Ingeniería Informática' },
                  { l:'Legajo',    v:'2024-0123', color:'#00b4d8' },
                  { l:'Año',       v:'2° año' },
                  { l:'Semestre',  v:'Semestre 1 · 2026' },
                ].map(f => (
                  <div key={f.l} className="fg-cell">
                    <div className="field-label">{f.l}</div>
                    <div className="field-val" style={{color: f.color ?? '#f0f4f8'}}>{f.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contacto */}
            <div className="card">
              <div className="card-header">
                <h3>Datos de contacto</h3>
                <button className="card-edit" onClick={() => abrirModal('perfil')}>Editar →</button>
              </div>
              <div className="field-list">
                {[
                  {
                    label:'Teléfono', val:telefono,
                    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.63A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.18 6.18l1.27-.84a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                  },
                  {
                    label:'Email institucional', val:'maria.gonzalez@uca.edu.py',
                    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  },
                  {
                    label:'Dirección', val:direccion,
                    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  },
                ].map(f => (
                  <div key={f.label} className="field-item">
                    <div className="field-icon">{f.icon}</div>
                    <div>
                      <div className="field-label">{f.label}</div>
                      <div className="field-val">{f.val}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* ── MODAL ── */}
        {modal && (
          <div className="modal-backdrop" onClick={e=>{ if(e.target===e.currentTarget) setModal(false) }}>
            <div className="modal-box">
              <div className="modal-head">
                <h2>Editar perfil</h2>
                <button className="modal-close" onClick={()=>setModal(false)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <div className="modal-body">
                <div className="modal-tabs">
                  <button className={`modal-tab${tab==='perfil'?' active':''}`} onClick={()=>setTab('perfil')}>Datos personales</button>
                  <button className={`modal-tab${tab==='contrasena'?' active':''}`} onClick={()=>setTab('contrasena')}>Contraseña</button>
                </div>

                {tab === 'perfil' && (
                  <>
                    <div className="modal-avatar-wrap">
                      <div className="modal-avatar" onClick={()=>modalRef.current?.click()}>
                        {dFoto ? <img src={dFoto} alt="avatar"/> : initials}
                        <div className="modal-avatar-ov">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                            <circle cx="12" cy="13" r="4"/>
                          </svg>
                        </div>
                      </div>
                      <span className="upload-hint">Clic para cambiar foto · JPG, PNG, máx. 5 MB</span>
                      <input ref={modalRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>handleFoto(e,true)} />
                    </div>

                    <div className="modal-divider"/>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Nombre</label>
                        <input className="form-input"
                          value={dNom.split(' ')[0]}
                          onChange={e=>setDNom(e.target.value+' '+dNom.split(' ').slice(1).join(' '))}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Apellido</label>
                        <input className="form-input"
                          value={dNom.split(' ').slice(1).join(' ')}
                          onChange={e=>setDNom(dNom.split(' ')[0]+' '+e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Email institucional</label>
                      <input className="form-input" value="maria.gonzalez@uca.edu.py" disabled />
                      <span className="form-hint">El email institucional no puede modificarse.</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Teléfono</label>
                      <input className="form-input" value={dTel} onChange={e=>setDTel(e.target.value)} placeholder="0981-000000" />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Dirección</label>
                      <input className="form-input" value={dDir} onChange={e=>setDDir(e.target.value)} placeholder="Ciudad, Paraguay" />
                    </div>
                  </>
                )}

                {tab === 'contrasena' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Contraseña actual</label>
                      <input className="form-input" type="password" value={pwAct} onChange={e=>setPwAct(e.target.value)} placeholder="••••••••" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Nueva contraseña</label>
                      <input className="form-input" type="password" value={pwNew} onChange={e=>setPwNew(e.target.value)} placeholder="••••••••" />
                      <span className="form-hint">Mínimo 8 caracteres.</span>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Confirmar contraseña</label>
                      <input className="form-input" type="password" value={pwConf} onChange={e=>setPwConf(e.target.value)} placeholder="••••••••"
                        style={{borderColor: pwConf && pwNew!==pwConf ? '#ef4444' : ''}} />
                      {pwConf && pwNew!==pwConf && <span className="form-hint" style={{color:'#ef4444'}}>Las contraseñas no coinciden.</span>}
                    </div>
                  </>
                )}
              </div>

              <div className="modal-foot">
                <button className="btn-secondary" onClick={()=>setModal(false)}>Cancelar</button>
                <button className="btn-primary"
                  onClick={tab==='perfil' ? guardar : guardarPwd}
                  disabled={tab==='contrasena' && !pwValid}
                  style={{opacity: tab==='contrasena' && !pwValid ? .4 : 1, cursor: tab==='contrasena' && !pwValid ? 'not-allowed':'pointer'}}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:13,height:13}}>
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                  </svg>
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && <div className="toast">✓ Cambios guardados correctamente</div>}

      </div>
    </>
  )
}