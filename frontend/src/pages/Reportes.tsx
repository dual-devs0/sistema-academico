import { useState, useEffect } from 'react'
import { api } from '../lib/api'

interface CarreraStats {
  carrera: string
  total_alumnos: number
  asistencia_pct: number
  aprobados_pct: number
  en_riesgo: number
}

interface Resumen {
  total_alumnos: number
  total_becados: number
  total_materias: number
  total_profesores: number
}

interface BecadoUser {
  id: number
  username: string
  nombre: string | null
  email: string | null
  carrera_id: number | null
  role: string
}

const MOCK_RESUMEN: Resumen = { total_alumnos:245, total_becados:87, total_materias:18, total_profesores:12 }
const MOCK_CARRERAS: CarreraStats[] = [
  { carrera:'Ing. Informática', total_alumnos:125, asistencia_pct:89, aprobados_pct:92, en_riesgo:10 },
  { carrera:'Ing. Civil',       total_alumnos:80,  asistencia_pct:85, aprobados_pct:88, en_riesgo:8  },
  { carrera:'Arquitectura',     total_alumnos:40,  asistencia_pct:91, aprobados_pct:94, en_riesgo:3  },
]

const CYAN   = 'var(--accent)'
const GREEN  = '#22c55e'
const YELLOW = '#f59e0b'
const RED    = '#ef4444'
const PURPLE = '#a855f7'
const BLUE   = '#3b82f6'

const reportes = [
  { id:1, titulo:'Reporte de asistencia general',  descripcion:'Asistencia de todos los alumnos por materia y fecha', tipo:'asistencia', generado:'2026-06-20' },
  { id:2, titulo:'Reporte de puntajes por carrera', descripcion:'Promedios y distribución de notas por carrera',       tipo:'puntajes',   generado:'2026-06-20' },
  { id:3, titulo:'Reporte de alumnos becados',      descripcion:'Lista completa de alumnos con beca activa',           tipo:'becados',    generado:'2026-06-19' },
  { id:4, titulo:'Reporte de materias y docentes',  descripcion:'Materias activas con profesor asignado y cantidad',   tipo:'materias',   generado:'2026-06-18' },
]


const tipoCfg: Record<string,{color:string;bg:string;label:string}> = {
  asistencia: { color:GREEN,  bg:'#22c55e15', label:'Asistencia' },
  puntajes:   { color:BLUE,   bg:'#3b82f615', label:'Puntajes'   },
  becados:    { color:PURPLE, bg:'#a855f715', label:'Becados'    },
  materias:   { color:YELLOW, bg:'#f59e0b15', label:'Materias'   },
}

function buildReportePdfHtml(tipo: string, carrerasData: CarreraStats[], res: Resumen): string {
  const r   = reportes.find(x=>x.tipo===tipo)!
  const cfg = tipoCfg[tipo]
  const fecha = new Date().toLocaleDateString('es-PY',{day:'2-digit',month:'long',year:'numeric'})

  const filas = carrerasData.map(c=>`<tr>
    <td style="font-weight:600;color:#1e293b;padding:11px 16px;border-bottom:1px solid #f1f5f9;">${c.carrera}</td>
    <td style="text-align:center;color:#64748b;padding:11px 16px;border-bottom:1px solid #f1f5f9;">${c.total_alumnos}</td>
    <td style="text-align:center;font-weight:700;color:#16a34a;padding:11px 16px;border-bottom:1px solid #f1f5f9;">${c.asistencia_pct}%</td>
    <td style="text-align:center;font-weight:700;color:#0284c7;padding:11px 16px;border-bottom:1px solid #f1f5f9;">${c.aprobados_pct}%</td>
    <td style="text-align:center;font-weight:700;color:#dc2626;padding:11px 16px;border-bottom:1px solid #f1f5f9;">${c.en_riesgo}</td>
  </tr>`).join('')

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#fff;color:#1e293b;font-size:13px;}
  .wrap{max-width:740px;margin:0 auto;}
  .hdr{display:flex;align-items:center;justify-content:space-between;padding:20px 28px 18px;border-bottom:3px solid ${cfg.color};}
  .hdr-logo{width:42px;height:42px;background:${cfg.color};border-radius:10px;display:flex;align-items:center;justify-content:center;}
  .hdr-logo svg{width:20px;height:20px;}
  .hdr-inst{font-size:16px;font-weight:800;color:#0f172a;}
  .hdr-sub{font-size:11px;color:#64748b;margin-top:2px;}
  .hdr-r{text-align:right;}
  .meta{background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:16px 28px;display:flex;gap:24px;flex-wrap:wrap;}
  .mi .ml{font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px;}
  .mi .mv{font-size:13px;font-weight:600;color:#1e293b;}
  .mi .mc{font-size:13px;font-weight:700;color:${cfg.color};}
  .kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:20px 28px;border-bottom:1px solid #e2e8f0;}
  .kpi{border:1px solid #e2e8f0;border-radius:10px;padding:14px;text-align:center;}
  .kpi-v{font-size:22px;font-weight:800;line-height:1;margin-bottom:4px;}
  .kpi-l{font-size:10px;color:#64748b;}
  .sec{font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;font-weight:700;padding:14px 28px 8px;}
  table{width:100%;border-collapse:collapse;}
  thead th{padding:9px 16px;font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.07em;text-align:left;border-bottom:2px solid #e2e8f0;background:#f8fafc;}
  thead th.c{text-align:center;}
  .rep-list{padding:14px 28px 20px;}
  .rep-row{display:flex;align-items:flex-start;gap:12px;padding:12px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:8px;}
  .rep-dot{width:10px;height:10px;border-radius:50%;background:${cfg.color};flex-shrink:0;margin-top:3px;}
  .rep-t{font-size:13px;font-weight:600;color:#1e293b;}
  .rep-d{font-size:11px;color:#64748b;margin-top:2px;}
  .foot{display:flex;align-items:center;justify-content:space-between;padding:10px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;}
  .foot span{font-size:10px;color:#94a3b8;}
</style>
</head><body><div class="wrap">
<div class="hdr">
  <div style="display:flex;align-items:center;gap:14px;">
    <div class="hdr-logo"><svg viewBox="0 0 24 24" fill="white"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg></div>
    <div><div class="hdr-inst">Universidad Católica</div><div class="hdr-sub">Ntra. Sra. de la Asunción — Unidad Pedagógica Caacupé</div></div>
  </div>
  <div class="hdr-r"><div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.07em;">Fecha de emisión</div><div style="font-size:13px;font-weight:700;color:#1e293b;margin-top:2px;">${fecha}</div></div>
</div>
<div class="meta">
  <div class="mi"><div class="ml">Reporte</div><div class="mc">${r.titulo}</div></div>
  <div class="mi"><div class="ml">Descripción</div><div class="mv">${r.descripcion}</div></div>
  <div class="mi"><div class="ml">Generado</div><div class="mv">${new Date(r.generado+'T00:00:00').toLocaleDateString('es-PY')}</div></div>
</div>
<div class="kpi-row">
  <div class="kpi"><div class="kpi-v" style="color:var(--accent);">${res.total_alumnos}</div><div class="kpi-l">Total alumnos</div></div>
  <div class="kpi"><div class="kpi-v" style="color:#22c55e;">${res.total_becados}</div><div class="kpi-l">Becados</div></div>
  <div class="kpi"><div class="kpi-v" style="color:#a855f7;">${res.total_materias}</div><div class="kpi-l">Materias</div></div>
  <div class="kpi"><div class="kpi-v" style="color:#f59e0b;">${res.total_profesores}</div><div class="kpi-l">Docentes</div></div>
</div>
<div class="sec">Resumen por carrera</div>
<table>
  <thead><tr><th>Carrera</th><th class="c">Alumnos</th><th class="c">Asistencia</th><th class="c">Aprobados</th><th class="c">En riesgo</th></tr></thead>
  <tbody>${filas}</tbody>
</table>
<div class="sec" style="margin-top:12px;">Reportes incluidos</div>
<div class="rep-list">
  ${reportes.map(x=>`<div class="rep-row"><div class="rep-dot"></div><div><div class="rep-t">${x.titulo}</div><div class="rep-d">${x.descripcion}</div></div></div>`).join('')}
</div>
<div class="foot">
  <span>Documento generado por el Sistema Académico UCA · Uso oficial</span>
  <span>Semestre 1 · 2026</span>
</div>
</div></body></html>`
}

function tipoIcono(tipo: string, color: string) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      {tipo==='asistencia' && <><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>}
      {tipo==='puntajes'   && <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>}
      {tipo==='becados'    && <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>}
      {tipo==='materias'   && <><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></>}
    </svg>
  )
}

const css = `
  *, *::before, *::after { box-sizing:border-box; }
  .rep-root { display:flex; flex-direction:column; flex:1; font-family:'Inter',system-ui,sans-serif; color:var(--text-primary); }

  .topbar {
    display:flex; align-items:center; padding:0 24px; height:56px;
    border-bottom:1px solid #2a3040; background:var(--bg-base);
    position:sticky; top:0; z-index:20; flex-shrink:0;
  }
  .topbar h1 { font-size:17px; font-weight:700; color:var(--text-primary); letter-spacing:-.01em; }

  .content { padding:20px 24px; flex:1; overflow-y:auto; }

  /* KPIs */
  .kpi-row { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:18px; }
  .kpi { background:var(--bg-surface); border:1px solid #2a3040; border-radius:14px; padding:16px; display:flex; flex-direction:column; gap:12px; transition:border-color .15s; }
  .kpi:hover { border-color:var(--border-light); }
  .kpi-top { display:flex; align-items:flex-start; justify-content:space-between; }
  .kpi-icon { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .kpi-icon svg { width:16px; height:16px; }
  .kpi-trend { font-size:10px; font-weight:700; padding:2px 7px; border-radius:20px; }
  .kpi-value { font-size:28px; font-weight:900; line-height:1; }
  .kpi-label { font-size:11px; color:var(--text-muted); margin-top:2px; }
  .kpi-bar { height:4px; background:#2a3040; border-radius:2px; overflow:hidden; }
  .kpi-fill { height:100%; border-radius:2px; }

  /* Grid */
  .main-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }

  /* Card */
  .card { background:var(--bg-surface); border:1px solid #2a3040; border-radius:14px; overflow:hidden; }
  .card-hdr { display:flex; align-items:center; justify-content:space-between; padding:14px 18px 12px; border-bottom:1px solid #2a3040; }
  .card-hdr h3 { font-size:13px; font-weight:700; color:var(--text-primary); }
  .card-hdr p  { font-size:11px; color:var(--text-muted); margin-top:2px; }

  /* Botones */
  .btn-primary { display:inline-flex; align-items:center; gap:6px; padding:8px 14px; background:var(--accent); border:none; border-radius:9px; color:#000; font-size:12px; font-weight:700; font-family:inherit; cursor:pointer; transition:opacity .15s; white-space:nowrap; }
  .btn-primary:hover { opacity:.85; }
  .btn-primary svg { width:12px; height:12px; }
  .btn-ghost  { display:inline-flex; align-items:center; gap:5px; padding:6px 11px; background:transparent; border:1px solid var(--border-light); border-radius:8px; color:var(--text-secondary); font-size:11px; font-weight:600; font-family:inherit; cursor:pointer; white-space:nowrap; transition:border-color .15s,color .15s; }
  .btn-ghost:hover { border-color:var(--text-muted); color:var(--text-primary); }
  .btn-ghost svg { width:11px; height:11px; }
  .btn-export { display:inline-flex; align-items:center; gap:5px; padding:6px 11px; background:var(--accent-muted); border:1px solid var(--accent-hover); border-radius:8px; color:var(--accent); font-size:11px; font-weight:700; font-family:inherit; cursor:pointer; white-space:nowrap; transition:background .15s; }
  .btn-export:hover { background:var(--accent-muted); }
  .btn-export svg { width:11px; height:11px; }

  /* Reporte item desktop */
  .rep-item { display:flex; align-items:center; gap:12px; padding:13px 16px; border-bottom:1px solid #2a304022; transition:background .12s; }
  .rep-item:last-child { border-bottom:none; }
  .rep-item:hover { background:var(--bg-hover); }
  .rep-icon  { width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .rep-icon svg { width:16px; height:16px; }
  .rep-info  { flex:1; min-width:0; }
  .rep-title { font-size:13px; font-weight:600; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .rep-desc  { font-size:11px; color:var(--text-muted); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .rep-date  { font-size:10px; color:var(--text-muted); margin-top:3px; }
  .rep-acts  { display:flex; gap:5px; flex-shrink:0; }

  /* Tabla */
  .sum-table { width:100%; border-collapse:collapse; }
  .sum-table thead th { padding:9px 14px; font-size:9px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:.07em; text-align:left; border-bottom:1px solid #2a3040; background:var(--bg-input); white-space:nowrap; }
  .sum-table thead th.c { text-align:center; }
  .sum-table tbody td { padding:11px 14px; border-bottom:1px solid #2a304022; font-size:13px; vertical-align:middle; }
  .sum-table tbody tr:last-child td { border-bottom:none; }
  .sum-table tbody tr:hover td { background:var(--bg-hover); }
  .sum-table td.c { text-align:center; font-weight:700; }
  .mini-bar  { height:4px; background:#2a3040; border-radius:2px; overflow:hidden; margin-top:4px; }
  .mini-fill { height:100%; border-radius:2px; }

  /* Distribución */
  .distrib { padding:14px 16px; border-top:1px solid #2a3040; display:flex; flex-direction:column; gap:9px; }
  .distrib-title { font-size:10px; color:var(--text-muted); font-weight:700; text-transform:uppercase; letter-spacing:.06em; margin-bottom:2px; }
  .distrib-row { display:flex; align-items:center; gap:10px; }
  .distrib-lbl { font-size:12px; color:var(--text-secondary); width:110px; flex-shrink:0; }
  .distrib-bar { flex:1; height:6px; background:#2a3040; border-radius:3px; overflow:hidden; }
  .distrib-fill { height:100%; border-radius:3px; }
  .distrib-pct { font-size:12px; font-weight:700; color:var(--accent); width:36px; text-align:right; }

  /* Mobile cards */
  .rep-cards { display:none; flex-direction:column; gap:8px; padding:12px; }
  .rep-card  { background:var(--bg-input); border:1px solid #2a3040; border-radius:12px; padding:12px; }
  .rep-card-top  { display:flex; align-items:flex-start; gap:10px; margin-bottom:10px; }
  .rep-card-title{ font-size:13px; font-weight:700; color:var(--text-primary); }
  .rep-card-desc { font-size:11px; color:var(--text-muted); margin-top:2px; }
  .rep-card-foot { display:flex; gap:7px; }
  .rep-card-foot .btn-ghost,
  .rep-card-foot .btn-export { flex:1; justify-content:center; }

  /* Modal Ver */
  .modal-backdrop {
    position:fixed; inset:0; background:rgba(0,0,0,.7);
    backdrop-filter:blur(6px); z-index:100;
    display:flex; align-items:center; justify-content:center; padding:16px;
  }
  .modal-box {
    background:var(--bg-surface); border:1px solid #2a3040;
    border-radius:16px; width:100%; max-width:560px;
    max-height:90dvh; overflow-y:auto;
    box-shadow:0 24px 60px rgba(0,0,0,.6);
  }
  .modal-head {
    display:flex; align-items:center; justify-content:space-between;
    padding:16px 20px 13px; border-bottom:1px solid #2a3040;
    position:sticky; top:0; background:var(--bg-surface); z-index:2;
  }
  .modal-head h2 { font-size:14px; font-weight:700; color:var(--text-primary); }
  .modal-close {
    background:none; border:none; color:var(--text-muted); cursor:pointer;
    padding:4px; border-radius:6px; display:flex; transition:color .15s;
  }
  .modal-close:hover { color:var(--text-primary); background:#2a3040; }
  .modal-close svg { width:18px; height:18px; }
  .modal-body { padding:16px 20px; display:flex; flex-direction:column; gap:14px; }
  .modal-kpi-row { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
  .modal-kpi { background:var(--bg-input); border:1px solid #2a3040; border-radius:10px; padding:12px 14px; }
  .modal-kpi-val { font-size:22px; font-weight:800; line-height:1; }
  .modal-kpi-lbl { font-size:10px; color:var(--text-muted); margin-top:3px; }
  .modal-section-title { font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.07em; font-weight:700; margin-bottom:8px; }
  .modal-table { width:100%; border-collapse:collapse; }
  .modal-table thead th { padding:8px 12px; font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; text-align:left; border-bottom:1px solid #2a3040; background:var(--bg-input); white-space:nowrap; }
  .modal-table thead th.c { text-align:center; }
  .modal-table tbody td { padding:10px 12px; border-bottom:1px solid #2a304022; font-size:12px; vertical-align:middle; }
  .modal-table tbody tr:last-child td { border-bottom:none; }
  .modal-table td.c { text-align:center; font-weight:700; }
  .modal-foot { display:flex; gap:8px; padding:0 20px 16px; }
  .modal-foot .btn-primary { flex:1; justify-content:center; }
  .modal-foot .btn-ghost   { flex:1; justify-content:center; }

  @media(max-width:768px){
    .modal-backdrop { align-items:flex-end; padding:0; }
    .modal-box { border-radius:20px 20px 0 0; max-width:100%; max-height:92dvh; }
    .modal-head { padding:14px 16px 11px; }
    .modal-body { padding:12px 14px; gap:10px; }
    .modal-kpi-row { grid-template-columns:repeat(2,1fr); gap:6px; }
    .modal-kpi { padding:8px 10px; }
    .modal-kpi-val { font-size:17px; }
    .modal-scroll { overflow-x:auto; -webkit-overflow-scrolling:touch; }
    .modal-section-title { margin-bottom:4px; }
    .modal-table thead th { padding:6px 8px; font-size:9px; }
    .modal-table tbody td { padding:7px 8px; font-size:11px; }
    .modal-foot { flex-direction:column; padding:0 14px 12px; gap:6px; }
  }

  /* Toast */
  .toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:#22c55e; color:#000; font-size:13px; font-weight:700; padding:10px 22px; border-radius:999px; z-index:200; white-space:nowrap; animation:tin .25s ease; }
  @keyframes tin { from{opacity:0;transform:translateX(-50%) translateY(8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }

  @media(max-width:900px){ .main-grid { grid-template-columns:1fr; } .kpi-row { grid-template-columns:repeat(2,1fr); } }
  @media(max-width:768px){
    .topbar  { padding:0 14px; }
    .content { padding:14px; }
    .rep-item  { display:none; }
    .rep-cards { display:flex; }
    .kpi-row { gap:8px; }
    .kpi-value { font-size:22px; }
  }
  @media(max-width:480px){
    .kpi-row { grid-template-columns:1fr 1fr; }
  }
`

export default function Reportes() {
  const [toast,        setToast]        = useState('')
  const [verModal,     setVerModal]     = useState<string|null>(null)
  const [loading,      setLoading]      = useState(true)
  const [resumen,      setResumen]      = useState<Resumen>({ total_alumnos:0, total_becados:0, total_materias:0, total_profesores:0 })
  const [carrerasData, setCarrerasData] = useState<CarreraStats[]>([])
  const [becadosData,  setBecadosData]  = useState<BecadoUser[]>([])

  useEffect(() => {
    Promise.allSettled([
      api.get<Resumen>('/reportes/resumen'),
      api.get<CarreraStats[]>('/reportes/por-carrera'),
      api.get<BecadoUser[]>('/reportes/becados'),
    ]).then(([res, car, bec]) => {
      if (res.status === 'fulfilled') setResumen(res.value)
      else setResumen(MOCK_RESUMEN)
      if (car.status === 'fulfilled') setCarrerasData(car.value)
      else setCarrerasData(MOCK_CARRERAS)
      if (bec.status === 'fulfilled') setBecadosData(bec.value)
    }).finally(() => setLoading(false))
  }, [])

  function showToast(msg:string){ setToast(msg); setTimeout(()=>setToast(''),2400) }

  async function exportarPDF(tipo:string){
    showToast('Generando PDF…')
    const html2pdf = (await import('html2pdf.js')).default
    const r = reportes.find(x=>x.tipo===tipo)!
    // Renderizar visible (fuera de pantalla pero no display:none)
    const container = document.createElement('div')
    container.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'width:794px',
      'min-height:100px',
      'background:#ffffff',
      'z-index:-9999',
      'opacity:0.01',
      'pointer-events:none',
    ].join(';')
    container.innerHTML = buildReportePdfHtml(tipo, carrerasData, resumen)
    document.body.appendChild(container)
    // Esperar render completo
    await new Promise(res=>setTimeout(res,600))
    try {
      await (html2pdf() as {set(o:Record<string,unknown>):{from(e:HTMLElement):{save():Promise<void>}}}).set({
        margin:[8,8],
        filename:`reporte_${r.tipo}_2026.pdf`,
        image:{type:'jpeg',quality:1},
        html2canvas:{
          scale:2,
          useCORS:true,
          backgroundColor:'#ffffff',
          logging:false,
          allowTaint:true,
          windowWidth:794,
        },
        jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},
      }).from(container).save()
      showToast('PDF descargado ✓')
    } catch {
      showToast('Error al generar PDF')
    } finally {
      document.body.removeChild(container)
    }
  }

  const becadosPct = resumen.total_alumnos > 0 ? Math.round(resumen.total_becados / resumen.total_alumnos * 100) : 0
  const kpis = [
    { value: loading ? '—' : String(resumen.total_alumnos),   label:'Total alumnos',   color:CYAN,   bg:'var(--accent-muted)', bar:100,        trend:'alumnos',        trendBg:'#22c55e18', trendColor:'#22c55e',
      icon:<svg viewBox="0 0 24 24" fill="none" stroke={CYAN}  strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> },
    { value: loading ? '—' : String(resumen.total_becados),   label:'Alumnos becados', color:GREEN,  bg:'#22c55e15', bar:becadosPct, trend:`${becadosPct}%`, trendBg:'#22c55e18', trendColor:'#22c55e',
      icon:<svg viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
    { value: loading ? '—' : String(resumen.total_materias),  label:'Materias activas',color:PURPLE, bg:'#a855f715', bar:72,         trend:'activas',        trendBg:'#a855f718', trendColor:'#a855f7',
      icon:<svg viewBox="0 0 24 24" fill="none" stroke={PURPLE}strokeWidth="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg> },
    { value: loading ? '—' : String(resumen.total_profesores),label:'Docentes',        color:YELLOW, bg:'#f59e0b15', bar:48,         trend:'activos',        trendBg:'#f59e0b18', trendColor:'#f59e0b',
      icon:<svg viewBox="0 0 24 24" fill="none" stroke={YELLOW}strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
  ]

  return (
    <>
      <style>{css}</style>
      <div className="rep-root">

        <header className="topbar">
          <h1>Reportes globales</h1>
        </header>

        <div className="content">

          {/* KPIs */}
          <div className="kpi-row">
            {kpis.map(k=>(
              <div key={k.label} className="kpi">
                <div className="kpi-top">
                  <div className="kpi-icon" style={{background:k.bg}}>{k.icon}</div>
                  <span className="kpi-trend" style={{background:k.trendBg,color:k.trendColor}}>{k.trend}</span>
                </div>
                <div>
                  <div className="kpi-value" style={{color:k.color}}>{k.value}</div>
                  <div className="kpi-label">{k.label}</div>
                </div>
                <div className="kpi-bar"><div className="kpi-fill" style={{width:`${k.bar}%`,background:k.color}}/></div>
              </div>
            ))}
          </div>

          <div className="main-grid">

            {/* Reportes disponibles */}
            <div className="card">
              <div className="card-hdr">
                <h3>Reportes disponibles</h3>
                <button className="btn-primary" onClick={()=>exportarPDF('asistencia')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Exportar todo
                </button>
              </div>

              {/* Desktop */}
              <div>
                {reportes.map(r=>{
                  const cfg = tipoCfg[r.tipo]
                  return (
                    <div key={r.id} className="rep-item">
                      <div className="rep-icon" style={{background:cfg.bg}}>{tipoIcono(r.tipo,cfg.color)}</div>
                      <div className="rep-info">
                        <div className="rep-title">{r.titulo}</div>
                        <div className="rep-desc">{r.descripcion}</div>
                        <div className="rep-date">Generado: {new Date(r.generado+'T00:00:00').toLocaleDateString('es-PY')}</div>
                      </div>
                      <div className="rep-acts">
                        <button className="btn-ghost" onClick={()=>setVerModal(r.tipo)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          Ver
                        </button>
                        <button className="btn-export" onClick={()=>exportarPDF(r.tipo)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          PDF
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Mobile cards */}
              <div className="rep-cards">
                {reportes.map(r=>{
                  const cfg=tipoCfg[r.tipo]
                  return (
                    <div key={r.id} className="rep-card">
                      <div className="rep-card-top">
                        <div className="rep-icon" style={{background:cfg.bg,width:36,height:36,borderRadius:9,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                          {tipoIcono(r.tipo,cfg.color)}
                        </div>
                        <div>
                          <div className="rep-card-title">{r.titulo}</div>
                          <div className="rep-card-desc">{r.descripcion}</div>
                        </div>
                      </div>
                      <div className="rep-card-foot">
                        <button className="btn-ghost" onClick={()=>setVerModal(r.tipo)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          Ver
                        </button>
                        <button className="btn-export" onClick={()=>exportarPDF(r.tipo)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          Exportar PDF
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Resumen por carrera */}
            <div className="card">
              <div className="card-hdr">
                <div>
                  <h3>Resumen por carrera</h3>
                  <p>Asistencia y aprobación</p>
                </div>
              </div>
              <div style={{overflowX:'auto'}}>
                <table className="sum-table">
                  <thead>
                    <tr>
                      <th>Carrera</th>
                      <th className="c">Alumnos</th>
                      <th className="c">Asistencia</th>
                      <th className="c">Aprobados</th>
                      <th className="c">Riesgo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? <tr><td colSpan={5} style={{textAlign:'center',padding:'24px',color:'var(--text-muted)',fontSize:12}}>Cargando…</td></tr>
                      : carrerasData.length === 0
                      ? <tr><td colSpan={5} style={{textAlign:'center',padding:'24px',color:'var(--text-muted)',fontSize:12}}>Sin datos</td></tr>
                      : carrerasData.map(c=>(
                          <tr key={c.carrera}>
                            <td style={{fontWeight:600,color:'var(--text-primary)'}}>{c.carrera}</td>
                            <td className="c" style={{color:'var(--text-secondary)'}}>{c.total_alumnos}</td>
                            <td className="c">
                              <span style={{color:GREEN,fontWeight:700}}>{c.asistencia_pct}%</span>
                              <div className="mini-bar"><div className="mini-fill" style={{width:`${c.asistencia_pct}%`,background:GREEN}}/></div>
                            </td>
                            <td className="c">
                              <span style={{color:CYAN,fontWeight:700}}>{c.aprobados_pct}%</span>
                              <div className="mini-bar"><div className="mini-fill" style={{width:`${c.aprobados_pct}%`,background:CYAN}}/></div>
                            </td>
                            <td className="c" style={{color:RED,fontWeight:700}}>{c.en_riesgo}</td>
                          </tr>
                        ))
                    }
                  </tbody>
                </table>
              </div>

              {/* Distribución */}
              <div className="distrib">
                <div className="distrib-title">Distribución de alumnos</div>
                {(() => {
                  const total = carrerasData.reduce((a, c) => a + c.total_alumnos, 0)
                  return carrerasData.map(c => {
                    const pct = total > 0 ? Math.round(c.total_alumnos / total * 100) : 0
                    return (
                      <div key={c.carrera} className="distrib-row">
                        <div className="distrib-lbl">{c.carrera}</div>
                        <div className="distrib-bar"><div className="distrib-fill" style={{width:`${pct}%`,background:CYAN}}/></div>
                        <div className="distrib-pct">{pct}%</div>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>

          </div>
        </div>

        {/* Modal Ver reporte */}
        {verModal && (() => {
          const r   = reportes.find(x=>x.tipo===verModal)!
          const cfg = tipoCfg[verModal]
          return (
            <div className="modal-backdrop" onClick={()=>setVerModal(null)}>
              <div className="modal-box" onClick={e=>e.stopPropagation()}>
                <div className="modal-head">
                  <div>
                    <div style={{fontSize:10,color:cfg.color,fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:3}}>{cfg.label}</div>
                    <h2>{r.titulo}</h2>
                  </div>
                  <button className="modal-close" onClick={()=>setVerModal(null)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
                <div className="modal-body">

                  {/* Descripción */}
                  <div style={{fontSize:12,color:'var(--text-secondary)',lineHeight:1.6,background:'var(--bg-input)',border:'1px solid #2a3040',borderRadius:8,padding:'10px 13px'}}>
                    {r.descripcion} · Generado: {new Date(r.generado+'T00:00:00').toLocaleDateString('es-PY')}
                  </div>

                  {/* KPIs */}
                  <div>
                    <div className="modal-section-title">Estadísticas generales</div>
                    <div className="modal-kpi-row">
                      {[
                        {v:String(resumen.total_alumnos),   l:'Total alumnos',   color:CYAN  },
                        {v:String(resumen.total_becados),   l:'Alumnos becados', color:GREEN },
                        {v:String(resumen.total_materias),  l:'Materias activas',color:PURPLE},
                        {v:String(resumen.total_profesores),l:'Docentes',        color:YELLOW},
                      ].map(k=>(
                        <div key={k.l} className="modal-kpi">
                          <div className="modal-kpi-val" style={{color:k.color}}>{k.v}</div>
                          <div className="modal-kpi-lbl">{k.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tabla — becados o carreras */}
                  {verModal === 'becados' ? (
                    <div>
                      <div className="modal-section-title">Alumnos con beca activa ({becadosData.length})</div>
                      <div className="modal-scroll"><table className="modal-table">
                        <thead>
                          <tr>
                            <th>Nombre</th>
                            <th>Usuario</th>
                            <th>Email</th>
                          </tr>
                        </thead>
                        <tbody>
                          {becadosData.length === 0
                            ? <tr><td colSpan={3} style={{textAlign:'center',padding:'18px',color:'var(--text-muted)',fontSize:12}}>Sin becados registrados</td></tr>
                            : becadosData.map(u=>(
                                <tr key={u.id}>
                                  <td style={{fontWeight:600,color:'var(--text-primary)'}}>{u.nombre || u.username}</td>
                                  <td style={{color:'var(--text-secondary)'}}>{u.username}</td>
                                  <td style={{color:'var(--text-secondary)'}}>{u.email || '—'}</td>
                                </tr>
                              ))
                          }
                        </tbody>
                      </table></div>
                    </div>
                  ) : (
                    <div>
                      <div className="modal-section-title">Resumen por carrera</div>
                      <div className="modal-scroll"><table className="modal-table">
                        <thead>
                          <tr>
                            <th>Carrera</th>
                            <th className="c">Alumnos</th>
                            <th className="c">Asistencia</th>
                            <th className="c">Aprobados</th>
                            <th className="c">Riesgo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {carrerasData.map(row=>(
                            <tr key={row.carrera}>
                              <td style={{fontWeight:600,color:'var(--text-primary)'}}>{row.carrera}</td>
                              <td className="c" style={{color:'var(--text-secondary)'}}>{row.total_alumnos}</td>
                              <td className="c" style={{color:GREEN}}>{row.asistencia_pct}%</td>
                              <td className="c" style={{color:CYAN}}>{row.aprobados_pct}%</td>
                              <td className="c" style={{color:RED}}>{row.en_riesgo}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table></div>
                    </div>
                  )}

                </div>
                <div className="modal-foot">
                  <button className="btn-ghost" onClick={()=>setVerModal(null)}>Cerrar</button>
                  <button className="btn-primary" onClick={()=>{setVerModal(null);exportarPDF(verModal)}}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:12,height:12}}>
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Exportar PDF
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

        {toast && <div className="toast">✓ {toast}</div>}
      </div>
    </>
  )
}