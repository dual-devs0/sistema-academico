import { useState, useRef, useEffect, useCallback } from 'react'
import { api, decodeToken } from '../lib/api'

type Motivo = 'reposo' | 'justificado' | 'sin_motivo' | null
type DiaClase = { id?:number; numero:number; fecha:string; presente:boolean; motivo?:Motivo; descripcion?:string }
type MateriaAsistencia = { nombre:string; codigo:string; profesor:string; clases:DiaClase[]; materia_id?:number }

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
        {numero:9,fecha:'19 Mar',presente:true},
        {numero:10,fecha:'19 Mar',presente:true},
        {numero:11,fecha:'19 Mar',presente:true},
        {numero:12,fecha:'19 Mar',presente:false,motivo:'sin_motivo', descripcion:'Sin justificación registrada'},
        {numero:13,fecha:'19 Mar',presente:false,motivo:'reposo',     descripcion:'Reposo médico por gripe'},
        {numero:14,fecha:'19 Mar',presente:true},
        {numero:15,fecha:'19 Mar',presente:true},
        {numero:16,fecha:'19 Mar',presente:true},
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
  return Math.round((clases.filter(c => c.presente).length / clases.length) * 100)
}
function colorPct(p: number) {
  if (p >= 85) return { stroke:'#22c55e', text:'#22c55e', bg:'#22c55e15', border:'#22c55e30', label:'Regular' }
  if (p >= 75) return { stroke:'#f59e0b', text:'#f59e0b', bg:'#f59e0b15', border:'#f59e0b30', label:'En riesgo' }
  return             { stroke:'#ef4444', text:'#ef4444', bg:'#ef444415', border:'#ef444430', label:'Irregular' }
}
function motivoStyle(m: Motivo) {
  if (m === 'reposo')      return { color:'#f59e0b', bg:'#f59e0b15', border:'#f59e0b40', label:'Reposo médico',     icon:'ti-activity' }
  if (m === 'justificado') return { color:'#00b4d8', bg:'#00b4d815', border:'#00b4d840', label:'Justificado',       icon:'ti-file-check' }
  if (m === 'sin_motivo')  return { color:'#ef4444', bg:'#ef444415', border:'#ef444440', label:'Sin justificación', icon:'ti-alert-circle' }
  return                          { color:'#506070', bg:'#1e2d3d18', border:'#1e2d3d',   label:'',                  icon:'' }
}

function BarraCSS({ pct: p, color }: { pct: number; color: string }) {
  return (
    <div style={{ position:'relative', height:28 }}>
      <div style={{ position:'absolute', top:10, left:0, right:0, height:7, borderRadius:3.5, background:'#1e2d3d' }} />
      <div style={{ position:'absolute', top:10, left:0, width:`${p}%`, height:7, borderRadius:3.5, background:color, transition:'width .5s ease' }} />
      <div style={{ position:'absolute', top:7, left:'75%', transform:'translateX(-50%)', width:2, height:13, borderRadius:1, background:'#f59e0b', opacity:0.7 }} />
      <div style={{ position:'absolute', top:21, left:'75%', transform:'translateX(-50%)', fontSize:9, fontWeight:700, color:'#f59e0b', fontFamily:'Inter,sans-serif', whiteSpace:'nowrap' }}>
        mín. 75%
      </div>
    </div>
  )
}

function DonutSVG({ p, color }: { p: number; color: string }) {
  const r = 36, cx = 44, cy = 44, circ = 2 * Math.PI * r
  const filled = (p / 100) * circ
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" style={{ flexShrink:0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e2d3d" strokeWidth="8" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition:'stroke-dasharray .5s ease' }}
      />
      <text x={cx} y={cy - 5} textAnchor="middle" dominantBaseline="middle"
        fontFamily="Inter,sans-serif" fontSize="14" fontWeight="800" fill="#f0f4f8">{p}%</text>
      <text x={cx} y={cy + 10} textAnchor="middle" dominantBaseline="middle"
        fontFamily="Inter,sans-serif" fontSize="9" fill="#506070">asist.</text>
    </svg>
  )
}

type ModalInfo = { dia: DiaClase; materia: string } | null

const css = `
  *, *::before, *::after { box-sizing:border-box; }
  .asist-root { display:flex; flex-direction:column; flex:1; font-family:'Inter',system-ui,sans-serif; color:#f0f4f8; }

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

  .toolbar-note {
    display:flex; align-items:center; gap:7px;
    background:#131920; border:1px solid #1e2d3d;
    border-radius:8px; padding:8px 12px; font-size:11px; color:#8fa3b8;
  }
  .toolbar-note svg { width:14px; height:14px; color:#00b4d8; flex-shrink:0; }

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
    box-shadow:0 12px 32px rgba(0,0,0,.5); z-index:999;
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

  .bar-section { padding:12px 20px 20px; border-bottom:1px solid #1e2d3d; }
  .bar-label-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; gap:12px; }
  .bar-label-left  { font-size:11px; color:#8fa3b8; }
  .bar-label-right { font-size:12px; font-weight:700; white-space:nowrap; }

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
    .toolbar-right { width:100%; flex-direction:column; align-items:stretch; gap:8px; }
    .custom-select-wrap { width:100%; }
    .custom-select-btn  { width:100%; min-width:unset; }
    .custom-select-dropdown { position:absolute; left:0; right:0; top:calc(100% + 6px); z-index:999; }
    .ac-head { padding:12px 14px; gap:12px; }
    .dias-section { padding:12px 14px; }
    .bar-section  { padding:10px 14px 18px; }
    .modal-backdrop { align-items:flex-end; padding:0; }
    .modal-box { border-radius:20px 20px 0 0; max-width:100%; padding:20px 20px 32px; }
  }
.btn-primary {
  display:flex; align-items:center; gap:6px;
  padding:7px 14px; border-radius:8px;
  border:1px solid #00b4d8; background:#00b4d818;
  color:#00b4d8; font-size:12px; font-weight:600;
  cursor:pointer; font-family:inherit;
  transition:background .12s;
  white-space:nowrap;
}
.btn-primary:hover { background:#00b4d830; }
.btn-toggle.active { background:#1a2230 !important; border-color:#00b4d8 !important; }
`

type ModalCRUD = { type:'create'; materia:MateriaAsistencia } | { type:'edit'; dia:DiaClase; materia:MateriaAsistencia } | null

export default function Asistencia() {
  const token = localStorage.getItem('token')
  const user = token ? decodeToken(token) : null
  const role = user?.role || 'alumno'
  const puedeEditar = role === 'admin' || role === 'profesor'

  const [semestre, setSemestre]   = useState(semestres[0])
  const [filtro, setFiltro]       = useState<'todas' | 'ok' | 'riesgo'>('todas')
  const [dropSemOpen, setDropSem] = useState(false)
  const [dropFilOpen, setDropFil] = useState(false)
  const [modalInfo, setModalInfo] = useState<ModalInfo>(null)
  const [modalCRUD, setModalCRUD] = useState<ModalCRUD>(null)
  const [apiData, setApiData] = useState<MateriaAsistencia[] | null>(null)
  const [qrModal, setQrModal] = useState<{show:boolean; imagen?:string; nombre?:string; countdown?:number}>({show:false})

  const semRef = useRef<HTMLDivElement>(null)
  const filRef = useRef<HTMLDivElement>(null)

  const cargarAsistencias = useCallback(() => {
    if (!user) return
    Promise.all([
      api.get<{ id: number; nombre: string; profesor_id: number }[]>('/materias/').catch(() => []),
      api.get<{ id: number; user_id: number; materia_id: number; fecha: string; presente: boolean; es_becado?: boolean }[]>('/asistencias/').catch(() => []),
    ]).then(([materiasData, asistenciasData]) => {
      const grouped = materiasData.map(m => {
        const cls = asistenciasData.filter(a => a.materia_id === m.id)
        return {
          nombre: m.nombre,
          materia_id: m.id,
          codigo: `MAT${m.id}`,
          profesor: `Prof. ${m.profesor_id}`,
          clases: cls.map((a, i) => ({
            id: a.id,
            numero: i + 1,
            fecha: a.fecha,
            presente: a.presente,
          })),
        }
      })
      if (grouped.length > 0) setApiData(grouped)
    }).catch(() => {})
  }, [user])

  useEffect(() => { cargarAsistencias() }, [cargarAsistencias])

  function crearAsistencia(materiaId: number, fecha: string, presente: boolean) {
    if (!user) return
    api.post('/asistencias/', { user_id: user.user_id, materia_id: materiaId, fecha, presente, es_becado: false })
      .then(() => cargarAsistencias())
      .catch(() => alert('Error al crear asistencia'))
    setModalCRUD(null)
  }

  function editarAsistencia(id: number, materiaId: number, fecha: string, presente: boolean) {
    api.put(`/asistencias/${id}`, { user_id: user?.user_id, materia_id: materiaId, fecha, presente, es_becado: false })
      .then(() => cargarAsistencias())
      .catch(() => alert('Error al actualizar asistencia'))
    setModalCRUD(null)
  }

  function eliminarAsistencia(id: number) {
    if (!confirm('¿Eliminar este registro de asistencia?')) return
    api.delete(`/asistencias/${id}`)
      .then(() => cargarAsistencias())
      .catch(() => alert('Error al eliminar asistencia'))
  }

  function generarQR(materiaId: number, materiaNombre: string) {
    import('../lib/api').then(({ api }) => {
      api.get<{qr_image:string; expires_in:number}>(`/asistencias/qr/${materiaId}`)
        .then(res => {
          let secs = res.expires_in
          setQrModal({ show:true, imagen:res.qr_image, nombre:materiaNombre, countdown:secs })
          const iv = setInterval(() => {
            secs--
            if (secs <= 0) { clearInterval(iv); setQrModal(p => ({...p, countdown:0})); return }
            setQrModal(p => ({...p, countdown:secs}))
          }, 1000)
        })
        .catch(err => alert('Error generando QR: ' + (err.message || 'intente nuevamente')))
    })
  }

  const materias = apiData ?? datosPorSemestre[semestre] ?? []

  const totalPresentes = materias.reduce((a, m) => a + m.clases.filter(c => c.presente).length, 0)
  const totalClases    = materias.reduce((a, m) => a + m.clases.length, 0)
  const totalAusentes  = totalClases - totalPresentes
  const promGeneral    = totalClases ? Math.round((totalPresentes / totalClases) * 100) : 0

  const filtered = materias.filter(m => {
    const p = pct(m.clases)
    if (filtro === 'ok')     return p >= 75
    if (filtro === 'riesgo') return p < 75
    return true
  })

  const filtroLabel = filtro === 'ok' ? 'Regular (≥75%)' : filtro === 'riesgo' ? 'En riesgo (<75%)' : 'Todas las materias'

  useEffect(() => {
    function h(e: MouseEvent | TouchEvent) {
      if (semRef.current && !semRef.current.contains(e.target as Node)) setDropSem(false)
      if (filRef.current && !filRef.current.contains(e.target as Node)) setDropFil(false)
    }
    document.addEventListener('mousedown', h)
    document.addEventListener('touchend', h)
    return () => {
      document.removeEventListener('mousedown', h)
      document.removeEventListener('touchend', h)
    }
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
            <div className="kpi">
              <div className="kpi-lbl">Promedio</div>
              <div className="kpi-val" style={{ color:colorPct(promGeneral).text }}>{promGeneral}%</div>
            </div>
            <div className="kpi">
              <div className="kpi-lbl">Presentes</div>
              <div className="kpi-val" style={{ color:'#22c55e' }}>{totalPresentes}</div>
            </div>
            <div className="kpi">
              <div className="kpi-lbl">Ausentes</div>
              <div className="kpi-val" style={{ color:'#ef4444' }}>{totalAusentes}</div>
            </div>
            <div className="kpi">
              <div className="kpi-lbl">Total clases</div>
              <div className="kpi-val" style={{ color:'#8fa3b8' }}>{totalClases}</div>
            </div>
          </div>

          <div className="toolbar">
            <div className="toolbar-left">
              {materias.length} materias · Asistencia general: <strong>{promGeneral}%</strong>
            </div>
            <div className="toolbar-right">

              <div className="toolbar-note">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                Mínimo 75% para rendir examen final
              </div>

              <div className="custom-select-wrap" ref={filRef}>
                <button
                  className={`custom-select-btn${dropFilOpen ? ' open' : ''}`}
                  onClick={() => setDropFil(v => !v)}
                >
                  <span>{filtroLabel}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {dropFilOpen && (
                  <div className="custom-select-dropdown">
                    {[
                      { val:'todas',  label:'Todas las materias' },
                      { val:'ok',     label:'Regular (≥75%)' },
                      { val:'riesgo', label:'En riesgo (<75%)' },
                    ].map(o => (
                      <button
                        key={o.val}
                        className={`custom-select-opt${filtro === o.val ? ' selected' : ''}`}
                        onClick={() => { setFiltro(o.val as any); setDropFil(false) }}
                      >
                        <span>{o.label}</span>
                        {filtro === o.val && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="custom-select-wrap" ref={semRef}>
                <button
                  className={`custom-select-btn${dropSemOpen ? ' open' : ''}`}
                  onClick={() => setDropSem(v => !v)}
                >
                  <span>{semestre}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {dropSemOpen && (
                  <div className="custom-select-dropdown">
                    {semestres.map(s => (
                      <button
                        key={s}
                        className={`custom-select-opt${s === semestre ? ' selected' : ''}`}
                        onClick={() => { setSemestre(s); setDropSem(false) }}
                      >
                        <span>{s}</span>
                        {s === semestre && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              {puedeEditar && (
                <button className="btn-primary" onClick={() => setModalCRUD({type:'create', materia: materias[0]})}>
                  + Nueva asistencia
                </button>
              )}
              </div>

            </div>
          </div>

          {filtered.map(m => {
            const p         = pct(m.clases)
            const col       = colorPct(p)
            const presentes = m.clases.filter(c => c.presente).length
            const ausentes  = m.clases.length - presentes

            return (
              <div key={m.nombre} className="asist-card">

                <div className="ac-head">
                  <DonutSVG p={p} color={col.stroke} />
                  <div className="ac-info">
                    <div className="ac-nombre">{m.nombre}</div>
                    <div className="ac-sub">{m.codigo} · Prof. {m.profesor}</div>
                    <div className="ac-stats">
                      <div className="ac-stat"><div className="dot" style={{ background:'#22c55e' }}/><span style={{ color:'#22c55e' }}>{presentes} presentes</span></div>
                      <div className="ac-stat"><div className="dot" style={{ background:'#ef4444' }}/><span style={{ color:'#ef4444' }}>{ausentes} ausentes</span></div>
                      <div className="ac-stat"><div className="dot" style={{ background:'#506070' }}/><span style={{ color:'#506070' }}>{m.clases.length} clases</span></div>
                    </div>
                    <div className="ac-badge" style={{ color:col.text, background:col.bg, borderColor:col.border }}>
                      {col.label}
                    </div>
                    {puedeEditar && m.materia_id && (
                      <button onClick={() => generarQR(m.materia_id!, m.nombre)}
                        style={{marginTop:10,display:'flex',alignItems:'center',gap:6,padding:'6px 12px',borderRadius:8,border:'1px solid #00b4d840',background:'#00b4d812',color:'#00b4d8',cursor:'pointer',fontSize:12,fontFamily:'inherit',fontWeight:600}}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                          <rect x="3" y="14" width="7" height="7"/><rect x="17" y="17" width="4" height="4"/>
                          <rect x="14" y="14" width="3" height="3"/>
                        </svg>
                        Generar QR
                      </button>
                    )}
                  </div>
                </div>

                <div className="bar-section">
                  <div className="bar-label-row">
                    <span className="bar-label-left">Asistencia acumulada</span>
                    <span className="bar-label-right" style={{ color:col.text }}>
                      {presentes}/{m.clases.length} clases · {p}%
                    </span>
                  </div>
                  <BarraCSS pct={p} color={col.stroke} />
                </div>

                <div className="dias-section">
                  <div className="dias-title">Registro de clases — tocá para ver el detalle</div>
                  <div className="dias-grid">
                    {m.clases.map((dia, idx) => (
                      <div key={idx} style={{ position:'relative', display:'inline-flex' }}>
                        <button className="dia-btn"
                          onClick={() => setModalInfo({ dia, materia:m.nombre })}
                          title={`Clase ${dia.numero} — ${dia.fecha}`}
                          style={{
                            borderColor: dia.presente ? '#22c55e40' : '#ef444440',
                            background:  dia.presente ? '#22c55e10' : '#ef444410',
                          }}
                        >
                          <span className="dia-num"  style={{ color:dia.presente ? '#22c55e' : '#ef4444' }}>{dia.numero}</span>
                          <span className="dia-icon" style={{ color:dia.presente ? '#22c55e' : '#ef4444' }}>{dia.presente ? '✓' : '✗'}</span>
                        </button>
                        {puedeEditar && dia.id && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); setModalCRUD({type:'edit', dia, materia: m}) }}
                              style={{position:'absolute', top:-4, right:-4, width:16, height:16, borderRadius:'50%', border:'1px solid #00b4d8', background:'#131920', color:'#00b4d8', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0, fontSize:9, fontFamily:'inherit', zIndex:1}}
                              title="Editar"
                            >
                              ✎
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); dia.id && eliminarAsistencia(dia.id) }}
                              style={{position:'absolute', bottom:-4, right:-4, width:16, height:16, borderRadius:'50%', border:'1px solid #ef4444', background:'#131920', color:'#ef4444', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0, fontSize:9, fontFamily:'inherit', zIndex:1}}
                              title="Eliminar"
                            >
                              ✕
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="dias-legend">
                    <span><span className="legend-box" style={{ background:'#22c55e10', borderColor:'#22c55e40' }}/>Presente</span>
                    <span><span className="legend-box" style={{ background:'#ef444410', borderColor:'#ef444440' }}/>Ausente</span>
                  </div>
                </div>

              </div>
            )
          })}

        </div>
      </div>

      {modalInfo && (
        <div className="modal-backdrop" onClick={() => setModalInfo(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setModalInfo(null)}>
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
                  const ms = motivoStyle(modalInfo.dia.motivo ?? null)
                  return (
                    <>
                      <div className="modal-estado" style={{ color:ms.color, background:ms.bg, borderColor:ms.border }}>
                        <i className={`ti ${ms.icon}`} style={{ fontSize:16 }} aria-hidden="true"/>
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

      {qrModal.show && (
        <div className="modal-backdrop" onClick={() => setQrModal({show:false})}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{maxWidth:340,textAlign:'center'}}>
            <button className="modal-close" onClick={() => setQrModal({show:false})}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <div style={{fontSize:11,color:'#00b4d8',fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6}}>QR Asistencia</div>
            <div style={{fontSize:15,fontWeight:700,color:'#f0f4f8',marginBottom:4}}>{qrModal.nombre}</div>
            <div style={{fontSize:11,color:'#506070',marginBottom:16}}>Mostrá este código a tus alumnos para registrar asistencia</div>
            {qrModal.imagen && (
              <img src={qrModal.imagen} alt="QR"
                style={{width:210,height:210,borderRadius:12,border:'4px solid #1e2d3d',margin:'0 auto 16px',display:'block'}} />
            )}
            <div style={{display:'inline-flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:8,
              background:(qrModal.countdown??0)>60?'#22c55e18':'#ef444418',
              border:'1px solid',borderColor:(qrModal.countdown??0)>60?'#22c55e40':'#ef444440',
              color:(qrModal.countdown??0)>60?'#22c55e':'#ef4444',fontSize:13,fontWeight:700}}>
              {(qrModal.countdown??0)>0
                ?`⏱ Expira en ${Math.floor((qrModal.countdown??0)/60)}:${String((qrModal.countdown??0)%60).padStart(2,'0')}`
                :'❌ QR expirado'}
            </div>
          </div>
        </div>
      )}

      {modalCRUD && (
        <div className="modal-backdrop" onClick={() => setModalCRUD(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{maxWidth:420}}>
            <button className="modal-close" onClick={() => setModalCRUD(null)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <div className="modal-fecha" style={{fontSize:15, marginBottom:4, color:'#00b4d8'}}>
              {modalCRUD.type === 'create' ? 'Nueva asistencia' : 'Editar asistencia'}
            </div>
            <div className="modal-nombre" style={{marginBottom:16}}>{modalCRUD.materia.nombre}</div>

            {/* Date input */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11, color:'#506070', marginBottom:4, fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em'}}>Fecha</div>
              <input type="date" defaultValue={new Date().toISOString().slice(0,10)} id="crud-fecha"
                style={{width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #243447', background:'#131920', color:'#f0f4f8', fontSize:13, fontFamily:'inherit'}}
              />
            </div>

            {/* Present/Ausente toggle */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11, color:'#506070', marginBottom:6, fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em'}}>Estado</div>
              <div style={{display:'flex', gap:8}}>
                <button id="crud-presente" className="btn-toggle active" onClick={() => {
                  document.querySelectorAll('.btn-toggle').forEach(b => b.classList.remove('active'))
                  document.getElementById('crud-presente')?.classList.add('active')
                }}
                style={{flex:1, padding:'8px', borderRadius:8, border:'1px solid #243447', background:'#131920', color:'#22c55e', cursor:'pointer', fontSize:13, fontFamily:'inherit', fontWeight:600}}>
                  ✓ Presente
                </button>
                <button id="crud-ausente" className="btn-toggle" onClick={() => {
                  document.querySelectorAll('.btn-toggle').forEach(b => b.classList.remove('active'))
                  document.getElementById('crud-ausente')?.classList.add('active')
                }}
                style={{flex:1, padding:'8px', borderRadius:8, border:'1px solid #243447', background:'#131920', color:'#ef4444', cursor:'pointer', fontSize:13, fontFamily:'inherit', fontWeight:600}}>
                  ✗ Ausente
                </button>
              </div>
            </div>

            {/* Submit */}
            <button onClick={() => {
              const fecha = (document.getElementById('crud-fecha') as HTMLInputElement)?.value || ''
              const presente = document.getElementById('crud-presente')?.classList.contains('active') ?? true
              if (modalCRUD.type === 'create') {
                crearAsistencia(modalCRUD.materia.materia_id!, fecha, presente)
              } else {
                editarAsistencia(modalCRUD.dia.id!, modalCRUD.materia.materia_id!, fecha, presente)
              }
            }}
            style={{width:'100%', padding:'10px', borderRadius:8, border:'none', background:'#00b4d8', color:'#000', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit'}}>
              {modalCRUD.type === 'create' ? 'Registrar asistencia' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}