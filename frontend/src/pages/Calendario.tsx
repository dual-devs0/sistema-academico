import { useState } from 'react'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

type TipoEvento = 'parcial' | 'final' | 'feriado' | 'asueto' | 'entrega' | 'actividad'

interface Evento {
  date: string
  tipo: TipoEvento
  nombre: string
  materia: string
}

const eventos: Evento[] = [
  { date: '2026-03-10', tipo: 'actividad', nombre: 'Inicio del semestre', materia: 'General' },
  { date: '2026-03-20', tipo: 'entrega', nombre: 'TP Nº1 - Cálculo', materia: 'Análisis Matemático I' },
  { date: '2026-04-02', tipo: 'feriado', nombre: 'Semana Santa', materia: 'General' },
  { date: '2026-04-15', tipo: 'parcial', nombre: 'Parcial 1 — Física I', materia: 'Física I' },
  { date: '2026-04-17', tipo: 'parcial', nombre: 'Parcial 1 — Mat. Discreta', materia: 'Matemática Discreta' },
  { date: '2026-04-22', tipo: 'parcial', nombre: 'Parcial 1 — Análisis', materia: 'Análisis Matemático I' },
  { date: '2026-05-01', tipo: 'asueto', nombre: 'Día del Trabajador', materia: 'General' },
  { date: '2026-05-14', tipo: 'asueto', nombre: 'Independencia PY', materia: 'General' },
  { date: '2026-06-10', tipo: 'parcial', nombre: 'Parcial 2 — Física I', materia: 'Física I' },
  { date: '2026-06-18', tipo: 'entrega', nombre: 'TP Nº2 — Cálculo', materia: 'Análisis Matemático I' },
  { date: '2026-06-25', tipo: 'parcial', nombre: 'Parcial 2 — Análisis', materia: 'Análisis Matemático I' },
  { date: '2026-08-05', tipo: 'final', nombre: 'Final — Física I', materia: 'Física I' },
  { date: '2026-08-07', tipo: 'final', nombre: 'Final — Mat. Discreta', materia: 'Matemática Discreta' },
  { date: '2026-08-12', tipo: 'final', nombre: 'Final — Análisis', materia: 'Análisis Matemático I' },
]

const tipoEstilo: Record<TipoEvento, { color: string; bg: string; border: string }> = {
  parcial:   { color: '#a855f7', bg: '#a855f718', border: '#a855f733' },
  final:     { color: '#ef4444', bg: '#ef444418', border: '#ef444433' },
  feriado:   { color: '#506070', bg: '#1a2230',   border: '#50607033' },
  asueto:    { color: '#22c55e', bg: '#15803d18', border: '#22c55e33' },
  entrega:   { color: '#f59e0b', bg: '#f59e0b18', border: '#f59e0b33' },
  actividad: { color: '#00b4d8', bg: '#00b4d818', border: '#00b4d833' },
}

const leyenda: { label: string; color: string }[] = [
  { label: 'Parcial', color: '#a855f7' },
  { label: 'Final', color: '#ef4444' },
  { label: 'Feriado', color: '#506070' },
  { label: 'Asueto', color: '#22c55e' },
  { label: 'Entrega', color: '#f59e0b' },
  { label: 'Actividad', color: '#00b4d8' },
]

function eventosDelDia(y: number, m: number, d: number) {
  const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  return eventos.filter(e => e.date === key)
}

const css = `
  .cal-root { display:flex; flex-direction:column; flex:1; font-family:'Inter',system-ui,sans-serif; }
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
  .main-grid { display:grid; grid-template-columns:1fr 240px; gap:18px; align-items:start; }
  .card { background:#131920; border:1px solid #1e2d3d; border-radius:14px; overflow:hidden; }
  .leyenda-bar { display:flex; align-items:center; gap:16px; flex-wrap:wrap; padding:12px 20px; border-bottom:1px solid #1e2d3d; }
  .ley-item { display:flex; align-items:center; gap:6px; font-size:11px; color:#8fa3b8; }
  .ley-dot { width:9px; height:9px; border-radius:50%; flex-shrink:0; }
  .nav-bar { display:flex; align-items:center; justify-content:space-between; padding:14px 20px; border-bottom:1px solid #1e2d3d; }
  .nav-mes { font-size:15px; font-weight:700; color:#f0f4f8; }
  .nav-btn { display:inline-flex; align-items:center; gap:6px; padding:6px 14px; background:#1a2230; border:1px solid #243447; border-radius:8px; color:#8fa3b8; font-size:12px; font-family:inherit; cursor:pointer; transition:border-color .15s,color .15s; }
  .nav-btn:hover { border-color:#00b4d8; color:#f0f4f8; }
  .dias-header { display:grid; grid-template-columns:repeat(7,1fr); gap:4px; padding:12px 16px 8px; }
  .dia-label { text-align:center; font-size:10px; color:#506070; font-weight:600; text-transform:uppercase; letter-spacing:.06em; }
  .cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:4px; padding:0 16px 16px; }
  .dia-cell { min-height:70px; border:1px solid #1e2d3d; border-radius:8px; padding:7px; cursor:pointer; transition:background .12s; background:#0b0f14; }
  .dia-cell:hover { background:#1a2230; }
  .dia-cell.today { border-color:#00b4d8; background:#00b4d808; }
  .dia-num { font-size:12px; margin-bottom:4px; }
  .dia-num.normal { color:#8fa3b8; font-weight:400; }
  .dia-num.has-ev { color:#f0f4f8; font-weight:700; }
  .dia-num.today-num { color:#00b4d8; font-weight:700; }
  .ev-chip { border-radius:4px; padding:2px 5px; font-size:9px; font-weight:600; margin-top:3px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; line-height:1.3; }
  .right-col { display:flex; flex-direction:column; gap:14px; }
  .card-header { display:flex; align-items:center; justify-content:space-between; padding:14px 18px 12px; border-bottom:1px solid #1e2d3d; }
  .card-header h3 { font-size:13px; font-weight:700; color:#f0f4f8; }
  .ev-item { display:flex; align-items:center; gap:10px; padding:10px 16px; border-bottom:1px solid #1e2d3d44; }
  .ev-item:last-child { border-bottom:none; }
  .ev-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
  .ev-title { font-size:12px; font-weight:600; }
  .ev-sub { font-size:11px; color:#506070; margin-top:1px; }
  .ev-date { font-size:11px; color:#506070; white-space:nowrap; margin-left:auto; }
  .empty-panel { padding:16px; font-size:12px; color:#506070; }
`

export default function Calendario() {
  const hoy = new Date()
  const [actual, setActual] = useState(new Date(2026, 3, 1))
  const [selEvs, setSelEvs] = useState<Evento[]>([])
  const [selDia, setSelDia] = useState('')

  const y = actual.getFullYear()
  const m = actual.getMonth()
  const primerDia = new Date(y, m, 1).getDay()
  const diasEnMes = new Date(y, m + 1, 0).getDate()

  const proximosEventos = eventos
    .filter(e => new Date(e.date) >= hoy)
    .slice(0, 4)

  function seleccionarDia(d: number) {
    const evs = eventosDelDia(y, m, d)
    setSelEvs(evs)
    setSelDia(`${d} de ${MESES[m]} ${y}`)
  }

  return (
    <>
      <style>{css}</style>
      <div className="cal-root">

        {/* Topbar */}
        <header className="topbar">
          <div>
            <h1>Calendario académico</h1>
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
          <div className="main-grid">

            {/* Calendario */}
            <div className="card">
              <div className="leyenda-bar">
                {leyenda.map(l => (
                  <div key={l.label} className="ley-item">
                    <div className="ley-dot" style={{ background: l.color }} />
                    {l.label}
                  </div>
                ))}
              </div>

              <div className="nav-bar">
                <button className="nav-btn" onClick={() => setActual(new Date(y, m - 1, 1))}>← Anterior</button>
                <span className="nav-mes">{MESES[m]} {y}</span>
                <button className="nav-btn" onClick={() => setActual(new Date(y, m + 1, 1))}>Siguiente →</button>
              </div>

              <div className="dias-header">
                {DIAS.map(d => <div key={d} className="dia-label">{d}</div>)}
              </div>

              <div className="cal-grid">
                {Array.from({ length: primerDia }).map((_, i) => <div key={`e-${i}`} />)}
                {Array.from({ length: diasEnMes }).map((_, i) => {
                  const d = i + 1
                  const evs = eventosDelDia(y, m, d)
                  const esHoy = hoy.getFullYear() === y && hoy.getMonth() === m && hoy.getDate() === d
                  const tieneEvs = evs.length > 0
                  return (
                    <div
                      key={d}
                      className={`dia-cell${esHoy ? ' today' : ''}`}
                      onClick={() => seleccionarDia(d)}
                    >
                      <div className={`dia-num ${esHoy ? 'today-num' : tieneEvs ? 'has-ev' : 'normal'}`}>{d}</div>
                      {evs.slice(0, 2).map((e, idx) => (
                        <div key={idx} className="ev-chip" style={{
                          color: tipoEstilo[e.tipo].color,
                          background: tipoEstilo[e.tipo].bg,
                          border: `1px solid ${tipoEstilo[e.tipo].border}`,
                        }}>
                          {e.nombre}
                        </div>
                      ))}
                      {evs.length > 2 && (
                        <div style={{ fontSize: '9px', color: '#506070', marginTop: '2px' }}>+{evs.length - 2} más</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Panel derecho */}
            <div className="right-col">

              {/* Próximos eventos */}
              <div className="card">
                <div className="card-header"><h3>Próximos eventos</h3></div>
                {proximosEventos.map((e, i) => {
                  const fecha = new Date(e.date + 'T00:00:00')
                  return (
                    <div key={i} className="ev-item">
                      <div className="ev-dot" style={{ background: tipoEstilo[e.tipo].color }} />
                      <div style={{ flex: 1 }}>
                        <div className="ev-title" style={{ color: tipoEstilo[e.tipo].color }}>{e.nombre}</div>
                        <div className="ev-sub">{e.materia}</div>
                      </div>
                      <div className="ev-date">{fecha.getDate()} {MESES[fecha.getMonth()].slice(0, 3)}</div>
                    </div>
                  )
                })}
              </div>

              {/* Día seleccionado */}
              <div className="card">
                <div className="card-header">
                  <h3>{selDia || 'Día seleccionado'}</h3>
                </div>
                {selEvs.length === 0
                  ? <div className="empty-panel">{selDia ? 'Sin eventos este día.' : 'Hacé clic en un día para ver sus eventos.'}</div>
                  : selEvs.map((e, i) => (
                    <div key={i} className="ev-item">
                      <div className="ev-dot" style={{ background: tipoEstilo[e.tipo].color }} />
                      <div>
                        <div className="ev-title" style={{ color: tipoEstilo[e.tipo].color }}>{e.nombre}</div>
                        <div className="ev-sub">{e.materia}</div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}