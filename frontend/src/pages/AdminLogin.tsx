import { useState } from 'react'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import logoUCA from '../assets/uc_logo_sist_academico.png'
import { api, decodeToken, setAccessToken } from '../lib/api'
import { setDocTitle } from '../lib/docTitle'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPass] = useState('')
  const [showPass, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const semestreActual = `Semestre ${new Date().getMonth() < 6 ? 1 : 2} · ${new Date().getFullYear()}`

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Completá todos los campos.'); return }
    setLoading(true)
    try {
      const res = await api.post<{ access_token: string; token_type: string }>('/auth/login', {
        username: email, password, role: 'admin',
      })
      setAccessToken(res.access_token)
      const decoded = decodeToken(res.access_token)
      sessionStorage.setItem('user_rol', decoded?.role || '')
      sessionStorage.setItem('user_nombre', decoded?.username || '')
      if (decoded?.role !== 'admin') {
        setError('Acceso denegado.')
        setAccessToken(null)
        return
      }
      setDocTitle('admin', decoded?.username || '')
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #07090d; --surface: #0e131a; --surface-glass: rgba(14, 19, 26, 0.6);
      --border: #1e2d3d; --border-glass: rgba(30, 45, 61, 0.5);
      --cyan: #2563eb; --cyan-glow: rgba(37, 99, 235, 0.18);
      --cyan-bright: #60a5fa;
      --text-1: #ffffff; --text-2: #94a3b8; --text-3: #64748b;
      --danger: rgba(239, 68, 68, 0.1); --danger-border: rgba(239, 68, 68, 0.3);
    }
    html, body { width: 100%; height: 100%; overflow: hidden; background: var(--bg); }

    .admin-root {
      font-family: 'Inter', system-ui, sans-serif;
      background: var(--bg); color: var(--text-1);
      width: 100vw; height: 100vh;
      display: flex; overflow: hidden;
      position: relative;
    }

    /* RIGHT DECORATIVE PANEL (Background on Mobile) */
    .panel-deco {
      flex: 1; display: flex; flex-direction: column;
      justify-content: center; align-items: flex-start;
      padding: 80px 60px;
      position: relative; overflow: hidden;
    }
    .panel-deco-bg {
      position: absolute; inset: 0; z-index: 0;
      background-image: url('/campus.png');
      background-size: cover; background-position: center;
      filter: contrast(1.1) brightness(0.9);
      transform: scale(1.05);
      animation: slowZoom 20s ease-in-out infinite alternate;
    }
    @keyframes slowZoom {
      0% { transform: scale(1.05); }
      100% { transform: scale(1.1); }
    }
    .panel-deco-overlay {
      position: absolute; inset: 0; z-index: 1;
      background: linear-gradient(135deg, rgba(7,9,13,0.85) 0%, rgba(7,9,13,0.4) 50%, rgba(0,180,216,0.1) 100%);
    }
    .panel-deco-content {
      position: relative; z-index: 3;
      display: flex; flex-direction: column;
      align-items: flex-start; gap: 24px; max-width: 520px;
    }
    
    .hero-eyebrow {
      display: inline-flex; align-items: center; gap: 8px;
      background: rgba(0,180,216,0.1); border: 1px solid rgba(0,180,216,0.25);
      border-radius: 20px; padding: 6px 14px;
      font-size: 12px; font-weight: 600; color: var(--cyan-bright);
      backdrop-filter: blur(8px);
    }
    .hero-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--cyan-bright); display: block; box-shadow: 0 0 8px var(--cyan-bright); }
    
    .hero-title {
      font-size: clamp(32px, 4vw, 54px); font-weight: 800;
      line-height: 1.1; color: #fff; letter-spacing: -0.03em;
    }
    .hero-title span { 
      background: linear-gradient(135deg, #2563eb, #93c5fd);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .hero-desc { font-size: 15px; color: #cbd5e1; line-height: 1.6; max-width: 460px; font-weight: 400; }

    /* LEFT FORM PANEL (Overlay on Mobile) */
    .panel-form {
      width: 480px; flex-shrink: 0;
      background: var(--surface);
      border-right: 1px solid var(--border);
      height: 100vh;
      display: flex; flex-direction: column;
      position: relative; z-index: 10;
      box-shadow: 20px 0 50px rgba(0,0,0,0.5);
    }
    
    .form-header {
      padding: 60px 48px 0;
      display: flex; justify-content: center;
    }
    .form-logo { width: 220px; height: auto; }

    .form-content {
      flex: 1; padding: 40px 48px;
      display: flex; flex-direction: column; justify-content: center;
      overflow-y: auto;
    }

    .form-title { font-size: 26px; font-weight: 800; color: var(--text-1); letter-spacing: -0.02em; margin-bottom: 6px; }
    .form-sub { font-size: 14px; color: var(--text-2); margin-bottom: 32px; }

    .input-group { margin-bottom: 20px; }
    .input-label { display: block; font-size: 12px; font-weight: 600; color: var(--text-2); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
    .input-wrapper { position: relative; }
    .input-icon {
      position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
      width: 16px; height: 16px; color: var(--text-3); transition: color 0.2s;
    }
    .input-field {
      width: 100%; height: 48px; padding: 0 16px 0 42px;
      background: rgba(255,255,255,0.03); border: 1px solid var(--border);
      border-radius: 10px; color: var(--text-1); font-size: 15px;
      transition: all 0.2s; outline: none;
    }
    .input-field:focus {
      background: rgba(0,180,216,0.02);
      border-color: var(--cyan);
      box-shadow: 0 0 0 4px var(--cyan-glow);
    }
    .input-field:focus + .input-icon { color: var(--cyan); }
    
    .pw-toggle {
      position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
      background: none; border: none; color: var(--text-3); cursor: pointer;
      display: flex; align-items: center; justify-content: center; padding: 4px;
      transition: color 0.2s;
    }
    .pw-toggle:hover { color: var(--text-1); }

    .btn-submit {
      width: 100%; height: 48px; margin-top: 10px;
      background: var(--cyan); border: none; border-radius: 10px;
      color: #fff; font-size: 15px; font-weight: 700; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: all 0.2s; box-shadow: 0 4px 14px rgba(0,180,216,0.3);
    }
    .btn-submit:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,180,216,0.4); }
    .btn-submit:active { transform: translateY(1px); box-shadow: 0 2px 8px rgba(0,180,216,0.3); }
    .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }

    .error-msg {
      background: var(--danger); border: 1px solid var(--danger-border);
      color: #f87171; font-size: 13px; font-weight: 500;
      padding: 10px 14px; border-radius: 8px; margin-bottom: 20px;
      display: flex; align-items: center; gap: 8px;
    }

    .form-footer { padding: 20px 48px; text-align: center; font-size: 12px; color: var(--text-3); border-top: 1px solid var(--border); }

    /* RESPONSIVE DESIGN FOR TABLETS AND MOBILE */
    @media (max-width: 960px) {
      .admin-root { flex-direction: column; overflow-y: auto; height: 100dvh; background: var(--bg); }
      html, body { overflow-y: auto; }
      
      .panel-deco { order: 1; padding: 40px 24px 80px; min-height: 40vh; border-bottom: 1px solid var(--border); }
      .panel-form { order: 2; width: 100%; height: auto; border-right: none; background: transparent; box-shadow: none; margin-top: -60px; z-index: 20; }
      
      .panel-deco-overlay {
        background: linear-gradient(180deg, rgba(7,9,13,0.3) 0%, rgba(7,9,13,0.8) 60%, var(--bg) 100%);
      }
      
      .form-content {
        padding: 32px 24px; margin: 0 20px 40px;
        background: rgba(14, 19, 26, 0.85); backdrop-filter: blur(20px);
        border: 1px solid var(--border-glass); border-radius: 20px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05);
      }
      
      .form-header { padding: 0 0 24px 0; }
      .form-logo { width: 180px; }
      .form-footer { border-top: none; padding: 0 20px 30px; }
    }

    @media (max-width: 480px) {
      .panel-deco { padding: 30px 20px 60px; min-height: 35vh; }
      .hero-title { font-size: 28px; }
      .form-content { margin: 0 16px 30px; padding: 28px 20px; }
      .input-field { height: 46px; font-size: 14px; }
      .btn-submit { height: 46px; }
    }
  `

  return (
    <>
      <style>{css}</style>
      <div className="admin-root">
        
        {/* DESKTOP LEFT / MOBILE BOTTOM: FORM PANEL */}
        <div className="panel-form">
          <div className="form-header">
            <img src={logoUCA} alt="UCA Admin" className="form-logo" />
          </div>

          <div className="form-content">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <h2 className="form-title">Panel de Administración</h2>
              <p className="form-sub">Ingresá con tus credenciales de administrador</p>

              {error && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="error-msg">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleLogin}>
                <div className="input-group">
                  <label className="input-label" htmlFor="email">Correo Institucional</label>
                  <div className="input-wrapper">
                    <input id="email" className="input-field" type="email" placeholder="admin@uca.edu.py" value={email} onChange={e => setEmail(e.target.value)} />
                    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="password">Contraseña</label>
                  <div className="input-wrapper">
                    <input id="password" className="input-field" type={showPass ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPass(e.target.value)} />
                    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    <button type="button" className="pw-toggle" onClick={() => setShow(!showPass)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        {showPass 
                          ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></> 
                          : <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                        }
                      </svg>
                    </button>
                  </div>
                </div>

                <button className="btn-submit" type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <svg style={{ animation: 'spin 1s linear infinite' }} width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
                        <path d="M12 2a10 10 0 0110 10" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                      Ingresando...
                    </>
                  ) : 'Acceder al panel →'}
                </button>
              </form>
            </motion.div>
          </div>
            <div className="form-footer">
              Sistema de gestión académica · UCA 2026
              <span style={{ display:'inline-block', marginLeft:14, paddingLeft:14, borderLeft:'1px solid #1e2d3d' }}>
                <button onClick={()=>navigate('/login')} style={{ background:'none', border:'none', color:'#506070', cursor:'pointer', fontSize:11, fontFamily:'inherit', textDecoration:'underline', textUnderlineOffset:2 }}>Portal alumno/profesor</button>
              </span>
            </div>
        </div>

        {/* DESKTOP RIGHT / MOBILE TOP: DECORATIVE PANEL */}
        <div className="panel-deco">
          <div className="panel-deco-bg" />
          <div className="panel-deco-overlay" />
          <div className="panel-deco-content">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                <img src="/icono web.png" alt="UC" style={{ width: 56, height: 56, borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', objectFit: 'cover', boxShadow: '0 8px 16px rgba(0,0,0,0.3)' }} />
                <div>
                  <p style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Unidad Pedagógica</p>
                  <p style={{ fontSize: 13, color: 'var(--cyan-bright)', fontWeight: 500 }}>Sede Caacupé</p>
                </div>
              </div>

              <div className="hero-eyebrow">
                <span className="hero-dot" /> {semestreActual}
              </div>
              <h1 className="hero-title">Gestión administrativa, <span>control total</span></h1>
              <p className="hero-desc">
                Administrá usuarios, materias, reportes, estadísticas y boletas de calificaciones en un entorno seguro y de alto rendimiento.
              </p>
            </motion.div>
          </div>
        </div>

      </div>
    </>
  )
}