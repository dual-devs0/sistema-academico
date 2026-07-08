import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { getRole, getUsername } from '../hooks/useRole'
import { api } from '../lib/api'
import logoUCA from '../assets/uc_logo_sist_academico.png'

type MenuItem = { label: string; path: string; icon: string }

// ─── Menús por rol (estilo capturas: lista corta) ───────────────────────────

const menuAlumno: MenuItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'ti-layout-dashboard' },
  { label: 'Cursos', path: '/programa', icon: 'ti-school' },
  { label: 'Mi Progreso', path: '/malla', icon: 'ti-hierarchy-3' },
  { label: 'Calificaciones', path: '/puntajes', icon: 'ti-certificate' },
  { label: 'Expediente', path: '/expediente', icon: 'ti-file-certificate' },
  { label: 'Inscripción', path: '/inscripciones', icon: 'ti-clipboard-list' },
  { label: 'Asistencia', path: '/asistencia', icon: 'ti-qrcode' },
  { label: 'Biblioteca', path: '/biblioteca', icon: 'ti-books' },
  { label: 'Calendario', path: '/calendario', icon: 'ti-calendar' },
  { label: 'Boleta', path: '/boleta', icon: 'ti-file-text' },
  { label: 'Foro', path: '/foro', icon: 'ti-messages' },
  { label: 'Ajustes', path: '/perfil', icon: 'ti-settings' },
]

const menuProfesor: MenuItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'ti-layout-dashboard' },
  { label: 'Mis Materias', path: '/mis-materias', icon: 'ti-book-2' },
  { label: 'Calificaciones', path: '/puntajes', icon: 'ti-certificate' },
  { label: 'Asistencia', path: '/asistencia', icon: 'ti-qrcode' },
  { label: 'Estadísticas', path: '/estadisticas', icon: 'ti-chart-pie' },
  { label: 'Calendario', path: '/calendario', icon: 'ti-calendar' },
  { label: 'Biblioteca', path: '/biblioteca', icon: 'ti-books' },
  { label: 'Foro', path: '/foro', icon: 'ti-messages' },
  { label: 'Ajustes', path: '/perfil', icon: 'ti-settings' },
]

const menuAdmin: MenuItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'ti-layout-dashboard' },
  { label: 'Usuarios & Roles', path: '/usuarios', icon: 'ti-users' },
  { label: 'Asignaciones', path: '/gestion-asignaciones', icon: 'ti-binary-tree' },
  { label: 'Malla Curricular', path: '/malla', icon: 'ti-hierarchy-3' },
  { label: 'Expediente', path: '/expediente', icon: 'ti-file-certificate' },
  { label: 'Inscripciones', path: '/inscripciones', icon: 'ti-clipboard-list' },
  { label: 'Calificaciones', path: '/puntajes', icon: 'ti-certificate' },
  { label: 'Reportes', path: '/reportes', icon: 'ti-report' },
  { label: 'Estadísticas', path: '/estadisticas', icon: 'ti-chart-bar' },
  { label: 'Calendario', path: '/calendario', icon: 'ti-calendar' },
  { label: 'Foro', path: '/foro', icon: 'ti-messages' },
  { label: 'Ajustes Globales', path: '/perfil', icon: 'ti-settings' },
]

const bottomNavByRole: Record<string, MenuItem[]> = {
  alumno: [
    { label: 'Inicio', path: '/dashboard', icon: 'ti-layout-dashboard' },
    { label: 'Cursos', path: '/programa', icon: 'ti-school' },
    { label: 'QR', path: '/asistencia/scan', icon: 'ti-qrcode' },
    { label: 'Calificaciones', path: '/puntajes', icon: 'ti-certificate' },
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
    window.addEventListener('uca:help', () => setHelpOpen(true))
    return () => window.removeEventListener('uca:help', () => setHelpOpen(true))
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

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

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
            <button onClick={() => setHelpOpen(true)} className="btn-ghost" style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: 11, marginBottom: 8, background: 'var(--accent-muted)', color: 'var(--accent-bright)', border: '1px solid transparent' }}>
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
                      {menuItems.map(item => (
                        <button key={item.path} onClick={() => { navigate(item.path); setAppsOpen(false) }}
                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '10px 4px', borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                          onMouseEnter={ev => { ev.currentTarget.style.color = 'var(--accent-bright)'; ev.currentTarget.style.borderColor = 'var(--accent-hover)' }}
                          onMouseLeave={ev => { ev.currentTarget.style.color = 'var(--text-secondary)'; ev.currentTarget.style.borderColor = 'var(--border-subtle)' }}>
                          <i className={`ti ${item.icon}`} style={{ fontSize: 18 }} />
                          <span style={{ fontSize: 9, fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

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

      {/* Modal Centro de Ayuda — global, invocable via emitHelp() */}
      {helpOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setHelpOpen(false)}>
          <div className="card card-elevated" style={{ width: '100%', maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>Centro de Ayuda</h3>
              <button onClick={() => setHelpOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><i className="ti ti-x" /></button>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Universidad Católica — Unidad Pedagógica de Caacupé
            </p>
            <a href="https://wa.me/595512435838" target="_blank" rel="noopener noreferrer" className="btn-primary"
              style={{ width: '100%', background: '#25D366', marginBottom: 10, textDecoration: 'none' }}>
              <i className="ti ti-brand-whatsapp" /> Contactar por WhatsApp
            </a>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                <i className="ti ti-phone" style={{ color: 'var(--accent-bright)' }} />
                <a href="tel:+59521243583" style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>0511 24 35 83</a>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                <i className="ti ti-mail" style={{ color: 'var(--accent-bright)' }} />
                <a href="mailto:soporte@uca.edu.py" style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>soporte@uca.edu.py</a>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                <i className="ti ti-clock" /> Lun–Vie 07:00–20:00
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
