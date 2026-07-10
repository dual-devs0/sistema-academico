import { useState, useRef } from 'react'
import { motion, AnimatePresence, useInView } from 'motion/react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import logoUCA from '../assets/uc_logo_sist_academico.png'
import { api, decodeToken, setAccessToken } from '../lib/api'
import { setDocTitle } from '../lib/docTitle'

type Rol = 'alumno' | 'profesor'
type Tab = 'login' | 'registro'

const WaIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.558 4.112 1.532 5.836L.054 23.446a.5.5 0 00.609.61l5.71-1.493A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.95 9.95 0 01-5.127-1.42l-.369-.214-3.821.999 1.023-3.71-.24-.382A9.953 9.953 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
  </svg>
)

function AnimatedLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) {
  const ref = useRef<HTMLLabelElement>(null)
  const inView = useInView(ref, { once: false, margin: '-50px' })
  return (
    <motion.label
      ref={ref}
      htmlFor={htmlFor}
      initial={{ x: -20, opacity: 0 }}
      animate={inView ? { x: 0, opacity: 1 } : { x: -20, opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 12, fontWeight: 500, color: 'var(--text-2)',
        marginBottom: 5, userSelect: 'none',
      }}
    >
      {children}
    </motion.label>
  )
}

export default function AcademicoLogin() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const redirect = params.get('redirect') || ''

  const [tab, setTab]              = useState<Tab>('login')
  const [rol, setRol]              = useState<Rol>('alumno')
  const [documento, setDoc]        = useState('')
  const [password, setPass]        = useState('')
  const [matricula, setMat]        = useState('')
  const [showPass, setShow]        = useState(false)
  const [loading, setLoading]      = useState(false)
  const [error, setError]          = useState('')
  const [showSoporte, setSoporte]  = useState(false)
  const [showRecuperar, setShowRecuperar] = useState(false)
  const [recEmail, setRecEmail] = useState('')
  const [recLoading, setRecLoading] = useState(false)
  const [recEnviado, setRecEnviado] = useState(false)
  const [recError, setRecError] = useState('')
  const [showDocExtranjero, setDocExtranjero] = useState(false)
  const [tipoDocumento, setTipoDocumento] = useState('Pasaporte')
  const [paisDocumento, setPaisDocumento] = useState('Paraguay')
  const [paisPersonalizado, setPaisPersonalizado] = useState('')

  const tiposDocExtranjero = [
    'Libreta de Baja', 'Libreta Cívica', 'Pasaporte', 'Carnet de Migraciones',
    'RUC', 'Indefinido', 'DNI', 'RG - Registro General',
    'Cédula de Identidad', 'RUT',
  ]

  const paises = [
    'Paraguay', 'Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia',
    'Ecuador', 'Perú', 'Uruguay', 'Venezuela', 'México', 'España',
    'Estados Unidos', 'Otro',
  ]

  const semestreActual = `Semestre ${new Date().getMonth() < 6 ? 1 : 2} · ${new Date().getFullYear()}`

  const accentColor  = rol === 'profesor' ? '#8b5cf6' : '#00b4d8'
  const accentGlow   = rol === 'profesor' ? '#8b5cf620' : '#00b4d820'
  const accentBright = rol === 'profesor' ? '#c4b5fd' : '#48cae4'

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!documento || !password) { setError('Completá todos los campos.'); return }
    setLoading(true)
    try {
      const res = await api.post<{ access_token: string; token_type: string }>('/auth/login', {
        username: documento, password, role: rol,
      })
      setAccessToken(res.access_token)
      const decoded = decodeToken(res.access_token)
      const rolReal = decoded?.role || ''
      sessionStorage.setItem('user_rol', rolReal)
      sessionStorage.setItem('user_nombre', decoded?.username || '')

      if (rolReal !== rol) {
        setError('Acceso denegado para este rol.')
        setAccessToken(null)
        return
      }

      setDocTitle(rolReal, decoded?.username || '')
      navigate(redirect || '/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  function handleRegistro(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!documento || !matricula) { setError('Completá todos los campos.'); return }
    setLoading(true)
    setTimeout(() => { setLoading(false); setError('Registro en proceso. Contactá a administración.') }, 1000)
  }

  async function handleRecuperar(e: React.FormEvent) {
    e.preventDefault(); setRecError('')
    if (!recEmail) { setRecError('Ingresá tu documento o email.'); return }
    setRecLoading(true)
    try {
      await api.post<{ detail: string }>('/auth/recuperar-contrasena', {
        username_or_email: recEmail,
      })
      setRecEnviado(true)
    } catch (err) {
      setRecError(err instanceof Error ? err.message : 'Error de conexión')
    } finally {
      setRecLoading(false)
    }
  }

  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0b0f14; --surface: #131920;
      --border: #1e2d3d; --border2: #243447;
      --accent: ${accentColor}; --accent-glow: ${accentGlow}; --accent-bright: ${accentBright};
      --text-1: #f0f4f8; --text-2: #8fa3b8; --text-3: #506070;
      --danger: rgba(239,68,68,0.12); --danger-border: rgba(239,68,68,0.35);
    }
    html, body { width:100%; height:100%; overflow:hidden; }

    .login-root {
      font-family: 'Inter', system-ui, sans-serif;
      background: var(--bg); color: var(--text-1);
      width: 100vw; height: 100vh;
      display: flex; align-items: stretch; overflow: hidden;
    }

    .panel-left {
      flex: 1; display: flex; flex-direction: column;
      justify-content: center; align-items: flex-start;
      padding: clamp(28px,4vh,56px) 52px;
      position: relative; overflow: hidden;
    }
    .panel-left-bg {
      position:absolute; inset:0; z-index:0;
      background-image: url('/campus.png');
      background-size:cover; background-position:center;
    }
    .panel-left-overlay {
      position:absolute; inset:0; z-index:1;
      background: linear-gradient(135deg,
        rgba(11,15,20,.75) 0%,
        rgba(11,15,20,.40) 50%,
        rgba(11,15,20,.70) 100%);
    }
    .panel-left-overlay-accent {
      position:absolute; inset:0; z-index:2;
      background: linear-gradient(135deg, transparent 30%, ${accentColor}08 100%);
      pointer-events: none;
    }
    .panel-left-content {
      position:relative; z-index:3;
      display:flex; flex-direction:column;
      align-items:flex-start; gap:clamp(14px,2.2vh,26px); max-width:480px;
    }
    .hero-eyebrow {
      display:inline-flex; align-items:center; gap:8px;
      background:var(--accent-glow); border:1px solid var(--accent-color)40;
      border-radius:20px; padding:4px 12px;
      font-size:11px; font-weight:500; color:var(--accent);
    }
    .hero-dot { width:6px; height:6px; border-radius:50%; background:var(--accent); display:block; }
    .hero-title {
      font-size:clamp(26px,2.8vw,42px); font-weight:800;
      line-height:1.15; color:var(--text-1); letter-spacing:-.02em;
    }
    .hero-title span {
      background: linear-gradient(135deg, var(--accent), var(--accent-bright));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .hero-desc { font-size:13.5px; color:var(--text-2); line-height:1.6; max-width:420px; }

    .panel-right {
      width: 500px; flex-shrink: 0;
      background: var(--bg); border-left: 1px solid var(--border);
      height: 100vh;
      display: flex; flex-direction: column;
      align-items: stretch;
      padding: 0;
      overflow: hidden;
    }
    .pr-logo {
      flex-shrink: 0;
      display: flex; justify-content: center;
      padding: 20px 48px 0;
    }
    .pr-scroll {
      flex: 1; overflow-y: auto; overflow-x: hidden;
      padding: 14px 48px 0;
      display: flex; flex-direction: column;
      justify-content: center;
      scrollbar-width: thin;
      scrollbar-color: #1e2d3d transparent;
    }
    .pr-scroll::-webkit-scrollbar { width: 4px; }
    .pr-scroll::-webkit-scrollbar-track { background: transparent; }
    .pr-scroll::-webkit-scrollbar-thumb { background: #1e2d3d; border-radius: 4px; }
    .pr-footer {
      flex-shrink: 0;
      padding: 10px 48px 16px;
      text-align: center; font-size: 11px; color: var(--text-3);
    }

    .sx-tabs {
      display:flex; width:100%;
      border-bottom: 1px solid var(--border); margin-bottom:14px;
    }
    .sx-tab {
      flex:1; padding:8px 0; background:none; border:none;
      font-size:13px; font-weight:500; font-family:inherit; color:var(--text-3); cursor:pointer;
      border-bottom:2px solid transparent; margin-bottom:-1px;
      transition:color .15s, border-color .15s;
    }
    .sx-tab.active { color:var(--accent); border-bottom-color:var(--accent); }

    .sx-form-title {
      font-size:23px; font-weight:700; letter-spacing:-.03em;
      color:var(--text-1); line-height:1.2; margin-bottom:2px;
    }
    .sx-form-sub { font-size:12px; color:var(--text-3); margin-bottom:12px; }

    .rol-switch {
      display:flex; background:rgba(255,255,255,0.04); border:1px solid var(--border);
      border-radius:12px; padding:4px; margin-bottom:18px; gap:4px;
    }
    .rol-btn {
      flex:1; height:36px; border:none; border-radius:9px;
      font-size:13px; font-weight:600; cursor:pointer;
      transition:all 0.2s; color:var(--text-3); background:transparent; font-family:inherit;
    }
    .rol-btn.active { background:var(--accent); color:#fff; box-shadow:0 2px 8px var(--accent-glow); }

    .form-title { font-size:23px; font-weight:700; letter-spacing:-.03em; color:var(--text-1); line-height:1.2; margin-bottom:2px; }
    .form-sub { font-size:12px; color:var(--text-3); margin-bottom:16px; }

    .sx-divider {
      position:relative; display:flex; align-items:center; width:100%; margin:10px 0;
    }
    .sx-divider::before, .sx-divider::after { content:''; flex:1; height:1px; background:var(--border); }
    .sx-divider span {
      padding:0 10px; font-size:11px; color:var(--text-3);
      text-transform:uppercase; letter-spacing:.06em; background:var(--bg);
    }

    .sx-field { width:100%; margin-bottom:9px; }
    .sx-field-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:5px; }
    .sx-input-wrap { position:relative; }
    .sx-input-icon {
      position:absolute; left:11px; top:50%; transform:translateY(-50%);
      width:14px; height:14px; color:var(--text-3); pointer-events:none;
    }
    .sx-input {
      width:100%; height:37px; padding:0 12px 0 36px;
      background:var(--surface); border:1px solid var(--border2);
      border-radius:7px; color:var(--text-1); font-size:13px;
      font-family:inherit; outline:none;
      transition:border-color .18s, box-shadow .18s;
    }
    .sx-input::placeholder { color:var(--text-3); }
    .sx-input:focus { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-glow); }
    .sx-select {
      background:var(--surface); color:var(--text-1);
      padding:0 8px; height:37px;
      border:1px solid var(--border2); border-radius:7px;
      font-size:13px; font-family:inherit; outline:none; width:100%;
      transition:border-color .18s, box-shadow .18s;
    }
    .sx-select:focus { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-glow); }
    .sx-select option { background:#131920; color:var(--text-1); }
    .sx-pw-toggle {
      position:absolute; right:10px; top:50%; transform:translateY(-50%);
      background:none; border:none; cursor:pointer; color:var(--text-3);
      padding:3px; display:flex; align-items:center;
    }
    .sx-forgot { font-size:11px; color:var(--accent); text-decoration:none; }
    .sx-forgot:hover { text-decoration:underline; }

    .sx-demo {
      display:flex; align-items:center; gap:8px;
      background:var(--surface); border:1px solid var(--border);
      border-radius:7px; padding:7px 11px; margin-bottom:10px; width:100%;
    }
    .sx-demo p { font-size:10px; color:var(--text-2); line-height:1.4; }
    .sx-demo strong { color:var(--text-1); font-weight:600; }

    .sx-btn-primary {
      width:100%; height:39px;
      background:var(--accent); border:none; border-radius:8px;
      color:#000; font-size:13.5px; font-weight:700;
      font-family:inherit; cursor:pointer;
      transition:opacity .18s, transform .1s;
    }
    .sx-btn-primary:hover { opacity:.88; }
    .sx-btn-primary:active { transform:scale(0.98); }
    .sx-btn-primary:disabled { opacity:.45; cursor:not-allowed; }

    .sx-alt-row { display:flex; gap:8px; width:100%; }
    .sx-btn-alt {
      flex:1; height:35px;
      background:var(--surface); border:1px solid var(--border2);
      border-radius:7px; color:var(--text-2);
      font-size:11.5px; font-weight:500; font-family:inherit; cursor:pointer;
      display:flex; align-items:center; justify-content:center; gap:6px;
      transition:border-color .15s, color .15s, background .15s;
    }
    .sx-btn-alt:hover { border-color:var(--accent); color:var(--text-1); }
    .sx-btn-alt.active { border-color:var(--accent); color:var(--accent); background:var(--accent-glow); }

    .sx-switch { font-size:12px; color:var(--text-3); text-align:center; margin-top:9px; width:100%; }
    .sx-switch a { font-weight:600; color:var(--text-1); text-decoration:underline; text-underline-offset:3px; cursor:pointer; }

    .sx-error {
      background:var(--danger); border:1px solid var(--danger-border);
      border-radius:7px; padding:7px 11px; margin-bottom:9px;
      font-size:11.5px; color:#f87171; width:100%;
    }

    .sx-ext-banner {
      display:flex; align-items:center; gap:8px;
      background:${accentGlow}; border:1px solid ${accentColor}30;
      border-radius:7px; padding:7px 11px; margin-bottom:10px; width:100%;
      font-size:11px; color:var(--accent);
    }

    .sx-footer { display: none; }

    .modal-backdrop {
      position:fixed; inset:0; z-index:100;
      background:rgba(0,0,0,.70); backdrop-filter:blur(5px);
      display:flex; align-items:center; justify-content:center; padding:16px;
    }
    .modal-box {
      background:#131920; border:1px solid #1e2d3d;
      border-radius:18px; padding:24px 24px 20px;
      width:100%; max-width:380px; position:relative;
      box-shadow:0 28px 64px rgba(0,0,0,.7);
    }
    .modal-close {
      position:absolute; top:14px; right:14px;
      background:none; border:none; cursor:pointer;
      color:#506070; padding:4px; display:flex; align-items:center;
      transition:color .15s;
    }
    .modal-close:hover { color:#f0f4f8; }
    .modal-title { font-size:20px; font-weight:700; color:#f0f4f8; margin-bottom:3px; }
    .modal-sub { font-size:12px; color:#506070; margin-bottom:16px; }
    .modal-wa-btn {
      width:100%; height:44px; border:none; border-radius:10px;
      background:#25D366; color:#fff;
      font-size:14px; font-weight:700; font-family:inherit; cursor:pointer;
      display:flex; align-items:center; justify-content:center; gap:8px;
      margin-bottom:16px; transition:opacity .18s, transform .1s;
      text-decoration:none;
    }
    .modal-wa-btn:hover { opacity:.9; }
    .modal-wa-btn:active { transform:scale(0.98); }
    .modal-field { margin-bottom:11px; }
    .modal-label { font-size:12px; font-weight:500; color:#8fa3b8; margin-bottom:5px; display:block; }
    .modal-input-wrap { position:relative; }
    .modal-input-icon {
      position:absolute; left:11px; top:50%; transform:translateY(-50%);
      width:14px; height:14px; color:#506070; pointer-events:none;
    }
    .modal-input {
      width:100%; height:38px; padding:0 12px 0 34px;
      background:#0f1520; border:1px solid #1e2d3d;
      border-radius:8px; color:#f0f4f8; font-size:13px;
      font-family:inherit; outline:none;
      transition:border-color .18s, box-shadow .18s;
    }
    .modal-input::placeholder { color:#506070; }
    .modal-input:focus { border-color:${accentColor}; box-shadow:0 0 0 3px ${accentGlow}; }
    .modal-textarea {
      width:100%; padding:10px 12px 10px 34px;
      background:#0f1520; border:1px solid #1e2d3d;
      border-radius:8px; color:#f0f4f8; font-size:13px;
      font-family:inherit; outline:none; resize:vertical; min-height:80px;
      transition:border-color .18s, box-shadow .18s;
    }
    .modal-textarea::placeholder { color:#506070; }
    .modal-textarea:focus { border-color:${accentColor}; box-shadow:0 0 0 3px ${accentGlow}; }
    .modal-textarea-icon {
      position:absolute; left:11px; top:12px;
      width:14px; height:14px; color:#506070; pointer-events:none;
    }
    .modal-send-row { display:flex; gap:8px; margin-top:14px; margin-bottom:14px; }
    .modal-btn-email {
      flex:1; height:40px; border:1px solid #1e2d3d;
      border-radius:9px; background:#1a2230; color:#f0f4f8;
      font-size:12.5px; font-weight:600; font-family:inherit; cursor:pointer;
      display:flex; align-items:center; justify-content:center; gap:6px;
      transition:border-color .15s, background .15s;
    }
    .modal-btn-email:hover { border-color:${accentColor}; background:#1e2d3d; }
    .modal-btn-wa2 {
      flex:1; height:40px; border:none;
      border-radius:9px; background:#25D366; color:#fff;
      font-size:12.5px; font-weight:700; font-family:inherit; cursor:pointer;
      display:flex; align-items:center; justify-content:center; gap:6px;
      text-decoration:none; transition:opacity .15s;
    }
    .modal-btn-wa2:hover { opacity:.88; }
    .modal-contact-bar {
      display:flex; flex-wrap:wrap; gap:8px 16px;
      padding-top:12px; border-top:1px solid #1e2d3d;
    }
    .modal-contact-item { display:flex; align-items:center; gap:5px; font-size:11.5px; }
    .modal-contact-item a { color:${accentColor}; text-decoration:none; }
    .modal-contact-item a:hover { text-decoration:underline; }
    .modal-contact-item span { color:#8fa3b8; }

    @media(max-width:960px){
      .login-root { flex-direction:column; height:auto; min-height:100dvh; overflow:auto; }
      html, body { overflow:auto; }
      .panel-left {
        height:auto; min-height:260px;
        padding:20px 18px 20px;
        align-items:flex-start;
        justify-content:space-between;
      }
      .panel-left-overlay {
        background: linear-gradient(to bottom,
          rgba(11,15,20,.50) 0%,
          rgba(11,15,20,.25) 45%,
          #0b0f14 100%) !important;
      }
      .panel-left-overlay-accent { display: none; }
      .panel-right { border-top: none !important; }
      .panel-left-content { gap:10px; max-width:100%; width:100%; }
      .hero-title { font-size:26px; line-height:1.15; }
      .hero-desc { font-size:12.5px; max-width:100%; }
      .mobile-stats { display:flex !important; gap:8px; width:100%; margin-top:4px; }
      .mobile-stat {
        flex:1; background:rgba(13,15,20,.65); backdrop-filter:blur(8px);
        border:1px solid rgba(255,255,255,.07);
        border-radius:10px; padding:7px 10px; text-align:center;
      }
      .mobile-stat-val { font-size:16px; font-weight:800; color:#fff; line-height:1.1; }
      .mobile-stat-lbl { font-size:8px; color:#4a6fa5; text-transform:uppercase; letter-spacing:.05em; margin-top:2px; }
      .panel-right {
        width:100%; height:auto;
        border-left:none; border-top:1px solid var(--border);
        padding:0; justify-content:flex-start; overflow:visible;
      }
      .pr-logo { padding:18px 20px 0; border-bottom:1px solid var(--border); padding-bottom:14px; }
      .pr-scroll { padding:14px 20px 0; overflow-y:visible; flex:none; }
      .pr-footer { padding:8px 20px 20px; }
      .sx-input { height:44px; font-size:14px; }
      .sx-select { height:44px; font-size:14px; }
      .sx-btn-primary { height:46px; font-size:15px; border-radius:12px; }
      .role-btn { padding:10px 0; font-size:13.5px; }
      .modal-backdrop { align-items:flex-end !important; padding:0 !important; }
      .modal-box {
        border-radius:20px 20px 0 0 !important;
        max-width:100% !important;
        width:100% !important;
        padding:20px 20px 32px !important;
      }
    }

    @media(max-width:420px){
      html, body { overscroll-behavior:none; }
      .login-root { overflow:auto; scrollbar-width:none; }
      .login-root::-webkit-scrollbar { display:none; }
      .panel-left { padding:16px 14px 16px; min-height:240px; }
      .hero-title { font-size:23px; }
      .pr-logo { padding:14px 14px 12px; }
      .pr-scroll { padding:12px 14px 0; }
      .pr-footer { padding:6px 14px 18px; }
    }
    .mobile-stats { display:none; }
  `

  return (
    <>
      <style>{css}</style>
      <div className="login-root">

        {/* LEFT */}
        <div className="panel-left">
          <div className="panel-left-bg" />
          <div className="panel-left-overlay" />
          <div className="panel-left-overlay-accent" />
          <div className="panel-left-content">
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <img src="/icono web.png" alt="UC" style={{ width:52, height:52, borderRadius:'50%', border:'2px solid rgba(255,255,255,.2)', objectFit:'cover', flexShrink:0 }} />
              <div>
                <p style={{ fontSize:17, fontWeight:700, color:'#fff', lineHeight:1.2 }}>Sist. Académico</p>
                <p style={{ fontSize:11, color:'rgba(255,255,255,.75)', fontWeight:500 }}>UCA — Unidad Pedagógica Caacupé</p>
              </div>
            </div>
            <div className="hero-eyebrow" style={{ textShadow:'0 2px 8px rgba(0,0,0,.9)' }}>
              <span className="hero-dot" />{semestreActual}
            </div>
            <h1 className="hero-title" style={{ textShadow:'0 2px 12px rgba(0,0,0,.9)' }}>
              Tu ecosistema académico,<br /><span>unificado.</span>
            </h1>
            <p className="hero-desc" style={{ textShadow:'0 2px 8px rgba(0,0,0,.9)' }}>
              Accedé a tus calificaciones, asistencia, calendario y boletas desde cualquier dispositivo.
            </p>
          </div>
        </div>

        {/* RIGHT */}
        <div className="panel-right">
          <div className="pr-logo">
            <img src={logoUCA} alt="Universidad Católica" style={{ width:210, maxWidth:'100%', height:'auto', opacity:0.95 }} />
          </div>

          <div className="pr-scroll">
            <div className="sx-tabs">
              {(['login','registro'] as Tab[]).map(t => (
                <button key={t} className={`sx-tab${tab===t?' active':''}`} onClick={() => { setTab(t); setError('') }}>
                  {t==='login' ? 'Iniciar sesión' : 'Registrarme'}
                </button>
              ))}
            </div>

            {/* ── ROL SWITCHER ── */}
            <div className="rol-switch">
              <button className={`rol-btn ${rol === 'alumno' ? 'active' : ''}`} onClick={() => { setRol('alumno'); setError('') }}>
                Alumno
              </button>
              <button className={`rol-btn ${rol === 'profesor' ? 'active' : ''}`} onClick={() => { setRol('profesor'); setError('') }}>
                Profesor
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={rol} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
                <h2 className="form-title">
                  {rol === 'alumno' ? 'Portal del Alumno' : 'Portal del Profesor'}
                </h2>
                <p className="form-sub">
                  {rol === 'alumno'
                    ? 'Accedé a tus puntajes, asistencia y boleta'
                    : 'Gestioná calificaciones y asistencia de tus cursos'}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* ── LOGIN ── */}
            {tab === 'login' && (
              <motion.div key="login" initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{duration:0.4,ease:'easeOut'}} style={{width:'100%'}}>

                {error && <div className="sx-error">{error}</div>}

                <form onSubmit={handleLogin} style={{width:'100%'}}>
                  {showDocExtranjero && rol === 'alumno' ? (
                    <>
                      <div className="sx-ext-banner">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                        </svg>
                        Acceso con documento extranjero
                      </div>
                      <div className="sx-field">
                        <AnimatedLabel htmlFor="tipo-doc-login">Tipo de Documento</AnimatedLabel>
                        <select className="sx-select" value={tipoDocumento} onChange={e=>setTipoDocumento(e.target.value)} style={{cursor:'pointer'}}>
                          {tiposDocExtranjero.map(t=><option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="sx-field">
                        <AnimatedLabel htmlFor="documento">Número de Documento</AnimatedLabel>
                        <div className="sx-input-wrap">
                          <svg className="sx-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
                          </svg>
                          <input id="documento" className="sx-input" type="text" placeholder="Nro. de documento" value={documento} onChange={e=>setDoc(e.target.value)} autoComplete="username" />
                        </div>
                      </div>
                      <div className="sx-field">
                        <div className="sx-field-header">
                          <AnimatedLabel htmlFor="pais-login">País de Emisión</AnimatedLabel>
                          {paisDocumento === 'Otro' && (
                            <button type="button" onClick={()=>{ setPaisDocumento('Paraguay'); setPaisPersonalizado('') }} style={{ fontSize:11, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', textDecoration:'underline', textUnderlineOffset:2 }}>
                              ← Ver lista
                            </button>
                          )}
                        </div>
                        {paisDocumento === 'Otro' ? (
                          <div className="sx-input-wrap">
                            <svg className="sx-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                            </svg>
                            <input id="pais-login" className="sx-input" type="text" placeholder="Escribí el país" value={paisPersonalizado} onChange={e=>setPaisPersonalizado(e.target.value)} autoFocus />
                          </div>
                        ) : (
                          <select className="sx-select" value={paisDocumento} onChange={e=>setPaisDocumento(e.target.value)} style={{cursor:'pointer'}}>
                            {paises.map(p=><option key={p} value={p}>{p}</option>)}
                          </select>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="sx-field">
                      <AnimatedLabel htmlFor="documento">
                        {rol === 'alumno' ? 'Nro. de Documento' : 'Email institucional'}
                      </AnimatedLabel>
                      <div className="sx-input-wrap">
                        <svg className="sx-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          {rol==='alumno'
                            ? <><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></>
                            : <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>
                          }
                        </svg>
                        <input id="documento" className="sx-input"
                          type={rol==='alumno'?'text':'email'}
                          placeholder={rol==='alumno' ? '12345678' : 'profesor@uca.edu.py'}
                          value={documento} onChange={e=>setDoc(e.target.value)} autoComplete="username" />
                      </div>
                    </div>
                  )}

                  <div className="sx-field">
                    <div className="sx-field-header">
                      <AnimatedLabel htmlFor="password">Contraseña</AnimatedLabel>
                      <button type="button" className="sx-forgot" onClick={()=>{ setShowRecuperar(true); setRecEmail(''); setRecError(''); setRecEnviado(false) }} style={{background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:11,color:'var(--accent)',textDecoration:'none'}}>¿Olvidaste tu contraseña?</button>
                    </div>
                    <div className="sx-input-wrap">
                      <svg className="sx-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                      </svg>
                      <input id="password" className="sx-input" type={showPass?'text':'password'} placeholder="Tu contraseña" value={password} onChange={e=>setPass(e.target.value)} style={{paddingRight:38}} autoComplete="current-password" />
                      <button type="button" className="sx-pw-toggle" onClick={()=>setShow(!showPass)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          {showPass
                            ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                            : <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                          }
                        </svg>
                      </button>
                    </div>
                  </div>

                  {!showDocExtranjero && (
                    <div className="sx-demo">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      <p>
                        <strong>Alumno:</strong> 12345678 · Alumno1234! &nbsp;
                        <strong>Profesor:</strong> prof@uca.edu.py · Profesor1234!
                      </p>
                    </div>
                  )}

                  <button className="sx-btn-primary" type="submit" disabled={loading} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                    {loading ? (
                      <>
                        <svg style={{animation:'spin .8s linear infinite',flexShrink:0}} width="15" height="15" viewBox="0 0 24 24" fill="none">
                          <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
                          <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,.3)" strokeWidth="3"/>
                          <path d="M12 2a10 10 0 0110 10" stroke="#000" strokeWidth="3" strokeLinecap="round"/>
                        </svg>
                        Ingresando...
                      </>
                    ) : `Ingresar como ${rol === 'alumno' ? 'alumno' : 'profesor'}`}
                  </button>
                </form>

                <div className="sx-divider"><span>o acceder con</span></div>

                <div className="sx-alt-row">
                  {rol === 'alumno' && (
                    <button
                      className={`sx-btn-alt${showDocExtranjero?' active':''}`}
                      onClick={()=>{ setDocExtranjero(!showDocExtranjero); setDoc(''); setError('') }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                      </svg>
                      {showDocExtranjero ? 'Cancelar' : 'Doc. extranjero'}
                    </button>
                  )}
                  <button className="sx-btn-alt" onClick={()=>setSoporte(true)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 2H3v16h5l4 4 4-4h5V2z"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="11" y2="13"/>
                    </svg>
                    Soporte
                  </button>
                </div>

                <div className="sx-switch">
                  ¿No tenés cuenta?{' '}
                  <a onClick={()=>{setTab('registro');setError('');setDocExtranjero(false)}}>Registrarme</a>
                </div>
              </motion.div>
            )}

            {/* ── REGISTRO ── */}
            {tab === 'registro' && (
              <motion.div key="registro" initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{duration:0.4,ease:'easeOut'}} style={{width:'100%'}}>
                <div className="sx-form-title">Crear cuenta</div>
                <div className="sx-form-sub">Completá tus datos para registrarte</div>

                {error && <div className="sx-error">{error}</div>}

                <form onSubmit={handleRegistro} style={{width:'100%'}}>
                  {showDocExtranjero ? (
                    <>
                      <div className="sx-ext-banner">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                        </svg>
                        Registro con documento extranjero
                      </div>
                      <div className="sx-field">
                        <AnimatedLabel htmlFor="tipo-doc-reg">Tipo de Documento</AnimatedLabel>
                        <select className="sx-select" value={tipoDocumento} onChange={e=>setTipoDocumento(e.target.value)} style={{cursor:'pointer'}}>
                          {tiposDocExtranjero.map(t=><option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="sx-field">
                        <AnimatedLabel htmlFor="reg-doc-num">Número de Documento</AnimatedLabel>
                        <div className="sx-input-wrap">
                          <svg className="sx-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
                          </svg>
                          <input id="reg-doc-num" className="sx-input" type="text" placeholder="Nro. de documento" value={documento} onChange={e=>setDoc(e.target.value)} />
                        </div>
                      </div>
                      <div className="sx-field">
                        <div className="sx-field-header">
                          <AnimatedLabel htmlFor="reg-pais">País de Emisión</AnimatedLabel>
                          {paisDocumento === 'Otro' && (
                            <button type="button" onClick={()=>{ setPaisDocumento('Paraguay'); setPaisPersonalizado('') }} style={{ fontSize:11, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', textDecoration:'underline', textUnderlineOffset:2 }}>
                              ← Ver lista
                            </button>
                          )}
                        </div>
                        {paisDocumento === 'Otro' ? (
                          <div className="sx-input-wrap">
                            <svg className="sx-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                            </svg>
                            <input id="reg-pais" className="sx-input" type="text" placeholder="Escribí el país" value={paisPersonalizado} onChange={e=>setPaisPersonalizado(e.target.value)} autoFocus />
                          </div>
                        ) : (
                          <select className="sx-select" value={paisDocumento} onChange={e=>setPaisDocumento(e.target.value)} style={{cursor:'pointer'}}>
                            {paises.map(p=><option key={p} value={p}>{p}</option>)}
                          </select>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="sx-field">
                      <AnimatedLabel htmlFor="reg-doc">Nro. de Documento</AnimatedLabel>
                      <div className="sx-input-wrap">
                        <svg className="sx-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
                        </svg>
                        <input id="reg-doc" className="sx-input" type="text" placeholder="ej. 12345678" value={documento} onChange={e=>setDoc(e.target.value)} />
                      </div>
                    </div>
                  )}

                  <div className="sx-field">
                    <AnimatedLabel htmlFor="reg-mat">Matrícula</AnimatedLabel>
                    <div className="sx-input-wrap">
                      <svg className="sx-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
                      </svg>
                      <input id="reg-mat" className="sx-input" type="text" placeholder="Tu matrícula" value={matricula} onChange={e=>setMat(e.target.value)} />
                    </div>
                  </div>

                  <button className="sx-btn-primary" type="submit" disabled={loading}>
                    {loading ? (
                      <span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                        <svg style={{animation:'spin .8s linear infinite',flexShrink:0}} width="15" height="15" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,.3)" strokeWidth="3"/>
                          <path d="M12 2a10 10 0 0110 10" stroke="#000" strokeWidth="3" strokeLinecap="round"/>
                        </svg>
                        Procesando...
                      </span>
                    ) : 'Registrarme'}
                  </button>
                </form>

                <div className="sx-divider"><span>o registrarse con</span></div>

                <div className="sx-alt-row" style={{marginBottom:0}}>
                  {rol === 'alumno' && (
                    <button
                      className={`sx-btn-alt${showDocExtranjero?' active':''}`}
                      type="button"
                      onClick={()=>{ setDocExtranjero(!showDocExtranjero); setDoc(''); setError('') }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                      </svg>
                      {showDocExtranjero ? 'Cancelar' : 'Doc. extranjero'}
                    </button>
                  )}
                  <button className="sx-btn-alt" type="button" onClick={()=>setSoporte(true)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 2H3v16h5l4 4 4-4h5V2z"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="11" y2="13"/>
                    </svg>
                    Soporte
                  </button>
                </div>

                <div className="sx-switch">
                  ¿Ya tenés cuenta?{' '}
                  <a onClick={()=>{setTab('login');setError('');setDocExtranjero(false)}}>Iniciar sesión</a>
                </div>
              </motion.div>
            )}

            <div className="sx-footer" />
          </div>

          <div className="pr-footer">
            Sistema de gestión académica · UCA 2026
            <span style={{ display:'inline-block', marginLeft:14, paddingLeft:14, borderLeft:'1px solid #1e2d3d' }}>
              <button onClick={()=>navigate('/admin')} style={{ background:'none', border:'none', color:'#506070', cursor:'pointer', fontSize:11, fontFamily:'inherit', textDecoration:'underline', textUnderlineOffset:2 }}>Acceso administradores</button>
            </span>
          </div>
        </div>
      </div>

      {/* ── MODAL RECUPERAR CONTRASEÑA ── */}
      {showRecuperar && (
        <div className="modal-backdrop" onClick={()=>setShowRecuperar(false)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <button className="modal-close" onClick={()=>setShowRecuperar(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            {recEnviado ? (
              <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} transition={{duration:0.3}}>
                <div className="modal-title">Revisá tu correo</div>
                <div className="modal-sub">Si el usuario existe, recibirás un email con tu nueva contraseña.</div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:'16px 0',color:'#34d399'}}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                  </svg>
                </div>
                <button className="sx-btn-primary" style={{background:'var(--accent)',height:40}} onClick={()=>setShowRecuperar(false)}>
                  Entendido
                </button>
              </motion.div>
            ) : (
              <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.3}}>
                <div className="modal-title">Restablecer contraseña</div>
                <div className="modal-sub">Ingresá tu documento de identidad o email institucional.</div>

                {recError && (
                  <div className="sx-error" style={{marginBottom:12}}>{recError}</div>
                )}

                <form onSubmit={handleRecuperar}>
                  <div className="modal-field">
                    <label className="modal-label">Documento o Email</label>
                    <div className="modal-input-wrap">
                      <svg className="modal-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
                      </svg>
                      <input className="modal-input" type="text" placeholder="ej. 12345678 o email@uca.edu.py"
                        value={recEmail} onChange={e=>setRecEmail(e.target.value)} autoFocus />
                    </div>
                  </div>
                  <button className="sx-btn-primary" type="submit" disabled={recLoading} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,height:40}}>
                    {recLoading ? (
                      <>
                        <svg style={{animation:'spin .8s linear infinite',flexShrink:0}} width="15" height="15" viewBox="0 0 24 24" fill="none">
                          <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
                          <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,.3)" strokeWidth="3"/>
                          <path d="M12 2a10 10 0 0110 10" stroke="#000" strokeWidth="3" strokeLinecap="round"/>
                        </svg>
                        Enviando...
                      </>
                    ) : 'Enviar instrucciones'}
                  </button>
                </form>

                <div style={{textAlign:'center',marginTop:14,fontSize:11,color:'var(--text-3)'}}>
                  ¿No tenés acceso a tu correo?{' '}
                  <a onClick={()=>{setShowRecuperar(false);setSoporte(true)}} style={{color:'var(--accent)',cursor:'pointer',textDecoration:'underline',textUnderlineOffset:2}}>Contactá a soporte</a>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL SOPORTE ── */}
      {showSoporte && (
        <div className="modal-backdrop" onClick={()=>setSoporte(false)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <button className="modal-close" onClick={()=>setSoporte(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <div className="modal-title">Centro de Soporte</div>
            <div className="modal-sub">Universidad Católica — Unidad Pedagógica de Caacupé</div>
            <a href="https://wa.me/595512435838" target="_blank" rel="noopener noreferrer" className="modal-wa-btn">
              <WaIcon size={18} /> Contactar por WhatsApp
            </a>
            <div className="modal-field">
              <label className="modal-label">Nombre</label>
              <div className="modal-input-wrap">
                <svg className="modal-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <input className="modal-input" type="text" placeholder="Tu nombre" />
              </div>
            </div>
            <div className="modal-field">
              <label className="modal-label">Correo electrónico</label>
              <div className="modal-input-wrap">
                <svg className="modal-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
                <input className="modal-input" type="email" placeholder="tucorreo@ejemplo.com" />
              </div>
            </div>
            <div className="modal-field">
              <label className="modal-label">Describí tu problema</label>
              <div className="modal-input-wrap">
                <svg className="modal-textarea-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
                <textarea className="modal-textarea" placeholder="Contanos en qué podemos ayudarte..." style={{paddingLeft:34}} />
              </div>
            </div>
            <div className="modal-send-row">
              <button className="modal-btn-email" onClick={()=>window.location.href='mailto:soporte@uca.edu.py'}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
                Enviar por Email
              </button>
              <a href="https://wa.me/595512435838" target="_blank" rel="noopener noreferrer" className="modal-btn-wa2">
                <WaIcon size={14} /> Enviar por WhatsApp
              </a>
            </div>
            <div className="modal-contact-bar">
              <div className="modal-contact-item">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00b4d8" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.06 2.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>
                </svg>
                <a href="tel:+59521243583">0511 24 35 83</a>
              </div>
              <div className="modal-contact-item">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00b4d8" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
                <a href="mailto:soporte@uca.edu.py">soporte@uca.edu.py</a>
              </div>
              <div className="modal-contact-item">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8fa3b8" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>Lun–Vie 07:00–20:00</span>
              </div>
              <div className="modal-contact-item">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8fa3b8" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                <span>Caacupé, Paraguay</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
