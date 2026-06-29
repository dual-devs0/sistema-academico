import { useState, useRef, useEffect } from 'react'
import { api, decodeToken } from '../lib/api'

type Materia = {
  nombre: string
  profesor: string
  parcial1: number | null
  parcial2: number | null
  tp: number | null
  final: number | null
}

// Datos por semestre — cuando haya BD, vendrán del API
const datosPorSemestre: Record<string, Materia[]> = {
  'Semestre 1 · 2026': [
    { nombre:'Análisis Matemático I', profesor:'Carlos Méndez', parcial1:7.5, parcial2:8,   tp:9,   final:null },
    { nombre:'Física I',              profesor:'Ana Torres',    parcial1:6,   parcial2:7.5, tp:8.5, final:null },
    { nombre:'Matemática Discreta',   profesor:'Carlos Méndez', parcial1:9,   parcial2:null,tp:8,   final:null },
    { nombre:'Programación I',        profesor:'Luis Paredes',  parcial1:10,  parcial2:9.5, tp:10,  final:null },
    { nombre:'Historia y Filosofía',  profesor:'Pedro Rojas',   parcial1:7,   parcial2:6.5, tp:8,   final:null },
  ],
  'Semestre 2 · 2025': [
    { nombre:'Cálculo II',            profesor:'Carlos Méndez', parcial1:8,   parcial2:8.5, tp:9,   final:7.5 },
    { nombre:'Álgebra Lineal',        profesor:'Ana Torres',    parcial1:7,   parcial2:7,   tp:8,   final:6.5 },
    { nombre:'Física II',             profesor:'Luis Paredes',  parcial1:6.5, parcial2:7,   tp:7.5, final:null },
  ],
  'Semestre 1 · 2025': [
    { nombre:'Cálculo I',             profesor:'Carlos Méndez', parcial1:9,   parcial2:8.5, tp:9.5, final:9   },
    { nombre:'Química General',       profesor:'María Ruiz',    parcial1:7.5, parcial2:8,   tp:8,   final:7   },
  ],
}

const semestres = Object.keys(datosPorSemestre)

function calcProm(m: Materia): number | null {
  const ns = [m.parcial1, m.parcial2, m.tp, m.final].filter(n => n !== null) as number[]
  if (!ns.length) return null
  return Math.round((ns.reduce((a,b)=>a+b,0)/ns.length)*10)/10
}
function notaColor(n: number | null) {
  if (n===null) return '#2a3a55'
  if (n>=9)  return '#22c55e'
  if (n>=7.5)return '#00b4d8'
  if (n>=6)  return '#f59e0b'
  return '#ef4444'
}
function chipStyle(p: number | null) {
  if (p===null)  return { color:'#506070', bg:'#1e2d3d18', border:'#1e2d3d' }
  if (p>=9)      return { color:'#22c55e', bg:'#22c55e15', border:'#22c55e40' }
  if (p>=7.5)    return { color:'#00b4d8', bg:'#00b4d815', border:'#00b4d840' }
  if (p>=6)      return { color:'#f59e0b', bg:'#f59e0b15', border:'#f59e0b40' }
  return               { color:'#ef4444', bg:'#ef444415', border:'#ef444440' }
}
function estadoChip(m: Materia) {
  const p = calcProm(m)
  if (m.final!==null) return { label:'Aprobado',  color:'#22c55e', bg:'#22c55e15' }
  if (p===null)       return { label:'Sin notas', color:'#506070', bg:'#1e2d3d18' }
  if (p<6)            return { label:'En riesgo', color:'#ef4444', bg:'#ef444415' }
  return                     { label:'En curso',  color:'#f59e0b', bg:'#f59e0b15' }
}

// Exportar a PDF con jsPDF
async function exportarPDF(materias: Materia[], semestre: string, promGeneral: number) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' })
  const W = 210, margin = 14

  // Header
  doc.setFillColor(11, 15, 20)
  doc.rect(0, 0, W, 30, 'F')
  doc.setTextColor(0, 180, 216)
  doc.setFontSize(16)
  doc.setFont('helvetica','bold')
  doc.text('Sistema Académico UCA', margin, 12)
  doc.setTextColor(240, 244, 248)
  doc.setFontSize(11)
  doc.setFont('helvetica','normal')
  doc.text('Registro de Puntajes — ' + semestre, margin, 20)
  doc.setTextColor(80, 96, 112)
  doc.setFontSize(9)
  doc.text('Generado el ' + new Date().toLocaleDateString('es-PY'), margin, 27)

  let y = 38

  // KPI row
  const kpis = [
    { l:'Materias',   v: String(materias.length) },
    { l:'Promedio',   v: String(promGeneral) },
    { l:'Mejor nota', v: String(Math.max(...materias.flatMap(m=>[m.parcial1,m.parcial2,m.tp,m.final]).filter(n=>n!==null) as number[])) },
    { l:'Finales pend.', v: String(materias.filter(m=>m.final===null).length) },
  ]
  const kW = (W - margin*2) / 4 - 2
  kpis.forEach((k, i) => {
    const x = margin + i*(kW+2)
    doc.setFillColor(19, 25, 32)
    doc.roundedRect(x, y, kW, 16, 2, 2, 'F')
    doc.setTextColor(80, 96, 112)
    doc.setFontSize(7)
    doc.setFont('helvetica','normal')
    doc.text(k.l.toUpperCase(), x+3, y+6)
    doc.setTextColor(0, 180, 216)
    doc.setFontSize(13)
    doc.setFont('helvetica','bold')
    doc.text(k.v, x+3, y+13)
  })
  y += 22

  // Tabla header
  const cols = ['Materia','Profesor','P1','P2','TP','Final','Prom.','Estado']
  const colW = [52, 36, 12, 12, 12, 12, 14, 22]
  doc.setFillColor(13, 17, 23)
  doc.rect(margin, y, W-margin*2, 8, 'F')
  doc.setTextColor(80, 96, 112)
  doc.setFontSize(7.5)
  doc.setFont('helvetica','bold')
  let cx = margin
  cols.forEach((c,i) => { doc.text(c, cx+2, y+5.5); cx+=colW[i] })
  y += 8

  // Filas
  materias.forEach((m, idx) => {
    const p = calcProm(m)
    const est = m.final!==null?'Aprobado':p===null?'Sin notas':p<6?'En riesgo':'En curso'
    const bg = idx%2===0 ? [19,25,32] : [15,20,27]
    doc.setFillColor(bg[0],bg[1],bg[2])
    doc.rect(margin, y, W-margin*2, 9, 'F')

    doc.setTextColor(240,244,248)
    doc.setFontSize(8)
    doc.setFont('helvetica','bold')

    const vals = [
      m.nombre, m.profesor,
      m.parcial1!=null?String(m.parcial1):'—',
      m.parcial2!=null?String(m.parcial2):'—',
      m.tp!=null?String(m.tp):'—',
      m.final!=null?String(m.final):'—',
      p!=null?String(p):'—',
      est,
    ]
    cx = margin
    vals.forEach((v, i) => {
      if (i===0) {
        doc.setFont('helvetica','bold')
        doc.setTextColor(240,244,248)
      } else {
        doc.setFont('helvetica','normal')
        // color nota
        if (i>=2&&i<=6) {
          const n = parseFloat(v)
          if (!isNaN(n)) {
            if (n>=9)   doc.setTextColor(34,197,94)
            else if(n>=7.5) doc.setTextColor(0,180,216)
            else if(n>=6)   doc.setTextColor(245,158,11)
            else            doc.setTextColor(239,68,68)
          } else doc.setTextColor(80,96,112)
        } else if (i===7) {
          if(v==='Aprobado')   doc.setTextColor(34,197,94)
          else if(v==='En riesgo') doc.setTextColor(239,68,68)
          else doc.setTextColor(245,158,11)
        } else doc.setTextColor(143,163,184)
      }
      // truncar texto largo
      const maxW = colW[i]-3
      let txt = v
      while (doc.getTextWidth(txt)>maxW && txt.length>1) txt=txt.slice(0,-1)
      doc.text(txt, cx+2, y+6)
      cx+=colW[i]
    })
    y+=9
    if (y>270) { doc.addPage(); y=14 }
  })

  // Footer
  const totalPages = doc.getNumberOfPages()
  for (let i=1;i<=totalPages;i++) {
    doc.setPage(i)
    doc.setTextColor(42,58,85)
    doc.setFontSize(8)
    doc.setFont('helvetica','normal')
    doc.text('Universidad Católica Caacupé · Sistema Académico · ' + semestre, margin, 290)
    doc.text('Pág. '+i+'/'+totalPages, W-margin, 290, {align:'right'})
  }

  doc.save('puntajes_' + semestre.replace(/[·\s]/g,'_') + '.pdf')
}

function exportarCSV(materias: Materia[], semestre: string) {
  const rows = [
    ['Materia','Parcial 1','Parcial 2','Trabajo Práctico','Examen Final','Promedio','Progreso','Estado'],
    ...materias.map(m => {
      const p  = calcProm(m)
      const st = estadoChip(m).label
      const completadas = [m.parcial1, m.parcial2, m.tp, m.final].filter(n => n !== null).length
      return [
        m.nombre, m.parcial1??'-', m.parcial2??'-', m.tp??'-', m.final??'-',
        p !== null ? p.toFixed(1) : '-', Math.round((completadas/4)*100)+'%', st
      ]
    })
  ]
  const csv = rows.map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'})
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `puntajes_${semestre.replace(/[·\s]/g,'_')}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
  import('../lib/api').then(m => m.emitToast('Archivo CSV descargado'))
}

const css = `
  *, *::before, *::after { box-sizing:border-box; }
  .puntajes-root { display:flex; flex-direction:column; flex:1; font-family:'Inter',system-ui,sans-serif; color:#f0f4f8; }

  .topbar {
    display:flex; align-items:center; justify-content:space-between;
    padding:0 24px; height:56px;
    border-bottom:1px solid #1e2d3d; background:#0b0f14;
    position:sticky; top:0; z-index:20; flex-shrink:0;
  }
  .topbar h1 { font-size:17px; font-weight:700; color:#f0f4f8; letter-spacing:-.01em; }
  .topbar p  { font-size:11px; color:#506070; margin-top:1px; }

  .content { padding:20px 24px; flex:1; overflow-y:auto; }

  .kpi-row { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:20px; }
  .kpi { background:#131920; border:1px solid #1e2d3d; border-radius:12px; padding:14px 16px; }
  .kpi-lbl { font-size:10px; color:#506070; text-transform:uppercase; letter-spacing:.07em; margin-bottom:4px; }
  .kpi-val { font-size:22px; font-weight:800; line-height:1; }

  .toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; gap:10px; flex-wrap:wrap; }
  .toolbar-left { font-size:12px; color:#8fa3b8; }
  .toolbar-left strong { color:#00b4d8; font-weight:700; }
  .toolbar-right { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }

  .search-box {
    display:flex; align-items:center; gap:7px;
    background:#131920; border:1px solid #1e2d3d;
    border-radius:8px; padding:0 11px; height:34px; transition:border-color .15s;
  }
  .search-box:focus-within { border-color:#00b4d8; }
  .search-box svg { width:13px; height:13px; color:#506070; flex-shrink:0; }
  .search-box input {
    background:none; border:none; outline:none;
    color:#f0f4f8; font-size:12px; font-family:inherit; width:130px;
  }
  .search-box input::placeholder { color:#3a4f6a; }

  /* Custom dropdown */
  .custom-select-wrap { position:relative; }
  .custom-select-btn {
    display:flex; align-items:center; gap:8px;
    background:#131920; border:1px solid #1e2d3d;
    border-radius:8px; padding:0 10px; height:34px;
    color:#f0f4f8; font-size:12px; font-family:inherit;
    cursor:pointer; transition:border-color .15s; white-space:nowrap;
    min-width:160px; justify-content:space-between;
  }
  .custom-select-btn:hover, .custom-select-btn.open { border-color:#00b4d8; }
  .custom-select-btn svg { width:12px; height:12px; color:#506070; flex-shrink:0; transition:transform .2s; }
  .custom-select-btn.open svg { transform:rotate(180deg); }
  .custom-select-dropdown {
    position:absolute; top:calc(100% + 6px); left:0; right:0;
    background:#131920; border:1px solid #1e2d3d;
    border-radius:10px; overflow:hidden;
    box-shadow:0 12px 32px rgba(0,0,0,.5); z-index:100;
  }
  .custom-select-opt {
    display:flex; align-items:center; justify-content:space-between;
    padding:10px 14px; font-size:13px; color:#8fa3b8;
    cursor:pointer; transition:background .12s;
    border:none; background:none; width:100%; text-align:left;
    font-family:inherit;
  }
  .custom-select-opt:hover { background:#1a2230; color:#f0f4f8; }
  .custom-select-opt.selected { color:#00b4d8; background:#00b4d808; }
  .custom-select-opt svg { width:14px; height:14px; color:#00b4d8; flex-shrink:0; }

  .btn-export {
    display:flex; align-items:center; gap:6px;
    padding:0 14px; height:34px;
    background:#131920; border:1px solid #1e2d3d;
    border-radius:8px; color:#8fa3b8;
    font-size:12px; font-family:inherit; cursor:pointer;
    transition:border-color .15s, color .15s, background .15s;
    white-space:nowrap;
  }
  .btn-export:hover { border-color:#00b4d8; color:#f0f4f8; background:#00b4d808; }
  .btn-export:active { background:#00b4d815; }
  .btn-export svg { width:13px; height:13px; }

  /* Tabla desktop */
  .tbl-wrap { background:#131920; border:1px solid #1e2d3d; border-radius:14px; overflow:hidden; }
  table { width:100%; border-collapse:collapse; }
  thead tr { background:#0d1117; }
  th {
    padding:9px 16px; font-size:10px; font-weight:600;
    color:#506070; text-transform:uppercase; letter-spacing:.07em;
    text-align:left; border-bottom:1px solid #1e2d3d; white-space:nowrap;
  }
  th.c { text-align:center; }
  tbody tr { border-bottom:1px solid #1e2d3d1a; transition:background .12s; }
  tbody tr:last-child { border-bottom:none; }
  tbody tr:hover { background:#1a2230; }
  td { padding:12px 16px; vertical-align:middle; }
  td.c { text-align:center; }
  .mat-name { font-weight:600; color:#f0f4f8; font-size:13px; margin-bottom:1px; }
  .mat-prof { font-size:11px; color:#506070; }
  .nota { font-size:15px; font-weight:800; }
  .prom-chip { display:inline-flex; align-items:center; padding:3px 10px; border-radius:20px; font-size:13px; font-weight:800; border:1px solid; }
  .estado-chip { display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:6px; font-size:10px; font-weight:600; }
  .prog-track { height:4px; background:#1e2d3d; border-radius:4px; overflow:hidden; margin-bottom:3px; min-width:80px; }
  .prog-fill  { height:100%; border-radius:4px; }
  .prog-lbl   { font-size:10px; color:#506070; white-space:nowrap; }

  /* Cards mobile */
  .cards-list { display:none; }
  .mat-card { background:#131920; border:1px solid #1e2d3d; border-radius:14px; overflow:hidden; margin-bottom:12px; }
  .mat-card-head { display:flex; align-items:flex-start; justify-content:space-between; padding:14px 16px 12px; border-bottom:1px solid #1e2d3d; }
  .mat-card-notas { display:grid; grid-template-columns:repeat(4,1fr); }
  .nota-cell { padding:14px 8px; text-align:center; border-right:1px solid #1e2d3d; }
  .nota-cell:last-child { border-right:none; }
  .nota-lbl { font-size:9px; color:#506070; text-transform:uppercase; letter-spacing:.05em; margin-bottom:8px; }
  .nota-num { font-size:20px; font-weight:800; }
  .mat-card-footer { display:flex; align-items:center; justify-content:space-between; padding:10px 16px; border-top:1px solid #1e2d3d; background:#0d1117; gap:12px; }

  @media(max-width:768px){
    .tbl-wrap  { display:none; }
    .cards-list { display:block; }
    .toolbar { flex-direction:column; align-items:flex-start; }
    .toolbar-right { width:100%; flex-wrap:wrap; }
    .search-box { flex:1; }
    .search-box input { width:100%; }
    .kpi-row { grid-template-columns:repeat(2,1fr); gap:8px; margin-bottom:14px; }
    .kpi-val { font-size:20px; }
    .content { padding:14px; }
    .topbar  { padding:0 14px; }
    .custom-select-dropdown { position:fixed; left:14px; right:14px; top:auto; }
  }
`

export default function Puntajes() {
  const [semestre, setSemestre] = useState(semestres[0])
  const [dropOpen, setDropOpen] = useState(false)
  const [search, setSearch]     = useState('')
  const [materias, setMaterias] = useState<Materia[]>([])
  const dropRef = useRef<HTMLDivElement>(null)

  // Cargar datos reales desde la API
  useEffect(() => {
    const token = localStorage.getItem('token')
    const user = token ? decodeToken(token) : null
    if (!user) return

    Promise.all([
      api.get<{ id: number; nombre: string; profesor_id: number }[]>('/materias/').catch(() => []),
      api.get<{ id: number; user_id: number; materia_id: number; tipo: string; valor: number }[]>(`/puntajes/?user_id=${user.username}`).catch(() => []),
    ]).then(([materiasData, puntajesData]) => {
      const grouped: Materia[] = materiasData.map(m => {
        const pts = puntajesData.filter(p => p.materia_id === m.id)
        return {
          nombre: m.nombre,
          profesor: `Prof. ${m.profesor_id}`,
          parcial1: pts.find(p => p.tipo === 'parcial1')?.valor ?? null,
          parcial2: pts.find(p => p.tipo === 'parcial2')?.valor ?? null,
          tp: pts.find(p => p.tipo === 'practico')?.valor ?? null,
          final: pts.find(p => p.tipo === 'final')?.valor ?? null,
        }
      })
      if (grouped.length > 0) {
        setMaterias(grouped)
      }
    }).catch(() => {})
  }, [])

  const materiasActuales = materias.length > 0 ? materias : (datosPorSemestre[semestre] ?? [])
  const filtered = materiasActuales.filter(m => m.nombre.toLowerCase().includes(search.toLowerCase()))

  const promGeneral = (() => {
    const ps = materiasActuales.map(calcProm).filter(p => p !== null) as number[]
    if (!ps.length) return 0
    return Math.round((ps.reduce((a,b)=>a+b,0)/ps.length)*10)/10
  })()

  // Cerrar dropdown al click afuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <>
      <style>{css}</style>
      <div className="puntajes-root">

        <header className="topbar">
          <div>
            <h1>Mis puntajes</h1>
            <p>{semestre}</p>
          </div>
        </header>

        <div className="content">

          {/* KPIs */}
          <div className="kpi-row">
            <div className="kpi">
              <div className="kpi-lbl">Materias</div>
              <div className="kpi-val" style={{color:'#00b4d8'}}>{materiasActuales.length}</div>
            </div>
            <div className="kpi">
              <div className="kpi-lbl">Promedio general</div>
              <div className="kpi-val" style={{color:'#22c55e'}}>{promGeneral}</div>
            </div>
            <div className="kpi">
              <div className="kpi-lbl">Mejor nota</div>
              <div className="kpi-val" style={{color:'#22c55e'}}>
                {Math.max(...materiasActuales.flatMap(m=>[m.parcial1,m.parcial2,m.tp,m.final]).filter(n=>n!==null) as number[])}
              </div>
            </div>
            <div className="kpi">
              <div className="kpi-lbl">Finales pendientes</div>
              <div className="kpi-val" style={{color:'#f59e0b'}}>{materiasActuales.filter(m=>m.final===null).length}</div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="toolbar">
            <div className="toolbar-left">
              {materiasActuales.length} materias · Promedio: <strong>{promGeneral}</strong>
            </div>
            <div className="toolbar-right">
              <div className="search-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input placeholder="Buscar materia..." value={search} onChange={e=>setSearch(e.target.value)} />
              </div>

              {/* Dropdown semestre custom */}
              <div className="custom-select-wrap" ref={dropRef}>
                <button
                  className={`custom-select-btn${dropOpen?' open':''}`}
                  onClick={() => setDropOpen(!dropOpen)}
                >
                  <span>{semestre}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {dropOpen && (
                  <div className="custom-select-dropdown">
                    {semestres.map(s => (
                      <button
                        key={s}
                        className={`custom-select-opt${s===semestre?' selected':''}`}
                        onClick={() => { setSemestre(s); setDropOpen(false); setSearch('') }}
                      >
                        <span>{s}</span>
                        {s===semestre && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{display:'flex',gap:8}}>
                <button className="btn-export" style={{background:'#131920',borderColor:'#1e2d3d'}} onClick={() => exportarCSV(filtered, semestre)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Exportar CSV
                </button>
                <button className="btn-export" onClick={() => exportarPDF(filtered, semestre, promGeneral)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Exportar PDF
                </button>
              </div>
            </div>
          </div>

          {/* Tabla desktop */}
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Materia</th>
                  <th className="c">Parc. 1</th>
                  <th className="c">Parc. 2</th>
                  <th className="c">TP</th>
                  <th className="c">Final</th>
                  <th className="c">Promedio</th>
                  <th>Progreso</th>
                  <th className="c">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => {
                  const p = calcProm(m)
                  const chip = chipStyle(p)
                  const est  = estadoChip(m)
                  const prog = [m.parcial1,m.parcial2,m.tp,m.final].filter(n=>n!==null).length
                  return (
                    <tr key={m.nombre}>
                      <td>
                        <div className="mat-name">{m.nombre}</div>
                        <div className="mat-prof">Prof. {m.profesor}</div>
                      </td>
                      {[m.parcial1,m.parcial2,m.tp,m.final].map((n,i)=>(
                        <td key={i} className="c">
                          <span className="nota" style={{color:notaColor(n)}}>{n??'—'}</span>
                        </td>
                      ))}
                      <td className="c">
                        <span className="prom-chip" style={{color:chip.color,background:chip.bg,borderColor:chip.border}}>
                          {p??'—'}
                        </span>
                      </td>
                      <td style={{minWidth:100}}>
                        <div className="prog-track">
                          <div className="prog-fill" style={{
                            width:`${(prog/4)*100}%`,
                            background: prog>=3?'#22c55e':prog>=2?'#00b4d8':'#f59e0b'
                          }}/>
                        </div>
                        <div className="prog-lbl">{prog}/4 notas</div>
                      </td>
                      <td className="c">
                        <span className="estado-chip" style={{color:est.color,background:est.bg}}>{est.label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Cards mobile */}
          <div className="cards-list">
            {filtered.map(m => {
              const p    = calcProm(m)
              const chip = chipStyle(p)
              const est  = estadoChip(m)
              const prog = [m.parcial1,m.parcial2,m.tp,m.final].filter(n=>n!==null).length
              return (
                <div key={m.nombre} className="mat-card">
                  <div className="mat-card-head">
                    <div>
                      <div className="mat-name">{m.nombre}</div>
                      <div className="mat-prof">Prof. {m.profesor}</div>
                    </div>
                    <span className="prom-chip" style={{color:chip.color,background:chip.bg,borderColor:chip.border}}>
                      {p??'—'}
                    </span>
                  </div>
                  <div className="mat-card-notas">
                    {[{l:'Parcial 1',v:m.parcial1},{l:'Parcial 2',v:m.parcial2},{l:'TP',v:m.tp},{l:'Final',v:m.final}].map(n=>(
                      <div key={n.l} className="nota-cell">
                        <div className="nota-lbl">{n.l}</div>
                        <div className="nota-num" style={{color:notaColor(n.v)}}>{n.v??'—'}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mat-card-footer">
                    <div style={{flex:1}}>
                      <div className="prog-track">
                        <div className="prog-fill" style={{width:`${(prog/4)*100}%`,background:prog>=3?'#22c55e':prog>=2?'#00b4d8':'#f59e0b'}}/>
                      </div>
                      <div className="prog-lbl" style={{marginTop:3}}>{prog}/4 notas cargadas</div>
                    </div>
                    <span className="estado-chip" style={{color:est.color,background:est.bg}}>{est.label}</span>
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </div>
    </>
  )
}
