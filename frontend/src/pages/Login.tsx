import { useState } from 'react'
import logoUCA from '../assets/uc_logo-removebg-preview.png'

type Rol = 'alumno' | 'profesor' | 'admin'
type Tab = 'login' | 'registro'

const credencialesDemo: Record<Rol, { doc: string; pass: string }> = {
  alumno:   { doc: '12345678',         pass: 'Alumno1234!' },
  profesor: { doc: 'prof@uca.edu.py',  pass: 'Profesor1234!' },
  admin:    { doc: 'admin@uca.edu.py', pass: 'Admin1234!' },
}

const placeholderDoc: Record<Rol, string> = {
  alumno:   'ej. 12345678',
  profesor: 'ej. prof@uca.edu.py',
  admin:    'ej. admin@uca.edu.py',
}

const labelDoc: Record<Rol, string> = {
  alumno:   'Nro. de Documento',
  profesor: 'Email institucional',
  admin:    'Email de administrador',
}

export default function Login() {
  const [tab, setTab] = useState<Tab>('login')
  const [rol, setRol] = useState<Rol>('alumno')
  const [documento, setDocumento] = useState('')
  const [password, setPassword] = useState('')
  const [matricula, setMatricula] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleRolChange(r: Rol) {
    setRol(r); setDocumento(''); setPassword(''); setError('')
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!documento || !password) { setError('Completá todos los campos.'); return }
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      const demo = credencialesDemo[rol]
      if (documento === demo.doc && password === demo.pass) {
        window.location.href = '/dashboard'
      } else {
        setError('Credenciales incorrectas.')
      }
    }, 1000)
  }

  function handleRegistro(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!documento || !matricula) { setError('Completá todos los campos.'); return }
    setLoading(true)
    setTimeout(() => { setLoading(false); setError('Registro en proceso. Contactá a administración.') }, 1000)
  }

  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0b0f14; --surface: #131920; --surface2: #1a2230;
      --border: #1e2d3d; --border2: #243447;
      --cyan: #00b4d8; --cyan-glow: #00b4d820;
      --text-1: #f0f4f8; --text-2: #8fa3b8; --text-3: #506070;
      --yellow: #f59e0b;
    }
    html, body {
      width: 100%; height: 100%; overflow-x: hidden;
    }
    .login-root {
      font-family: 'Inter', system-ui, sans-serif;
      background: var(--bg); color: var(--text-1);
      width: 100vw; height: 100vh; display: flex; align-items: stretch; overflow: hidden;
    }
    .panel-left {
      flex: 1; display: flex; flex-direction: column;
      justify-content: center; gap: clamp(24px, 4vh, 48px);
      padding: clamp(24px, 4vh, 48px) 56px;
      position: relative; overflow: hidden; background: var(--surface);
    }
    .panel-left::before {
      content:''; position:absolute; top:-120px; left:-120px;
      width:500px; height:500px; border-radius:50%;
      background:radial-gradient(circle,#00b4d812 0%,transparent 70%); pointer-events:none;
    }
    .panel-left::after {
      content:''; position:absolute; bottom:-80px; right:-80px;
      width:360px; height:360px; border-radius:50%;
      background:radial-gradient(circle,#0ea5e910 0%,transparent 70%); pointer-events:none;
    }
    .grid-lines {
      position:absolute; inset:0;
      background-image: linear-gradient(var(--border) 1px,transparent 1px), linear-gradient(90deg,var(--border) 1px,transparent 1px);
      background-size:56px 56px; opacity:.25; pointer-events:none;
    }
    .brand { display:flex; align-items:center; gap:14px; z-index:1; }
    .brand-icon {
      width:42px; height:42px;
      background:linear-gradient(135deg,var(--cyan),#0ea5e9);
      border-radius:10px; display:flex; align-items:center; justify-content:center;
    }
    .brand-name { font-size:15px; font-weight:700; color:var(--text-1); line-height:1.2; }
    .brand-sub { font-size:11px; color:var(--text-3); letter-spacing:.04em; text-transform:uppercase; }
    .hero-eyebrow {
      display:inline-flex; align-items:center; gap:8px;
      background:var(--cyan-glow); border:1px solid #00b4d830;
      border-radius:20px; padding:5px 14px;
      font-size:12px; font-weight:500; color:var(--cyan);
      letter-spacing:.04em; margin-bottom:clamp(12px, 2vh, 28px);
    }
    .hero-dot { width:6px; height:6px; border-radius:50%; background:var(--cyan); display:block; }
    .hero-title {
      font-size:clamp(24px,2.8vw,40px); font-weight:800;
      line-height:1.15; color:var(--text-1); margin-bottom:clamp(8px, 1.5vh, 16px);
      letter-spacing:-.02em;
    }
    .hero-title span { color:var(--cyan); }
    .hero-desc { font-size:14px; color:var(--text-2); line-height:1.55; max-width:420px; margin-bottom:clamp(16px, 3vh, 40px); }
    .stats-row {
      display:flex; border:1px solid var(--border); border-radius:14px;
      overflow:hidden; background:var(--surface2); width:fit-content;
    }
    .stat { padding:14px 28px; border-right:1px solid var(--border); }
    .stat:last-child { border-right:none; }
    .stat-value { font-size:22px; font-weight:700; color:var(--text-1); }
    .stat-label { font-size:11px; color:var(--text-3); margin-top:2px; text-transform:uppercase; letter-spacing:.05em; }
    .feature-list { display:flex; flex-wrap:wrap; gap:10px; z-index:1; }
    .feature-pill {
      display:flex; align-items:center; gap:7px;
      background:var(--surface2); border:1px solid var(--border2);
      border-radius:8px; padding:7px 13px; font-size:12px; color:var(--text-2);
    }
    .panel-right {
      width:460px; flex-shrink:0; background:var(--bg);
      display:flex; flex-direction:column; justify-content:center; align-items:center;
      padding:40px 48px; border-left:1px solid var(--border);
      overflow-y: auto;
    }
    .logo-area { width:100%; display:flex; flex-direction:column; align-items:center; margin-bottom:24px; }
    .tabs { display:flex; border-bottom:1px solid var(--border); margin-bottom:24px; gap:0; width:100%; }
    .tab-btn {
      flex:1; padding:11px 0; background:none; border:none;
      font-size:13px; font-weight:500; font-family:inherit;
      color:var(--text-3); cursor:pointer;
      border-bottom:2px solid transparent; margin-bottom:-1px;
      transition:color .15s, border-color .15s;
    }
    .tab-btn.active { color:var(--cyan); border-bottom-color:var(--cyan); }
    .role-selector {
      display:flex; background:var(--surface); border:1px solid var(--border);
      border-radius:10px; padding:4px; gap:4px; margin-bottom:24px; width:100%;
    }
    .role-btn {
      flex:1; padding:9px 0; border:none; border-radius:7px;
      background:transparent; color:var(--text-2);
      font-size:13px; font-weight:500; cursor:pointer;
      transition:all .18s ease; font-family:inherit;
    }
    .role-btn.active { background:var(--cyan); color:#000; font-weight:600; }
    .field { margin-bottom:16px; width:100%; }
    .field label {
      display:block; font-size:12px; font-weight:500; color:var(--text-2);
      margin-bottom:7px; letter-spacing:.03em; text-transform:uppercase;
    }
    .input-wrap { position:relative; }
    .input-icon {
      position:absolute; left:14px; top:50%; transform:translateY(-50%);
      width:16px; height:16px; color:var(--text-3);
    }
    .input-field {
      width:100%; padding:12px 14px 12px 42px;
      background:var(--surface); border:1px solid var(--border2);
      border-radius:9px; color:var(--text-1); font-size:14px;
      font-family:inherit; outline:none;
      transition:border-color .18s, box-shadow .18s;
    }
    .input-field::placeholder { color:var(--text-3); }
    .input-field:focus { border-color:var(--cyan); box-shadow:0 0 0 3px var(--cyan-glow); }
    .pw-toggle {
      position:absolute; right:13px; top:50%; transform:translateY(-50%);
      background:none; border:none; cursor:pointer; color:var(--text-3); padding:4px;
    }
    .field-meta { display:flex; justify-content:flex-end; margin-top:8px; }
    .field-meta a { font-size:12px; color:var(--cyan); text-decoration:none; }
    .demo-hint {
      display:flex; align-items:center; gap:8px;
      background:var(--surface); border:1px solid var(--border);
      border-radius:8px; padding:10px 14px; margin-bottom:20px; width:100%;
    }
    .demo-hint p { font-size:12px; color:var(--text-2); line-height:1.4; }
    .demo-hint strong { color:var(--text-1); font-weight:600; }
    .btn-primary {
      width:100%; padding:13px; background:var(--cyan); border:none;
      border-radius:9px; color:#000; font-size:14px; font-weight:700;
      font-family:inherit; cursor:pointer; margin-bottom:16px;
      transition:opacity .18s;
    }
    .btn-primary:hover { opacity:.88; }
    .btn-primary:disabled { opacity:.5; cursor:not-allowed; }
    .divider {
      display:flex; align-items:center; gap:12px; margin:16px 0; width:100%;
    }
    .divider::before, .divider::after { content:''; flex:1; height:1px; background:var(--border); }
    .divider span { font-size:11px; color:var(--text-3); white-space:nowrap; }
    .alt-actions { display:flex; gap:10px; width:100%; margin-bottom:4px; }
    .btn-alt {
      flex:1; padding:10px; background:var(--surface);
      border:1px solid var(--border2); border-radius:9px;
      color:var(--text-2); font-size:12px; font-weight:500;
      font-family:inherit; cursor:pointer;
      display:flex; align-items:center; justify-content:center; gap:7px;
      transition:border-color .15s, color .15s;
    }
    .btn-alt:hover { border-color:var(--cyan); color:var(--text-1); }
    .form-footer { margin-top:24px; text-align:center; font-size:11px; color:var(--text-3); }
    .error-box {
      background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.3);
      border-radius:8px; padding:10px 14px; margin-bottom:16px;
      font-size:12px; color:#f87171; width:100%;
    }
    @media(max-width:900px){
      .panel-left{ display: none; }
      .panel-right{ width: 100vw; padding-top: 32px; }
      .logo-area img { width: 200px !important; }
    }
    @media(max-width:420px){
      .panel-right{ padding: 24px 20px; padding-top: 28px; }
      .logo-area img { width: 170px !important; }
    }
  `

  return (
    <>
      <style>{css}</style>
      <div className="login-root">

        {/* LEFT PANEL */}
        <div className="panel-left">
          <div className="grid-lines" />

          <div className="brand">
            <div className="brand-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
              </svg>
            </div>
            <div>
              <div className="brand-name">Sist. Académico</div>
              <div className="brand-sub">UCA — Universidad Católica</div>
            </div>
          </div>

          <div style={{ zIndex: 1 }}>
            <div className="hero-eyebrow">
              <span className="hero-dot" />
              Semestre 1 · 2026
            </div>
            <h1 className="hero-title">
              Tu expediente<br />académico,<br /><span>siempre al día</span>
            </h1>
            <p className="hero-desc">
              Consultá calificaciones, asistencia, calendario de exámenes y boletas en un solo lugar. Acceso seguro para alumnos, docentes y administración.
            </p>
            <div className="stats-row">
              <div className="stat"><div className="stat-value">245</div><div className="stat-label">Alumnos</div></div>
              <div className="stat"><div className="stat-value">18</div><div className="stat-label">Materias</div></div>
              <div className="stat"><div className="stat-value">12</div><div className="stat-label">Docentes</div></div>
            </div>
          </div>

          <div className="feature-list">
            {[
              { label: 'Puntajes en tiempo real', path: 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11' },
              { label: 'Calendario académico', path: 'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18' },
              { label: 'Boleta PDF oficial', path: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6' },
              { label: 'Estadísticas detalladas', path: 'M22 12h-4l-3 9L9 3l-3 9H2' },
            ].map(f => (
              <div key={f.label} className="feature-pill">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00b4d8" strokeWidth="2">
                  <path d={f.path} strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {f.label}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="panel-right">

          {/* Logo UCA grande y centrado */}
          <div className="logo-area">
            <img
              src={logoUCA}
              alt="Universidad Católica"
              style={{ width: '280px', filter: 'brightness(0) invert(1)', opacity: 0.92 }}
            />
          </div>

          {/* Tabs */}
          <div className="tabs">
            {(['login', 'registro'] as Tab[]).map(t => (
              <button
                key={t}
                className={`tab-btn${tab === t ? ' active' : ''}`}
                onClick={() => { setTab(t); setError('') }}
              >
                {t === 'login' ? 'Iniciar sesión' : 'Registrarme'}
              </button>
            ))}
          </div>

          {tab === 'login' && (
            <>
              {/* Role selector */}
              <div className="role-selector">
                {(['alumno', 'profesor', 'admin'] as Rol[]).map(r => (
                  <button
                    key={r}
                    className={`role-btn${rol === r ? ' active' : ''}`}
                    onClick={() => handleRolChange(r)}
                  >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>

              {error && <div className="error-box">{error}</div>}

              <form onSubmit={handleLogin} style={{ width: '100%' }}>
                <div className="field">
                  <label>{labelDoc[rol]}</label>
                  <div className="input-wrap">
                    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {rol === 'alumno'
                        ? <><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></>
                        : <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>
                      }
                    </svg>
                    <input
                      className="input-field"
                      type={rol === 'alumno' ? 'text' : 'email'}
                      placeholder={placeholderDoc[rol]}
                      value={documento}
                      onChange={e => setDocumento(e.target.value)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label>Contraseña</label>
                  <div className="input-wrap">
                    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                    <input
                      className="input-field"
                      type={showPass ? 'text' : 'password'}
                      placeholder="Tu contraseña"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <button type="button" className="pw-toggle" onClick={() => setShowPass(!showPass)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#506070" strokeWidth="2">
                        {showPass
                          ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                          : <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                        }
                      </svg>
                    </button>
                  </div>
                  <div className="field-meta"><a href="#">¿Olvidaste tu contraseña?</a></div>
                </div>

                <div className="demo-hint">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <p>Demo: <strong>{credencialesDemo[rol].doc}</strong> · <strong>{credencialesDemo[rol].pass}</strong></p>
                </div>

                <button className="btn-primary" type="submit" disabled={loading}>
                  {loading ? 'Ingresando...' : 'Ingresar'}
                </button>
              </form>

              <div className="divider"><span>o acceder con</span></div>

              <div className="alt-actions">
                <button className="btn-alt">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                  Doc. extranjero
                </button>
                <button className="btn-alt">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 2H3v16h5l4 4 4-4h5V2z"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="11" y2="13"/>
                  </svg>
                  Soporte
                </button>
              </div>
            </>
          )}

          {tab === 'registro' && (
            <>
              {error && <div className="error-box">{error}</div>}
              <form onSubmit={handleRegistro} style={{ width: '100%' }}>
                <div className="field">
                  <label>Nro. de Documento</label>
                  <div className="input-wrap">
                    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
                    </svg>
                    <input className="input-field" type="text" placeholder="ej. 12345678" value={documento} onChange={e => setDocumento(e.target.value)} />
                  </div>
                </div>
                <div className="field">
                  <label>Matrícula</label>
                  <div className="input-wrap">
                    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
                    </svg>
                    <input className="input-field" type="text" placeholder="Tu matrícula" value={matricula} onChange={e => setMatricula(e.target.value)} />
                  </div>
                </div>
                <button className="btn-primary" type="submit" disabled={loading}>
                  {loading ? 'Procesando...' : 'Registrarme'}
                </button>
              </form>
            </>
          )}

          <div className="form-footer">Sistema de gestión académica · UCA 2026</div>
        </div>
      </div>
    </>
  )
}