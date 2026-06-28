import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import logoUCASmall from '../assets/uc_logo_sist_academico.png'
import { decodeToken } from '../lib/api'

const menuPorRol: Record<string, { label: string; path: string; icon: string }[]> = {
  admin: [
    { label: 'Dashboard',     path: '/dashboard',    icon: 'ti-layout-dashboard' },
    { label: 'Estadísticas',  path: '/estadisticas', icon: 'ti-chart-dots' },
    { label: 'Usuarios',      path: '/usuarios',     icon: 'ti-users' },
    { label: 'Materias',   path: '/materias',  icon: 'ti-book' },
    { label: 'Puntajes',   path: '/puntajes',  icon: 'ti-chart-bar' },
    { label: 'Asistencia', path: '/asistencia',icon: 'ti-checkbox' },
    { label: 'Calendario', path: '/calendario',icon: 'ti-calendar' },
    { label: 'Biblioteca', path: '/biblioteca',icon: 'ti-books' },
    { label: 'Temario',    path: '/temario',   icon: 'ti-list' },
    { label: 'Boleta PDF', path: '/boleta',    icon: 'ti-file-text' },
    { label: 'Reportes',   path: '/reportes',  icon: 'ti-report' },
    { label: 'Perfil',     path: '/perfil',    icon: 'ti-user' },
  ],
  profesor: [
    { label: 'Mis Cursos',    path: '/miscursos',    icon: 'ti-school' },
    { label: 'Dashboard',     path: '/dashboard',    icon: 'ti-layout-dashboard' },
    { label: 'Estadísticas',  path: '/estadisticas', icon: 'ti-chart-dots' },
    { label: 'Puntajes',   path: '/puntajes',  icon: 'ti-chart-bar' },
    { label: 'Asistencia', path: '/asistencia',icon: 'ti-checkbox' },
    { label: 'Materias',   path: '/materias',  icon: 'ti-book' },
    { label: 'Temario',    path: '/temario',   icon: 'ti-list' },
    { label: 'Calendario', path: '/calendario',icon: 'ti-calendar' },
    { label: 'Perfil',     path: '/perfil',    icon: 'ti-user' },
  ],
  alumno: [
    { label: 'Dashboard',  path: '/dashboard', icon: 'ti-layout-dashboard' },
    { label: 'Puntajes',   path: '/puntajes',  icon: 'ti-chart-bar' },
    { label: 'Asistencia', path: '/asistencia',icon: 'ti-checkbox' },
    { label: 'Calendario', path: '/calendario',icon: 'ti-calendar' },
    { label: 'Biblioteca', path: '/biblioteca',icon: 'ti-books' },
    { label: 'Temario',    path: '/temario',   icon: 'ti-list' },
    { label: 'Boleta PDF', path: '/boleta',    icon: 'ti-file-text' },
    { label: 'Perfil',     path: '/perfil',    icon: 'ti-user' },
  ],
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const token = localStorage.getItem('token')
  const user = token ? decodeToken(token) : null
  const role = user?.role || 'alumno'
  const menuItems = menuPorRol[role] || menuPorRol.alumno

  useEffect(() => {
    document.title = 'Universidad Católica Caacupé'
    if (!token) navigate('/login', { replace: true })
  }, [navigate, token])

  function handleNav(path: string) {
    navigate(path)
    setMobileOpen(false)
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }

        .nav-scroll { scrollbar-width:thin; scrollbar-color:transparent transparent; }
        .nav-scroll::-webkit-scrollbar { width:4px; }
        .nav-scroll::-webkit-scrollbar-track { background:transparent; }
        .nav-scroll::-webkit-scrollbar-thumb { background:transparent; border-radius:4px; }
        .nav-scroll:hover { scrollbar-color:#2a3550 transparent; }
        .nav-scroll:hover::-webkit-scrollbar-thumb { background:#2a3550; }

        .layout-root {
          display:flex; background:#0b0f14;
          height:100dvh; overflow:hidden; font-family:Inter,sans-serif;
        }

        /* Overlay mobile */
        .sidebar-overlay {
          display:none; position:fixed; inset:0; z-index:40;
          background:rgba(0,0,0,.6); backdrop-filter:blur(2px);
        }
        .sidebar-overlay.open { display:block; }

        /* Sidebar */
        .sidebar {
          width:190px; height:100%;
          background:#0b0f14; border-right:1px solid #1a2035;
          display:flex; flex-direction:column; flex-shrink:0;
          overflow:hidden; z-index:50; position:relative;
        }

        @media(max-width:768px){
          .sidebar {
            position:fixed; top:0; left:0; height:100dvh;
            width:240px !important; transform:translateX(-100%);
            box-shadow:4px 0 24px rgba(0,0,0,.5);
          }
          .sidebar.mobile-open { transform:translateX(0); }
        }

        .sidebar-brand {
          display:flex; align-items:center; justify-content:center;
          padding:18px 12px 14px; border-bottom:1px solid #1a2035; flex-shrink:0;
        }
        .sidebar-brand-logo {
          display:flex; align-items:center; justify-content:center; width:100%;
        }

        /* Ocultar toggle en desktop */
        .sidebar-toggle-btn { display:none !important; }

        /* Botón de 3 rayas — toggle sidebar en desktop */
        .sidebar-toggle-btn {
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          gap:4px; width:32px; height:32px; flex-shrink:0;
          background:none; border:1px solid #1a2035; border-radius:7px;
          cursor:pointer; padding:0; transition:border-color .15s, background .15s;
        }
        .sidebar-toggle-btn:hover { border-color:#243447; background:#131920; }
        .sidebar-toggle-btn span {
          display:block; width:14px; height:1.5px;
          background:#4a6fa5; border-radius:2px;
          transition:all 200ms ease;
        }
        /* Animar a X cuando está abierto */
        .sidebar-toggle-btn.open span:nth-child(1) { transform:rotate(45deg) translate(4px,4px); }
        .sidebar-toggle-btn.open span:nth-child(2) { opacity:0; transform:scaleX(0); }
        .sidebar-toggle-btn.open span:nth-child(3) { transform:rotate(-45deg) translate(4px,-4px); }

        .nav-item {
          width:100%; display:flex; align-items:center;
          gap:8px; padding:8px 9px; border-radius:9px;
          border:none; cursor:pointer; margin-bottom:1px;
          background:transparent; color:#4a6fa5;
          font-size:12.5px; font-weight:400;
          text-align:left; font-family:Inter,sans-serif;
          transition:all 150ms ease; white-space:nowrap; overflow:hidden;
        }
        .nav-item.active { background:#0f2044; color:#1a8fff; font-weight:500; }
        .nav-item:hover:not(.active) { background:#131929; color:#a0b4d0; }

        .sidebar-footer { padding:10px 8px; border-top:1px solid #1a2035; flex-shrink:0; }
        .sidebar-footer-btn {
          width:100%; display:flex; align-items:center; gap:8px;
          padding:8px 10px; border-radius:8px; border:none;
          cursor:pointer; background:transparent;
          font-size:12px; font-family:Inter,sans-serif;
          white-space:nowrap; transition:all 150ms ease;
        }

        .layout-main {
          flex:1; height:100%; overflow-y:auto;
          min-width:0; background:#0b0f14;
          display:flex; flex-direction:column;
        }

        /* Topbar mobile */
        .mobile-topbar {
          display:none; align-items:center; gap:10px;
          padding:10px 14px; border-bottom:1px solid #1a2035;
          background:#0b0f14; position:sticky; top:0; z-index:30; flex-shrink:0;
        }
        @media(max-width:768px){ .mobile-topbar { display:flex; } }

        /* Hamburger mobile (3 rayas simples) */
        .hamburger {
          display:flex; flex-direction:column; align-items:center;
          justify-content:center; gap:4px;
          width:36px; height:36px; flex-shrink:0;
          background:#131920; border:1px solid #243447;
          border-radius:8px; cursor:pointer; padding:0;
        }
        .hamburger span {
          display:block; width:16px; height:1.5px;
          background:#8fa3b8; border-radius:2px;
        }
      `}</style>

      <div className="layout-root">

        {/* Overlay mobile */}
        <div
          className={`sidebar-overlay${mobileOpen ? ' open' : ''}`}
          onClick={() => setMobileOpen(false)}
        />

        {/* Sidebar */}
        <div className={`sidebar${mobileOpen ? ' mobile-open' : ''}`}>

          {/* Brand */}
          <div className="sidebar-brand">
            <div className="sidebar-brand-logo">
              <img
                src={logoUCASmall}
                alt="UCA"
                style={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: 64,
                  objectFit: 'contain',
                  filter: 'brightness(0) invert(1)',
                  opacity: 0.92,
                }}
              />
            </div>
          </div>

          {/* Nav */}
          <div className="nav-scroll" style={{ flex:1, padding:'10px 8px', overflowY:'auto' }}>
            {menuItems.map(item => {
              const active = location.pathname === item.path
              return (
                <button
                  key={item.path}
                  onClick={() => handleNav(item.path)}
                  title={undefined}
                  className={`nav-item${active ? ' active' : ''}`}
                >
                  <i className={`ti ${item.icon}`} aria-hidden="true" style={{ fontSize:'15px', flexShrink:0 }} />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>

          {/* Footer — solo cerrar sesión */}
          <div className="sidebar-footer">
            <button
              className="sidebar-footer-btn"
              onClick={() => { localStorage.removeItem('token'); navigate('/login') }}
              style={{ color:'#e05555' }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#1a1015'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
            >
              <i className="ti ti-logout" aria-hidden="true" style={{ fontSize:'14px', flexShrink:0 }} />
              Cerrar sesión
            </button>
          </div>
        </div>

        {/* Main */}
        <main className="layout-main">
          {/* Topbar mobile — 3 rayas + logo */}
          <div className="mobile-topbar">
            <button className="hamburger" onClick={() => setMobileOpen(true)} aria-label="Abrir menú">
              <span /><span /><span />
            </button>
            <img
              src={logoUCASmall}
              alt="UCA"
              style={{ height:28, width:'auto', filter:'brightness(0) invert(1)', opacity:0.9 }}
            />
          </div>
          {children}
        </main>

      </div>
    </>
  )
}