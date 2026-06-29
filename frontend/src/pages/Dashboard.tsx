import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { decodeToken, api } from '../lib/api'

const materiasMock = [
  { nombre: 'Análisis Matemático I', profesor: 'Carlos Méndez', parcial1: 7.5, parcial2: 8.0,  tp: 9.0,  promedio: 8.2, promClass: 'mid' },
  { nombre: 'Física I',              profesor: 'Ana Torres',    parcial1: 6.0, parcial2: 7.5,  tp: 8.5,  promedio: 7.3, promClass: 'low' },
  { nombre: 'Matemática Discreta',   profesor: 'Carlos Méndez', parcial1: 9.0, parcial2: null, tp: 8.0,  promedio: 8.5, promClass: 'mid' },
  { nombre: 'Programación I',        profesor: 'Luis Paredes',  parcial1: 10.0,parcial2: 9.5,  tp: 10.0, promedio: 9.8, promClass: 'high' },
]

const eventosMock = [
  { tipo: 'final',   titulo: 'Final — Física I',      sub: 'Ana Torres',    fecha: '5 Ago' },
  { tipo: 'final',   titulo: 'Final — Mat. Discreta', sub: 'Carlos Méndez', fecha: '7 Ago' },
  { tipo: 'final',   titulo: 'Final — Análisis',      sub: 'Carlos Méndez', fecha: '12 Ago' },
  { tipo: 'entrega', titulo: 'TP — Programación I',   sub: 'Luis Paredes',  fecha: '28 Jul' },
]

const notificacionesMock = [
  { icon: 'ti-chart-bar', color: '#22c55e', bg: '#15803d18', titulo: 'Nueva nota cargada',     sub: 'Parcial 2 — Programación I: 9.5', tiempo: 'Hace 10 min', path: '/puntajes' },
  { icon: 'ti-calendar',  color: '#00b4d8', bg: '#00b4d818', titulo: 'Evento próximo',          sub: 'Final Física I — 5 de agosto',    tiempo: 'Hace 1 h',   path: '/calendario' },
  { icon: 'ti-checkbox',  color: '#f59e0b', bg: '#f59e0b18', titulo: 'Asistencia actualizada', sub: 'Análisis Matemático I: 75%',       tiempo: 'Ayer',        path: '/asistencia' },
]

const asistenciasMock = [
  { nombre: 'Análisis Matemático I', pct: 75,  clase: 'warn' },
  { nombre: 'Física I',              pct: 83,  clase: 'ok' },
  { nombre: 'Programación I',        pct: 100, clase: 'ok' },
]

const tpsMock = [
  { nombre: 'Trabajo Práctico N° 3', materia: 'Programación I', fecha: '28 Jul' },
  { nombre: 'Informe — Laboratorio', materia: 'Física I',        fecha: '2 Ago' },
]

type MateriaRow = { nombre: string; profesor: string; parcial1: number | null; parcial2: number | null; tp: number | null; promedio: number; promClass: string }
type EventoRow = { tipo: string; titulo: string; sub: string; fecha: string }
type AsistenciaRow = { nombre: string; pct: number; clase: string }
type TpRow = { nombre: string; materia: string; fecha: string }

const dotColor: Record<string, string> = { final: '#ef4444', entrega: '#f59e0b', parcial: '#a855f7', asueto: '#22c55e' }
const gradeColor: Record<string, string> = { high: '#22c55e', mid: '#00b4d8', low: '#f59e0b', empty: '#506070' }
const avgBg:      Record<string, string> = { high: '#15803d18', mid: '#00b4d818', low: '#f59e0b18' }

function gradeClass(n: number | null) {
  if (n === null) return 'empty'
  if (n >= 8)    return 'high'
  if (n >= 6.5)  return 'mid'
  return 'low'
}

const css = `
  *, *::before, *::after { box-sizing: border-box; }
  .dash-wrap { display:flex; flex-direction:column; flex:1; min-height:0; }

  /* ── TOPBAR ── */
  .topbar {
    display:flex; align-items:center; justify-content:space-between;
    padding:0 24px; height:56px;
    border-bottom:1px solid #1e2d3d; background:#0b0f14;
    position:sticky; top:0; z-index:20; flex-shrink:0;
  }
  .topbar-left h1 { font-size:17px; font-weight:700; color:#f0f4f8; letter-spacing:-.01em; }
  .topbar-left p  { font-size:11px; color:#506070; margin-top:1px; }
  .topbar-right   { display:flex; align-items:center; gap:8px; }

  /* Búsqueda */
  .search-wrap {
    display:flex; align-items:center; gap:8px;
    background:#131920; border:1px solid #243447;
    border-radius:8px; padding:0 12px; height:34px;
    transition:border-color .15s, width .2s;
    width:160px; overflow:hidden;
  }
  .search-wrap:focus-within { border-color:#00b4d8; width:220px; }
  .search-wrap svg { width:14px; height:14px; color:#506070; flex-shrink:0; }
  .search-input {
    background:none; border:none; outline:none;
    color:#f0f4f8; font-size:12px; font-family:inherit; width:100%;
  }
  .search-input::placeholder { color:#506070; }

  /* Botones topbar */
  .topbar-btn {
    display:flex; align-items:center; justify-content:center;
    width:34px; height:34px; background:#131920;
    border:1px solid #243447; border-radius:8px;
    color:#8fa3b8; cursor:pointer; position:relative;
    transition:border-color .15s, color .15s; flex-shrink:0;
  }
  .topbar-btn svg { width:15px; height:15px; }
  .topbar-btn:hover { border-color:#00b4d8; color:#f0f4f8; }
  .notif-dot {
    position:absolute; top:6px; right:6px;
    width:7px; height:7px;
    background:#ef4444; border-radius:50%; border:2px solid #0b0f14;
  }

  /* Avatar */
  .avatar {
    width:34px; height:34px;
    background:linear-gradient(135deg,#00b4d8,#0ea5e9);
    border-radius:50%; display:flex; align-items:center; justify-content:center;
    font-size:12px; font-weight:700; color:#000;
    cursor:pointer; flex-shrink:0; transition:opacity .15s;
  }
  .avatar:hover { opacity:.85; }

  /* ── DROPDOWN NOTIFICACIONES ── */
  .notif-wrap { position:relative; }
  .notif-dropdown {
    position:absolute; top:calc(100% + 8px); right:0;
    width:300px; background:#131920; border:1px solid #1e2d3d;
    border-radius:12px; overflow:hidden;
    box-shadow:0 16px 40px rgba(0,0,0,.6); z-index:50;
  }
  .notif-header {
    display:flex; align-items:center; justify-content:space-between;
    padding:12px 16px; border-bottom:1px solid #1e2d3d;
  }
  .notif-header span { font-size:13px; font-weight:700; color:#f0f4f8; }
  .notif-clear { font-size:11px; color:#00b4d8; background:none; border:none; cursor:pointer; font-family:inherit; }
  .notif-item {
    display:flex; align-items:flex-start; gap:10px;
    padding:11px 16px; border-bottom:1px solid #1e2d3d33;
    cursor:pointer; transition:background .12s;
  }
  .notif-item:last-child { border-bottom:none; }
  .notif-item:hover { background:#1a2230; }
  .notif-icon {
    width:32px; height:32px; border-radius:8px;
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
  }
  .notif-icon i { font-size:15px; }
  .notif-title { font-size:12px; font-weight:600; color:#f0f4f8; }
  .notif-sub   { font-size:11px; color:#506070; margin-top:1px; }
  .notif-time  { font-size:10px; color:#506070; white-space:nowrap; flex-shrink:0; margin-top:1px; }

  /* Mobile: notif como panel fijo */
  @media(max-width:768px){
    .notif-dropdown {
      position:fixed;
      top:0; left:0; right:0; bottom:0;
      width:100%; border-radius:0;
      display:flex; flex-direction:column;
      z-index:200;
    }
    .notif-header {
      padding:16px 18px;
      border-bottom:1px solid #1e2d3d;
      flex-shrink:0;
    }
    .notif-body { flex:1; overflow-y:auto; }
    .notif-footer {
      padding:14px 18px;
      border-top:1px solid #1e2d3d;
      flex-shrink:0;
    }
    .search-wrap { display:none; }
  }

  /* ── CONTENT ── */
  .content { padding:20px 24px; flex:1; overflow-y:auto; }

  .welcome-banner {
    background:#131920; border:1px solid #1e2d3d;
    border-radius:14px; padding:18px 22px;
    display:flex; align-items:center; justify-content:space-between;
    margin-bottom:20px; position:relative; overflow:hidden;
  }
  .welcome-banner::before {
    content:''; position:absolute; right:-40px; top:-40px;
    width:180px; height:180px; border-radius:50%;
    background:radial-gradient(circle,#00b4d814,transparent 70%);
    pointer-events:none;
  }
  .welcome-text h2 { font-size:16px; font-weight:700; color:#f0f4f8; margin-bottom:3px; }
  .welcome-text p  { font-size:11px; color:#8fa3b8; }
  .semester-badge {
    display:flex; align-items:center; gap:7px;
    background:#00b4d818; border:1px solid #00b4d830;
    border-radius:8px; padding:8px 14px;
    font-size:12px; font-weight:600; color:#00b4d8; flex-shrink:0;
  }
  .semester-badge svg { width:13px; height:13px; }

  /* Stats */
  .stats-grid {
    display:grid; grid-template-columns:repeat(4,1fr);
    gap:12px; margin-bottom:20px;
  }
  .stat-card {
    background:#131920; border:1px solid #1e2d3d;
    border-radius:14px; padding:16px;
    display:flex; flex-direction:column; gap:10px;
    transition:border-color .15s;
  }
  .stat-card:hover { border-color:#243447; }
  .stat-card-top { display:flex; align-items:center; justify-content:space-between; }
  .stat-icon { width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; }
  .stat-icon svg { width:16px; height:16px; }
  .stat-icon.cyan   { background:#00b4d818; color:#00b4d8; }
  .stat-icon.green  { background:#15803d18; color:#22c55e; }
  .stat-icon.yellow { background:#f59e0b18; color:#f59e0b; }
  .stat-icon.purple { background:#a855f718; color:#a855f7; }
  .stat-trend { font-size:10px; font-weight:600; display:flex; align-items:center; gap:3px; }
  .stat-trend.up   { color:#22c55e; }
  .stat-trend.warn { color:#f59e0b; }
  .stat-value { font-size:24px; font-weight:800; color:#f0f4f8; line-height:1; }
  .stat-label { font-size:11px; color:#506070; }
  .stat-bar { height:3px; background:#1e2d3d; border-radius:2px; overflow:hidden; }
  .stat-bar-fill { height:100%; border-radius:2px; }

  /* Lower grid */
  .lower-grid { display:grid; grid-template-columns:1fr 290px; gap:16px; }
  .card { background:#131920; border:1px solid #1e2d3d; border-radius:14px; overflow:hidden; }
  .card-header {
    display:flex; align-items:center; justify-content:space-between;
    padding:14px 18px 12px; border-bottom:1px solid #1e2d3d;
  }
  .card-header h3 { font-size:13px; font-weight:700; color:#f0f4f8; }
  .card-header p  { font-size:11px; color:#506070; margin-top:1px; }
  .card-action {
    font-size:11px; color:#00b4d8; background:none; border:none;
    cursor:pointer; font-family:inherit; padding:4px 8px;
    border-radius:6px; transition:background .12s;
  }
  .card-action:hover { background:#00b4d818; }

  table { width:100%; border-collapse:collapse; }
  thead th {
    padding:8px 18px; font-size:10px; font-weight:600;
    color:#506070; text-transform:uppercase; letter-spacing:.07em;
    text-align:left; border-bottom:1px solid #1e2d3d; white-space:nowrap;
  }
  thead th:not(:first-child) { text-align:center; }
  tbody td { padding:11px 18px; border-bottom:1px solid #1e2d3d33; vertical-align:middle; }
  tbody tr:last-child td { border-bottom:none; }
  tbody tr:hover { background:#1a2230; }
  .subject-name { font-size:13px; font-weight:600; color:#f0f4f8; }
  .subject-code { font-size:11px; color:#506070; margin-top:1px; }
  .grade { font-size:13px; font-weight:700; text-align:center; }
  .avg-badge { display:inline-block; padding:3px 10px; border-radius:6px; font-size:12px; font-weight:700; }

  .right-col { display:flex; flex-direction:column; gap:12px; }
  .event-item {
    display:flex; align-items:flex-start; gap:10px;
    padding:10px 16px; border-bottom:1px solid #1e2d3d33;
    transition:background .12s;
  }
  .event-item:last-child { border-bottom:none; }
  .event-item:hover { background:#1a2230; }
  .event-dot { width:7px; height:7px; border-radius:50%; margin-top:4px; flex-shrink:0; }
  .event-title { font-size:12px; font-weight:600; color:#f0f4f8; }
  .event-sub   { font-size:11px; color:#506070; margin-top:1px; }
  .event-date  { font-size:11px; color:#506070; white-space:nowrap; flex-shrink:0; }
  .att-item { padding:10px 16px; border-bottom:1px solid #1e2d3d33; }
  .att-item:last-child { border-bottom:none; }
  .att-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
  .att-name { font-size:12px; font-weight:600; color:#f0f4f8; }
  .att-pct { font-size:12px; font-weight:700; }
  .att-pct.ok   { color:#22c55e; }
  .att-pct.warn { color:#f59e0b; }
  .att-bar { height:4px; background:#1e2d3d; border-radius:2px; overflow:hidden; }
  .att-fill { height:100%; border-radius:2px; }
  .att-fill.ok   { background:#22c55e; }
  .att-fill.warn { background:#f59e0b; }
  .tp-item {
    display:flex; align-items:center; gap:10px;
    padding:10px 16px; border-bottom:1px solid #1e2d3d33;
  }
  .tp-item:last-child { border-bottom:none; }
  .tp-dot  { width:7px; height:7px; border-radius:50%; background:#f59e0b; flex-shrink:0; }
  .tp-name { font-size:12px; font-weight:600; color:#f0f4f8; }
  .tp-sub  { font-size:11px; color:#506070; margin-top:1px; }
  .tp-due  { font-size:11px; color:#f59e0b; font-weight:500; white-space:nowrap; margin-left:auto; }

  /* Responsive */
  @media(max-width:768px){
    .topbar { padding:0 14px; height:52px; }
    .topbar-left h1 { font-size:15px; }
    .content { padding:14px; }
    .stats-grid { grid-template-columns:repeat(2,1fr); gap:10px; margin-bottom:16px; }
    .stat-value { font-size:22px; }
    .welcome-banner { flex-direction:column; align-items:flex-start; gap:10px; padding:14px 16px; }
    .semester-badge { display:none; }
    .lower-grid { grid-template-columns:1fr; gap:12px; }
  }
`

export default function Dashboard() {
  const navigate = useNavigate()
  const [showNotif, setShowNotif] = useState(false)
  const [searchVal, setSearchVal] = useState('')
  const [user, setUser] = useState(() => {
    const token = sessionStorage.getItem('token')
    return token ? decodeToken(token) : null
  })
  const [materias, setMaterias] = useState<MateriaRow[]>(materiasMock)
  const [eventos, setEventos] = useState<EventoRow[]>(eventosMock)
  const [asistencias, setAsistencias] = useState<AsistenciaRow[]>(asistenciasMock)
  const [tps] = useState<TpRow[]>(tpsMock)

  useEffect(() => {
    const token = sessionStorage.getItem('token')
    if (token) setUser(decodeToken(token))
  }, [])

  useEffect(() => {
    const token = sessionStorage.getItem('token')
    const userData = token ? decodeToken(token) : null
    if (!userData) return

    (async () => {
      try {
        const isAlumno = userData.role === 'alumno'
        const isProfesor = userData.role === 'profesor'
        const uid = Number(userData.user_id)
        const materiasRes: any[] = await api.get(
          isProfesor && !isNaN(uid) ? `/materias/?profesor_id=${uid}` : '/materias/'
        ) || []
        const puntajesRes: any[] = await api.get(
          isAlumno && !isNaN(uid) ? `/puntajes/?user_id=${uid}` : '/puntajes/'
        ) || []
        const asistenciasRes: any[] = await api.get(
          isAlumno && !isNaN(uid) ? `/asistencias/?user_id=${uid}` : '/asistencias/'
        ) || []
        const eventosRes: any[] = await api.get('/eventos/') || []

        if (materiasRes.length > 0) {
          const rows: MateriaRow[] = materiasRes.map((m: any) => {
            const pts = puntajesRes.filter((p: any) => p.materia_id === m.id)
            const p1 = pts.find((p: any) => p.tipo === 'parcial1')?.valor ?? null
            const p2 = pts.find((p: any) => p.tipo === 'parcial2')?.valor ?? null
            const tpVal = pts.find((p: any) => p.tipo === 'practico')?.valor ?? null
            const vals = [p1, p2, tpVal].filter((v): v is number => v !== null)
            const prom = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
            const cls = prom >= 8 ? 'high' : prom >= 6.5 ? 'mid' : 'low'
            const profName = m.profesor_nombre || (m.profesor_id ? `Prof. #${m.profesor_id}` : '—')
            return { nombre: m.nombre, profesor: profName, parcial1: p1, parcial2: p2, tp: tpVal, promedio: Math.round(prom * 10) / 10, promClass: cls }
          })
          if (rows.length > 0) setMaterias(rows)
        }
        if (asistenciasRes.length > 0) {
          const materiaMap: Record<string, string> = {}
          materiasRes.forEach((m: any) => { materiaMap[String(m.id)] = m.nombre })
          const grouped: Record<string, { presente: number; total: number; nombre: string }> = {}
          asistenciasRes.forEach((a: any) => {
            const key = String(a.materia_id)
            if (!grouped[key]) grouped[key] = {
              presente: 0,
              total: 0,
              nombre: a.materia_nombre || materiaMap[key] || `Materia #${key}`,
            }
            grouped[key].total++
            if (a.presente) grouped[key].presente++
          })
          const rows: AsistenciaRow[] = Object.entries(grouped).map(([, g]) => {
            const pct = g.total > 0 ? Math.round((g.presente / g.total) * 100) : 0
            return { nombre: g.nombre, pct, clase: pct >= 80 ? 'ok' : 'warn' }
          })
          if (rows.length > 0) setAsistencias(rows)
        }
        if (eventosRes.length > 0) {
          const rows: EventoRow[] = eventosRes.slice(0, 4).map((e: any) => ({
            tipo: e.tipo || 'evento',
            titulo: e.titulo,
            sub: e.descripcion || '',
            fecha: e.fecha?.slice(5, 10) || '—',
          }))
          if (rows.length > 0) setEventos(rows)
        }
      } catch { /* fallback to mock */ }
    })()
  }, [])

  function handleNotifClick(path: string) {
    setShowNotif(false)
    navigate(path)
  }

  return (
    <>
      <style>{css}</style>
      <div className="dash-wrap">

        {/* ── TOPBAR ── */}
        <header className="topbar">
          <div className="topbar-left">
            <h1>Dashboard</h1>
            <p>Semestre 1 — 2026</p>
          </div>

          <div className="topbar-right">

            {/* Búsqueda — oculta en mobile via CSS */}
            <div className="search-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                className="search-input"
                placeholder="Buscar..."
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
              />
            </div>

            {/* Notificaciones */}
            <div className="notif-wrap">
              <button
                className="topbar-btn"
                onClick={() => setShowNotif(!showNotif)}
                aria-label="Notificaciones"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
                <span className="notif-dot" />
              </button>

              {showNotif && (
                <>
                  {/* Overlay cierre — desktop */}
                  <div
                    style={{ position:'fixed', inset:0, zIndex:40 }}
                    onClick={() => setShowNotif(false)}
                  />
                  <div className="notif-dropdown">
                    <div className="notif-header">
                      <span>Notificaciones</span>
                      <button className="notif-clear" onClick={() => setShowNotif(false)}>
                        Marcar todo como leído
                      </button>
                    </div>

                    {/* Body scrolleable en mobile */}
                    <div className="notif-body">
                      {(notificacionesMock as typeof notificacionesMock).map((n, i) => (
                        <div
                          key={i}
                          className="notif-item"
                          onClick={() => handleNotifClick(n.path)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={e => e.key === 'Enter' && handleNotifClick(n.path)}
                        >
                          <div className="notif-icon" style={{ background: n.bg }}>
                            <i className={`ti ${n.icon}`} style={{ color: n.color }} aria-hidden="true" />
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div className="notif-title">{n.titulo}</div>
                            <div className="notif-sub">{n.sub}</div>
                          </div>
                          <div className="notif-time">{n.tiempo}</div>
                        </div>
                      ))}
                    </div>

                    {/* Footer solo mobile — botón cerrar */}
                    <div className="notif-footer" style={{ display:'none' }}>
                      <style>{`@media(max-width:768px){ .notif-footer { display:block !important; } }`}</style>
                      <button
                        onClick={() => setShowNotif(false)}
                        style={{
                          width:'100%', padding:'12px', background:'#1a2230',
                          border:'1px solid #243447', borderRadius:10,
                          color:'#f0f4f8', fontSize:13, fontWeight:600,
                          fontFamily:'inherit', cursor:'pointer',
                        }}
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Avatar → perfil */}
            <div
              className="avatar"
              onClick={() => navigate('/perfil')}
              role="button"
              tabIndex={0}
              aria-label="Ir al perfil"
              onKeyDown={e => e.key === 'Enter' && navigate('/perfil')}
            >
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        {/* ── CONTENT ── */}
        <div className="content">

          {/* Welcome */}
          <div className="welcome-banner">
            <div className="welcome-text">
              <h2>¡Bienvenido/a, {user?.username || 'Usuario'}! 👋</h2>
              <p>Rol: {user?.role || '—'} · Sistema Académico UCA</p>
            </div>
            <div className="semester-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Semestre 1 · 2026
            </div>
          </div>

          {/* Stats */}
          <div className="stats-grid">
            {(() => {
              const numMaterias = materias.length
              const promedios = materias.map(m => m.promedio).filter(v => v > 0)
              const promGeneral = promedios.length > 0 ? promedios.reduce((a, b) => a + b, 0) / promedios.length : 0
              const promAsistencia = asistencias.length > 0 ? asistencias.reduce((a, b) => a + b.pct, 0) / asistencias.length : 0
              const numTps = tps.length
              return [
                { icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>, cls:'cyan',   value:String(numMaterias), label: user?.role === 'admin' ? 'Total materias' : user?.role === 'profesor' ? 'Materias a cargo' : 'Materias cursando',   trend:'↑ activo',   trendCls:'up' },
                { icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,  cls:'green',  value:promGeneral.toFixed(1), label:'Promedio general',    trend:'↑ bueno',    trendCls:'up',  bar:Math.round(promGeneral * 10),  barColor:'#22c55e', valueColor:'#22c55e' },
                { icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,              cls:'yellow', value:`${Math.round(promAsistencia)}%`, label:'Asistencia promedio', trend:'↑ ok',       trendCls:'up',  bar:Math.round(promAsistencia),  barColor:'#f59e0b', valueColor:'#f59e0b' },
                { icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,                                                              cls:'purple', value:String(numTps),   label:'TPs pendientes',     trend:'⚠ pendiente', trendCls:'warn', valueColor:'#a855f7' },
              ]
            })().map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-card-top">
                  <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
                  <span className={`stat-trend ${s.trendCls}`}>{s.trend}</span>
                </div>
                <div>
                  <div className="stat-value" style={{ color: s.valueColor } as React.CSSProperties}>{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
                {s.bar !== undefined && (
                  <div className="stat-bar">
                    <div className="stat-bar-fill" style={{ width:`${s.bar}%`, background:s.barColor }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Lower grid */}
          <div className="lower-grid">

            {/* Tabla puntajes */}
            <div className="card">
              <div className="card-header">
                <div><h3>{user?.role === 'admin' ? 'Resumen global' : user?.role === 'profesor' ? 'Mis materias' : 'Mis puntajes'}</h3><p>Semestre 1 · 2026</p></div>
                <button className="card-action" onClick={() => navigate('/puntajes')}>Ver todo →</button>
              </div>
              <div style={{ overflowX:'auto' }}>
                {user?.role === 'profesor' ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Materia</th><th style={{textAlign:'center'}}>Año</th><th style={{textAlign:'center'}}>Semestre</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materias.map(m => (
                        <tr key={m.nombre}>
                          <td><div className="subject-name">{m.nombre}</div></td>
                          <td style={{textAlign:'center'}}><div className="grade" style={{color:'#00b4d8'}}>—</div></td>
                          <td style={{textAlign:'center'}}><div className="grade" style={{color:'#00b4d8'}}>—</div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Materia</th><th>Parcial 1</th><th>Parcial 2</th><th>TP</th><th>Promedio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materias.map(m => (
                        <tr key={m.nombre}>
                          <td>
                            <div className="subject-name">{m.nombre}</div>
                            <div className="subject-code">{m.profesor}</div>
                          </td>
                          {[m.parcial1, m.parcial2, m.tp].map((n, i) => (
                            <td key={i}>
                              <div className="grade" style={{ color: gradeColor[gradeClass(n)] }}>{n ?? '—'}</div>
                            </td>
                          ))}
                          <td>
                            <div style={{ textAlign:'center' }}>
                              <span className="avg-badge" style={{ background:avgBg[m.promClass], color:gradeColor[m.promClass] }}>
                                {m.promedio}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Right col */}
            <div className="right-col">

              {/* Próximos eventos */}
              <div className="card">
                <div className="card-header">
                  <div><h3>Próximos eventos</h3><p>Calendario académico</p></div>
                  <button className="card-action" onClick={() => navigate('/calendario')}>Ver →</button>
                </div>
                {eventos.map((ev, i) => (
                  <div key={i} className="event-item">
                    <div className="event-dot" style={{ background:dotColor[ev.tipo] }} />
                    <div style={{ flex:1 }}>
                      <div className="event-title">{ev.titulo}</div>
                      <div className="event-sub">{ev.sub}</div>
                    </div>
                    <div className="event-date">{ev.fecha}</div>
                  </div>
                ))}
              </div>

              {/* Asistencia */}
              <div className="card">
                <div className="card-header">
                  <div><h3>Asistencia</h3><p>Por materia</p></div>
                  <button className="card-action" onClick={() => navigate('/asistencia')}>Ver →</button>
                </div>
                {asistencias.map(a => (
                  <div key={a.nombre} className="att-item">
                    <div className="att-header">
                      <span className="att-name">{a.nombre}</span>
                      <span className={`att-pct ${a.clase}`}>{a.pct}%</span>
                    </div>
                    <div className="att-bar">
                      <div className={`att-fill ${a.clase}`} style={{ width:`${a.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* TPs pendientes */}
              <div className="card">
                <div className="card-header">
                  <div><h3>TPs pendientes</h3></div>
                  <button className="card-action" onClick={() => navigate('/puntajes')}>Ver 2 →</button>
                </div>
                {tps.map((tp, i) => (
                  <div key={i} className="tp-item">
                    <div className="tp-dot" />
                    <div style={{ flex:1 }}>
                      <div className="tp-name">{tp.nombre}</div>
                      <div className="tp-sub">{tp.materia}</div>
                    </div>
                    <div className="tp-due">{tp.fecha}</div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  )
}