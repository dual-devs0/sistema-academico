import React from 'react'

const CYAN   = '#00b4d8'
const GREEN  = '#22c55e'
const YELLOW = '#f59e0b'
const RED    = '#ef4444'
const PURPLE = '#a855f7'
const BLUE   = '#3b82f6'

const reportes = [
  {
    id: 1,
    titulo: 'Reporte de asistencia general',
    descripcion: 'Asistencia de todos los alumnos por materia y fecha',
    tipo: 'asistencia',
    generado: '2026-06-20',
  },
  {
    id: 2,
    titulo: 'Reporte de puntajes por carrera',
    descripcion: 'Promedios y distribución de notas por carrera',
    tipo: 'puntajes',
    generado: '2026-06-20',
  },
  {
    id: 3,
    titulo: 'Reporte de alumnos becados',
    descripcion: 'Lista completa de alumnos con beca activa',
    tipo: 'becados',
    generado: '2026-06-19',
  },
  {
    id: 4,
    titulo: 'Reporte de materias y docentes',
    descripcion: 'Materias activas con profesor asignado y cantidad de alumnos',
    tipo: 'materias',
    generado: '2026-06-18',
  },
]

const carreras = [
  { carrera: 'Ing. Informática', alumnos: 125, asistencia: '89%', aprobados: '92%', riesgo: 10 },
  { carrera: 'Ing. Civil',       alumnos: 80,  asistencia: '85%', aprobados: '88%', riesgo: 8  },
  { carrera: 'Arquitectura',     alumnos: 40,  asistencia: '91%', aprobados: '94%', riesgo: 3  },
]

const tipoConfig: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  asistencia: {
    color: GREEN,
    bg: '#15803d18',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  },
  puntajes: {
    color: BLUE,
    bg: '#3b82f618',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  },
  becados: {
    color: PURPLE,
    bg: '#a855f718',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  },
  materias: {
    color: YELLOW,
    bg: '#f59e0b18',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>,
  },
}

const css = `
  .rep-root { display:flex; flex-direction:column; flex:1; font-family:'Inter',system-ui,sans-serif; }
  .topbar { display:flex; align-items:center; justify-content:space-between; padding:16px 28px; border-bottom:1px solid #1e2d3d; background:#0b0f14; position:sticky; top:0; z-index:10; }
  .topbar h1 { font-size:18px; font-weight:700; color:#f0f4f8; letter-spacing:-.01em; font-family:'Plus Jakarta Sans',sans-serif; }
  .topbar p { font-size:11px; color:#506070; margin-top:1px; }
  .topbar-right { display:flex; align-items:center; gap:10px; }
  .topbar-btn { display:flex; align-items:center; justify-content:center; width:34px; height:34px; background:#131920; border:1px solid #243447; border-radius:8px; color:#8fa3b8; cursor:pointer; }
  .topbar-btn svg { width:15px; height:15px; }
  .topbar-btn:hover { border-color:#00b4d8; color:#f0f4f8; }
  .avatar { width:34px; height:34px; background:linear-gradient(135deg,#00b4d8,#0ea5e9); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; color:#000; cursor:pointer; }
  .content { padding:24px 28px; flex:1; }
  .kpi-row { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:20px; }
  .kpi { background:#131920; border:1px solid #1e2d3d; border-radius:14px; padding:18px; display:flex; flex-direction:column; gap:12px; }
  .kpi-value { font-size:28px; font-weight:800; line-height:1; font-family:'Plus Jakarta Sans',sans-serif; }
  .kpi-label { font-size:11px; color:#506070; margin-top:3px; }
  .kpi-bar { height:3px; background:#1e2d3d; border-radius:2px; overflow:hidden; }
  .kpi-bar-fill { height:100%; border-radius:2px; }
  .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .card { background:#131920; border:1px solid #1e2d3d; border-radius:14px; overflow:hidden; }
  .card-header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px 14px; border-bottom:1px solid #1e2d3d; }
  .card-header h3 { font-size:14px; font-weight:700; color:#f0f4f8; font-family:'Plus Jakarta Sans',sans-serif; }
  .card-header p { font-size:11px; color:#506070; margin-top:2px; }
  .btn-primary { display:inline-flex; align-items:center; gap:6px; padding:8px 16px; background:#00b4d8; border:none; border-radius:9px; color:#000; font-size:12px; font-weight:700; font-family:inherit; cursor:pointer; }
  .btn-primary:hover { opacity:.88; }
  .btn-primary svg { width:13px; height:13px; }
  .btn-secondary { display:inline-flex; align-items:center; gap:6px; padding:8px 14px; background:#1a2230; border:1px solid #243447; border-radius:9px; color:#8fa3b8; font-size:12px; font-weight:500; font-family:inherit; cursor:pointer; }
  .btn-secondary:hover { border-color:#00b4d8; color:#f0f4f8; }
  .btn-secondary svg { width:13px; height:13px; }
  .rep-item { display:flex; align-items:center; gap:16px; padding:16px 20px; border-bottom:1px solid #1e2d3d44; }
  .rep-item:last-child { border-bottom:none; }
  .rep-item:hover { background:#1a2230; }
  .rep-icon { width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .rep-info { flex:1; }
  .rep-title { font-size:13px; font-weight:600; color:#f0f4f8; margin-bottom:2px; }
  .rep-desc { font-size:11px; color:#506070; }
  .rep-actions { display:flex; gap:8px; flex-shrink:0; }
  .sum-table { width:100%; border-collapse:collapse; }
  .sum-table th { padding:9px 18px; font-size:10px; font-weight:600; color:#506070; text-transform:uppercase; letter-spacing:.07em; text-align:left; border-bottom:1px solid #1e2d3d; }
  .sum-table th.center { text-align:center; }
  .sum-table td { padding:12px 18px; border-bottom:1px solid #1e2d3d44; font-size:13px; }
  .sum-table tr:last-child td { border-bottom:none; }
  .sum-table tr:hover td { background:#1a2230; }
  .sum-table td.center { text-align:center; }
`

export default function Reportes() {
  const kpis = [
    { value: '245', label: 'Total alumnos',    color: CYAN,   bar: 100 },
    { value: '87',  label: 'Alumnos becados',  color: GREEN,  bar: 36  },
    { value: '18',  label: 'Materias activas', color: PURPLE, bar: 72  },
    { value: '12',  label: 'Docentes',         color: YELLOW, bar: 48  },
  ]

  return (
    <>
      <style>{css}</style>
      <div className="rep-root">

        <header className="topbar">
          <div>
            <h1>Reportes globales</h1>
            <p>Panel de administración</p>
          </div>
          <div className="topbar-right">
            <button className="topbar-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            <button className="topbar-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
            </button>
            <div className="avatar">MG</div>
          </div>
        </header>

        <div className="content">

          {/* KPIs */}
          <div className="kpi-row">
            {kpis.map(k => (
              <div key={k.label} className="kpi">
                <div>
                  <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
                  <div className="kpi-label">{k.label}</div>
                </div>
                <div className="kpi-bar">
                  <div className="kpi-bar-fill" style={{ width: `${k.bar}%`, background: k.color }} />
                </div>
              </div>
            ))}
          </div>

          {/* Dos columnas */}
          <div className="grid-2">

            {/* Lista de reportes */}
            <div className="card">
              <div className="card-header">
                <div><h3>Reportes disponibles</h3></div>
                <button className="btn-primary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Exportar todo
                </button>
              </div>
              <div>
                {reportes.map(r => {
                  const cfg = tipoConfig[r.tipo]
                  return (
                    <div key={r.id} className="rep-item">
                      <div className="rep-icon" style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.icon}
                      </div>
                      <div className="rep-info">
                        <div className="rep-title">{r.titulo}</div>
                        <div className="rep-desc">
                          {r.descripcion} · Generado: {new Date(r.generado).toLocaleDateString('es-PY')}
                        </div>
                      </div>
                      <div className="rep-actions">
                        <button className="btn-secondary">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          Ver
                        </button>
                        <button className="btn-primary">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          Exportar
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Tabla resumen */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h3>Resumen por carrera</h3>
                  <p>Asistencia y aprobación</p>
                </div>
              </div>
              <table className="sum-table">
                <thead>
                  <tr>
                    <th>Carrera</th>
                    <th className="center">Alumnos</th>
                    <th className="center">Asistencia</th>
                    <th className="center">Aprobados</th>
                    <th className="center">En riesgo</th>
                  </tr>
                </thead>
                <tbody>
                  {carreras.map(row => (
                    <tr key={row.carrera}>
                      <td style={{ fontWeight: 600, color: '#f0f4f8' }}>{row.carrera}</td>
                      <td className="center" style={{ color: '#8fa3b8' }}>{row.alumnos}</td>
                      <td className="center" style={{ color: GREEN, fontWeight: 700 }}>{row.asistencia}</td>
                      <td className="center" style={{ color: CYAN,  fontWeight: 700 }}>{row.aprobados}</td>
                      <td className="center" style={{ color: RED,   fontWeight: 700 }}>{row.riesgo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}