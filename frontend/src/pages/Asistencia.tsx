type Clase = { presente: boolean }

type MateriaAsistencia = {
  nombre: string
  codigo: string
  clases: Clase[]
}

const asistencias: MateriaAsistencia[] = [
  { nombre: 'Análisis Matemático I', codigo: 'CYTI11', clases: [true,true,true,true,true,true,false,false].map(p=>({presente:p})) },
  { nombre: 'Física I', codigo: 'CYTI12', clases: [true,true,true,true,true,false].map(p=>({presente:p})) },
  { nombre: 'Programación I', codigo: 'CYTI16', clases: [true,true,true,true,true,true].map(p=>({presente:p})) },
  { nombre: 'Matemática Discreta', codigo: 'CYTI13', clases: [true,true,true,true,false,false].map(p=>({presente:p})) },
  { nombre: 'Historia y Filosofía', codigo: 'CYTD5', clases: [true,true,true,true,true,false].map(p=>({presente:p})) },
]

function pct(clases: Clase[]) {
  return Math.round((clases.filter(c => c.presente).length / clases.length) * 100)
}

function pctColor(p: number) {
  if (p >= 80) return { color: '#22c55e', bg: '#15803d18' }
  if (p >= 65) return { color: '#f59e0b', bg: '#f59e0b18' }
  return { color: '#ef4444', bg: '#ef444418' }
}

function barColor(p: number) {
  if (p >= 80) return '#22c55e'
  if (p >= 65) return '#f59e0b'
  return '#ef4444'
}

const css = `
  .asist-root { display:flex; flex-direction:column; flex:1; font-family:'Inter',system-ui,sans-serif; }
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
  select { background:#131920; border:1px solid #243447; border-radius:9px; color:#f0f4f8; font-size:12px; font-family:inherit; outline:none; padding:8px 32px 8px 12px; cursor:pointer; appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23506070' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 10px center; }
  select option { background:#1a2230; }
  .materia-card { background:#131920; border:1px solid #1e2d3d; border-radius:14px; padding:20px; margin-bottom:14px; transition:border-color .15s; }
  .materia-card:hover { border-color:#243447; }
  .materia-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
  .materia-nombre { font-size:15px; font-weight:700; color:#f0f4f8; margin-bottom:3px; }
  .materia-info { font-size:11px; color:#506070; }
  .materia-info .pres { color:#22c55e; }
  .materia-info .aus { color:#ef4444; }
  .pct-badge { font-size:18px; font-weight:800; padding:6px 14px; border-radius:8px; }
  .bar-track { height:6px; background:#1e2d3d; border-radius:3px; margin-bottom:14px; overflow:hidden; }
  .bar-fill { height:100%; border-radius:3px; transition:width .6s ease; }
  .clases-grid { display:flex; flex-wrap:wrap; gap:6px; }
  .clase-dot { display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:6px; font-size:12px; font-weight:700; }
  .clase-dot.pres { background:#15803d18; color:#22c55e; border:1px solid #22c55e30; }
  .clase-dot.aus { background:#ef444418; color:#ef4444; border:1px solid #ef444430; }
`

export default function Asistencia() {
  return (
    <>
      <style>{css}</style>
      <div className="asist-root">

        {/* Topbar */}
        <header className="topbar">
          <div>
            <h1>Mi asistencia</h1>
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
              Asistencia promedio general: <strong>85%</strong>
            </div>
            <select>
              <option>Semestre 1 · 2026</option>
              <option>Semestre 2 · 2025</option>
            </select>
          </div>

          {/* Cards */}
          {asistencias.map(a => {
            const p = pct(a.clases)
            const presentes = a.clases.filter(c => c.presente).length
            const ausentes = a.clases.length - presentes
            const { color, bg } = pctColor(p)
            return (
              <div key={a.nombre} className="materia-card">
                <div className="materia-top">
                  <div>
                    <div className="materia-nombre">{a.nombre}</div>
                    <div className="materia-info">
                      {a.codigo} · <span className="pres">✓ {presentes} presentes</span> · <span className="aus">✗ {ausentes} ausentes</span> · {a.clases.length} clases totales
                    </div>
                  </div>
                  <span className="pct-badge" style={{ color, background: bg }}>{p}%</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${p}%`, background: barColor(p) }} />
                </div>
                <div className="clases-grid">
                  {a.clases.map((c, i) => (
                    <span key={i} className={`clase-dot ${c.presente ? 'pres' : 'aus'}`}>
                      {c.presente ? '✓' : '✗'}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}