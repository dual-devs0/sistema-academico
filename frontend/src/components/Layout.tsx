import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { getRole, getUsername } from '../hooks/useRole'
import { api } from '../lib/api'
import logoUCA from '../assets/uc_logo_sist_academico.png'

type MenuItem = { label: string; path: string; icon: string; group?: string }

// ─── Íconos custom (reemplazan Tabler en Graduación/Equivalencias) ──────────

export function GraduationCapIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      {/* Birrete */}
      <path d="M11.5 3 3.5 6.7l8 3.7 8-3.7-8-3.7z" />
      <path d="M6.2 5.8 9 7.1" />
      <path d="M15.8 8.4v3.4c0 1.2-2 2.3-4.3 2.3-1 0-1.9-.2-2.6-.5" />
      <path d="M17.8 8.4v3.6" />
      <rect x="16.9" y="12" width="1.8" height="1.4" rx="0.4" />
      {/* Diploma con sello */}
      <path d="M4.2 9.6 2.2 15.4c-.15.45.15.9.6.9l1.9-.35" />
      <path d="M4.2 9.6l3.6 1.8c.9.45 1.9.6 2.85.4" />
      <path d="M4.7 16 3.9 19.5l1.6-1.1 1 1.7 1.2-3.3" />
      <circle cx="8.6" cy="14.4" r="2.1" />
      <circle cx="8.6" cy="14.4" r="0.9" />
    </svg>
  )
}

function HandChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <circle cx="14" cy="8" r="6" />
      <path d="M14 2v6h6M14 8 9.5 12.5M14 8l-2 5" />
      <path d="M2 20l3-3h4l4 1.4c1 .3 2-.4 1.6-1.4-.2-.6-.7-1-1.3-1.2L9 14.2H6.5L4 16.5" />
    </svg>
  )
}

export function GraduationNetworkIcon({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className="gni-anim">
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <circle cx="4" cy="4" r="2" />
        <path d="M2.2 8.6a2.6 2.6 0 0 1 3.6 0" />
        <circle cx="20" cy="4" r="2" />
        <path d="M18.2 8.6a2.6 2.6 0 0 1 3.6 0" />
        <circle cx="4" cy="20" r="2" />
        <path d="M2.2 15.4a2.6 2.6 0 0 0 3.6 0" />
        <circle cx="20" cy="20" r="2" />
        <path d="M18.2 15.4a2.6 2.6 0 0 0 3.6 0" />
      </g>
      <g className="gni-arcs" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.85">
        <path d="M8.5 4.2h7" />
        <path d="M8.5 19.8h7" />
        <path d="M3.6 8.6v6.8" />
        <path d="M20.4 8.6v6.8" />
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8.5 6.5 11l5.5 2.5 5.5-2.5z" />
        <path d="M9 12.3v2.4c0 1 1.3 1.8 3 1.8s3-.8 3-1.8v-2.4" />
      </g>
    </svg>
  )
}

const iconOverride: Record<string, React.ComponentType<{ size?: number }>> = {
  '/mi-graduacion': GraduationCapIcon,
  '/graduacion-admin': GraduationCapIcon,
  '/mis-equivalencias': HandChartIcon,
  '/equivalencias-admin': HandChartIcon,
}

// ─── Menús por rol, agrupados en secciones (PRINCIPAL/ACADÉMICO/RECURSOS/TRÁMITES) ──

const menuAlumno: MenuItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'ti-layout-dashboard', group: 'Principal' },
  { label: 'Calendario', path: '/calendario', icon: 'ti-calendar', group: 'Principal' },

  { label: 'Cursos', path: '/programa', icon: 'ti-school', group: 'Académico' },
  { label: 'Boleta', path: '/boleta', icon: 'ti-file-text', group: 'Académico' },
  { label: 'Inscripción', path: '/inscripciones', icon: 'ti-clipboard-list', group: 'Académico' },
  { label: 'Mi Progreso', path: '/malla', icon: 'ti-hierarchy-3', group: 'Académico' },
  { label: 'Expediente', path: '/expediente', icon: 'ti-file-certificate', group: 'Académico' },
  { label: 'Graduación', path: '/mi-graduacion', icon: 'ti-graduation-cap', group: 'Académico' },
  { label: 'Equivalencias', path: '/mis-equivalencias', icon: 'ti-shuffle', group: 'Académico' },

  { label: 'Biblioteca', path: '/biblioteca', icon: 'ti-books', group: 'Recursos' },
  { label: 'Becas', path: '/mis-becas', icon: 'ti-receipt-2', group: 'Recursos' },
  { label: 'Pasantías', path: '/mis-pasantias', icon: 'ti-briefcase', group: 'Recursos' },

  { label: 'Mis Cuotas', path: '/mis-cuotas', icon: 'ti-coin', group: 'Trámites' },
  { label: 'Trámites', path: '/tramites', icon: 'ti-file-description', group: 'Trámites' },

  { label: 'Ajustes', path: '/perfil', icon: 'ti-settings' },
]

const menuProfesor: MenuItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'ti-layout-dashboard', group: 'Principal' },
  { label: 'Calendario', path: '/calendario', icon: 'ti-calendar', group: 'Principal' },
  { label: 'Asistencia', path: '/asistencia', icon: 'ti-qrcode', group: 'Principal' },

  { label: 'Mis Materias', path: '/mis-materias', icon: 'ti-book-2', group: 'Académico' },
  { label: 'Calificaciones', path: '/puntajes', icon: 'ti-certificate', group: 'Académico' },
  { label: 'Estadísticas', path: '/estadisticas', icon: 'ti-chart-pie', group: 'Académico' },

  { label: 'Biblioteca', path: '/biblioteca', icon: 'ti-books', group: 'Recursos' },

  { label: 'Ajustes', path: '/perfil', icon: 'ti-settings' },
]

const menuAdmin: MenuItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'ti-layout-dashboard', group: 'Principal' },
  { label: 'Calendario', path: '/calendario', icon: 'ti-calendar', group: 'Principal' },
  { label: 'Usuarios & Roles', path: '/usuarios', icon: 'ti-users', group: 'Principal' },
  { label: 'Asignaciones', path: '/gestion-asignaciones', icon: 'ti-binary-tree', group: 'Principal' },

  { label: 'Calificaciones', path: '/puntajes', icon: 'ti-certificate', group: 'Académico' },
  { label: 'Inscripciones', path: '/inscripciones', icon: 'ti-clipboard-list', group: 'Académico' },
  { label: 'Malla Curricular', path: '/malla', icon: 'ti-hierarchy-3', group: 'Académico' },
  { label: 'Expediente', path: '/expediente', icon: 'ti-file-certificate', group: 'Académico' },
  { label: 'Graduación', path: '/graduacion-admin', icon: 'ti-graduation-cap', group: 'Académico' },
  { label: 'Equivalencias', path: '/equivalencias-admin', icon: 'ti-shuffle', group: 'Académico' },

  { label: 'Pasantías', path: '/pasantias-admin', icon: 'ti-briefcase', group: 'Recursos' },
  { label: 'Reportes', path: '/reportes', icon: 'ti-report', group: 'Recursos' },
  { label: 'Estadísticas', path: '/estadisticas', icon: 'ti-chart-bar', group: 'Recursos' },

  { label: 'Finanzas', path: '/finanzas', icon: 'ti-coin', group: 'Trámites' },
  { label: 'Trámites', path: '/tramites', icon: 'ti-file-description', group: 'Trámites' },

  { label: 'Ajustes Globales', path: '/ajustes-globales', icon: 'ti-settings' },
]

const bottomNavByRole: Record<string, MenuItem[]> = {
  alumno: [
    { label: 'Inicio', path: '/dashboard', icon: 'ti-layout-dashboard' },
    { label: 'Cursos', path: '/programa', icon: 'ti-school' },
    { label: 'QR', path: '/asistencia/scan', icon: 'ti-qrcode' },
    { label: 'Calendario', path: '/calendario', icon: 'ti-calendar-event' },
    { label: 'Ajustes', path: '/perfil', icon: 'ti-settings' },
  ],
  profesor: [
    { label: 'Inicio', path: '/dashboard', icon: 'ti-layout-dashboard' },
    { label: 'Materias', path: '/mis-materias', icon: 'ti-book-2' },
    { label: 'QR', path: '/asistencia', icon: 'ti-qrcode' },
    { label: 'Notas', path: '/puntajes', icon: 'ti-certificate' },
    { label: 'Ajustes', path: '/perfil', icon: 'ti-settings' },
  ],
  admin: [
    { label: 'Inicio', path: '/dashboard', icon: 'ti-layout-dashboard' },
    { label: 'Usuarios', path: '/usuarios', icon: 'ti-users' },
    { label: 'Asignaciones', path: '/gestion-asignaciones', icon: 'ti-binary-tree' },
    { label: 'Reportes', path: '/reportes', icon: 'ti-report' },
    { label: 'Ajustes', path: '/perfil', icon: 'ti-settings' },
  ],
}

const roleLabel: Record<string, string> = {
  alumno: 'Estudiante',
  profesor: 'Profesor',
  admin: 'Admin Senior',
}

function getMenuPorRol(rol: string | null): MenuItem[] {
  if (rol === 'admin') return menuAdmin
  if (rol === 'profesor') return menuProfesor
  return menuAlumno
}

type EventoNotif = { id?: number; titulo: string; tipo: string; fecha: string }

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [appsOpen, setAppsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [proximos, setProximos] = useState<EventoNotif[]>([])
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const appsRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const location = useLocation()

  const role = getRole()
  const username = getUsername()
  const menuItems = getMenuPorRol(role)
  const bottomNav = bottomNavByRole[role ?? 'alumno']

  useEffect(() => {
    document.title = 'Universidad Católica Caacupé'
  }, [])

  useEffect(() => {
    const onHelp = () => setHelpOpen(true)
    window.addEventListener('uca:help', onHelp)
    return () => window.removeEventListener('uca:help', onHelp)
  }, [])

  useEffect(() => {
    api.get<{ foto_url: string | null }>('/users/me').then(d => { if (d.foto_url) setFotoUrl(d.foto_url) }).catch(() => {})
    const onAvatar = (e: Event) => setFotoUrl((e as CustomEvent).detail?.url ?? null)
    window.addEventListener('uca:avatar', onAvatar)
    return () => window.removeEventListener('uca:avatar', onAvatar)
  }, [])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
      if (appsRef.current && !appsRef.current.contains(e.target as Node)) setAppsOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function abrirNotif() {
    setNotifOpen(v => !v)
    setAppsOpen(false)
    if (!notifOpen) {
      const hoy = new Date().toISOString().slice(0, 10)
      api.get<EventoNotif[]>('/eventos/').then(evs => {
        setProximos(evs.filter(e => e.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 4))
      }).catch(() => {})
    }
  }

  useEffect(() => {
    if (role) document.body.setAttribute('data-role', role)
    return () => { document.body.removeAttribute('data-role') }
  }, [role])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const logout = async () => {
    const wasAdmin = role === 'admin'
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {
      // ignorar errores de red — el cliente limpia igual
    }
    sessionStorage.clear()
    // Limpiar token en memoria
    const { setAccessToken } = await import('../lib/api')
    setAccessToken(null)
    navigate(wasAdmin ? '/admin' : '/login')
  }

  return (
    <>
      <style>{`
        .nav-scroll { scrollbar-width: thin; scrollbar-color: transparent transparent; overscroll-behavior: contain; }
        .nav-scroll::-webkit-scrollbar { width: 4px; }
        .nav-scroll::-webkit-scrollbar-thumb { background: transparent; border-radius: 4px; }
        .nav-scroll:hover { scrollbar-color: var(--bg-hover) transparent; }
        .nav-scroll:hover::-webkit-scrollbar-thumb { background: var(--bg-hover); }
        .layout-content-scroll { overscroll-behavior: contain; }

        .sidebar-header {
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          padding: 20px 16px 16px; flex-shrink: 0;
        }
        .sidebar-logo { width: 160px; height: auto; object-fit: contain; display: block; }
        .sidebar-title {
          font-size: 15px; font-weight: 700; color: #fff;
          text-align: center; line-height: 1.2; letter-spacing: -0.01em;
        }

        .layout-sidebar {
          width: 216px; height: 100%;
          background: #0e1015; border-right: 1px solid var(--border-subtle);
          display: flex; flex-direction: column; flex-shrink: 0; overflow: hidden;
        }
        .layout-topbar {
          height: 58px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; padding: 0 22px;
          background: #0e1015; border-bottom: 1px solid var(--border-subtle);
        }
        .layout-bottomnav { display: none; }
        .topbar-menu-btn { display: none; }

        .side-item {
          width: 100%; display: flex; align-items: center; gap: 11px;
          padding: 10px 12px; border-radius: 10px; border: none;
          cursor: pointer; margin-bottom: 3px;
          font-family: var(--font-mono); font-size: 11.5px; font-weight: 600;
          letter-spacing: 0.02em;
          background: transparent; color: var(--text-secondary);
          text-align: left; transition: all 150ms ease; white-space: nowrap;
        }
        .side-item:hover { background: var(--bg-hover); color: var(--text-primary); }
        .side-item.active {
          background: var(--accent-muted); color: var(--accent-bright);
          box-shadow: inset 2px 0 0 var(--accent);
        }
        .side-item i { font-size: 16px; flex-shrink: 0; }

        .side-group-label {
          font-family: var(--font-mono); font-size: 9.5px; font-weight: 700;
          letter-spacing: 0.08em; color: var(--text-muted);
          padding: 14px 12px 6px; text-transform: uppercase;
        }

        .gni-anim { animation: gni-breathe 3s ease-in-out infinite; transform-origin: center; }
        .gni-anim .gni-arcs { animation: gni-flow 2.4s ease-in-out infinite; transform-origin: center; }
        @keyframes gni-breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
        @keyframes gni-flow { 0%,100% { opacity: 0.45; } 50% { opacity: 1; } }

        @media (max-width: 768px) {
          .layout-root { display: block !important; }
          .layout-main { padding: 0 !important; width: 100% !important; max-width: 100vw !important; height: 100% !important; }
          .layout-main main { padding: 16px 12px 84px !important; width: 100% !important; box-sizing: border-box; }
          .topbar-menu-btn { display: flex !important; }
          .sidebar-header { padding: 16px 12px 12px; }
          .sidebar-logo { width: 140px; }
          .sidebar-title { font-size: 13px; }

          .layout-sidebar {
            position: fixed; top: 0; bottom: 0; left: 0;
            width: 262px; z-index: 100;
            transform: translateX(-100%);
            transition: transform 220ms ease;
          }
          .layout-sidebar.mobile-open { transform: translateX(0); }
          .layout-overlay {
            display: block; position: fixed; inset: 0; z-index: 99;
            background: rgba(0,0,0,0.6);
          }
          .layout-bottomnav {
            display: flex; position: fixed; bottom: 0; left: 0; right: 0; z-index: 90;
            height: 62px; background: #0e1015;
            border-top: 1px solid var(--border-subtle);
            justify-content: space-around; align-items: stretch;
            padding-bottom: env(safe-area-inset-bottom);
          }
          .layout-bottomnav-qr {
            width: 52px; height: 52px; border-radius: 50%; flex-shrink: 0;
            display: flex; align-items: center; justify-content: center;
            background: linear-gradient(135deg, var(--accent), var(--accent-bright));
            color: #fff; border: 4px solid #0e1015; cursor: pointer;
            transform: translateY(-16px); box-shadow: 0 6px 18px var(--accent-hover);
          }
          .layout-bottomnav-qr i { font-size: 22px; }
        }
      `}</style>

      <div className="layout-root" style={{ display: 'flex', background: 'var(--bg-base)', height: '100vh', overflow: 'hidden', fontFamily: 'var(--font-sans)' }}>

        {mobileOpen && <div className="layout-overlay" onClick={() => setMobileOpen(false)} />}

        {/* ── Sidebar ── */}
        <div className={`layout-sidebar${mobileOpen ? ' mobile-open' : ''}`}>
          {/* Logo */}
          <div className="sidebar-header">
            <img src={logoUCA} alt="Universidad Católica - Unidad Pedagógica de Caacupé" className="sidebar-logo" />
            <span className="sidebar-title">Sistema Académico</span>
          </div>

          {/* Usuario chip */}
          <div style={{ margin: '0 12px 14px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 12 }}>
            {fotoUrl ? (
              <img src={fotoUrl} alt={username} style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div className="avatar-initials" style={{ width: 34, height: 34, fontSize: 13 }}>
                {(username || '?').slice(0, 2)}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {username || 'Usuario'}
              </div>
              <div className="mono-label" style={{ fontSize: 9 }}>{roleLabel[role ?? 'alumno']}</div>
            </div>
          </div>

          {/* Nav */}
          <div className="nav-scroll" style={{ flex: 1, padding: '4px 12px', overflowY: 'auto' }}>
            {(() => {
              let lastGroup: string | undefined
              return menuItems.map(item => {
                const active = location.pathname === item.path
                const showHeader = item.group !== undefined && item.group !== lastGroup
                lastGroup = item.group
                const CustomIcon = iconOverride[item.path]
                return (
                  <div key={item.path}>
                    {showHeader && (
                      <div className="side-group-label">{item.group}</div>
                    )}
                    <button className={`side-item${active ? ' active' : ''}`}
                      onClick={() => { navigate(item.path); setMobileOpen(false) }}>
                      {CustomIcon ? <CustomIcon /> : <i className={`ti ${item.icon}`} aria-hidden="true" />}
                      <span>{item.label}</span>
                    </button>
                  </div>
                )
              })
            })()}
          </div>

          {/* Footer */}
          <div style={{ padding: '12px', flexShrink: 0 }}>
            {role !== 'admin' && (
              <button onClick={() => setHelpOpen(true)} className="btn-ghost" style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: 11, marginBottom: 8, background: 'var(--accent-muted)', color: 'var(--accent-bright)', border: '1px solid transparent' }}>
                <i className="ti ti-help" style={{ fontSize: 14 }} />
                Centro de Ayuda
              </button>
            )}
            <button onClick={() => setShowLogoutConfirm(true)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: 'transparent', fontFamily: 'var(--font-mono)',
                color: '#ef4444', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.10)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <i className="ti ti-logout" aria-hidden="true" style={{ fontSize: 14 }} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>

        {/* ── Main ── */}
        <div className="layout-main" style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Topbar */}
          <div className="layout-topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
              <button className="topbar-menu-btn btn-ghost" onClick={() => setMobileOpen(true)}
                style={{ padding: '6px 8px', borderRadius: 8, alignItems: 'center' }} aria-label="Abrir menú">
                <i className="ti ti-menu-2" style={{ fontSize: 17 }} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div ref={notifRef} style={{ position: 'relative' }}>
                <button className="btn-ghost" style={{ padding: '7px 9px', borderRadius: 10, background: 'transparent', border: 'none' }} aria-label="Notificaciones" onClick={abrirNotif}>
                  <i className="ti ti-bell" style={{ fontSize: 17 }} />
                </button>
                {notifOpen && (
                  <div className="card card-elevated" style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 300, padding: 0, overflow: 'hidden', zIndex: 300 }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', fontSize: 13, fontWeight: 800 }}>Próximos eventos</div>
                    {proximos.length === 0 ? (
                      <div style={{ padding: 16, fontSize: 12.5, color: 'var(--text-secondary)' }}>Sin eventos próximos.</div>
                    ) : proximos.map((e, i) => (
                      <button key={i} onClick={() => { setNotifOpen(false); navigate('/calendario') }}
                        style={{ width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between', gap: 10, padding: '10px 16px', border: 'none', borderBottom: i < proximos.length - 1 ? '1px solid var(--border-subtle)' : 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-primary)' }}
                        onMouseEnter={ev => { ev.currentTarget.style.background = 'var(--bg-hover)' }}
                        onMouseLeave={ev => { ev.currentTarget.style.background = 'transparent' }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600 }}>{e.titulo}</span>
                        <span className="mono-label" style={{ fontSize: 9, flexShrink: 0 }}>{e.fecha.slice(8, 10)}/{e.fecha.slice(5, 7)}</span>
                      </button>
                    ))}
                    <button onClick={() => { setNotifOpen(false); navigate('/calendario') }}
                      style={{ width: '100%', padding: '10px 16px', border: 'none', borderTop: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--accent-bright)', fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700, cursor: 'pointer' }}>
                      Ver calendario completo →
                    </button>
                  </div>
                )}
              </div>

              <div ref={appsRef} style={{ position: 'relative' }}>
                <button className="btn-ghost" style={{ padding: '7px 9px', borderRadius: 10, background: 'transparent', border: 'none' }} aria-label="Aplicaciones" onClick={() => { setAppsOpen(v => !v); setNotifOpen(false) }}>
                  <i className="ti ti-grid-dots" style={{ fontSize: 17 }} />
                </button>
                {appsOpen && (
                  <div className="card card-elevated" style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 240, padding: 14, zIndex: 300 }}>
                    <div className="mono-label" style={{ marginBottom: 10 }}>Acceso rápido</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                      {menuItems.map(item => {
                        const CustomIcon = iconOverride[item.path]
                        return (
                          <button key={item.path} onClick={() => { navigate(item.path); setAppsOpen(false) }}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '10px 4px', borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                            onMouseEnter={ev => { ev.currentTarget.style.color = 'var(--accent-bright)'; ev.currentTarget.style.borderColor = 'var(--accent-hover)' }}
                            onMouseLeave={ev => { ev.currentTarget.style.color = 'var(--text-secondary)'; ev.currentTarget.style.borderColor = 'var(--border-subtle)' }}>
                            {CustomIcon ? <CustomIcon size={18} /> : <i className={`ti ${item.icon}`} style={{ fontSize: 18 }} />}
                            <span style={{ fontSize: 9, fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>{item.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              <button className="btn-ghost" onClick={() => setHelpOpen(true)} aria-label="Ayuda"
                style={{ padding:'7px 9px', borderRadius:10, background:'transparent', border:'none' }}>
                <i className="ti ti-help" style={{ fontSize:17 }} />
              </button>

              <button onClick={() => navigate('/perfil')} aria-label="Perfil"
                className={fotoUrl ? '' : 'avatar-initials'}
                style={{ width: 34, height: 34, fontSize: 12, border: '1px solid var(--border-light)', cursor: 'pointer', borderRadius: '50%', overflow: 'hidden', padding: 0, background: 'none' }}>
                {fotoUrl ? <img src={fotoUrl} alt={username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (username || '?').slice(0, 2)}
              </button>
            </div>
          </div>

          <main className="layout-content-scroll" style={{ flex: 1, padding: 24, overflowY: 'auto', background: 'var(--bg-base)' }}>
            {children}
          </main>
        </div>

        {/* ── Bottom nav mobile ── */}
        <nav className="layout-bottomnav">
          {bottomNav.map(item => {
            const active = location.pathname === item.path
            if (item.icon === 'ti-qrcode') {
              return (
                <button key={item.path} onClick={() => navigate(item.path)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                  <span className="layout-bottomnav-qr"><i className={`ti ${item.icon}`} /></span>
                </button>
              )
            }
            return (
              <button key={item.path} onClick={() => navigate(item.path)}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: 2, border: 'none', background: 'transparent',
                  color: active ? 'var(--accent-bright)' : 'var(--text-muted)', cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                }}>
                <i className={`ti ${item.icon}`} style={{ fontSize: 20 }} />
                <span style={{ fontSize: 9, fontWeight: active ? 700 : 400 }}>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Modal confirmación cerrar sesión */}
      {showLogoutConfirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', backdropFilter:'blur(3px)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={() => setShowLogoutConfirm(false)}>
          <div className="card" style={{ maxWidth:340, textAlign:'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:36, marginBottom:12 }}><i className="ti ti-logout" style={{ color:'var(--danger)' }} /></div>
            <h3 style={{ fontSize:16, fontWeight:800, marginBottom:6 }}>Cerrar sesión</h3>
            <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:20, lineHeight:1.4 }}>
              ¿Estás seguro de que querés cerrar la sesión?
            </p>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button className="btn-ghost" onClick={() => setShowLogoutConfirm(false)} style={{ padding:'10px 22px', fontSize:12.5 }}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={logout} style={{ background:'var(--danger)', padding:'10px 22px', fontSize:12.5 }}>
                <i className="ti ti-logout" /> Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Centro de Ayuda — rediseñado con FAQ + accesos rápidos */}
      {helpOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', backdropFilter:'blur(4px)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={() => setHelpOpen(false)}>
          <div className="card" style={{ width:'100%', maxWidth:520, padding:0, overflow:'hidden' }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'18px 22px', borderBottom:'1px solid var(--border-subtle)' }}>
              <h3 style={{ fontSize:17, fontWeight:800, display:'flex', alignItems:'center', gap:8 }}>
                <i className="ti ti-help" style={{ color:'var(--accent-bright)' }} /> Centro de Ayuda
              </h3>
              <button onClick={() => setHelpOpen(false)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:4 }}>
                <i className="ti ti-x" style={{ fontSize:18 }} />
              </button>
            </div>

            <div style={{ padding:'18px 22px' }}>
              <p style={{ fontSize:12.5, color:'var(--text-secondary)', marginBottom:16 }}>
                Universidad Católica — Unidad Pedagógica de Caacupé
              </p>

              {/* Acciones rápidas */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:18 }}>
                <button onClick={() => { window.open('https://wa.me/595512435838', '_blank') }}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:12, border:'1px solid rgba(37,211,102,.2)', background:'rgba(37,211,102,.08)', cursor:'pointer', color:'var(--text-primary)', fontFamily:'inherit', fontSize:12.5, fontWeight:600, textAlign:'left' }}>
                  <i className="ti ti-brand-whatsapp" style={{ fontSize:20, color:'#25D366' }} />
                  <span>WhatsApp<br />Soporte directo</span>
                </button>
                <button onClick={() => { window.location.href = 'mailto:soporte@uca.edu.py' }}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:12, border:'1px solid var(--accent-hover)', background:'var(--accent-subtle)', cursor:'pointer', color:'var(--text-primary)', fontFamily:'inherit', fontSize:12.5, fontWeight:600, textAlign:'left' }}>
                  <i className="ti ti-mail" style={{ fontSize:20, color:'var(--accent-bright)' }} />
                  <span>Correo<br />soporte@uca.edu.py</span>
                </button>
                <button onClick={() => { setHelpOpen(false); navigate('/perfil') }}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:12, border:'1px solid var(--border-subtle)', background:'var(--bg-elevated)', cursor:'pointer', color:'var(--text-primary)', fontFamily:'inherit', fontSize:12.5, fontWeight:600, textAlign:'left' }}>
                  <i className="ti ti-user" style={{ fontSize:20, color:'var(--text-secondary)' }} />
                  <span>Mi Perfil<br />Datos personales</span>
                </button>
                <button onClick={() => { window.open('https://wa.me/595512435838?text=Necesito%20ayuda%20con%20el%20sistema%20académico', '_blank') }}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:12, border:'1px solid var(--warning-subtle)', background:'rgba(245,158,11,.08)', cursor:'pointer', color:'var(--text-primary)', fontFamily:'inherit', fontSize:12.5, fontWeight:600, textAlign:'left' }}>
                  <i className="ti ti-bug" style={{ fontSize:20, color:'var(--warning)' }} />
                  <span>Reportar<br />un problema</span>
                </button>
              </div>

              {/* FAQ */}
              <details style={{ marginBottom:8 }}>
                <summary style={{ cursor:'pointer', fontSize:13, fontWeight:700, color:'var(--text-primary)', padding:'8px 0', listStyle:'none', display:'flex', alignItems:'center', gap:8 }}>
                  <i className="ti ti-question-mark" style={{ fontSize:14, color:'var(--accent-bright)' }} /> Preguntas frecuentes
                  <i className="ti ti-chevron-down" style={{ marginLeft:'auto', fontSize:14, color:'var(--text-muted)', transition:'transform .2s' }} />
                </summary>
                <div style={{ padding:'4px 0 8px 22px', display:'flex', flexDirection:'column', gap:10 }}>
                  {[
                    { q:'¿Cómo me inscribo a materias?', a:'Desde el menú Inscripciones podés inscribirte a las materias disponibles del período actual.' },
                    { q:'¿Dónde veo mis notas?', a:'Tus calificaciones están disponibles en el módulo Calificaciones del menú principal.' },
                    { q:'¿Cómo recupero mi contraseña?', a:'Usá la opción "¿Olvidaste tu contraseña?" en la pantalla de inicio de sesión.' },
                    { q:'¿Qué hago si no cargo un pago?', a:'Comunicate con administración por WhatsApp o correo electrónico.' },
                  ].map((faq, i) => (
                    <div key={i}>
                      <div style={{ fontSize:12.5, fontWeight:600, color:'var(--text-primary)', marginBottom:2 }}>{faq.q}</div>
                      <div style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.4 }}>{faq.a}</div>
                    </div>
                  ))}
                </div>
              </details>

              {/* Contacto directo */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10, paddingTop:14, borderTop:'1px solid var(--border-subtle)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12.5 }}>
                  <i className="ti ti-phone" style={{ color:'var(--accent-bright)' }} />
                  <a href="tel:+59521243583" style={{ color:'var(--text-primary)', textDecoration:'none' }}>0511 24 35 83</a>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12.5, color:'var(--text-secondary)' }}>
                  <i className="ti ti-clock" /> Lun–Vie 07:00–20:00
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
