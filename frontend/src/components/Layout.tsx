import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { decodeToken } from '../lib/api'

const menuItems: Record<string, { label: string; path: string; icon: string }[]> = {
  admin: [
    { label: 'Dashboard', path: '/dashboard', icon: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z' },
    { label: 'Usuarios', path: '/usuarios', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2' },
    { label: 'Materias', path: '/materias', icon: 'M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z' },
    { label: 'Puntajes', path: '/puntajes', icon: 'M18 20V10M12 20V4M6 20v-6' },
    { label: 'Asistencia', path: '/asistencia', icon: 'M9 12l2 2 4-4M7.86 2h8.28M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z' },
    { label: 'Reportes', path: '/reportes', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { label: 'Estadísticas', path: '/estadisticas', icon: 'M18 20V10M12 20V4M6 20v-6' },
    { label: 'Calendario', path: '/calendario', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { label: 'Programa', path: '/programa', icon: 'M4 6h16M4 12h16M4 18h16' },
    { label: 'Biblioteca', path: '/biblioteca', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    { label: 'Inscripciones', path: '/inscripciones', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { label: 'Boleta', path: '/boleta', icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
    { label: 'Perfil', path: '/perfil', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  ],
  profesor: [
    { label: 'Dashboard', path: '/dashboard', icon: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z' },
    { label: 'Mis Cursos', path: '/miscursos', icon: 'M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z' },
    { label: 'Puntajes', path: '/puntajes', icon: 'M18 20V10M12 20V4M6 20v-6' },
    { label: 'Asistencia', path: '/asistencia', icon: 'M9 12l2 2 4-4M7.86 2h8.28M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z' },
    { label: 'Materias', path: '/materias', icon: 'M4 6h16M4 12h16M4 18h16' },
    { label: 'Estadísticas', path: '/estadisticas', icon: 'M18 20V10M12 20V4M6 20v-6' },
    { label: 'Calendario', path: '/calendario', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { label: 'Programa', path: '/programa', icon: 'M4 6h16M4 12h16M4 18h16' },
    { label: 'Biblioteca', path: '/biblioteca', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    { label: 'Boleta', path: '/boleta', icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
    { label: 'Perfil', path: '/perfil', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  ],
  alumno: [
    { label: 'Dashboard', path: '/dashboard', icon: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z' },
    { label: 'Puntajes', path: '/puntajes', icon: 'M18 20V10M12 20V4M6 20v-6' },
    { label: 'Asistencia', path: '/asistencia', icon: 'M9 12l2 2 4-4M7.86 2h8.28M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z' },
    { label: 'Calendario', path: '/calendario', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { label: 'Programa', path: '/programa', icon: 'M4 6h16M4 12h16M4 18h16' },
    { label: 'Biblioteca', path: '/biblioteca', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    { label: 'Boleta', path: '/boleta', icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
    { label: 'Perfil', path: '/perfil', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  ],
}

const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .layout-root { display: flex; width: 100vw; height: 100vh; background: #0b0f14; font-family: 'Inter', system-ui, sans-serif; overflow: hidden; }
  
  .sidebar {
    width: 240px; flex-shrink: 0; background: #0e131a;
    border-right: 1px solid #1e2d3d; display: flex; flex-direction: column;
    height: 100vh; position: relative; z-index: 30;
    transition: transform 0.25s ease;
  }
  .sidebar-logo {
    padding: 20px 18px; display: flex; align-items: center; gap: 10px;
    border-bottom: 1px solid #1e2d3d; min-height: 56px;
  }
  .sidebar-logo img { width: 120px; height: auto; }
  .sidebar-user {
    padding: 14px 18px; border-bottom: 1px solid #1e2d3d;
    display: flex; align-items: center; gap: 10px;
  }
  .sidebar-avatar {
    width: 32px; height: 32px; border-radius: 50%;
    background: linear-gradient(135deg, #00b4d8, #0ea5e9);
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700; color: #000; flex-shrink: 0;
  }
  .sidebar-user-info { flex: 1; min-width: 0; }
  .sidebar-user-name { font-size: 12px; font-weight: 700; color: #f0f4f8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sidebar-user-rol  { font-size: 10px; color: #506070; text-transform: uppercase; letter-spacing: 0.05em; }
  
  .sidebar-nav { flex: 1; overflow-y: auto; padding: 8px 10px; }
  .sidebar-section { margin-bottom: 4px; }
  .sidebar-link {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 12px; border-radius: 8px;
    color: #8fa3b8; font-size: 12px; font-weight: 500;
    text-decoration: none; cursor: pointer; transition: all 0.12s;
    border: none; background: none; width: 100%; text-align: left; font-family: inherit;
  }
  .sidebar-link:hover { background: #1a2230; color: #f0f4f8; }
  .sidebar-link.active { background: #00b4d815; color: #00b4d8; font-weight: 600; }
  .sidebar-link svg { width: 15px; height: 15px; flex-shrink: 0; }
  
  .sidebar-footer { padding: 12px 10px; border-top: 1px solid #1e2d3d; }
  .sidebar-logout {
    display: flex; align-items: center; gap: 10px; width: 100%;
    padding: 9px 12px; border-radius: 8px;
    color: #ef4444; font-size: 12px; font-weight: 500;
    background: none; border: none; cursor: pointer; font-family: inherit;
    transition: background 0.12s;
  }
  .sidebar-logout:hover { background: #ef444410; }
  .sidebar-logout svg { width: 15px; height: 15px; flex-shrink: 0; }

  .main-area { flex: 1; display: flex; flex-direction: column; min-width: 0; overflow-y: auto; overflow-x: hidden; }

  .sidebar-overlay { display: none; }

  @media (max-width: 768px) {
    .sidebar { position: fixed; left: 0; top: 0; transform: translateX(-100%); }
    .sidebar.open { transform: translateX(0); }
    .sidebar-overlay {
      display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      z-index: 29; opacity: 0; pointer-events: none; transition: opacity 0.25s;
    }
    .sidebar-overlay.open { opacity: 1; pointer-events: auto; }
  }

  .mobile-hamburger {
    display: none; position: fixed; bottom: 20px; right: 20px; z-index: 50;
    width: 48px; height: 48px; border-radius: 50%;
    background: #00b4d8; border: none; color: #000;
    cursor: pointer; box-shadow: 0 4px 16px rgba(0,180,216,0.4);
    align-items: center; justify-content: center;
  }
  .mobile-hamburger svg { width: 20px; height: 20px; }
  @media (max-width: 768px) { .mobile-hamburger { display: flex; } }
`

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const token = sessionStorage.getItem('token')
  const user = token ? decodeToken(token) : null
  const role = (user?.role || 'alumno') as keyof typeof menuItems
  const items = menuItems[role] || menuItems.alumno

  const initials = user?.username?.slice(0, 2).toUpperCase() || 'U'

  function handleLogout() {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user_rol')
    sessionStorage.removeItem('user_nombre')
    navigate('/login')
  }

  function closeSidebar() { setSidebarOpen(false) }

  return (
    <>
      <style>{css}</style>
      <div className="layout-root">
        <div className={`sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="sidebar-logo">
            <img src="/icono web.png" alt="UCA" style={{ width: 28, height: 28, borderRadius: 6 }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#f0f4f8' }}>Sistema UCA</span>
          </div>

          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.username || 'Usuario'}</div>
              <div className="sidebar-user-rol">{role === 'admin' ? 'Administrador' : role === 'profesor' ? 'Profesor' : 'Alumno'}</div>
            </div>
          </div>

          <nav className="sidebar-nav">
            {items.map(item => {
              const isActive = location.pathname === item.path
              return (
                <div key={item.path} className="sidebar-section">
                  <button
                    className={`sidebar-link${isActive ? ' active' : ''}`}
                    onClick={() => { navigate(item.path); closeSidebar() }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={item.icon} />
                    </svg>
                    {item.label}
                  </button>
                </div>
              )
            })}
          </nav>

          <div className="sidebar-footer">
            <button className="sidebar-logout" onClick={handleLogout}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              Cerrar sesión
            </button>
          </div>
        </div>

        <div className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`} onClick={closeSidebar} />

        <div className="main-area">
          {children}
        </div>

        <button className="mobile-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
      <