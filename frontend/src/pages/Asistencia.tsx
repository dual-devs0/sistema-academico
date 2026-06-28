import { useState, useRef, useEffect } from 'react'

type Motivo = 'reposo' | 'justificado' | 'sin_motivo' | null
type DiaClase = { numero:number; fecha:string; presente:boolean; motivo?:Motivo; descripcion?:string }
type MateriaAsistencia = { nombre:string; codigo:string; profesor:string; clases:DiaClase[] }

const datosPorSemestre: Record<string, MateriaAsistencia[]> = {
  'Semestre 1 · 2026': [
    { nombre:'Análisis Matemático I', codigo:'CYTI11', profesor:'Carlos Méndez',
      clases:[
        {numero:1,fecha:'3 Mar', presente:true},
        {numero:2,fecha:'5 Mar', presente:true},
        {numero:3,fecha:'10 Mar',presente:true},
        {numero:4,fecha:'12 Mar',presente:true},
        {numero:5,fecha:'17 Mar',presente:true},
        {numero:6,fecha:'19 Mar',presente:true},
        {numero:7,fecha:'24 Mar',presente:false,motivo:'reposo',     descripcion:'Reposo médico por gripe'},
        {numero:8,fecha:'26 Mar',presente:false,motivo:'sin_motivo', descripcion:'Sin justificación registrada'},
      ]},
    { nombre:'Física I', codigo:'CYTI12', profesor:'Ana Torres',
      clases:[
        {numero:1,fecha:'4 Mar', presente:true},
        {numero:2,fecha:'6 Mar', presente:true},
        {numero:3,fecha:'11 Mar',presente:true},
        {numero:4,fecha:'13 Mar',presente:true},
        {numero:5,fecha:'18 Mar',presente:true},
        {numero:6,fecha:'20 Mar',presente:false,motivo:'justificado',descripcion:'Trámite administrativo justificado'},
      ]},
    { nombre:'Programación I', codigo:'CYTI16', profesor:'Luis Paredes',
      clases:[
        {numero:1,fecha:'3 Mar', presente:true},
        {numero:2,fecha:'10 Mar',presente:true},
        {numero:3,fecha:'17 Mar',presente:true},
        {numero:4,fecha:'24 Mar',presente:true},
        {numero:5,fecha:'31 Mar',presente:true},
        {numero:6,fecha:'7 Abr', presente:true},
      ]},
    { nombre:'Matemática Discreta', codigo:'CYTI13', profesor:'Carlos Méndez',
      clases:[
        {numero:1,fecha:'5 Mar', presente:true},
        {numero:2,fecha:'12 Mar',presente:true},
        {numero:3,fecha:'19 Mar',presente:true},
        {numero:4,fecha:'26 Mar',presente:true},
        {numero:5,fecha:'2 Abr', presente:false,motivo:'reposo',    descripcion:'Reposo por dolor de cabeza'},
        {numero:6,fecha:'9 Abr', presente:false,motivo:'sin_motivo',descripcion:'Sin justificación registrada'},
      ]},
    { nombre:'Historia y Filosofía', codigo:'CYTD5', profesor:'Pedro Rojas',
      clases:[
        {numero:1,fecha:'4 Mar', presente:true},
        {numero:2,fecha:'11 Mar',presente:true},
        {numero:3,fecha:'18 Mar',presente:true},
        {numero:4,fecha:'25 Mar',presente:false,motivo:'justificado',descripcion:'Actividad académica externa'},
        {numero:5,fecha:'1 Abr', presente:true},
        {numero:6,fecha:'8 Abr', presente:true},
      ]},
  ],
  'Semestre 2 · 2025': [
    { nombre:'Cálculo II', codigo:'CYTI21', profesor:'Carlos Méndez',
      clases:[
        {numero:1,fecha:'4 Ago', presente:true},
        {numero:2,fecha:'6 Ago', presente:true},
        {numero:3,fecha:'11 Ago',presente:false,motivo:'reposo',descripcion:'Reposo médico'},
        {numero:4,fecha:'13 Ago',presente:true},
        {numero:5,fecha:'18 Ago',presente:true},
        {numero:6,fecha:'20 Ago',presente:true},
      ]},
    { nombre:'Álgebra Lineal', codigo:'CYTI22', profesor:'Ana Torres',
      clases:[
        {numero:1,fecha:'5 Ago', presente:true},
        {numero:2,fecha:'12 Ago',presente:true},
        {numero:3,fecha:'19 Ago',presente:true},
        {numero:4,fecha:'26 Ago',presente:true},
      ]},
  ],
  'Semestre 1 · 2025': [
    { nombre:'Cálculo I', codigo:'CYTI11A', profesor:'Carlos Méndez',
      clases:[
        {numero:1,fecha:'3 Mar', presente:true},
        {numero:2,fecha:'10 Mar',presente:true},
        {numero:3,fecha:'17 Mar',presente:true},
        {numero:4,fecha:'24 Mar',presente:true},
        {numero:5,fecha:'31 Mar',presente:true},
      ]},
  ],
}

const semestres = Object.keys(datosPorSemestre)

function pct(clases: DiaClase[]) {
  return Math.round((clases.filter(c=>c.presente).length/clases.length)*100)
}
function colorPct(p: number) {
  if (p>=85) return {stroke:'#22c55e',text:'#22c55e',bg:'#22c55e15',border:'#22c55e30',label:'Regular'}
  if (p>=75) return {stroke:'#f59e0b',text:'#f59e0b',bg:'#f59e0b15',border:'#f59e0b30',label:'En riesgo'}
  return         {stroke:'#ef4444',text:'#ef4444',bg:'#ef444415',border:'#ef444430',label:'Irregular'}
}
function motivoStyle(m: Motivo) {
  if (m==='reposo')      return {color:'#f59e0b',bg:'#f59e0b15',border:'#f59e0b40',label:'Reposo médico',icon:'ti-activity'}
  if (m==='justificado') return {color:'#00b4d8',bg:'#00b4d815',border:'#00b4d840',label:'Justificado',icon:'ti-file-check'}
  if (m==='sin_motivo')  return {color:'#ef4444',bg:'#ef444415',border:'#ef444440',label:'Sin justificación',icon:'ti-alert-circle'}
  return                        {color:'#506070',bg:'#1e2d3d18',border:'#1e2d3d',  label:'',icon:''}
}

function BarraSVG({ pct: p, color }: { pct: number; color: string }) {
  // Usamos SVG para que el fill sea EXACTAMENTE proporcional al %
  // El track ocupa todo el ancho (viewBox 200 unidades)
  // El fill ocupa p*2 unidades (0-200), la línea del 75% siempre en x=150
  const W = 200
  const H = 20
  const fillW = (p / 100) * W      // ancho proporcional exacto
  const minX  = (75 / 100) * W     // posición exacta del 75% = 150
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="bar-svg-wrap"
      style={{ height: 28, display:'block', width:'100%' }}
    >
      {/* Track */}
      <rect x={0} y={6} width={W} height={7} rx={3.5} fill="#1e2d3d" />
      {/* Fill proporcional */}
      <rect x={0} y={6} width={fillW} height={7} rx={3.5} fill={color} />
      {/* Línea del mínimo 75% */}
      <rect x={minX - 1} y={3} width={2} height={13} rx={1} fill="#f59e0b" opacity={0.7} />
      {/* Texto "75%" debajo de la línea */}
      <text
        x={minX}
        y={H - 1}
        textAnchor="middle"
        fontSize="7"
        fontFamily="Inter,sans-serif"
        fontWeight="700"
        fill="#f59e0b"
      >
        mín. 75%
      </text>
    </svg>
  )
}

function DonutSVG({p, color}: {p:number; color:string}) {
  const r=36,cx=44,cy=44,circ=2*Math.PI*r
  const filled=(p/100)*circ
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" style={{flexShrink:0}}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e2d3d" strokeWidth="8"/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{transition:'stroke-dasharray .5s ease'}}
      />
      <text x={cx} y={cy-5} textAnchor="middle" dominantBaseline="middle"
        fontFamily="Inter,sans-serif" fontSize="14" fontWeight="800" fill="#f0f4f8">{p}%</text>
      <text x={cx} y={cy+10} textAnchor="middle" dominantBaseline="middle"
        fontFamily="Inter,sans-serif" fontSize="9" fill="#506070">asist.</text>
    </svg>
  )
}

type ModalInfo = {dia:DiaClase; materia:string} | null

const css = `
  *, *::before, *::after { box-sizing:border-box; }
  .asist-root { display:flex; flex-direction:column; flex:1; font-family:'Inter',system-ui,sans-serif; color:#f0f4f8; }

  .topbar {
    display:flex; align-items:center; justify-content:space-between;
    padding:0 24px; height:56px;
    border-bottom:1px solid #1e2d3d; background:#0b0f14;
    position:sticky; top:0; z-index:20; flex-shrink:0;
  }
  .topbar h1 { font-size:17px; font-weight:700; color:#f0f4f8; }
  .topbar p  { font-size:11px; color:#506070; margin-top:1px; }

  .content { padding:20px 24px; flex:1; overflow-y:auto; }

  .kpi-row { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:20px; }
  .kpi { background:#131920; border:1px solid #1e2d3d; border-radius:12px; padding:14px 16px; }
  .kpi-lbl { font-size:10px; color:#506070; text-transform:uppercase; letter-spacing:.07em; margin-bottom:4px; }
  .kpi-val { font-size:22px; font-weight:800; line-height:1; }

  .toolbar { display:flex; align-items:center; gap:10px; margin-bottom:16px; flex-wrap:wrap; }
  .toolbar-note {
    display:flex; align-items:center; gap:7px; flex:1;
    background:#131920; border:1px solid #1e2d3d;
    border-radius:8px; padding:8px 12px; font-size:11px; color:#8fa3b8;
    min-width:0;
  }
  .toolbar-note svg { width:14px; height:14px; color:#00b4d8; flex-shrink:0; }

  /* Custom select (igual que puntajes) */
  .custom-select-wrap { position:relative; }
  .custom-select-btn {
    display:flex; align-items:center; gap:8px;
    background:#131920; border:1px solid #1e2d3d;
    border-radius:8px; padding:0 10px; height:34px;
    color:#f0f4f8; font-size:12px; font-family:inherit;
    cursor:pointer; transition:border-color .15s; white-space:nowrap;
    min-width:140px; justify-content:space-between;
  }
  .custom-select-btn:hover,.custom-select-btn.open { border-color:#00b4d8; }
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
    border:none; background:none; width:100%; text-align:left; font-family:inherit;
  }
  .custom-select-opt:hover { background:#1a2230; color:#f0f4f8; }
  .custom-select-opt.selected { color:#00b4d8; background:#00b4d808; }
  .custom-select-opt svg { width:14px; height:14px; color:#00b4d8; flex-shrink:0; }

  /* Cards */
  .asist-card { background:#131920; border:1px solid #1e2d3d; border-radius:14px; overflow:hidden; margin-bottom:14px; transition:border-color .15s; }
  .asist-card:hover { border-color:#243447; }

  .ac-head { display:flex; align-items:center; gap:16px; padding:16px 20px; border-bottom:1px solid #1e2d3d; }
  .ac-info { flex:1; min-width:0; }
  .ac-nombre { font-size:14px; font-weight:700; color:#f0f4f8; margin-bottom:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .ac-sub    { font-size:11px; color:#506070; margin-bottom:6px; }
  .ac-stats  { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .ac-stat   { display:flex; align-items:center; gap:4px; font-size:11px; font-weight:500; white-space:nowrap; }
  .dot       { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
  .ac-badge  { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:6px; font-size:10px; font-weight:600; border:1px solid; margin-top:6px; }

  /* Barra */
  .bar-section { padding:12px 20px 16px; border-bottom:1px solid #1e2d3d; }
  .bar-label-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; gap:12px; }
  .bar-label-left { font-size:11px; color:#8fa3b8; }
  .bar-label-right { font-size:12px; font-weight:700; white-space:nowrap; }
  .bar-svg-wrap { width:100%; display:block; }

  /* Días */
  .dias-section { padding:14px 20px; }
  .dias-title { font-size:10px; font-weight:600; color:#506070; text-transform:uppercase; letter-spacing:.07em; margin-bottom:10px; }
  .dias-grid  { display:flex; flex-wrap:wrap; gap:6px; }
  .dia-btn {
    width:36px; height:36px; border-radius:9px; border:1px solid;
    cursor:pointer; display:flex; flex-direction:column;
    align-items:center; justify-content:center; gap:1px;
    transition:transform .1s; background:none; flex-shrink:0;
  }
  .dia-btn:hover { transform:scale(1.1); }
  .dia-btn:active { transform:scale(0.95); }
  .dia-num  { font-size:9px; font-weight:700; line-height:1; }
  .dia-icon { font-size:10px; line-height:1; }
  .dias-legend { display:flex; gap:14px; margin-top:10px; }
  .dias-legend span { display:flex; align-items:center; gap:4px; font-size:11px; color:#3a4f6a; }
  .legend-box { width:8px; height:8px; border-radius:3px; border:1px solid; display:inline-block; }

  /* Modal */
  .modal-backdrop {
    position:fixed; inset:0; z-index:200;
    background:rgba(0,0,0,.65); backdrop-filter:blur(4px);
    display:flex; align-items:center; justify-content:center; padding:16px;
  }
  .modal-box {
    background:#131920; border:1px solid #1e2d3d;
    border-radius:16px; padding:24px;
    width:100%; max-width:340px; position:relative;
    box-shadow:0 24px 60px rgba(0,0,0,.6);
  }
  .modal-close {
    position:absolute; top:14px; right:14px; background:none; border:none;
    cursor:pointer; color:#506070; padding:4px; display:flex; align-items:center;
    transition:color .15s; border-radius:6px;
  }
  .modal-close:hover { color:#f0f4f8; background:#1a2230; }
  .modal-fecha  { font-size:11px; color:#506070; margin-bottom:4px; }
  .modal-nombre { font-size:15px; font-weight:700; color:#f0f4f8; margin-bottom:16px; }
  .modal-estado {
    display:flex; align-items:center; gap:8px;
    padding:10px 14px; border-radius:10px;
    font-size:13px; font-weight:600; border:1px solid; margin-bottom:14px;
  }
  .modal-motivo-lbl { font-size:10px; color:#506070; text-transform:uppercase; letter-spacing:.07em; margin-bottom:6px; }
  .modal-motivo-box {
    background:#0d1117; border:1px solid #1e2d3d;
    border-radius:8px; padding:12px; font-size:13px; color:#8fa3b8; line-height:1.6;
  }
  .modal-presente {
    display:flex; align-items:center; gap:10px;
    background:#22c55e15; border:1px solid #22c55e30;
    border-radius:10px; padding:12px 16px;
    font-size:13px; font-weight:600; color:#22c55e; margin-top:4px;
  }

  @media(max-width:768px){
    .kpi-row { grid-template-columns:repeat(2,1fr); gap:8px; margin-bottom:14px; }
    .kpi-val { font-size:20px; }
    .content { padding:14px; }
    .topbar  { padding:0 14px; }
    .toolbar { flex-direction:column; align-items:flex-start; }
    .toolbar-note { width:100%; }
    .ac-head { padding:12px 14px; gap:12px; }
    .dias-section { padding:12px 14px; }
    .bar-section  { padding:10px 14px; }
    .modal-backdrop { align-items:flex-end; padding:0; }
    .modal-box { border-radius:20px 20px 0 0; max-width:100%; padding:20px 20px 32px; }
    .custom-select-dropdown { position:fixed; left:14px; right:14px; }
  }
`

export default function Asistencia() {
  const [semestre, setSemestre]   = useState(semestres[0])
  const [dropSemOpen, setDropSem] = useState(false)
  const [dropFilOpen, setDropFil] = useState(false)
  const [filtro, setFiltro]       = useState<'todas'|'ok'|'riesgo'>('todas')
  const [modalInfo, setModalInfo] = useState<ModalInfo>(null)
  const semRef = useRef<HTMLDivElement>(null)
  const filRef = useRef<HTMLDivElement>(null)

  const materias = datosPorSemestre[semestre] ?? []

  const totalPresentes = materias.reduce((a,m)=>a+m.clases.filter(c=>c.presente).length,0)
  const totalClases    = materias.reduce((a,m)=>a+m.clases.length,0)
  const totalAusentes  = totalClases - totalPresentes
  const promGeneral    = totalClases ? Math.round((totalPresentes/totalClases)*100) : 0

  const filtered = materias.filter(m => {
    const p = pct(m.clases)
    if (filtro==='ok')     return p>=75
    if (filtro==='riesgo') return p<75
    return true
  })

  const filtroLabel = filtro==='ok'?'Regular (≥75%)':filtro==='riesgo'?'En riesgo (<75%)':'Todas las materias'

  useEffect(() => {
    function h(e:MouseEvent) {
      if (semRef.current && !semRef.current.contains(e.target as Node)) setDropSem(false)
      if (filRef.current && !filRef.current.contains(e.target as Node)) setDropFil(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <>
      <style>{css}</style>
      <div className="asist-root">

        <header className="topbar">
          <div>
            <h1>Mi asistencia</h1>
            <p>{semestre}</p>
          </div>
        </header>

        <div className="content">

          <div className="kpi-row">
            <div className="kpi"><div className="kpi-lbl">Promedio</div><div className="kpi-val" style={{color:colorPct(promGeneral).text}}>{promGeneral}%</div></div>
            <div className="kpi"><div className="kpi-lbl">Presentes</div><div className="kpi-val" style={{color:'#22c55e'}}>{totalPresentes}</div></div>
            <div className="kpi"><div className="kpi-lbl">Ausentes</div><div className="kpi-val" style={{color:'#ef4444'}}>{totalAusentes}</div></div>
            <div className="kpi"><div className="kpi-lbl">Total clases</div><div className="kpi-val" style={{color:'#8fa3b8'}}>{totalClases}</div></div>
          </div>

          <div className="toolbar">
            <div className="toolbar-note">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Se requiere mínimo 75% de asistencia para rendir examen final
            </div>

            {/* Filtro materias */}
            <div className="custom-select-wrap" ref={filRef}>
              <button className={`custom-select-btn${dropFilOpen?' open':''}`} onClick={()=>setDropFil(!dropFilOpen)}>
                <span>{filtroLabel}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {dropFilOpen && (
                <div className="custom-select-dropdown">
                  {[
                    {val:'todas',label:'Todas las materias'},
                    {val:'ok',   label:'Regular (≥75%)'},
                    {val:'riesgo',label:'En riesgo (<75%)'},
                  ].map(o=>(
                    <button key={o.val} className={`custom-select-opt${filtro===o.val?' selected':''}`}
                      onClick={()=>{setFiltro(o.val as any);setDropFil(false)}}>
                      <span>{o.label}</span>
                      {filtro===o.val && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Semestre */}
            <div className="custom-select-wrap" ref={semRef}>
              <button className={`custom-select-btn${dropSemOpen?' open':''}`} onClick={()=>setDropSem(!dropSemOpen)}>
                <span>{semestre}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {dropSemOpen && (
                <div className="custom-select-dropdown">
                  {semestres.map(s=>(
                    <button key={s} className={`custom-select-opt${s===semestre?' selected':''}`}
                      onClick={()=>{setSemestre(s);setDropSem(false)}}>
                      <span>{s}</span>
                      {s===semestre && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cards */}
          {filtered.map(m => {
            const p   = pct(m.clases)
            const col = colorPct(p)
            const presentes = m.clases.filter(c=>c.presente).length
            const ausentes  = m.clases.length - presentes

            return (
              <div key={m.nombre} className="asist-card">

                <div className="ac-head">
                  <DonutSVG p={p} color={col.stroke} />
                  <div className="ac-info">
                    <div className="ac-nombre">{m.nombre}</div>
                    <div className="ac-sub">{m.codigo} · Prof. {m.profesor}</div>
                    <div className="ac-stats">
                      <div className="ac-stat"><div className="dot" style={{background:'#22c55e'}}/><span style={{color:'#22c55e'}}>{presentes} presentes</span></div>
                      <div className="ac-stat"><div className="dot" style={{background:'#ef4444'}}/><span style={{color:'#ef4444'}}>{ausentes} ausentes</span></div>
                      <div className="ac-stat"><div className="dot" style={{background:'#506070'}}/><span style={{color:'#506070'}}>{m.clases.length} clases</span></div>
                    </div>
                    <div className="ac-badge" style={{color:col.text,background:col.bg,borderColor:col.border}}>
                      {col.label}
                    </div>
                  </div>
                </div>

                {/* Barra SVG — proporcional exacta */}
                <div className="bar-section">
                  <div className="bar-label-row">
                    <span className="bar-label-left">Asistencia acumulada</span>
                    <span className="bar-label-right" style={{color:col.text}}>
                      {presentes}/{m.clases.length} clases · {p}%
                    </span>
                  </div>
                  <BarraSVG pct={p} color={col.stroke} />
                </div>

                {/* Días */}
                <div className="dias-section">
                  <div className="dias-title">Registro de clases — tocá para ver el detalle</div>
                  <div className="dias-grid">
                    {m.clases.map(dia => (
                      <button key={dia.numero} className="dia-btn"
                        onClick={() => setModalInfo({dia, materia:m.nombre})}
                        title={`Clase ${dia.numero} — ${dia.fecha}`}
                        style={{
                          borderColor: dia.presente ? '#22c55e40' : '#ef444440',
                          background:  dia.presente ? '#22c55e10' : '#ef444410',
                        }}
                      >
                        <span className="dia-num"  style={{color:dia.presente?'#22c55e':'#ef4444'}}>{dia.numero}</span>
                        <span className="dia-icon" style={{color:dia.presente?'#22c55e':'#ef4444'}}>{dia.presente?'✓':'✗'}</span>
                      </button>
                    ))}
                  </div>
                  <div className="dias-legend">
                    <span>
                      <span className="legend-box" style={{background:'#22c55e10',borderColor:'#22c55e40'}}/>
                      Presente
                    </span>
                    <span>
                      <span className="legend-box" style={{background:'#ef444410',borderColor:'#ef444440'}}/>
                      Ausente
                    </span>
                  </div>
                </div>

              </div>
            )
          })}
        </div>
      </div>

      {/* Modal */}
      {modalInfo && (
        <div className="modal-backdrop" onClick={()=>setModalInfo(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <button className="modal-close" onClick={()=>setModalInfo(null)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <div className="modal-fecha">Clase {modalInfo.dia.numero} · {modalInfo.dia.fecha}</div>
            <div className="modal-nombre">{modalInfo.materia}</div>

            {modalInfo.dia.presente ? (
              <div className="modal-presente">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Presente en esta clase
              </div>
            ) : (
              <>
                {(() => {
                  const ms = motivoStyle(modalInfo.dia.motivo??null)
                  return (
                    <>
                      <div className="modal-estado" style={{color:ms.color,background:ms.bg,borderColor:ms.border}}>
                        <i className={`ti ${ms.icon}`} style={{fontSize:16}} aria-hidden="true"/>
                        Ausente — {ms.label}
                      </div>
                      <div className="modal-motivo-lbl">Detalle del registro</div>
                      <div className="modal-motivo-box">
                        {modalInfo.dia.descripcion ?? 'Sin información adicional registrada.'}
                      </div>
                    </>
                  )
                })()}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}