import { useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import logoUCASmall from '../assets/uca-removebg-preview.png'

const menuItems = [
  { label: 'Dashboard', path: '/dashboard', icon: 'ti-layout-dashboard' },
  { label: 'Puntajes', path: '/puntajes', icon: 'ti-chart-bar' },
  { label: 'Asistencia', path: '/asistencia', icon: 'ti-checkbox' },
  { label: 'Perfil', path: '/perfil', icon: 'ti-user' },
  { label: 'Usuarios', path: '/usuarios', icon: 'ti-users' },
  { label: 'Materias', path: '/materias', icon: 'ti-book' },
  { label: 'Calendario', path: '/calendario', icon: 'ti-calendar' },
  { label: 'Biblioteca', path: '/biblioteca', icon: 'ti-books' },
  { label: 'Temario', path: '/temario', icon: 'ti-list' },
  { label: 'Boleta PDF', path: '/boleta', icon: 'ti-file-text' },
  { label: 'Reportes', path: '/reportes', icon: 'ti-report' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <>
      <style>{`
        .nav-scroll {
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
        }
        .nav-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .nav-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .nav-scroll::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 4px;
        }
        .nav-scroll:hover {
          scrollbar-color: #2a3550 transparent;
        }
        .nav-scroll:hover::-webkit-scrollbar-thumb {
          background: #2a3550;
        }
      `}</style>
    <div style={{ display: 'flex', background: '#0d0f14', height: '100vh', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>

      {/* Sidebar */}
      <div style={{
        width: collapsed ? '56px' : '220px',
        height: '100%',
        background: '#0d0f14',
        borderRight: '1px solid #1a2035',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        transition: 'width 200ms ease',
        overflow: 'hidden',
      }}>

        {/* Brand */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: collapsed ? '16px 4px' : '20px 6px',
          borderBottom: '1px solid #1a2035',
          overflow: 'hidden',
        }}>
          <img
            src={logoUCASmall}
            alt="UCA"
            style={{
              width: collapsed ? '38px' : '100%',
              height: 'auto',
              objectFit: 'contain',
              filter: 'brightness(0) invert(1)',
              opacity: 0.9,
              transition: 'width 200ms ease',
            }}
          />
        </div>

        {/* Nav */}
        <div className="nav-scroll" style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
          {menuItems.map(item => {
            const active = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                title={collapsed ? item.label : undefined}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  gap: '10px', padding: '9px 10px', borderRadius: '10px',
                  border: 'none', cursor: 'pointer', marginBottom: '2px',
                  background: active ? '#0f2044' : 'transparent',
                  color: active ? '#1a8fff' : '#4a6fa5',
                  fontSize: '13px', fontWeight: active ? 500 : 400,
                  textAlign: 'left', fontFamily: 'Inter, sans-serif',
                  transition: 'all 150ms ease',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLButtonElement).style.background = '#131929'
                    ;(e.currentTarget as HTMLButtonElement).style.color = '#a0b4d0'
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                    ;(e.currentTarget as HTMLButtonElement).style.color = '#4a6fa5'
                  }
                }}
              >
                <i className={`ti ${item.icon}`} aria-hidden="true" style={{ fontSize: '16px', flexShrink: 0 }} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 8px', borderTop: '1px solid #1a2035' }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 10px', borderRadius: '8px', border: 'none',
              cursor: 'pointer', background: 'transparent',
              color: '#4a6fa5', fontSize: '12px', fontFamily: 'Inter, sans-serif',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#a0b4d0'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#4a6fa5'}
          >
            <i className={`ti ${collapsed ? 'ti-chevron-right' : 'ti-chevron-left'}`} aria-hidden="true" style={{ fontSize: '14px' }} />
            {!collapsed && 'Colapsar'}
          </button>
          <button
            onClick={() => navigate('/login')}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 10px', borderRadius: '8px', border: 'none',
              cursor: 'pointer', background: 'transparent',
              color: '#e05555', fontSize: '12px', fontFamily: 'Inter, sans-serif',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#1a1015'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
          >
            <i className="ti ti-logout" aria-hidden="true" style={{ fontSize: '14px' }} />
            {!collapsed && 'Cerrar sesión'}
          </button>
        </div>
      </div>

      {/* Main */}
      <main style={{ flex: 1, height: '100%', padding: '28px', overflowY: 'auto', minWidth: 0, background: '#0d0f14' }}>
        {children}
      </main>
    </div>
    </>
  )
}