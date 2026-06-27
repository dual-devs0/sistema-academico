type MateriaData = {
  nombre: string
  profesor: string
  parcial1: number | null
  parcial2: number | null
  tp: number | null
  final: number | null
  promedio: number
  promColor: string
  promBg: string
}

const materias: MateriaData[] = [
  { nombre: 'Análisis Matemático I', profesor: 'Carlos Méndez', parcial1: 7.5, parcial2: 8, tp: 9, final: null, promedio: 8.2, promColor: '#00b4d8', promBg: '#00b4d818' },
  { nombre: 'Física I', profesor: 'Ana Torres', parcial1: 6, parcial2: 7.5, tp: 8.5, final: null, promedio: 7.3, promColor: '#f59e0b', promBg: '#f59e0b18' },
  { nombre: 'Matemática Discreta', profesor: 'Carlos Méndez', parcial1: 9, parcial2: null, tp: 8, final: null, promedio: 8.5, promColor: '#00b4d8', promBg: '#00b4d818' },
  { nombre: 'Programación I', profesor: 'Luis Paredes', parcial1: 10, parcial2: 9.5, tp: 10, final: null, promedio: 9.8, promColor: '#22c55e', promBg: '#15803d18' },
  { nombre: 'Historia y Filosofía', profesor: 'Pedro Rojas', parcial1: 7, parcial2: 6.5, tp: 8, final: null, promedio: 7.2, promColor: '#f59e0b', promBg: '#f59e0b18' },
]

function colorNota(n: number | null): string {
  if (n === null) return '#506070'
  if (n >= 8) return '#22c55e'
  if (n >= 6.5) return '#00b4d8'
  return '#f59e0b'
}

const css = `
  .puntajes-root { display:flex; flex-direction:column; flex:1; font-family:'Inter',system-ui,sans-serif; }
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
  .toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
  .toolbar-left { font-size:13px; color:#8fa3b8; }
  .toolbar-left strong { color:#00b4d8; }
  .toolbar-right { display:flex; gap:10px; }
  .btn-secondary { display:inline-flex; align-items:center; gap:7px; padding:8px 16px; background:#131920; border:1px solid #243447; border-radius:9px; color:#8fa3b8; font-size:12px; font-weight:500; font-family:inherit; cursor:pointer; transition:border-color .15s,color .15s; }
  .btn-secondary:hover { border-color:#00b4d8; color:#f0f4f8; }
  .btn-secondary svg { width:13px; height:13px; }
  select { background:#131920; border:1px solid #243447; border-radius:9px; color:#f0f4f8; font-size:12px; font-family:inherit; outline:none; padding:8px 32px 8px 12px; cursor:pointer; appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23506070' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 10px center; }
  select option { background:#1a2230; }
  .materia-card { background:#131920; border:1px solid #1e2d3d; border-radius:14px; overflow:hidden; margin-bottom:14px; transition:border-color .15s; }
  .materia-card:hover { border-color:#243447; }
  .materia-header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px 14px; border-bottom:1px solid #1e2d3d; }
  .materia-nombre { font-size:15px; font-weight:700; color:#f0f4f8; margin-bottom:2px; }
  .materia-prof { font-size:11px; color:#506070; }
  .materia-prom { display:flex; align-items:center; gap:8px; }
  .materia-prom span:first-child { font-size:11px; color:#506070; }
  .prom-badge { padding:3px 10px; border-radius:6px; font-size:12px; font-weight:700; }
  .notas-grid { display:grid; grid-template-columns:repeat(4,1fr); }
  .nota-cell { padding:20px; text-align:center; border-right:1px solid #1e2d3d; }
  .nota-cell:last-child { border-right:none; }
  .nota-label { font-size:10px; color:#506070; text-transform:uppercase; letter-spacing:.07em; margin-bottom:10px; }
  .nota-val { font-size:22px; font-weight:700; }
  .nota-empty { font-size:13px; color:#506070; }
`

export default function Puntajes() {
  return (
    <>
      <style>{css}</style>
      <div className="puntajes-root">

        {/* Topbar */}
        <header className="topbar">
          <div>
            <h1>Mis puntajes</h1>
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

        <div className="content">

          {/* Toolbar */}
          <div className="toolbar">
            <div className="toolbar-left">
              5 materias · Promedio general: <strong>8.4</strong>
            </div>
            <div className="toolbar-right">
              <select>
                <option>Semestre 1 · 2026</option>
                <option>Semestre 2 · 2025</option>
              </select>
              <button className="btn-secondary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Exportar
              </button>
            </div>
          </div>

          {/* Cards de materias */}
          {materias.map(m => (
            <div key={m.nombre} className="materia-card">
              <div className="materia-header">
                <div>
                  <div className="materia-nombre">{m.nombre}</div>
                  <div className="materia-prof">Prof. {m.profesor}</div>
                </div>
                <div className="materia-prom">
                  <span>Promedio parcial:</span>
                  <span className="prom-badge" style={{ background: m.promBg, color: m.promColor }}>
                    {m.promedio}
                  </span>
                </div>
              </div>
              <div className="notas-grid">
                {[
                  { label: 'Parcial 1', valor: m.parcial1 },
                  { label: 'Parcial 2', valor: m.parcial2 },
                  { label: 'Trab. Práctico', valor: m.tp },
                  { label: 'Final', valor: m.final },
                ].map(n => (
                  <div key={n.label} className="nota-cell">
                    <div className="nota-label">{n.label}</div>
                    {n.valor !== null
                      ? <div className="nota-val" style={{ color: colorNota(n.valor) }}>{n.valor}</div>
                      : <div className="nota-empty">—</div>
                    }
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}