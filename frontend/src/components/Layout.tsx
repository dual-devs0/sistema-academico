import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getRole, getUsername } from '../hooks/useRole'

type MenuItem = { label: string; path: string; icon: string }

// ─── Menús por rol ──────────────────────────────────────────────────────────

const menuAdmin: MenuItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'ti-layout-dashboard' },
  { label: 'Usuarios', path: '/usuarios', icon: 'ti-users' },
  { label: 'Materias', path: '/materias', icon: 'ti-book' },
  { label: 'Inscripciones', path: '/inscripciones', icon: 'ti-clipboard-list' },
  { label: 'Puntajes', path: '/puntajes', icon: 'ti-chart-bar' },
  { label: 'Asistencia', path: '/asistencia', icon: 'ti-checkbox' },
  { label: 'Estadísticas', path: '/estadisticas', icon: 'ti-chart-pie' },
  { label: 'Reportes', path: '/reportes', icon: 'ti-report' },
  { label: 'Calendario', path: '/calendario', icon: 'ti-calendar' },
  { label: 'Biblioteca', path: '/biblioteca', icon: 'ti-books' },
  { label: 'Programa', path: '/programa', icon: 'ti-list' },
  { label: 'Boleta PDF', path: '/boleta', icon: 'ti-file-text' },
  { label: 'Perfil', path: '/perfil', icon: 'ti-user' },
]

const menuProfesor: MenuItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'ti-layout-dashboard' },
  { label: 'Mis Cursos', path: '/miscursos', icon: 'ti-school' },
  { label: 'Puntajes', path: '/puntajes', icon: 'ti-chart-bar' },
  { label: 'Asistencia', path: '/asistencia', icon: 'ti-checkbox' },
  { label: 'Materias', path: '/materias', icon: 'ti-book' },
  { label: 'Estadísticas', path: '/estadisticas', icon: 'ti-chart-pie' },
  { label: 'Calendario', path: '/calendario', icon: 'ti-calendar' },
  { label: 'Biblioteca', path: '/biblioteca', icon: 'ti-books' },
  { label: 'Programa', path: '/programa', icon: 'ti-list' },
  { label: 'Boleta PDF', path: '/boleta', icon: 'ti-file-text' },
  { label: 'Perfil', path: '/perfil', icon: 'ti-user' },
]

const menuAlumno: MenuItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'ti-layout-dashboard' },
  { label: 'Expediente', path: '/puntajes', icon: 'ti-chart-bar' },
  { label: 'Asistencia', path: '/asistencia', icon: 'ti-checkbox' },
  { label: 'Escanear QR', path: '/asistencia/scan', icon: 'ti-qrcode' },
  { label: 'Calendario', path: '/calendario', icon: 'ti-calendar' },
  { label: 'Biblioteca', path: '/biblioteca', icon: 'ti-books' },
  { label: 'Programa', path: '/programa', icon: 'ti-list' },
  { label: 'Boleta PDF', path: '/boleta', icon: 'ti-file-text' },
  { label: 'Perfil', path: '/perfil', icon: 'ti-user' },
]

// Bottom nav mobile: 5 ítems clave por rol
const bottomNavByRole: Record<string, MenuItem[]> = {
  alumno: [
    { label: 'Inicio', path: '/dashboard', icon: 'ti-layout-dashboard' },
    { label: 'Expediente', path: '/puntajes', icon: 'ti-chart-bar' },
    { label: 'QR', path: '/asistencia/scan', icon: 'ti-qrcode' },
    { label: 'Agenda', path: '/calendario', icon: 'ti-calendar' },
    { label: 'Perfil', path: '/perfil', icon: 'ti-user' },
  ],
  profesor: [
    { label: 'Inicio', path: '/dashboard', icon: 'ti-layout-dashboard' },
    { label: 'Cursos', path: '/miscursos', icon: 'ti-school' },
    { label: 'Asistencia', path: '/asistencia', icon: 'ti-qrcode' },
    { label: 'Puntajes', path: '/puntajes', icon: 'ti-chart-bar' },
    { label: 'Perfil', path: '/perfil', icon: 'ti-user' },
  ],
  admin: [
    { label: 'Inicio', path: '/dashboard', icon: 'ti-layout-dashboard' },
    { label: 'Usuarios', path: '/usuarios', icon: 'ti-users' },
    { label: 'Materias', path: '/materias', icon: 'ti-book' },
    { label: 'Reportes', path: '/reportes', icon: 'ti-report' },
    { label: 'Perfil', path: '/perfil', icon: 'ti-user' },
  ],
}

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/puntajes': 'Calificaciones',
  '/asistencia': 'Asistencia',
  '/asistencia/scan': 'Escanear QR',
  '/perfil': 'Perfil',
  '/usuarios': 'Gestión de Usuarios',
  '/materias': 'Oferta Académica',
  '/calendario': 'Calendario',
  '/biblioteca': 'Biblioteca Digital',
  '/programa': 'Programa',
  '/boleta': 'Boleta de Notas',
  '/reportes': 'Reportes',
  '/miscursos': 'Mis Cursos',
  '/estadisticas': 'Estadísticas',
  '/inscripciones': 'Inscripciones',
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
  const pageTitle = pageTitles[location.pathname] ?? 'UCA V2'

  useEffect(() => {
    document.title = 'Universidad Católica Caacupé'
  }, [])

  // Accent dinámico por rol
  useEffect(() => {
    if (role) document.body.setAttribute('data-role', role)
    return () => { document.body.removeAttribute('data-role') }
  }, [role])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

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
          width: 210px; height: 100%;
          background: var(--bg-surface); border-right: 1px solid var(--border-subtle);
          display: flex; flex-direction: column; flex-shrink: 0; overflow: hidden;
        }
        .layout-topbar {
          height: 56px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; padding: 0 20px;
          background: var(--bg-base); border-bottom: 1px solid var(--border-subtle);
        }
        .topbar-search { display: flex; }
        .layout-bottomnav { display: none; }
        .topbar-menu-btn { display: none; }

        @media (max-width: 768px) {
          .layout-root { display: block !important; }
          .layout-main { padding: 0 !important; width: 100% !important; max-width: 100vw !important; height: 100% !important; }
          .layout-main main { padding: 16px 12px 84px !important; width: 100% !important; box-sizing: border-box; }
          .topbar-search { display: none; }
          .topbar-menu-btn { display: flex !important; }

          .layout-sidebar {
            position: fixed; top: 0; bottom: 0; left: 0;
            width: 260px; z-index: 100;
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
            height: 62px; background: var(--bg-surface);
            border-top: 1px solid var(--border-subtle);
            justify-content: space-around; align-items: stretch;
            padding-bottom: env(safe-area-inset-bottom);
          }
        }
      `}</style>

      <div className="layout-root" style={{ display: 'flex', background: 'var(--bg-base)', height: '100vh', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>

        {mobileOpen && <div className="layout-overlay" onClick={() => setMobileOpen(false)} />}

        {/* ── Sidebar ── */}
        <div className={`layout-sidebar${mobileOpen ? ' mobile-open' : ''}`}>
          {/* Logo */}
          <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
              UCA <span style={{ color: 'var(--accent)' }}>V2</span>
            </span>
          </div>

          {/* Usuario */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: 'var(--accent-muted)', color: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, textTransform: 'uppercase',
            }}>
              {(username || '?').slice(0, 2)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {username || 'Usuario'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{role ?? ''}</div>
            </div>
          </div>

          {/* Nav */}
          <div className="nav-scroll" style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
            {menuItems.map(item => {
              const active = location.pathname === item.path
              return (
                <button key={item.path}
                  onClick={() => { navigate(item.path); setMobileOpen(false) }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 10px', borderRadius: 8, border: 'none',
                    borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                    cursor: 'pointer', marginBottom: 2, fontFamily: 'Inter, sans-serif',
                    background: active ? 'var(--accent-muted)' : 'transparent',
                    color: active ? 'var(--accent)' : 'var(--text-secondary)',
                    fontSize: 13, fontWeight: active ? 600 : 400,
                    textAlign: 'left', transition: 'all 150ms ease', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
                >
                  <i className={`ti ${item.icon}`} aria-hidden="true" style={{ fontSize: 16, flexShrink: 0 }} />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div style={{ padding: '10px 8px', borderTop: '1px solid var(--border-subtle)', flexShrink: 0 }}>
            <button
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'transparent', fontFamily: 'Inter, sans-serif',
                color: 'var(--text-secondary)', fontSize: 12, whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <i className="ti ti-help" aria-hidden="true" style={{ fontSize: 14 }} />
              <span>Centro de Ayuda</span>
            </button>
            <button onClick={logout}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'transparent', fontFamily: 'Inter, sans-serif',
                color: '#ef4444', fontSize: 12, whiteSpace: 'nowrap',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <button className="topbar-menu-btn btn-ghost" onClick={() => setMobileOpen(true)}
                style={{ padding: '6px 8px', borderRadius: 8, alignItems: 'center' }} aria-label="Abrir menú">
                <i className="ti ti-menu-2" style={{ fontSize: 17 }} />
              </button>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {pageTitle}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="topbar-search" style={{ position: 'relative' }}>
                <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--text-muted)' }} />
                <input className="input-uca" placeholder="Buscar materias..."
                  style={{ width: 220, padding: '7px 12px 7px 30px', fontSize: 13, background: 'var(--bg-surface)' }} />
              </div>
              <button className="btn-ghost" style={{ padding: '7px 9px', borderRadius: 8 }} aria-label="Notificaciones">
                <i className="ti ti-bell" style={{ fontSize: 16 }} />
              </button>
              <button className="btn-ghost" style={{ padding: '7px 9px', borderRadius: 8 }} aria-label="Aplicaciones">
                <i className="ti ti-grid-dots" style={{ fontSize: 16 }} />
              </button>
              <button onClick={() => navigate('/perfil')} aria-label="Perfil"
                style={{
                  width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border-light)',
                  background: 'var(--accent-muted)', color: 'var(--accent)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, textTransform: 'uppercase', fontFamily: 'inherit',
                }}>
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
                  color: active ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                }}>
                <i className={`ti ${item.icon}`} style={{ fontSize: 20 }} />
                <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </>
  )
}
