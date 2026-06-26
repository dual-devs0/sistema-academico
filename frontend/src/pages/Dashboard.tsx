
const materias = [
  { nombre: 'Análisis Matemático I', profesor: 'Carlos Méndez', parcial1: 7.5, parcial2: 8.0, tp: 9.0, promedio: 8.2, promClass: 'mid' },
  { nombre: 'Física I', profesor: 'Ana Torres', parcial1: 6.0, parcial2: 7.5, tp: 8.5, promedio: 7.3, promClass: 'low' },
  { nombre: 'Matemática Discreta', profesor: 'Carlos Méndez', parcial1: 9.0, parcial2: null, tp: 8.0, promedio: 8.5, promClass: 'mid' },
  { nombre: 'Programación I', profesor: 'Luis Paredes', parcial1: 10.0, parcial2: 9.5, tp: 10.0, promedio: 9.8, promClass: 'high' },
]

const eventos = [
  { tipo: 'final', titulo: 'Final — Física I', sub: 'Ana Torres', fecha: '5 Ago' },
  { tipo: 'final', titulo: 'Final — Mat. Discreta', sub: 'Carlos Méndez', fecha: '7 Ago' },
  { tipo: 'final', titulo: 'Final — Análisis', sub: 'Carlos Méndez', fecha: '12 Ago' },
  { tipo: 'entrega', titulo: 'TP — Programación I', sub: 'Luis Paredes', fecha: '28 Jul' },
]

const asistencias = [
  { nombre: 'Análisis Matemático I', pct: 75, clase: 'warn' },
  { nombre: 'Física I', pct: 83, clase: 'ok' },
  { nombre: 'Programación I', pct: 100, clase: 'ok' },
]

const tps = [
  { nombre: 'Trabajo Práctico N° 3', materia: 'Programación I', fecha: '28 Jul' },
  { nombre: 'Informe — Laboratorio', materia: 'Física I', fecha: '2 Ago' },
]

const dotColor: Record<string, string> = {
  final: '#ef4444', entrega: '#f59e0b', parcial: '#a855f7', asueto: '#22c55e',
}

const gradeColor: Record<string, string> = {
  high: '#22c55e', mid: '#00b4d8', low: '#f59e0b', empty: '#506070',
}

const avgBg: Record<string, string> = {
  high: '#15803d18', mid: '#00b4d818', low: '#f59e0b18',
}

function gradeClass(n: number | null): string {
  if (n === null) return 'empty'
  if (n >= 8) return 'high'
  if (n >= 6.5) return 'mid'
  return 'low'
}

const css = `
  .dash-root { display:flex; min-height:100vh; background:#0b0f14; font-family:'Inter',system-ui,sans-serif; color:#f0f4f8; font-size:14px; }
  .topbar { display:flex; align-items:center; justify-content:space-between; padding:14px 28px; border-bottom:1px solid #1e2d3d; background:#0b0f14; position:sticky; top:0; z-index:10; }
  .topbar-left h1 { font-size:18px; font-weight:700; color:#f0f4f8; letter-spacing:-.01em; }
  .topbar-left p { font-size:11px; color:#506070; margin-top:1px; }
  .topbar-right { display:flex; align-items:center; gap:10px; }
  .topbar-btn { display:flex; align-items:center; justify-content:center; width:34px; height:34px; background:#131920; border:1px solid #243447; border-radius:8px; color:#8fa3b8; cursor:pointer; position:relative; }
  .topbar-btn svg { width:15px; height:15px; }
  .topbar-btn:hover { border-color:#00b4d8; color:#f0f4f8; }
  .topbar-btn .dot { position:absolute; top:6px; right:6px; width:7px; height:7px; background:#ef4444; border-radius:50%; border:2px solid #0b0f14; }
  .avatar { width:34px; height:34px; background:linear-gradient(135deg,#00b4d8,#0ea5e9); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; color:#000; cursor:pointer; flex-shrink:0; }
  .content { padding:24px 28px; flex:1; overflow-y:auto; }
  .welcome-banner { background:#131920; border:1px solid #1e2d3d; border-radius:14px; padding:20px 24px; display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; position:relative; overflow:hidden; }
  .welcome-banner::before { content:''; position:absolute; right:-40px; top:-40px; width:200px; height:200px; border-radius:50%; background:radial-gradient(circle,#00b4d814,transparent 70%); pointer-events:none; }
  .welcome-text h2 { font-size:17px; font-weight:700; color:#f0f4f8; margin-bottom:3px; }
  .welcome-text p { font-size:12px; color:#8fa3b8; }
  .semester-badge { display:flex; align-items:center; gap:7px; background:#00b4d818; border:1px solid #00b4d830; border-radius:8px; padding:8px 14px; font-size:12px; font-weight:600; color:#00b4d8; }
  .semester-badge svg { width:13px; height:13px; }
  .stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:24px; }
  .stat-card { background:#131920; border:1px solid #1e2d3d; border-radius:14px; padding:18px; display:flex; flex-direction:column; gap:10px; transition:border-color .15s; }
  .stat-card:hover { border-color:#243447; }
  .stat-card-top { display:flex; align-items:center; justify-content:space-between; }
  .stat-icon { width:34px; height:34px; border-radius:9px; display:flex; align-items:center; justify-content:center; }
  .stat-icon svg { width:17px; height:17px; }
  .stat-icon.cyan { background:#00b4d818; color:#00b4d8; }
  .stat-icon.green { background:#15803d18; color:#22c55e; }
  .stat-icon.yellow { background:#f59e0b18; color:#f59e0b; }
  .stat-icon.purple { background:#a855f718; color:#a855f7; }
  .stat-trend { font-size:10px; font-weight:600; display:flex; align-items:center; gap:3px; }
  .stat-trend.up { color:#22c55e; }
  .stat-trend.warn { color:#f59e0b; }
  .stat-value { font-size:26px; font-weight:800; color:#f0f4f8; line-height:1; }
  .stat-label { font-size:11px; color:#506070; }
  .stat-bar { height:3px; background:#1e2d3d; border-radius:2px; overflow:hidden; }
  .stat-bar-fill { height:100%; border-radius:2px; }
  .lower-grid { display:grid; grid-template-columns:1fr 300px; gap:18px; }
  .card { background:#131920; border:1px solid #1e2d3d; border-radius:14px; overflow:hidden; }
  .card-header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px 14px; border-bottom:1px solid #1e2d3d; }
  .card-header h3 { font-size:14px; font-weight:700; color:#f0f4f8; }
  .card-header p { font-size:11px; color:#506070; margin-top:1px; }
  .card-action { font-size:11px; color:#00b4d8; background:none; border:none; cursor:pointer; font-family:inherit; }
  .card-action:hover { opacity:.7; }
  table { width:100%; border-collapse:collapse; }
  thead th { padding:9px 20px; font-size:10px; font-weight:600; color:#506070; text-transform:uppercase; letter-spacing:.07em; text-align:left; border-bottom:1px solid #1e2d3d; white-space:nowrap; }
  thead th:not(:first-child) { text-align:center; }
  tbody td { padding:12px 20px; border-bottom:1px solid #1e2d3d44; vertical-align:middle; }
  tbody tr:last-child td { border-bottom:none; }
  tbody tr:hover { background:#1a2230; }
  .subject-name { font-size:13px; font-weight:600; color:#f0f4f8; }
  .subject-code { font-size:11px; color:#506070; margin-top:1px; }
  .grade { font-size:14px; font-weight:700; text-align:center; }
  .avg-badge { display:inline-block; padding:3px 10px; border-radius:6px; font-size:12px; font-weight:700; }
  .right-col { display:flex; flex-direction:column; gap:14px; }
  .event-item { display:flex; align-items:flex-start; gap:10px; padding:11px 18px; border-bottom:1px solid #1e2d3d44; }
  .event-item:last-child { border-bottom:none; }
  .event-item:hover { background:#1a2230; }
  .event-dot { width:7px; height:7px; border-radius:50%; margin-top:4px; flex-shrink:0; }
  .event-title { font-size:12px; font-weight:600; color:#f0f4f8; }
  .event-sub { font-size:11px; color:#506070; margin-top:1px; }
  .event-date { font-size:11px; color:#506070; white-space:nowrap; flex-shrink:0; }
  .att-item { padding:10px 18px; border-bottom:1px solid #1e2d3d44; }
  .att-item:last-child { border-bottom:none; }
  .att-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
  .att-name { font-size:12px; font-weight:600; color:#f0f4f8; }
  .att-pct { font-size:12px; font-weight:700; }
  .att-pct.ok { color:#22c55e; }
  .att-pct.warn { color:#f59e0b; }
  .att-bar { height:4px; background:#1e2d3d; border-radius:2px; overflow:hidden; }
  .att-fill { height:100%; border-radius:2px; }
  .att-fill.ok { background:#22c55e; }
  .att-fill.warn { background:#f59e0b; }
  .tp-item { display:flex; align-items:center; gap:10px; padding:11px 18px; border-bottom:1px solid #1e2d3d44; }
  .tp-item:last-child { border-bottom:none; }
  .tp-dot { width:7px; height:7px; border-radius:50%; background:#f59e0b; flex-shrink:0; }
  .tp-name { font-size:12px; font-weight:600; color:#f0f4f8; }
  .tp-sub { font-size:11px; color:#506070; margin-top:1px; }
  .tp-due { font-size:11px; color:#f59e0b; font-weight:500; white-space:nowrap; margin-left:auto; }
`

export default function Dashboard() {
  return (
    <>
      <style>{css}</style>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>

        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <h1>Dashboard</h1>
            <p>Semestre 1 — 2026</p>
          </div>
          <div className="topbar-right">
            <button className="topbar-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
            <button className="topbar-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              <span className="dot" />
            </button>

            <div className="avatar">MG</div>
          </div>
        </header>

        {/* Content */}
        <div className="content">

          {/* Welcome */}
          <div className="welcome-banner">
            <div className="welcome-text">
              <h2>¡Bienvenida, María González! 👋</h2>
              <p>Ing. Informática · 2° año · Legajo 2024-0123 · <span style={{ color: '#22c55e', fontWeight: 600 }}>★ Becada</span></p>
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
            {[
              { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>, cls: 'cyan', value: '5', label: 'Materias cursando', trend: '↑ activo', trendCls: 'up' },
              { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>, cls: 'green', value: '8.4', label: 'Promedio general', trend: '↑ bueno', trendCls: 'up', bar: 84, barColor: '#22c55e', valueColor: '#22c55e' },
              { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>, cls: 'yellow', value: '92%', label: 'Asistencia promedio', trend: '↑ ok', trendCls: 'up', bar: 92, barColor: '#f59e0b', valueColor: '#f59e0b' },
              { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, cls: 'purple', value: '2', label: 'TPs pendientes', trend: '⚠ pendiente', trendCls: 'warn', valueColor: '#a855f7' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-card-top">
                  <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
                  <span className={`stat-trend ${s.trendCls}`}>{s.trend}</span>
                </div>
                <div>
                  <div className="stat-value" style={{ color: s.valueColor }}>{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
                {s.bar && (
                  <div className="stat-bar">
                    <div className="stat-bar-fill" style={{ width: `${s.bar}%`, background: s.barColor }} />
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
                <div>
                  <h3>Mis puntajes</h3>
                  <p>Semestre 1 · 2026</p>
                </div>
                <button className="card-action">Ver todo →</button>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Materia</th>
                    <th>Parcial 1</th>
                    <th>Parcial 2</th>
                    <th>TP</th>
                    <th>Promedio</th>
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
                          <div className="grade" style={{ color: gradeColor[gradeClass(n)] }}>
                            {n ?? '—'}
                          </div>
                        </td>
                      ))}
                      <td>
                        <div style={{ textAlign: 'center' }}>
                          <span className="avg-badge" style={{ background: avgBg[m.promClass], color: gradeColor[m.promClass] }}>
                            {m.promedio}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Right col */}
            <div className="right-col">

              {/* Próximos eventos */}
              <div className="card">
                <div className="card-header">
                  <div><h3>Próximos eventos</h3><p>Calendario académico</p></div>
                  <button className="card-action">Ver →</button>
                </div>
                {eventos.map((ev, i) => (
                  <div key={i} className="event-item">
                    <div className="event-dot" style={{ background: dotColor[ev.tipo] }} />
                    <div style={{ flex: 1 }}>
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
                </div>
                {asistencias.map(a => (
                  <div key={a.nombre} className="att-item">
                    <div className="att-header">
                      <span className="att-name">{a.nombre}</span>
                      <span className={`att-pct ${a.clase}`}>{a.pct}%</span>
                    </div>
                    <div className="att-bar">
                      <div className={`att-fill ${a.clase}`} style={{ width: `${a.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* TPs pendientes */}
              <div className="card">
                <div className="card-header">
                  <div><h3>TPs pendientes</h3></div>
                  <button className="card-action">2</button>
                </div>
                {tps.map((tp, i) => (
                  <div key={i} className="tp-item">
                    <div className="tp-dot" />
                    <div style={{ flex: 1 }}>
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