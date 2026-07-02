import { useState, useEffect } from 'react'
import { api } from '../lib/api'

const MESES   = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS_L  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const DIAS_S  = ['D','L','M','M','J','V','S']

type TipoEvento = 'parcial' | 'final' | 'feriado' | 'asueto' | 'entrega' | 'actividad'

interface Evento {
  date: string
  tipo: TipoEvento
  nombre: string
  materia: string
}

const mockEventos: Evento[] = [
  { date:'2026-03-10', tipo:'actividad', nombre:'Inicio del semestre',      materia:'General'               },
  { date:'2026-03-20', tipo:'entrega',   nombre:'TP Nº1 — Cálculo',         materia:'Análisis Matemático I' },
  { date:'2026-04-02', tipo:'feriado',   nombre:'Semana Santa',             materia:'General'               },
  { date:'2026-04-15', tipo:'parcial',   nombre:'Parcial 1 — Física I',     materia:'Física I'              },
  { date:'2026-04-17', tipo:'parcial',   nombre:'Parcial 1 — Mat. Discreta',materia:'Matemática Discreta'   },
  { date:'2026-04-22', tipo:'parcial',   nombre:'Parcial 1 — Análisis',     materia:'Análisis Matemático I' },
  { date:'2026-05-01', tipo:'asueto',    nombre:'Día del Trabajador',       materia:'General'               },
  { date:'2026-05-14', tipo:'asueto',    nombre:'Independencia PY',         materia:'General'               },
  { date:'2026-06-10', tipo:'parcial',   nombre:'Parcial 2 — Física I',     materia:'Física I'              },
  { date:'2026-06-18', tipo:'entrega',   nombre:'TP Nº2 — Cálculo',         materia:'Análisis Matemático I' },
  { date:'2026-06-25', tipo:'parcial',   nombre:'Parcial 2 — Análisis',     materia:'Análisis Matemático I' },
  { date:'2026-08-05', tipo:'final',     nombre:'Final — Física I',         materia:'Física I'              },
  { date:'2026-08-07', tipo:'final',     nombre:'Final — Mat. Discreta',    materia:'Matemática Discreta'   },
  { date:'2026-08-12', tipo:'final',     nombre:'Final — Análisis',         materia:'Análisis Matemático I' },
]

const tipoEstilo: Record<TipoEvento,{color:string;bg:string;border:string;label:string}> = {
  parcial:   { color:'#a855f7', bg:'#a855f715', border:'#a855f730', label:'Parcial'   },
  final:     { color:'#ef4444', bg:'#ef444415', border:'#ef444430', label:'Final'     },
  feriado:   { color:'#94a3b8', bg:'#1e2d3d',   border:'#2d3f52',   label:'Feriado'   },
  asueto:    { color:'#22c55e', bg:'#22c55e15', border:'#22c55e30', label:'Asueto'    },
  entrega:   { color:'#f59e0b', bg:'#f59e0b15', border:'#f59e0b30', label:'Entrega'   },
  actividad: { color:'#00b4d8', bg:'#00b4d815', border:'#00b4d830', label:'Actividad' },
}

function dateKey(y:number, m:number, d:number) {
  return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}
function fmtFecha(dateStr:string) {
  const f = new Date(dateStr+'T00:00:00')
  return `${f.getDate()} ${MESES[f.getMonth()].slice(0,3)}`
}
function fmtFechaLarga(dateStr:string) {
  const f = new Date(dateStr+'T00:00:00')
  return `${f.getDate()} de ${MESES[f.getMonth()]} ${f.getFullYear()}`
}

const css = `
  *, *::before, *::after { box-sizing:border-box; }
  .cal-root { display:flex; flex-direction:column; flex:1; font-family:'Inter',system-ui,sans-serif; color:#f0f4f8; }

  /* Topbar — solo título */
  .topbar {
    display:flex; align-items:center; padding:0 24px; height:56px;
    border-bottom:1px solid #1e2d3d; background:#0b0f14;
    position:sticky; top:0; z-index:20; flex-shrink:0;
  }
  .topbar h1 { font-size:17px; font-weight:700; color:#f0f4f8; letter-spacing:-.01em; }

  .content { padding:20px 24px; flex:1; overflow-y:auto; }

  /* Layout */
  .main-grid { display:grid; grid-template-columns:1fr 270px; gap:16px; align-items:start; }

  /* Card base */
  .card { background:#131920; border:1px solid #1e2d3d; border-radius:14px; overflow:hidden; }

  /* Leyenda */
  .leyenda-bar {
    display:flex; align-items:center; gap:6px; flex-wrap:wrap;
    padding:10px 16px; border-bottom:1px solid #1e2d3d;
  }
  .ley-chip {
    display:inline-flex; align-items:center; gap:4px;
    padding:3px 9px; border-radius:20px; font-size:11px; font-weight:600;
  }
  .ley-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }

  /* Nav mes */
  .nav-bar {
    display:flex; align-items:center; justify-content:space-between;
    padding:12px 16px; border-bottom:1px solid #1e2d3d;
  }
  .nav-mes { font-size:15px; font-weight:800; color:#f0f4f8; letter-spacing:-.01em; }
  .nav-btn {
    display:inline-flex; align-items:center; gap:4px;
    padding:6px 12px; background:#0b0f14; border:1px solid #243447;
    border-radius:8px; color:#8fa3b8; font-size:12px; font-weight:600;
    font-family:inherit; cursor:pointer; transition:border-color .15s, color .15s;
  }
  .nav-btn:hover { border-color:#00b4d8; color:#f0f4f8; }
  .nav-btn svg { width:12px; height:12px; }
  .btn-hoy {
    padding:6px 12px; background:#00b4d810; border:1px solid #00b4d830;
    border-radius:8px; color:#00b4d8; font-size:12px; font-weight:700;
    font-family:inherit; cursor:pointer; transition:background .15s;
  }
  .btn-hoy:hover { background:#00b4d820; }

  /* Cabecera días */
  .dias-header {
    display:grid; grid-template-columns:repeat(7,1fr);
    padding:8px 12px 4px; gap:3px;
  }
  .dia-lbl {
    text-align:center; font-size:10px; font-weight:700;
    color:#506070; text-transform:uppercase; letter-spacing:.06em;
    padding:4px 0;
  }

  /* Grid días */
  .cal-grid {
    display:grid; grid-template-columns:repeat(7,1fr);
    padding:4px 12px 12px; gap:3px;
  }
  .dia-cell {
    min-height:80px; border:1px solid #1e2d3d22; border-radius:9px;
    padding:6px 5px 5px; cursor:pointer;
    transition:background .12s, border-color .12s;
    background:#0f1620; position:relative;
  }
  .dia-cell:hover { background:#1a2230; border-color:#1e2d3d88; }
  .dia-cell.fuera-mes { opacity:.25; pointer-events:none; }
  .dia-cell.hoy     { border-color:#00b4d8 !important; background:#00b4d80a; }
  .dia-cell.sel     { border-color:#a855f7 !important; background:#a855f70a; }
  .dia-cell.tiene-ev { border-color:#1e2d3d55; }

  /* Número del día */
  .dia-num {
    font-size:11.5px; font-weight:500; color:#3a4f6a;
    line-height:1; margin-bottom:4px;
  }
  .dia-num.tiene-ev { color:#8fa3b8; font-weight:700; }
  .dia-num.es-hoy   { font-weight:800; }
  .hoy-ring {
    display:inline-flex; align-items:center; justify-content:center;
    width:20px; height:20px; border-radius:50%;
    background:#00b4d8; color:#000; font-size:11px; font-weight:800;
  }
  .sel-ring {
    display:inline-flex; align-items:center; justify-content:center;
    width:20px; height:20px; border-radius:50%;
    background:#a855f720; color:#a855f7; font-size:11px; font-weight:800;
    border:1px solid #a855f740;
  }

  /* Chips en celda (desktop) */
  .ev-chips { display:flex; flex-direction:column; gap:2px; }
  .ev-chip {
    border-radius:4px; padding:2px 4px;
    font-size:9px; font-weight:700;
    overflow:hidden; white-space:nowrap; text-overflow:ellipsis; line-height:1.4;
    border:1px solid;
  }
  .ev-mas { font-size:9px; color:#506070; font-weight:600; margin-top:1px; padding-left:2px; }

  /* Dots (mobile) */
  .ev-dots { display:none; gap:3px; margin-top:3px; flex-wrap:wrap; }
  .ev-dot  { width:6px; height:6px; border-radius:50%; flex-shrink:0; }

  /* Panel derecho */
  .right-col { display:flex; flex-direction:column; gap:12px; }
  .card-hdr {
    display:flex; align-items:center; justify-content:space-between;
    padding:13px 16px 11px; border-bottom:1px solid #1e2d3d;
  }
  .card-hdr h3 { font-size:13px; font-weight:700; color:#f0f4f8; }
  .card-hdr-sub { font-size:11px; color:#506070; }

  /* Próximos */
  .prox-item {
    display:flex; align-items:flex-start; gap:10px;
    padding:11px 16px; border-bottom:1px solid #1e2d3d22;
    transition:background .12s;
  }
  .prox-item:last-child { border-bottom:none; }
  .prox-item:hover { background:#1a2230; }
  .prox-bar { width:3px; border-radius:2px; flex-shrink:0; align-self:stretch; min-height:32px; }
  .prox-tipo   { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; }
  .prox-nombre { font-size:12px; font-weight:600; color:#f0f4f8; margin-top:1px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
  .prox-mat    { font-size:11px; color:#506070; margin-top:1px; }
  .prox-fecha  { font-size:10px; font-weight:700; color:#506070; white-space:nowrap; background:#1a2230; padding:3px 7px; border-radius:6px; flex-shrink:0; }

  /* Día seleccionado */
  .sel-empty {
    padding:24px 16px; text-align:center;
    font-size:12px; color:#506070; line-height:1.7;
  }
  .sel-empty svg { width:28px; height:28px; margin:0 auto 10px; display:block; opacity:.25; }
  .sel-ev-item {
    display:flex; align-items:flex-start; gap:10px;
    padding:12px 16px; border-bottom:1px solid #1e2d3d22;
  }
  .sel-ev-item:last-child { border-bottom:none; }
  .sel-ev-bar { width:3px; border-radius:2px; flex-shrink:0; align-self:stretch; min-height:36px; }
  .sel-ev-tipo   { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; }
  .sel-ev-nombre { font-size:13px; font-weight:600; color:#f0f4f8; margin-top:2px; }
  .sel-ev-mat    { font-size:11px; color:#506070; margin-top:2px; }

  /* Modal mobile */
  .modal-overlay {
    position:fixed; inset:0; background:rgba(0,0,0,.65);
    backdrop-filter:blur(4px); z-index:100;
    display:flex; align-items:flex-end; justify-content:center;
  }
  .day-modal {
    background:#131920; border:1px solid #1e2d3d;
    border-radius:20px 20px 0 0; width:100%;
    max-height:75dvh; overflow-y:auto;
    padding-bottom:env(safe-area-inset-bottom,16px);
    box-shadow:0 -8px 40px rgba(0,0,0,.5);
  }
  .day-modal-hdr {
    display:flex; align-items:center; justify-content:space-between;
    padding:16px 20px 12px; border-bottom:1px solid #1e2d3d;
    position:sticky; top:0; background:#131920;
  }
  .day-modal-hdr h3 { font-size:15px; font-weight:700; color:#f0f4f8; }
  .day-modal-hdr span { font-size:11px; color:#506070; }
  .modal-close {
    background:none; border:none; color:#506070; cursor:pointer;
    padding:4px; border-radius:6px; display:flex; transition:color .15s;
  }
  .modal-close:hover { color:#f0f4f8; }
  .modal-close svg { width:18px; height:18px; }

  /* Panel mobile — solo celular */
  .panel-mobile { display:none; flex-direction:column; gap:12px; margin-top:14px; }

  /* Responsive */
  @media(max-width:960px){
    .main-grid { grid-template-columns:1fr; }
    .right-col { display:none; }
    .panel-mobile { display:flex; }
    .ev-chips { display:none; }
    .ev-dots  { display:flex; }
    .dia-cell { min-height:52px; padding:5px 4px; }
  }
  @media(max-width:768px){
    .topbar  { padding:0 14px; }
    .content { padding:14px; }
    .cal-grid { padding:3px 8px 10px; gap:2px; }
    .dias-header { padding:6px 8px 2px; gap:2px; }
    .leyenda-bar { gap:4px; padding:8px 12px; }
    .nav-bar { padding:10px 12px; }
    .nav-mes { font-size:14px; }
  }
  @media(max-width:400px){
    .dia-lbl .lbl-l { display:none; }
    .dia-lbl .lbl-s { display:inline; }
    .hoy-ring, .sel-ring { width:18px; height:18px; font-size:10px; }
  }
`

export default function Calendario() {
  const [eventos, setEventos] = useState<Evento[]>(mockEventos)
  const hoy = new Date()
  const [actual,    setActual]    = useState(new Date(2026, 3, 1))
  const [selDia,    setSelDia]    = useState<number|null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const [data, materiasData] = await Promise.all([
          api.get<any[]>('/eventos/').catch(() => [] as any[]),
          api.get<any[]>('/materias/').catch(() => [] as any[]),
        ])
        const mMap: Record<number, string> = {}
        materiasData.forEach((m: any) => { mMap[m.id] = m.nombre })
        if (data.length > 0) {
          setEventos(data.map((e: any) => ({
            date: e.fecha,
            tipo: e.tipo || 'actividad',
            nombre: e.titulo || e.descripcion || '',
            materia: e.materia_id ? (mMap[e.materia_id] || `Materia #${e.materia_id}`) : 'General',
          })))
        }
      } catch { /* fallback to mock */ }
    })()
  }, [])

  function eventosDelDia(y:number, m:number, d:number) {
    return eventos.filter(e => e.date === dateKey(y,m,d))
  }

  const y = actual.getFullYear()
  const m = actual.getMonth()
  const primerDia = new Date(y, m, 1).getDay()
  const diasEnMes = new Date(y, m+1, 0).getDate()

  const hoyEsMesActual = hoy.getFullYear()===y && hoy.getMonth()===m

  const proximosEventos = eventos
    .filter(e => new Date(e.date+'T00:00:00') >= new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()))
    .sort((a,b) => a.date.localeCompare(b.date))
    .slice(0, 6)

  const selEvs = selDia ? eventosDelDia(y,m,selDia) : []
  const selLabel = selDia
    ? `${selDia} de ${MESES[m]} ${y}`
    : 'Seleccioná un día'

  function irHoy() {
    setActual(new Date(hoy.getFullYear(), hoy.getMonth(), 1))
    setSelDia(hoy.getDate())
  }

  function handleDia(d: number) {
    const evs = eventosDelDia(y,m,d)
    setSelDia(d)
    if (evs.length > 0) setModalOpen(true)
  }

  return (
    <>
      <style>{css}</style>
      <div className="cal-root">

        {/* Topbar — solo título */}
        <header className="topbar">
          <h1>Calendario académico</h1>
        </header>

        <div className="content">
          <div className="main-grid">

            {/* ── CALENDARIO ── */}
            <div className="card">

              {/* Leyenda tipos */}
              <div className="leyenda-bar">
                {(Object.entries(tipoEstilo) as [TipoEvento, typeof tipoEstilo[TipoEvento]][]).map(([tipo,s]) => (
                  <div key={tipo} className="ley-chip" style={{background:s.bg, border:`1px solid ${s.border}`}}>
                    <div className="ley-dot" style={{background:s.color}}/>
                    <span style={{color:s.color}}>{s.label}</span>
                  </div>
                ))}
              </div>

              {/* Nav mes */}
              <div className="nav-bar">
                <button className="nav-btn" onClick={()=>{setActual(new Date(y,m-1,1));setSelDia(null)}}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                  Ant.
                </button>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span className="nav-mes">{MESES[m]} {y}</span>
                  {!hoyEsMesActual && (
                    <button className="btn-hoy" onClick={irHoy}>Hoy</button>
                  )}
                </div>
                <button className="nav-btn" onClick={()=>{setActual(new Date(y,m+1,1));setSelDia(null)}}>
                  Sig.
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>

              {/* Cabecera días semana */}
              <div className="dias-header">
                {DIAS_L.map((dl,i) => (
                  <div key={dl} className="dia-lbl">
                    <span className="lbl-l">{dl}</span>
                    <span className="lbl-s" style={{display:'none'}}>{DIAS_S[i]}</span>
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div className="cal-grid">
                {/* Celdas vacías inicio */}
                {Array.from({length:primerDia}).map((_,i) => <div key={`v${i}`}/>)}

                {/* Días del mes */}
                {Array.from({length:diasEnMes}).map((_,i) => {
                  const d     = i+1
                  const evs   = eventosDelDia(y,m,d)
                  const esHoy = hoy.getFullYear()===y && hoy.getMonth()===m && hoy.getDate()===d
                  const esSel = selDia===d
                  const tieneEvs = evs.length>0

                  return (
                    <div
                      key={d}
                      className={`dia-cell${esHoy?' hoy':''}${esSel?' sel':''}${tieneEvs?' tiene-ev':''}`}
                      onClick={() => handleDia(d)}
                    >
                      {/* Número */}
                      <div className={`dia-num${esHoy?' es-hoy':tieneEvs?' tiene-ev':''}`}>
                        {esHoy
                          ? <span className="hoy-ring">{d}</span>
                          : esSel
                            ? <span className="sel-ring">{d}</span>
                            : <span>{d}</span>
                        }
                      </div>

                      {/* Chips desktop */}
                      <div className="ev-chips">
                        {evs.slice(0,2).map((e,idx) => (
                          <div key={idx} className="ev-chip" style={{color:tipoEstilo[e.tipo].color, background:tipoEstilo[e.tipo].bg, borderColor:tipoEstilo[e.tipo].border}}>
                            {e.nombre}
                          </div>
                        ))}
                        {evs.length>2 && <div className="ev-mas">+{evs.length-2}</div>}
                      </div>

                      {/* Dots mobile */}
                      <div className="ev-dots">
                        {evs.slice(0,3).map((e,idx) => (
                          <div key={idx} className="ev-dot" style={{background:tipoEstilo[e.tipo].color}}/>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── PANEL DERECHO ── */}
            <div className="right-col">

              {/* Próximos eventos */}
              <div className="card">
                <div className="card-hdr">
                  <h3>Próximos eventos</h3>
                  <span className="card-hdr-sub">{proximosEventos.length} pendientes</span>
                </div>
                {proximosEventos.length===0
                  ? <div className="sel-empty" style={{padding:'16px'}}>Sin eventos próximos</div>
                  : proximosEventos.map((e,i) => {
                    const s = tipoEstilo[e.tipo]
                    return (
                      <div key={i} className="prox-item">
                        <div className="prox-bar" style={{background:s.color}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div className="prox-tipo" style={{color:s.color}}>{s.label}</div>
                          <div className="prox-nombre">{e.nombre}</div>
                          <div className="prox-mat">{e.materia}</div>
                        </div>
                        <div className="prox-fecha">{fmtFecha(e.date)}</div>
                      </div>
                    )
                  })
                }
              </div>

              {/* Detalle día seleccionado */}
              <div className="card">
                <div className="card-hdr">
                  <h3>{selDia ? selLabel : 'Día seleccionado'}</h3>
                  {selEvs.length>0 && <span className="card-hdr-sub">{selEvs.length} evento{selEvs.length>1?'s':''}</span>}
                </div>
                {selEvs.length===0
                  ? <div className="sel-empty">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="4" width="18" height="18" rx="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8"  y1="2" x2="8"  y2="6"/>
                        <line x1="3"  y1="10" x2="21" y2="10"/>
                      </svg>
                      {selDia
                        ? 'Sin eventos este día.'
                        : 'Hacé click en un día\npara ver sus eventos.'
                      }
                    </div>
                  : selEvs.map((e,i) => {
                      const s = tipoEstilo[e.tipo]
                      return (
                        <div key={i} className="sel-ev-item">
                          <div className="sel-ev-bar" style={{background:s.color}}/>
                          <div>
                            <div className="sel-ev-tipo" style={{color:s.color}}>{s.label}</div>
                            <div className="sel-ev-nombre">{e.nombre}</div>
                            <div className="sel-ev-mat">{e.materia}</div>
                          </div>
                        </div>
                      )
                    })
                }
              </div>

            </div>
          </div>

          {/* ── PANEL MOBILE — Próximos + Día seleccionado (solo celular) ── */}
          <div className="panel-mobile">

            {/* Próximos eventos */}
            <div className="card">
              <div className="card-hdr">
                <h3>Próximos eventos</h3>
                <span className="card-hdr-sub">{proximosEventos.length} pendientes</span>
              </div>
              {proximosEventos.length===0
                ? <div className="sel-empty" style={{padding:'16px'}}>Sin eventos próximos</div>
                : proximosEventos.map((e,i) => {
                  const s = tipoEstilo[e.tipo]
                  return (
                    <div key={i} className="prox-item">
                      <div className="prox-bar" style={{background:s.color}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div className="prox-tipo" style={{color:s.color}}>{s.label}</div>
                        <div className="prox-nombre">{e.nombre}</div>
                        <div className="prox-mat">{e.materia}</div>
                      </div>
                      <div className="prox-fecha">{fmtFecha(e.date)}</div>
                    </div>
                  )
                })
              }
            </div>

            {/* Día seleccionado */}
            <div className="card">
              <div className="card-hdr">
                <h3>{selDia ? selLabel : 'Día seleccionado'}</h3>
                {selEvs.length>0 && <span className="card-hdr-sub">{selEvs.length} evento{selEvs.length>1?'s':''}</span>}
              </div>
              {selEvs.length===0
                ? <div className="sel-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="4" width="18" height="18" rx="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8"  y1="2" x2="8"  y2="6"/>
                      <line x1="3"  y1="10" x2="21" y2="10"/>
                    </svg>
                    {selDia ? 'Sin eventos este día.' : 'Tocá un día para ver sus eventos.'}
                  </div>
                : selEvs.map((e,i) => {
                    const s = tipoEstilo[e.tipo]
                    return (
                      <div key={i} className="sel-ev-item">
                        <div className="sel-ev-bar" style={{background:s.color}}/>
                        <div>
                          <div className="sel-ev-tipo" style={{color:s.color}}>{s.label}</div>
                          <div className="sel-ev-nombre">{e.nombre}</div>
                          <div className="sel-ev-mat">{e.materia}</div>
                        </div>
                      </div>
                    )
                  })
              }
            </div>

          </div>

        </div>

        {/* ── MODAL MOBILE — detalle día ── */}
        {modalOpen && selDia && (
          <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setModalOpen(false)}}>
            <div className="day-modal">
              <div className="day-modal-hdr">
                <div>
                  <h3>{selDia} de {MESES[m]}</h3>
                  <span>{selEvs.length} evento{selEvs.length>1?'s':''}</span>
                </div>
                <button className="modal-close" onClick={()=>setModalOpen(false)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6"  y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              {selEvs.map((e,i) => {
                const s = tipoEstilo[e.tipo]
                return (
                  <div key={i} className="sel-ev-item" style={{padding:'14px 20px'}}>
                    <div className="sel-ev-bar" style={{background:s.color}}/>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                        <div className="sel-ev-tipo" style={{color:s.color}}>{s.label}</div>
                        <span style={{fontSize:11,color:'#506070',background:'#1a2230',padding:'2px 8px',borderRadius:6}}>
                          {fmtFechaLarga(e.date)}
                        </span>
                      </div>
                      <div className="sel-ev-nombre">{e.nombre}</div>
                      <div className="sel-ev-mat">{e.materia}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </>
  )
}