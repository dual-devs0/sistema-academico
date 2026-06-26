import { useState } from 'react'

const css = `
  .perfil-root { display:flex; flex-direction:column; flex:1; font-family:'Inter',system-ui,sans-serif; }
  .topbar { display:flex; align-items:center; justify-content:space-between; padding:16px 28px; border-bottom:1px solid #1e2d3d; background:#0b0f14; position:sticky; top:0; z-index:10; }
  .topbar h1 { font-size:18px; font-weight:700; color:#f0f4f8; letter-spacing:-.01em; }
  .topbar p { font-size:11px; color:#506070; margin-top:1px; }
  .topbar-right { display:flex; align-items:center; gap:10px; }
  .topbar-btn { display:flex; align-items:center; justify-content:center; width:34px; height:34px; background:#131920; border:1px solid #243447; border-radius:8px; color:#8fa3b8; cursor:pointer; position:relative; }
  .topbar-btn svg { width:15px; height:15px; }
  .topbar-btn:hover { border-color:#00b4d8; color:#f0f4f8; }
  .topbar-btn .dot { position:absolute; top:6px; right:6px; width:7px; height:7px; background:#ef4444; border-radius:50%; border:2px solid #0b0f14; }
  .avatar-sm { width:34px; height:34px; background:linear-gradient(135deg,#00b4d8,#0ea5e9); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; color:#000; cursor:pointer; }
  .content { padding:24px 28px; flex:1; }
  .grid-main { display:grid; grid-template-columns:280px 1fr; gap:18px; align-items:start; }
  .card { background:#131920; border:1px solid #1e2d3d; border-radius:14px; overflow:hidden; }
  .card-header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px 14px; border-bottom:1px solid #1e2d3d; }
  .card-header h3 { font-size:14px; font-weight:700; color:#f0f4f8; }
  .card-header p { font-size:11px; color:#506070; margin-top:1px; }
  .card-action { font-size:12px; color:#00b4d8; background:none; border:none; cursor:pointer; font-family:inherit; }
  .card-action:hover { opacity:.7; }
  .btn-primary { display:inline-flex; align-items:center; gap:7px; padding:9px 16px; background:#00b4d8; border:none; border-radius:9px; color:#000; font-size:13px; font-weight:700; font-family:inherit; cursor:pointer; transition:opacity .18s; width:100%; justify-content:center; }
  .btn-primary:hover { opacity:.88; }
  .btn-secondary { display:inline-flex; align-items:center; gap:7px; padding:9px 16px; background:#1a2230; border:1px solid #243447; border-radius:9px; color:#8fa3b8; font-size:13px; font-weight:500; font-family:inherit; cursor:pointer; transition:border-color .15s,color .15s; width:100%; justify-content:center; }
  .btn-secondary:hover { border-color:#00b4d8; color:#f0f4f8; }
  .btn-primary svg, .btn-secondary svg { width:13px; height:13px; }
  .field-row { display:grid; grid-template-columns:1fr 1fr; }
  .field-cell { padding:16px 20px; border-right:1px solid #1e2d3d; border-bottom:1px solid #1e2d3d; }
  .field-cell:nth-child(even) { border-right:none; }
  .field-cell:nth-last-child(-n+2) { border-bottom:none; }
  .field-label { font-size:10px; color:#506070; text-transform:uppercase; letter-spacing:.07em; margin-bottom:5px; }
  .field-val { font-size:14px; font-weight:600; color:#f0f4f8; }
  .contact-item { display:flex; align-items:center; gap:12px; padding:16px 20px; border-bottom:1px solid #1e2d3d; }
  .contact-item:last-child { border-bottom:none; }
  .contact-icon { width:32px; height:32px; background:#00b4d818; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#00b4d8; flex-shrink:0; }
  .contact-icon svg { width:14px; height:14px; }
  .contact-label { font-size:11px; color:#506070; margin-bottom:2px; }
  .contact-val { font-size:13px; font-weight:600; color:#f0f4f8; }
  .stats-mini { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
  .stat-mini { background:#131920; border:1px solid #1e2d3d; border-radius:14px; padding:18px; text-align:center; }
  .stat-mini-val { font-size:24px; font-weight:800; line-height:1; margin-bottom:4px; }
  .stat-mini-label { font-size:10px; color:#506070; text-transform:uppercase; letter-spacing:.05em; }
  .info-col { display:flex; flex-direction:column; gap:14px; }
  .avatar-card { background:#131920; border:1px solid #1e2d3d; border-radius:14px; padding:28px 20px; text-align:center; }
  .avatar-big { width:76px; height:76px; background:linear-gradient(135deg,#00b4d8,#0ea5e9); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:26px; font-weight:800; color:#000; margin:0 auto 14px; }
  .avatar-name { font-size:17px; font-weight:700; color:#f0f4f8; margin-bottom:4px; }
  .avatar-email { font-size:12px; color:#8fa3b8; margin-bottom:12px; }
  .badge-beca { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; background:#15803d18; color:#22c55e; margin-bottom:20px; }
  .avatar-btns { display:flex; flex-direction:column; gap:8px; }
  input.editable { background:#1a2230; border:1px solid #243447; border-radius:8px; color:#f0f4f8; font-size:13px; font-family:inherit; outline:none; padding:8px 12px; width:100%; transition:border-color .18s; }
  input.editable:focus { border-color:#00b4d8; }
`

export default function Perfil() {
  const [editando, setEditando] = useState(false)
  const [telefono, setTelefono] = useState('0981-123456')

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
          <div className="topbar-right">
            <button className="topbar-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
            <button className="topbar-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              <span className="dot" />
            </button>
            <div className="avatar-sm">MG</div>
          </div>
        </header>

        <div className="content">
          <div className="grid-main">

            {/* Avatar card */}
            <div className="avatar-card">
              <div className="avatar-big">MG</div>
              <div className="avatar-name">María González</div>
              <div className="avatar-email">maria.gonzalez@uca.edu.py</div>
              <div className="badge-beca">★ Becada</div>
              <div className="avatar-btns">
                <button className="btn-primary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Editar perfil
                </button>
                <button className="btn-secondary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                  Cambiar contraseña
                </button>
              </div>
            </div>

            {/* Info col */}
            <div className="info-col">

              {/* Académico */}
              <div className="card">
                <div className="card-header"><h3>Información académica</h3></div>
                <div className="field-row">
                  {[
                    { label: 'Carrera', val: 'Ingeniería Informática' },
                    { label: 'Legajo', val: '2024-0123', color: '#00b4d8' },
                    { label: 'Año', val: '2° año' },
                    { label: 'Semestre', val: 'Semestre 1 · 2026' },
                  ].map(f => (
                    <div key={f.label} className="field-cell">
                      <div className="field-label">{f.label}</div>
                      <div className="field-val" style={{ color: f.color || '#f0f4f8' }}>{f.val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contacto */}
              <div className="card">
                <div className="card-header">
                  <h3>Datos de contacto</h3>
                  <button className="card-action" onClick={() => setEditando(!editando)}>
                    {editando ? 'Guardar →' : 'Editar →'}
                  </button>
                </div>
                <div className="contact-item">
                  <div className="contact-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.63A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.18 6.18l1.27-.84a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="contact-label">Teléfono</div>
                    {editando
                      ? <input className="editable" value={telefono} onChange={e => setTelefono(e.target.value)} />
                      : <div className="contact-val">{telefono}</div>
                    }
                  </div>
                </div>
                <div className="contact-item">
                  <div className="contact-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </div>
                  <div>
                    <div className="contact-label">Email institucional</div>
                    <div className="contact-val">maria.gonzalez@uca.edu.py</div>
                  </div>
                </div>
              </div>

              {/* Stats mini */}
              <div className="stats-mini">
                {[
                  { val: '8.4', label: 'Promedio', color: '#22c55e' },
                  { val: '92%', label: 'Asistencia', color: '#f59e0b' },
                  { val: '5', label: 'Materias', color: '#00b4d8' },
                ].map(s => (
                  <div key={s.label} className="stat-mini">
                    <div className="stat-mini-val" style={{ color: s.color }}>{s.val}</div>
                    <div className="stat-mini-label">{s.label}</div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  )
}