import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import logoUCASmall from '../assets/uc_logo_sist_academico.png'

type MenuItem = { label: string; path: string; icon: string }

// ─── Menús por rol ──────────────────────────────────────────────────────────

const menuAdmin: MenuItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'ti-layout-dashboard' },
  { label: 'Puntajes', path: '/puntajes', icon: 'ti-chart-bar' },
  { label: 'Asistencia', path: '/asistencia', icon: 'ti-checkbox' },
  { label: 'Perfil', path: '/perfil', icon: 'ti-user' },
  { label: 'Calendario', path: '/calendario', icon: 'ti-calendar' },
  { label: 'Biblioteca', path: '/biblioteca', icon: 'ti-books' },
  { label: 'Programa', path: '/programa', icon: 'ti-list' },
  { label: 'Boleta PDF', path: '/boleta', icon: 'ti-file-text' },
  { label: 'Materias', path: '/materias', icon: 'ti-book' },
  { label: 'Estadísticas', path: '/estadisticas', icon: 'ti-chart-pie' },
  { label: 'Usuarios', path: '/usuarios', icon: 'ti-users' },
  { label: 'Reportes', path: '/reportes', icon: 'ti-report' },
  { label: 'Inscripciones', path: '/inscripciones', icon: 'ti-clipboard-list' },
]

const menuProfesor: MenuItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'ti-layout-dashboard' },
  { label: 'Puntajes', path: '/puntajes', icon: 'ti-chart-bar' },
  { label: 'Asistencia', path: '/asistencia', icon: 'ti-checkbox' },
  { label: 'Perfil', path: '/perfil', icon: 'ti-user' },
  { label: 'Calendario', path: '/calendario', icon: 'ti-calendar' },
  { label: 'Biblioteca', path: '/biblioteca', icon: 'ti-books' },
  { label: 'Programa', path: '/programa', icon: 'ti-list' },
  { label: 'Boleta PDF', path: '/boleta', icon: 'ti-file-text' },
  { label: 'Materias', path: '/materias', icon: 'ti-book' },
  { label: 'Estadísticas', path: '/estadisticas', icon: 'ti-chart-pie' },
  { label: 'Mis Cursos', path: '/miscursos', icon: 'ti-school' },
]

const menuAlumno: MenuItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'ti-layout-dashboard' },
  { label: 'Puntajes', path: '/puntajes', icon: 'ti-chart-bar' },
  { label: 'Asistencia', path: '/asistencia', icon: 'ti-checkbox' },
  { label: 'Escanear QR', path: '/asistencia/scan', icon: 'ti-qrcode' },
  { label: 'Perfil', path: '/perfil', icon: 'ti-user' },
  { label: 'Calendario', path: '/calendario', icon: 'ti-calendar' },
  { label: 'Biblioteca', path: '/biblioteca', icon: 'ti-books' },
  { label: 'Programa', path: '/programa', icon: 'ti-list' },
  { label: 'Boleta PDF', path: '/boleta', icon: 'ti-file-text' },
]

function getMenuPorRol(rol: string | null): MenuItem[] {
  if (rol === 'admin' || rol === 'administrador') return menuAdmin
  if (rol === 'profesor') return menuProfesor
  return menuAlumno // default: alumno
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const userRol = sessionStorage.getItem('user_rol')
  const menuItems = getMenuPorRol(userRol)

  useEffect(() => {
    document.title = 'Universidad Católica Caacupé'
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  // Bloquea el scroll del contenido de fondo mientras el sidebar mobile está abierto,
  // así el scroll del menú no "se filtra" hacia el dashboard de atrás.
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <>
      <style>{`
        .nav-scroll { scrollbar-width: thin; scrollbar-color: transparent transparent; overscroll-behavior: contain; }
        .nav-scroll::-webkit-scrollbar { width: 4px; }
        .nav-scroll::-webkit-scrollbar-track { background: transparent; }
        .nav-scroll::-webkit-scrollbar-thumb { background: transparent; border-radius: 4px; }
        .nav-scroll:hover { scrollbar-color: #2a3550 transparent; }
        .nav-scroll:hover::-webkit-scrollbar-thumb { background: #2a3550; }

        .layout-content-scroll { overscroll-behavior: contain; }

        /* Desktop: sidebar fijo, SIN cambios respecto a la versión anterior */
        .layout-sidebar {
          width: 220px; height: 100%;
          background: #0d0f14; border-right: 1px solid #1a2035;
          display: flex; flex-direction: column; flex-shrink: 0; overflow: hidden;
        }

        .layout-mobile-btn { display: none; }

        @media (max-width: 768px) {
          .layout-root { display: block !important; }
          .layout-main { padding: 0 !important; width: 100% !important; max-width: 100vw !important; }
          .layout-main main { padding: 16px 12px !important; width: 100% !important; box-sizing: border-box; }
          .layout-mobile-btn { display: flex !important; }

          /* Mobile: sidebar oculto por defecto, fuera de pantalla */
          .layout-sidebar {
            position: fixed;
            top: 0; bottom: 0; left: 0;
            width: 260px;
            z-index: 100;
            transform: translateX(-100%);
            transition: transform 220ms ease;
          }

          /* Mobile: sidebar visible cuando se abre con el botón */
          .layout-sidebar.mobile-open {
            transform: translateX(0);
          }

          .layout-overlay {
            display: block; position: fixed; inset: 0; z-index: 99;
            background: rgba(0,0,0,0.6);
          }
        }
      `}</style>

      <div className="layout-root" style={{ display: 'flex', background: '#0d0f14', height: '100vh', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>

        {/* Overlay mobile — solo se monta cuando el sidebar está abierto */}
        {mobileOpen && <div className="layout-overlay" onClick={() => setMobileOpen(false)} />}

        {/* Sidebar — fixed 220px desktop (sin cambios), drawer deslizante en mobile */}
        <div className={`layout-sidebar${mobileOpen ? ' mobile-open' : ''}`}>
          {/* Brand */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px 6px', borderBottom: '1px solid #1a2035', overflow: 'hidden',
          }}>
            <img src={logoUCASmall} alt="UCA" style={{
              width: '100%', height: 'auto', objectFit: 'contain',
              filter: 'brightness(0) invert(1)', opacity: 0.9,
            }} />
          </div>

          {/* Nav — solo esto scrollea */}
          <div className="nav-scroll" style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
            {menuItems.map(item => {
              const active = location.pathname === item.path
              return (
                <button key={item.path}
                  onClick={() => { navigate(item.path); setMobileOpen(false) }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '9px 10px', borderRadius: '10px', border: 'none',
                    cursor: 'pointer', marginBottom: '2px', fontFamily: 'Inter, sans-serif',
                    background: active ? '#0f2044' : 'transparent',
                    color: active ? '#1a8fff' : '#4a6fa5',
                    fontSize: '13px', fontWeight: active ? 500 : 400,
                    textAlign: 'left', transition: 'all 150ms ease', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = '#131929'; (e.currentTarget as HTMLButtonElement).style.color = '#a0b4d0' } }}
                  onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#4a6fa5' } }}
                >
                  <i className={`ti ${item.icon}`} aria-hidden="true" style={{ fontSize: '16px', flexShrink: 0 }} />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>

          {/* Footer — fijo abajo */}
          <div style={{ padding: '10px 8px', borderTop: '1px solid #1a2035', flexShrink: 0 }}>
            <button onClick={() => navigate('/login')}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 10px', borderRadius: '8px', border: 'none',
                cursor: 'pointer', background: 'transparent', fontFamily: 'Inter, sans-serif',
                color: '#e05555', fontSize: '12px', whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#1a1015'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
            >
              <i className="ti ti-logout" aria-hidden="true" style={{ fontSize: '14px' }} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>

        {/* Main */}
        <div className="layout-main" style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <main className="layout-content-scroll" style={{ flex: 1, padding: '28px', overflowY: 'auto', background: '#0d0f14' }}>
            {children}
          </main>
        </div>

        {/* Floating button mobile — bottom-right */}
        <button className="layout-mobile-btn" onClick={() => setMobileOpen(true)}
          style={{
            position: 'fixed', bottom: 20, right: 20, zIndex: 50,
            width: 52, height: 52, borderRadius: '50%',
            background: '#1a8fff', border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(26,143,255,0.4)',
            alignItems: 'center', justifyContent: 'center',
          }}
          aria-label="Abrir menú"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>
    </>
  )
}