import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const menuItems = [
  { label: 'Dashboard', path: '/dashboard', icon: '🏠' },
  { label: 'Asistencia', path: '/asistencia', icon: '📋' },
  { label: 'Puntajes', path: '/puntajes', icon: '📊' },
  { label: 'Calendario', path: '/calendario', icon: '📅' },
  { label: 'Biblioteca', path: '/biblioteca', icon: '📚' },
  { label: 'Temario', path: '/temario', icon: '📝' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  function handleLogout() {
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-gray-100">

      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-56'} bg-white border-r border-gray-200 flex flex-col transition-all duration-200`}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">SA</span>
          </div>
          {!collapsed && (
            <div>
              <div className="text-sm font-semibold text-gray-800">Sist. Académico</div>
              <div className="text-xs text-gray-400">UCA</div>
            </div>
          )}
        </div>

        {/* Menu */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {menuItems.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition
                ${location.pathname === item.path
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-100 p-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition"
          >
            <span>{collapsed ? '→' : '←'}</span>
            {!collapsed && <span>Colapsar</span>}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition"
          >
            <span>🚪</span>
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>

    </div>
  )
}