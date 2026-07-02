import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getRole, getUsername } from '../hooks/useRole'

type MenuItem = { label: string; path: string; icon: string }

// ─── Menús por rol (estilo capturas: lista corta) ───────────────────────────

const menuAlumno: MenuItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'ti-layout-dashboard' },
  { label: 'Cursos', path: '/programa', icon: 'ti-school' },
  { label: 'Expediente', path: '/puntajes', icon: 'ti-certificate' },
  { label: 'Inscripción', path: '/inscripciones', icon: 'ti-clipboard-list' },
  { label: 'Asistencia', path: '/asistencia', icon: 'ti-qrcode' },
  { label: 'Biblioteca', path: '/biblioteca', icon: 'ti-books' },
  { label: 'Calendario', path: '/calendario', icon: 'ti-calendar' },
  { label: 'Boleta', path: '/boleta', icon: 'ti-file-text' },
  { label: 'Ajustes', path: '/perfil', icon: 'ti-settings' },
]

const menuProfesor: MenuItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'ti-layout-dashboard' },
  { label: 'Cursos', path: '/miscursos', icon: 'ti-school' },
  { label: 'Calificaciones', path: '/puntajes', icon: 'ti-certificate' },
  { label: 'Asistencia', path: '/asistencia', icon: 'ti-qrcode' },
  { label: 'Materias', path: '/materias', icon: 'ti-book' },
  { label: 'Estadísticas', path: '/estadisticas', icon: 'ti-chart-pie' },
  { label: 'Calendario', path: '/calendario', icon: 'ti-calendar' },
  { label: 'Biblioteca', path: '/biblioteca', icon: 'ti-books' },
  { label: 'Ajustes', path: '/perfil', icon: 'ti-settings' },
]

const menuAdmin: MenuItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'ti-layout-dashboard' },
  { label: 'Gestión Académica', path: '/materias', icon: 'ti-school' },
  { label: 'Usuarios & Roles', path: '/usuarios', icon: 'ti-users' },
  { label: 'Inscripciones', path: '/inscripciones', icon: 'ti-clipboard-list' },
  { label: 'Calificaciones', path: '/puntajes', icon: 'ti-certificate' },
  { label: 'Reportes', path: '/reportes', icon: 'ti-report' },
  { label: 'Estadísticas', path: '/estadisticas', icon: 'ti-chart-bar' },
  { label: 'Calendario', path: '/calendario', icon: 'ti-calendar' },
  { label: 'Ajustes Globales', path: '/perfil', icon: 'ti-settings' },
]

const bottomNavByRole: Record<string, MenuItem[]> = {
  alumno: [
    { label: 'Inicio', path: '/dashboard', icon: 'ti-layout-dashboard' },
    { label: 'Cursos', path: '/programa', icon: 'ti-school' },
    { label: 'QR', path: '/asistencia/scan', icon: 'ti-qrcode' },
    { label: 'Expediente', path: '/puntajes', icon: 'ti-certificate' },
    { label: 'Ajustes', path: '/perfil', icon: 'ti-settings' },
  ],
  profesor: [
    { label: 'Inicio', path: '/dashboard', icon: 'ti-layout-dashboard' },
    { label: 'Cursos', path: '/miscursos', icon: 'ti-school' },
    { label: 'QR', path: '/asistencia', icon: 'ti-qrcode' },
    { label: 'Notas', path: '/puntajes', icon: 'ti-certificate' },
    { label: 'Ajustes', path: '/perfil', icon: 'ti-settings' },
  ],
  admin: [
    { label: 'Inicio', path: '/dashboard', icon: 'ti-layout-dashboard' },
    { label: 'Usuarios', path: '/usuarios', icon: 'ti-users' },
    { label: 'Materias', path: '/materias', icon: 'ti-book' },
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

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
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
    if (role) document.body.setAttribute('data-role', role)
    return () => { document.body.removeAttribute('data-role') }
  }, [role])

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const logout = () => {
    const wasAdmin = role === 'admin'
    sessionStorage.clear()
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
        .topbar-search { display: flex; }
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

        @media (max-width: 768px) {
          .layout-root { display: block !important; }
          .layout-main { padding: 0 !important; width: 100% !important; max-width: 100vw !important; height: 100% !important; }
          .layout-main main { padding: 16px 12px 84px !important; width: 100% !important; box-sizing: border-box; }
          .topbar-search { display: none; }
          .topbar-menu-btn { display: flex !important; }

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
        }
      `}</style>

      <div className="layout-root" style={{ display: 'flex', background: 'var(--bg-base)', height: '100vh', overflow: 'hidden', fontFamily: 'var(--font-sans)' }}>

        {mobileOpen && <div className="layout-overlay" onClick={() => setMobileOpen(false)} />}

        {/* ── Sidebar ── */}
        <div className={`layout-sidebar${mobileOpen ? ' mobile-open' : ''}`}>
          {/* Logo */}
          <div style={{ padding: '20px 18px 16px' }}>
            <span style={{ fontSize: 21, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>
              UCA V2
            </span>
          </div>

          {/* Usuario chip */}
          <div style={{ margin: '0 12px 14px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 12 }}>
            <div className="avatar-initials" style={{ width: 34, height: 34, fontSize: 13 }}>
              {(username || '?').slice(0, 2)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {username || 'Usuario'}
              </div>
              <div className="mono-label" style={{ fontSize: 9 }}>{roleLabel[role ?? 'alumno']}</div>
            </div>
          </div>

          {/* Nav */}
          <div className="nav-scroll" style={{ flex: 1, padding: '4px 12px', overflowY: 'auto' }}>
            {menuItems.map(item => {
              const active = location.pathname === item.path
              return (
                <button key={item.path} className={`side-item${active ? ' active' : ''}`}
                  onClick={() => { navigate(item.path); setMobileOpen(false) }}>
                  <i className={`ti ${item.icon}`} aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div style={{ padding: '12px', flexShrink: 0 }}>
            <button className="btn-ghost" style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: 11, marginBottom: 8, background: 'var(--accent-muted)', color: 'var(--accent-bright)', border: '1px solid transparent' }}>
              <i className="ti ti-help" style={{ fontSize: 14 }} />
              Centro de Ayuda
            </button>
            <button onClick={logout}
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
              <div className="topbar-search" style={{ position: 'relative', width: 'min(300px, 40vw)' }}>
                <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--text-muted)' }} />
                <input className="input-uca" placeholder="Buscar recursos..."
                  style={{ padding: '8px 12px 8px 34px', fontSize: 13, background: 'var(--bg-surface)', borderRadius: 999 }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="btn-ghost" style={{ padding: '7px 9px', borderRadius: 10, background: 'transparent', border: 'none' }} aria-label="Notificaciones">
                <i className="ti ti-bell" style={{ fontSize: 17 }} />
              </button>
              <button className="btn-ghost" style={{ padding: '7px 9px', borderRadius: 10, background: 'transparent', border: 'none' }} aria-label="Aplicaciones">
                <i className="ti ti-grid-dots" style={{ fontSize: 17 }} />
              </button>
              <button onClick={() => navigate('/perfil')} aria-label="Perfil"
                className="avatar-initials"
                style={{ width: 34, height: 34, fontSize: 12, border: '1px solid var(--border-light)', cursor: 'pointer' }}>
                {(username || '?').slice(0, 2)}
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
    </>
  )
}
