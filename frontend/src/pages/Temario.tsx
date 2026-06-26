import { useState } from 'react'

interface Clase {
  semana: number
  titulo: string
  descripcion: string
  completada: boolean
}

interface MateriaTemario {
  materia: string
  profesor: string
  clases: Clase[]
}

const temarios: MateriaTemario[] = [
  {
    materia: 'Análisis Matemático I', profesor: 'Carlos Méndez',
    clases: [
      { semana: 1, titulo: 'Introducción a límites', descripcion: 'Concepto de límite, límites laterales, propiedades. Bibliografía: Stewart Cap. 2', completada: true },
      { semana: 2, titulo: 'Continuidad de funciones', descripcion: 'Funciones continuas, discontinuidades, teorema del valor intermedio.', completada: true },
      { semana: 3, titulo: 'Derivadas — definición', descripcion: 'Definición formal de derivada, reglas de derivación básicas.', completada: true },
      { semana: 4, titulo: 'Regla de la cadena', descripcion: 'Derivadas de funciones compuestas, derivadas implícitas.', completada: false },
      { semana: 5, titulo: 'Aplicaciones de derivadas', descripcion: 'Máximos y mínimos, optimización, regla de L\'Hôpital.', completada: false },
      { semana: 6, titulo: 'Integrales indefinidas', descripcion: 'Antiderivadas, técnicas de integración básicas.', completada: false },
    ],
  },
  {
    materia: 'Física I', profesor: 'Ana Torres',
    clases: [
      { semana: 1, titulo: 'Cinemática en 1D', descripcion: 'Posición, velocidad, aceleración. MRU y MRUA.', completada: true },
      { semana: 2, titulo: 'Cinemática en 2D', descripcion: 'Vectores, movimiento parabólico, movimiento circular.', completada: true },
      { semana: 3, titulo: 'Leyes de Newton', descripcion: 'Primera, segunda y tercera ley. Aplicaciones.', completada: true },
      { semana: 4, titulo: 'Trabajo y energía', descripcion: 'Trabajo de una fuerza, energía cinética, teorema trabajo-energía.', completada: false },
      { semana: 5, titulo: 'Energía potencial', descripcion: 'Fuerzas conservativas, energía potencial gravitatoria y elástica.', completada: false },
    ],
  },
  {
    materia: 'Programación I', profesor: 'Luis Paredes',
    clases: [
      { semana: 1, titulo: 'Introducción a C++', descripcion: 'Historia, compilación, primer programa. Variables y tipos de datos.', completada: true },
      { semana: 2, titulo: 'Estructuras de control', descripcion: 'If-else, switch, bucles for y while.', completada: true },
      { semana: 3, titulo: 'Funciones', descripcion: 'Declaración, definición, parámetros, valor de retorno, recursividad.', completada: true },
      { semana: 4, titulo: 'Arrays y strings', descripcion: 'Arrays unidimensionales y multidimensionales, manejo de strings.', completada: false },
      { semana: 5, titulo: 'Punteros', descripcion: 'Concepto de puntero, aritmética de punteros, punteros y arrays.', completada: false },
    ],
  },
]

const css = `
  .tem-root { display:flex; flex-direction:column; flex:1; font-family:'Inter',system-ui,sans-serif; }
  .topbar { display:flex; align-items:center; justify-content:space-between; padding:16px 28px; border-bottom:1px solid #1e2d3d; background:#0b0f14; position:sticky; top:0; z-index:10; }
  .topbar h1 { font-size:18px; font-weight:700; color:#f0f4f8; letter-spacing:-.01em; }
  .topbar p { font-size:11px; color:#506070; margin-top:1px; }
  .topbar-right { display:flex; align-items:center; gap:10px; }
  .topbar-btn { display:flex; align-items:center; justify-content:center; width:34px; height:34px; background:#131920; border:1px solid #243447; border-radius:8px; color:#8fa3b8; cursor:pointer; position:relative; }
  .topbar-btn svg { width:15px; height:15px; }
  .topbar-btn:hover { border-color:#00b4d8; color:#f0f4f8; }
  .topbar-btn .dot { position:absolute; top:6px; right:6px; width:7px; height:7px; background:#ef4444; border-radius:50%; border:2px solid #0b0f14; }
  .avatar { width:34px; height:34px; background:linear-gradient(135deg,#00b4d8,#0ea5e9); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; color:#000; cursor:pointer; }
  .content { padding:24px 28px; flex:1; }
  .main-grid { display:grid; grid-template-columns:240px 1fr; gap:18px; align-items:start; }
  .materias-panel { background:#131920; border:1px solid #1e2d3d; border-radius:14px; padding:12px; }
  .mat-label { font-size:10px; color:#506070; text-transform:uppercase; letter-spacing:.08em; padding:0 4px 10px; }
  .mat-item { padding:11px 12px; border-radius:8px; cursor:pointer; margin-bottom:3px; border:1px solid transparent; transition:all .14s; }
  .mat-item.active { background:#00b4d818; color:#00b4d8; border-color:#00b4d825; }
  .mat-item.inactive { background:transparent; color:#8fa3b8; }
  .mat-item.inactive:hover { background:#1a2230; color:#f0f4f8; }
  .mat-nombre { font-size:13px; font-weight:600; }
  .mat-pct { font-size:11px; margin-top:2px; opacity:.7; }
  .content-col { display:flex; flex-direction:column; gap:12px; }
  .header-card { background:#131920; border:1px solid #1e2d3d; border-radius:14px; padding:18px 20px; }
  .header-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
  .header-nombre { font-size:15px; font-weight:700; color:#f0f4f8; margin-bottom:2px; }
  .header-prof { font-size:12px; color:#506070; }
  .header-pct { font-size:20px; font-weight:800; color:#00b4d8; }
  .progress-bar { height:6px; background:#1e2d3d; border-radius:3px; overflow:hidden; margin-bottom:8px; }
  .progress-fill { height:100%; background:#00b4d8; border-radius:3px; transition:width .6s ease; }
  .progress-label { font-size:12px; color:#506070; }
  .clase-row { background:#131920; border:1px solid #1e2d3d; border-radius:10px; overflow:hidden; }
  .clase-btn { width:100%; display:flex; align-items:center; gap:14px; padding:14px 18px; border:none; background:transparent; cursor:pointer; text-align:left; font-family:inherit; transition:background .12s; }
  .clase-btn:hover { background:#1a2230; }
  .clase-indicator { width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; flex-shrink:0; }
  .clase-indicator.done { background:#15803d18; color:#22c55e; }
  .clase-indicator.pending { background:#1a2230; color:#506070; }
  .clase-semana { font-size:11px; color:#506070; margin-bottom:2px; }
  .clase-titulo { font-size:13px; font-weight:600; color:#f0f4f8; }
  .clase-badge { margin-left:auto; display:inline-flex; align-items:center; padding:2px 8px; border-radius:20px; font-size:10px; font-weight:600; flex-shrink:0; }
  .clase-badge.done { background:#15803d18; color:#22c55e; }
  .clase-badge.pending { background:#f59e0b18; color:#f59e0b; }
  .clase-chevron { width:14px; height:14px; color:#506070; transition:transform .15s; flex-shrink:0; }
  .clase-chevron.open { transform:rotate(180deg); }
  .clase-desc { padding:0 18px 14px 62px; font-size:13px; color:#8fa3b8; line-height:1.6; border-top:1px solid #1e2d3d; padding-top:12px; }
`

export default function Temario() {
  const [materiaActiva, setMateriaActiva] = useState(temarios[0].materia)
  const [claseAbierta, setClaseAbierta] = useState<number | null>(null)

  const temario = temarios.find(t => t.materia === materiaActiva)!
  const completadas = temario.clases.filter(c => c.completada).length
  const progreso = Math.round((completadas / temario.clases.length) * 100)

  return (
    <>
      <style>{css}</style>
      <div className="tem-root">

        {/* Topbar */}
        <header className="topbar">
          <div>
            <h1>Temario de clases</h1>
            <p>Cronograma semanal por materia</p>
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

        <div className="content">
          <div className="main-grid">

            {/* Panel materias */}
            <div className="materias-panel">
              <div className="mat-label">Materias</div>
              {temarios.map(t => {
                const comp = t.clases.filter(c => c.completada).length
                const pct = Math.round((comp / t.clases.length) * 100)
                const active = materiaActiva === t.materia
                return (
                  <div
                    key={t.materia}
                    className={`mat-item ${active ? 'active' : 'inactive'}`}
                    onClick={() => { setMateriaActiva(t.materia); setClaseAbierta(null) }}
                  >
                    <div className="mat-nombre">{t.materia}</div>
                    <div className="mat-pct">{pct}% completado</div>
                  </div>
                )
              })}
            </div>

            {/* Contenido */}
            <div className="content-col">

              {/* Header materia */}
              <div className="header-card">
                <div className="header-top">
                  <div>
                    <div className="header-nombre">{temario.materia}</div>
                    <div className="header-prof">Prof. {temario.profesor}</div>
                  </div>
                  <span className="header-pct">{progreso}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progreso}%` }} />
                </div>
                <div className="progress-label">{completadas} de {temario.clases.length} clases completadas</div>
              </div>

              {/* Clases */}
              {temario.clases.map(c => (
                <div key={c.semana} className="clase-row">
                  <button
                    className="clase-btn"
                    onClick={() => setClaseAbierta(claseAbierta === c.semana ? null : c.semana)}
                  >
                    <div className={`clase-indicator ${c.completada ? 'done' : 'pending'}`}>
                      {c.completada
                        ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14 }}><path d="M20 6L9 17l-5-5"/></svg>
                        : c.semana
                      }
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="clase-semana">Semana {c.semana}</div>
                      <div className="clase-titulo">{c.titulo}</div>
                    </div>
                    <span className={`clase-badge ${c.completada ? 'done' : 'pending'}`}>
                      {c.completada ? 'Completada' : 'Pendiente'}
                    </span>
                    <svg
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      className={`clase-chevron ${claseAbierta === c.semana ? 'open' : ''}`}
                    >
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                  {claseAbierta === c.semana && (
                    <div className="clase-desc">{c.descripcion}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}