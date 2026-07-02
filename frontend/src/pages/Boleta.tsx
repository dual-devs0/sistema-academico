import { useState, useEffect, useRef } from 'react'
import { api, decodeToken } from '../lib/api'

interface Materia {
  nombre: string
  profesor: string
  parcial1: number | null
  parcial2: number | null
  tp: number | null
  final: number | null
}

interface AlumnoData {
  nombre:   string
  legajo:   string
  carrera:  string
  anio:     number
  semestre: number
  email:    string
  becado:   boolean
}

const alumnoDefault: AlumnoData = {
  nombre:   '—',
  legajo:   '—',
  carrera:  '—',
  anio:     1,
  semestre: 1,
  email:    '—',
  becado:   false,
}

function calcProm(m: Materia): string {
  const ns = [m.parcial1,m.parcial2,m.tp,m.final].filter((n): n is number => n!==null)
  if (!ns.length) return '—'
  return (ns.reduce((a,b)=>a+b,0)/ns.length).toFixed(1)
}

function calcPromGeneral(mats: Materia[]): string {
  const ps = mats.map(m=>parseFloat(calcProm(m))).filter(n=>!isNaN(n))
  if (!ps.length) return '—'
  return (ps.reduce((a,b)=>a+b,0)/ps.length).toFixed(1)
}

function colorProm(p: string): string {
  const n = parseFloat(p)
  if (isNaN(n)) return '#8fa3b8'
  if (n>=8) return '#22c55e'
  if (n>=6) return '#f59e0b'
  return '#ef4444'
}

function colorNota(n: number|null): string {
  if (n===null) return '#506070'
  if (n>=8) return '#f0f4f8'
  if (n>=6) return '#f59e0b'
  return '#ef4444'
}

// ── HTML blanco para PDF (independiente del DOM dark) ──
function buildPdfHtml(alumno: AlumnoData, mats: Materia[]): string {
  const fecha = new Date().toLocaleDateString('es-PY',{day:'2-digit',month:'long',year:'numeric'})
  const prom  = calcPromGeneral(mats)
  const pc    = parseFloat(prom)>=8?'#16a34a':parseFloat(prom)>=6?'#d97706':'#dc2626'

  const filas = mats.map(m=>{
    const p  = calcProm(m)
    const pc = parseFloat(p)>=8?'#16a34a':parseFloat(p)>=6?'#d97706':'#dc2626'
    const nc = (n:number|null)=>n===null?'#94a3b8':n>=8?'#1e293b':n>=6?'#d97706':'#dc2626'
    return `<tr>
      <td style="font-weight:600;color:#1e293b;padding:12px 16px;border-bottom:1px solid #f1f5f9;">${m.nombre}</td>
      <td style="color:#0284c7;font-size:12px;padding:12px 16px;border-bottom:1px solid #f1f5f9;">${m.profesor}</td>
      <td style="text-align:center;font-weight:700;color:${nc(m.parcial1)};padding:12px 16px;border-bottom:1px solid #f1f5f9;">${m.parcial1??'—'}</td>
      <td style="text-align:center;font-weight:700;color:${nc(m.parcial2)};padding:12px 16px;border-bottom:1px solid #f1f5f9;">${m.parcial2??'—'}</td>
      <td style="text-align:center;font-weight:700;color:${nc(m.tp)};padding:12px 16px;border-bottom:1px solid #f1f5f9;">${m.tp??'—'}</td>
      <td style="text-align:center;color:#94a3b8;padding:12px 16px;border-bottom:1px solid #f1f5f9;">${m.final??'—'}</td>
      <td style="text-align:center;font-weight:800;font-size:15px;color:${pc};padding:12px 16px;border-bottom:1px solid #f1f5f9;">${p}</td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#fff;color:#1e293b;font-size:13px;}
  .wrap{max-width:740px;margin:0 auto;}
  .hdr{display:flex;align-items:center;justify-content:space-between;padding:22px 28px 20px;border-bottom:3px solid #0284c7;}
  .hdr-logo{width:46px;height:46px;background:#0284c7;border-radius:12px;display:flex;align-items:center;justify-content:center;}
  .hdr-logo svg{width:22px;height:22px;}
  .hdr-inst{font-size:17px;font-weight:800;color:#0f172a;}
  .hdr-sub{font-size:11px;color:#64748b;margin-top:2px;}
  .hdr-r{text-align:right;}
  .hdr-rl{font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.07em;}
  .hdr-rd{font-size:13px;font-weight:700;color:#1e293b;margin-top:2px;}
  .meta{display:grid;grid-template-columns:repeat(3,1fr);background:#f8fafc;border-bottom:1px solid #e2e8f0;}
  .mc{padding:14px 20px;border-right:1px solid #e2e8f0;}
  .mc:nth-child(3n){border-right:none;}
  .ml{font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px;}
  .mv{font-size:13px;font-weight:600;color:#1e293b;}
  .mc-cy{color:#0284c7;font-size:13px;font-weight:700;}
  .beca{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;background:#dcfce7;color:#16a34a;font-size:11px;font-weight:700;}
  .sec{font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;font-weight:700;padding:14px 20px 8px;}
  table{width:100%;border-collapse:collapse;}
  thead th{padding:9px 16px;font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.07em;text-align:left;border-bottom:2px solid #e2e8f0;background:#f8fafc;}
  thead th.c{text-align:center;}
  .total{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;background:#eff6ff;border-top:2px solid #0284c7;}
  .tl{font-size:14px;font-weight:700;color:#1e40af;}
  .tv{font-size:28px;font-weight:900;color:${pc};}
  .foot{display:flex;align-items:center;justify-content:space-between;padding:10px 20px;background:#f8fafc;border-top:1px solid #e2e8f0;}
  .foot span{font-size:10px;color:#94a3b8;}
  .wm{text-align:center;padding:8px;font-size:10px;color:#cbd5e1;letter-spacing:.05em;}
</style>
</head><body><div class="wrap">
<div class="hdr">
  <div style="display:flex;align-items:center;gap:14px;">
    <div class="hdr-logo"><svg viewBox="0 0 24 24" fill="white"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg></div>
    <div><div class="hdr-inst">Universidad Católica</div><div class="hdr-sub">Ntra. Sra. de la Asunción — Unidad Pedagógica Caacupé</div></div>
  </div>
  <div class="hdr-r"><div class="hdr-rl">Fecha de emisión</div><div class="hdr-rd">${fecha}</div></div>
</div>
<div class="meta">
  <div class="mc"><div class="ml">Alumno</div><div class="mv">${alumno.nombre}</div></div>
  <div class="mc"><div class="ml">Legajo</div><div class="mc-cy">${alumno.legajo}</div></div>
  <div class="mc"><div class="ml">Carrera</div><div class="mv">${alumno.carrera}</div></div>
  <div class="mc"><div class="ml">Año</div><div class="mv">${alumno.anio}° año</div></div>
  <div class="mc"><div class="ml">Semestre</div><div class="mv">Semestre ${alumno.semestre} · 2026</div></div>
  <div class="mc"><div class="ml">Estado</div>${alumno.becado?'<span class="beca">★ Becada</span>':'<div class="mv">Regular</div>'}</div>
</div>
<div class="sec">Detalle de calificaciones — Semestre ${alumno.semestre} · 2026</div>
<table>
  <thead><tr>
    <th>Materia</th><th>Profesor</th>
    <th class="c">P1</th><th class="c">P2</th><th class="c">TP</th><th class="c">Final</th><th class="c">Promedio</th>
  </tr></thead>
  <tbody>${filas}</tbody>
</table>
<div class="total"><div class="tl">Promedio general del semestre</div><div class="tv">${prom}</div></div>
<div class="foot">
  <span>Documento generado por el Sistema Académico UCA · Uso oficial</span>
  <span>Legajo: ${alumno.legajo} · Sem. ${alumno.semestre} · 2026</span>
</div>
<div class="wm">UNIVERSIDAD CATÓLICA — DOCUMENTO OFICIAL</div>
</div></body></html>`
}

const css = `
  *, *::before, *::after { box-sizing:border-box; }
  .bol-root { display:flex; flex-direction:column; flex:1; font-family:'Inter',system-ui,sans-serif; color:#f0f4f8; }

  .topbar {
    display:flex; align-items:center; padding:0 24px; height:56px;
    border-bottom:1px solid #1e2d3d; background:#0b0f14;
    position:sticky; top:0; z-index:20; flex-shrink:0;
  }
  .topbar h1 { font-size:17px; font-weight:700; color:#f0f4f8; letter-spacing:-.01em; }

  .content { padding:20px 24px; flex:1; }

  /* ── Admin selector bar ── */
  .sel-bar {
    display:flex; align-items:center; gap:12px; margin-bottom:20px; flex-wrap:wrap;
    background:#131920; border:1px solid #1e2d3d; border-radius:12px; padding:14px 16px;
  }
  .sel-bar-lbl { font-size:12px; color:#506070; font-weight:600; white-space:nowrap; }
  .sel-search-wrap { flex:1; min-width:200px; position:relative; }
  .sel-search-wrap svg { position:absolute; left:11px; top:50%; transform:translateY(-50%); width:14px; height:14px; color:#506070; pointer-events:none; }
  .sel-search {
    width:100%; background:#0d1117; border:1px solid #243447;
    border-radius:9px; color:#f0f4f8; font-size:13px;
    font-family:inherit; outline:none; padding:8px 14px 8px 34px; transition:border-color .15s;
  }
  .sel-search:focus { border-color:var(--accent); }
  .sel-search::placeholder { color:#506070; }
  .sel-dropdown {
    position:absolute; top:calc(100% + 5px); left:0; right:0; z-index:50;
    background:#131920; border:1px solid #1e2d3d; border-radius:10px;
    box-shadow:0 12px 32px rgba(0,0,0,.6); max-height:240px; overflow-y:auto;
  }
  .sel-option {
    padding:10px 14px; cursor:pointer; font-size:13px; color:#8fa3b8;
    border:none; background:none; width:100%; text-align:left; font-family:inherit;
    display:flex; align-items:center; gap:10px; transition:background .12s;
  }
  .sel-option:hover, .sel-option.active { background:#1a2230; color:#f0f4f8; }
  .sel-avatar {
    width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center;
    font-size:10px; font-weight:700; color:#000; flex-shrink:0;
    background:linear-gradient(135deg,var(--accent),#0ea5e9);
  }
  .sel-info { flex:1; min-width:0; }
  .sel-name { font-size:13px; font-weight:600; color:#f0f4f8; }
  .sel-email { font-size:11px; color:#506070; }
  .sel-selected-chip {
    display:inline-flex; align-items:center; gap:8px;
    background:var(--accent-muted); border:1px solid var(--accent-hover);
    border-radius:8px; padding:6px 12px; font-size:12px; font-weight:600; color:var(--accent);
  }
  .sel-selected-chip button { background:none; border:none; color:var(--accent); cursor:pointer; padding:0; display:flex; line-height:1; }
  .sel-selected-chip button:hover { color:#f0f4f8; }

  /* ── Empty state ── */
  .bol-empty {
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    padding:80px 20px; text-align:center; color:#506070;
  }
  .bol-empty-icon { width:56px; height:56px; margin-bottom:16px; opacity:.2; }
  .bol-empty-title { font-size:16px; font-weight:600; color:#8fa3b8; margin-bottom:6px; }
  .bol-empty-sub { font-size:13px; }

  .actions { display:flex; align-items:center; justify-content:flex-end; gap:8px; margin-bottom:20px; flex-wrap:wrap; }
  .btn-primary {
    display:inline-flex; align-items:center; gap:6px;
    padding:9px 16px; background:var(--accent); border:none;
    border-radius:9px; color:#000; font-size:13px; font-weight:700;
    font-family:inherit; cursor:pointer; transition:opacity .15s; white-space:nowrap;
  }
  .btn-primary:hover { opacity:.85; }
  .btn-primary svg { width:13px; height:13px; flex-shrink:0; }
  .btn-secondary {
    display:inline-flex; align-items:center; gap:6px;
    padding:9px 16px; background:#131920; border:1px solid #1e2d3d;
    border-radius:9px; color:#8fa3b8; font-size:13px; font-weight:600;
    font-family:inherit; cursor:pointer; white-space:nowrap; transition:border-color .15s, color .15s;
  }
  .btn-secondary:hover { border-color:var(--accent); color:#f0f4f8; }
  .btn-secondary svg { width:13px; height:13px; flex-shrink:0; }

  /* Boleta dark preview */
  .boleta { max-width:820px; margin:0 auto; background:#131920; border:1px solid #1e2d3d; border-radius:16px; overflow:hidden; }

  /* Header */
  .bol-hdr { padding:20px 24px 18px; border-bottom:3px solid var(--accent); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; }
  .bol-hdr-left { display:flex; align-items:center; gap:12px; }
  .bol-logo { width:44px; height:44px; background:linear-gradient(135deg,var(--accent),#0ea5e9); border-radius:11px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .bol-logo svg { width:22px; height:22px; }
  .bol-inst { font-size:15px; font-weight:800; color:#f0f4f8; }
  .bol-isub { font-size:11px; color:#506070; margin-top:2px; }
  .bol-hdr-right { text-align:right; }
  .bol-emit-lbl  { font-size:9px; color:#506070; text-transform:uppercase; letter-spacing:.07em; }
  .bol-emit-date { font-size:13px; font-weight:700; color:#f0f4f8; margin-top:3px; }

  /* Meta grid */
  .bol-meta { display:grid; grid-template-columns:repeat(3,1fr); background:#1a2230; border-bottom:1px solid #1e2d3d; }
  .mc { padding:13px 18px; border-right:1px solid #1e2d3d; }
  .mc:nth-child(3n) { border-right:none; }
  .ml { font-size:9px; color:#506070; text-transform:uppercase; letter-spacing:.07em; margin-bottom:4px; font-weight:600; }
  .mv { font-size:13px; font-weight:600; color:#f0f4f8; }
  .mc-cy { font-size:13px; font-weight:700; color:var(--accent); }
  .beca-badge { display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:20px; background:#15803d18; color:#22c55e; font-size:11px; font-weight:700; }

  /* Sección */
  .sec-lbl { font-size:9px; color:#506070; text-transform:uppercase; letter-spacing:.08em; font-weight:700; padding:13px 18px 7px; }

  /* Tabla */
  .table-scroll { overflow-x:auto; -webkit-overflow-scrolling:touch; }
  .table-scroll table { min-width:520px; }
  table { width:100%; border-collapse:collapse; }
  thead th { padding:9px 14px; font-size:9px; font-weight:700; color:#506070; text-transform:uppercase; letter-spacing:.07em; text-align:left; border-bottom:1px solid #1e2d3d; background:#0d1117; white-space:nowrap; }
  thead th.c { text-align:center; }
  tbody td { padding:12px 14px; border-bottom:1px solid #1e2d3d22; vertical-align:middle; }
  tbody tr:last-child td { border-bottom:none; }
  tbody tr:hover td { background:#1a2230; }
  td.c { text-align:center; font-weight:700; }

  /* Total */
  .bol-total { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-top:2px solid var(--accent); background:var(--accent-muted); }
  .bol-total-lbl { font-size:14px; font-weight:700; color:var(--accent); }
  .bol-total-val { font-size:28px; font-weight:900; line-height:1; }

  /* Footer */
  .bol-foot { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px; padding:11px 20px; background:#1a2230; border-top:1px solid #1e2d3d; }
  .bol-foot span { font-size:11px; color:#506070; }

  @media(max-width:768px){
    .topbar  { padding:0 14px; }
    .content { padding:14px 14px 80px; }
    .actions { justify-content:stretch; }
    .btn-primary, .btn-secondary { flex:1; justify-content:center; }
    .bol-hdr { padding:14px 16px 12px; }
    .bol-meta { grid-template-columns:1fr 1fr; }
    .mc:nth-child(3n)  { border-right:1px solid #1e2d3d; }
    .mc:nth-child(even){ border-right:none; }
    .mc:nth-last-child(-n+2){ border-bottom:none; }
    .bol-foot { flex-direction:column; gap:3px; }
    .sel-bar { flex-direction:column; align-items:stretch; }
  }
  @media(max-width:480px){
    .bol-hdr { flex-direction:column; align-items:flex-start; gap:10px; }
    .bol-hdr-right { text-align:left; }
  }
`

// ── Boleta visual compartida ──
function BoletaPreview({ alumno, materias }: { alumno: AlumnoData; materias: Materia[] }) {
  const promGeneral  = calcPromGeneral(materias)
  const fechaEmision = new Date().toLocaleDateString('es-PY',{day:'2-digit',month:'long',year:'numeric'})
  return (
    <div className="boleta">
      <div className="bol-hdr">
        <div className="bol-hdr-left">
          <div className="bol-logo">
            <svg viewBox="0 0 24 24" fill="white">
              <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
            </svg>
          </div>
          <div>
            <div className="bol-inst">Universidad Católica</div>
            <div className="bol-isub">Ntra. Sra. de la Asunción — Unidad Pedagógica Caacupé</div>
          </div>
        </div>
        <div className="bol-hdr-right">
          <div className="bol-emit-lbl">Fecha de emisión</div>
          <div className="bol-emit-date">{fechaEmision}</div>
        </div>
      </div>

      <div className="bol-meta">
        <div className="mc"><div className="ml">Alumno</div><div className="mv">{alumno.nombre}</div></div>
        <div className="mc"><div className="ml">Legajo</div><div className="mc-cy">{alumno.legajo}</div></div>
        <div className="mc"><div className="ml">Carrera</div><div className="mv">{alumno.carrera}</div></div>
        <div className="mc"><div className="ml">Año</div><div className="mv">{alumno.anio}° año</div></div>
        <div className="mc"><div className="ml">Semestre</div><div className="mv">Semestre {alumno.semestre} · 2026</div></div>
        <div className="mc"><div className="ml">Estado</div>{alumno.becado?<span className="beca-badge">★ Becada</span>:<div className="mv">Regular</div>}</div>
      </div>

      <div className="sec-lbl">Detalle de calificaciones — Semestre {alumno.semestre} · 2026</div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Materia</th><th>Profesor</th>
              <th className="c">Parcial 1</th><th className="c">Parcial 2</th>
              <th className="c">TP</th><th className="c">Final</th><th className="c">Promedio</th>
            </tr>
          </thead>
          <tbody>
            {materias.map(m=>{
              const p = calcProm(m)
              return (
                <tr key={m.nombre}>
                  <td style={{fontWeight:600,color:'#f0f4f8',fontSize:13}}>{m.nombre}</td>
                  <td style={{color:'var(--accent)',fontSize:12}}>{m.profesor}</td>
                  <td className="c" style={{color:colorNota(m.parcial1)}}>{m.parcial1??'—'}</td>
                  <td className="c" style={{color:colorNota(m.parcial2)}}>{m.parcial2??'—'}</td>
                  <td className="c" style={{color:colorNota(m.tp)}}>{m.tp??'—'}</td>
                  <td className="c" style={{color:'#506070'}}>{m.final??'—'}</td>
                  <td className="c" style={{fontSize:15,fontWeight:800,color:colorProm(p)}}>{p}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="bol-total">
        <div className="bol-total-lbl">Promedio general del semestre</div>
        <div className="bol-total-val" style={{color:colorProm(promGeneral)}}>{promGeneral}</div>
      </div>

      <div className="bol-foot">
        <span>Documento generado por el Sistema Académico UCA · Uso oficial</span>
        <span>Legajo: {alumno.legajo} · Sem. {alumno.semestre} · 2026</span>
      </div>
    </div>
  )
}

async function descargarPDF(alumno: AlumnoData, materias: Materia[]) {
  const html2pdf = (await import('html2pdf.js')).default
  const container = document.createElement('div')
  container.style.cssText = [
    'position:fixed','top:0','left:0','width:794px','min-height:100px',
    'background:#ffffff','z-index:-9999','opacity:0.01','pointer-events:none',
  ].join(';')
  container.innerHTML = buildPdfHtml(alumno, materias)
  document.body.appendChild(container)
  await new Promise(r=>setTimeout(r,600))
  try {
    await (html2pdf() as any).set({
      margin:[8,8],
      filename:`boleta_${alumno.legajo}_sem${alumno.semestre || 1}_2026.pdf`,
      image:{type:'jpeg',quality:1},
      html2canvas:{ scale:2, useCORS:true, backgroundColor:'#ffffff', logging:false, allowTaint:true, windowWidth:794 },
      jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},
    }).from(container).save()
  } finally {
    document.body.removeChild(container)
  }
}

// ── ADMIN VIEW: selector de alumno ──
function AdminBoletaView() {
  const [alumnos, setAlumnos] = useState<{id:number;nombre:string;email:string}[]>([])
  const [search,  setSearch]  = useState('')
  const [open,    setOpen]    = useState(false)
  const [selId,   setSelId]   = useState<number|null>(null)
  const [selNom,  setSelNom]  = useState('')
  const [alumno,  setAlumno]  = useState<AlumnoData>(alumnoDefault)
  const [materias,setMaterias]= useState<Materia[]>([])
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.get<{id:number;username:string;role:string;nombre:string;email:string}[]>('/users/')
      .then(data => {
        setAlumnos(
          data.filter(u => u.role === 'alumno').map(u => ({
            id: u.id,
            nombre: u.nombre || u.username,
            email: u.email || u.username,
          }))
        )
      }).catch(() => {})
  }, [])

  useEffect(() => {
    function h(e:MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const filtrados = search.trim()
    ? alumnos.filter(a =>
        a.nombre.toLowerCase().includes(search.toLowerCase()) ||
        a.email.toLowerCase().includes(search.toLowerCase())
      )
    : alumnos

  function selectAlumno(a: {id:number;nombre:string;email:string}) {
    setSelId(a.id)
    setSelNom(a.nombre)
    setSearch('')
    setOpen(false)
    setLoading(true)

    Promise.all([
      api.get<{id:number;username:string;nombre:string;email:string|null;carrera_id:number|null;es_becado:boolean|null}>(`/users/${a.id}`),
      api.get<{materia_id:number;tipo:string;valor:number}[]>(`/puntajes/?user_id=${a.id}`),
      api.get<{id:number;nombre:string;profesor_id:number}[]>('/materias/'),
    ]).then(([user, puntajes, mats]) => {
      setAlumno({
        nombre:   user.nombre || user.username,
        legajo:   user.username,
        carrera:  user.carrera_id ? `Carrera #${user.carrera_id}` : '—',
        anio:     1,
        semestre: 1,
        email:    user.email || '—',
        becado:   user.es_becado || false,
      })
      const byMateria: Record<number,{parcial1:number|null;parcial2:number|null;tp:number|null;final:number|null}> = {}
      puntajes.forEach(p => {
        if (!byMateria[p.materia_id]) byMateria[p.materia_id] = {parcial1:null,parcial2:null,tp:null,final:null}
        if (p.tipo==='parcial1') byMateria[p.materia_id].parcial1 = p.valor
        else if (p.tipo==='parcial2') byMateria[p.materia_id].parcial2 = p.valor
        else if (p.tipo==='practico') byMateria[p.materia_id].tp = p.valor
        else if (p.tipo==='final') byMateria[p.materia_id].final = p.valor
      })
      setMaterias(mats.map(m => ({
        nombre:   m.nombre,
        profesor: `Prof. #${m.profesor_id}`,
        ...(byMateria[m.id] ?? {parcial1:null,parcial2:null,tp:null,final:null}),
      })))
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  function limpiar() {
    setSelId(null); setSelNom(''); setSearch('')
    setAlumno(alumnoDefault); setMaterias([])
  }

  function initials(n:string){ return n.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase() }

  return (
    <>
      <style>{css}</style>
      <div className="bol-root">
        <header className="topbar">
          <h1>Boleta de notas</h1>
        </header>

        <div className="content">

          {/* Selector de alumno */}
          <div className="sel-bar">
            <span className="sel-bar-lbl">Alumno:</span>
            {selId ? (
              <div className="sel-selected-chip">
                {selNom}
                <button onClick={limpiar} title="Cambiar alumno">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ) : (
              <div className="sel-search-wrap" ref={wrapRef} style={{position:'relative'}}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  className="sel-search"
                  placeholder="Buscar alumno por nombre o email…"
                  value={search}
                  onChange={e=>{ setSearch(e.target.value); setOpen(true) }}
                  onFocus={()=>setOpen(true)}
                />
                {open && filtrados.length > 0 && (
                  <div className="sel-dropdown">
                    {filtrados.slice(0,20).map(a => (
                      <button key={a.id} className="sel-option" onMouseDown={()=>selectAlumno(a)}>
                        <div className="sel-avatar">{initials(a.nombre)}</div>
                        <div className="sel-info">
                          <div className="sel-name">{a.nombre}</div>
                          <div className="sel-email">{a.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {!selId ? (
            <div className="bol-empty">
              <svg className="bol-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
              </svg>
              <div className="bol-empty-title">Seleccioná un alumno</div>
              <div className="bol-empty-sub">Buscá por nombre o email para ver su boleta de notas</div>
            </div>
          ) : loading ? (
            <div className="bol-empty">
              <div style={{color:'var(--accent)',fontSize:13}}>Cargando boleta…</div>
            </div>
          ) : (
            <>
              <div className="actions">
                <button className="btn-secondary" onClick={()=>window.print()}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 6 2 18 2 18 9"/>
                    <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                    <rect x="6" y="14" width="12" height="8"/>
                  </svg>
                  Imprimir
                </button>
                <button className="btn-primary" onClick={()=>descargarPDF(alumno, materias)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Descargar PDF
                </button>
              </div>
              <BoletaPreview alumno={alumno} materias={materias} />
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ── ALUMNO VIEW: boleta propia ──
function AlumnoBoletaView() {
  const [alumno,   setAlumno]   = useState<AlumnoData>(alumnoDefault)
  const [materias, setMaterias] = useState<Materia[]>([])

  useEffect(() => {
    const token = sessionStorage.getItem('token')
    const userData = token ? decodeToken(token) : null

    api.get<{id:number;nombre:string|null;username:string;email:string|null;carrera_id:number|null;es_becado:boolean|null}>('/users/me')
      .then(u => {
        setAlumno({
          nombre:   u.nombre || u.username,
          legajo:   u.username,
          carrera:  u.carrera_id ? `Carrera #${u.carrera_id}` : '—',
          anio:     1,
          semestre: 1,
          email:    u.email || '—',
          becado:   u.es_becado || false,
        })
      }).catch(() => {})

    if (userData?.user_id) {
      api.get<{materia_id:number;tipo:string;valor:number}[]>(`/puntajes/?user_id=${userData.user_id}`)
        .then(puntajes => {
          const byMateria: Record<number,{parcial1:number|null;parcial2:number|null;tp:number|null;final:number|null}> = {}
          puntajes.forEach(p => {
            if (!byMateria[p.materia_id]) byMateria[p.materia_id] = {parcial1:null,parcial2:null,tp:null,final:null}
            if (p.tipo==='parcial1') byMateria[p.materia_id].parcial1 = p.valor
            else if (p.tipo==='parcial2') byMateria[p.materia_id].parcial2 = p.valor
            else if (p.tipo==='practico') byMateria[p.materia_id].tp = p.valor
            else if (p.tipo==='final') byMateria[p.materia_id].final = p.valor
          })
          api.get<{id:number;nombre:string;profesor_id:number}[]>('/materias/')
            .then(mats => {
              setMaterias(mats.map(m => ({
                nombre:   m.nombre,
                profesor: `Prof. #${m.profesor_id}`,
                ...(byMateria[m.id] ?? {parcial1:null,parcial2:null,tp:null,final:null}),
              })))
            }).catch(() => {})
        }).catch(() => {})
    }
  }, [])

  return (
    <>
      <style>{css}</style>
      <div className="bol-root">
        <header className="topbar">
          <h1>Boleta de notas</h1>
        </header>

        <div className="content">
          <div className="actions">
            <button className="btn-secondary" onClick={()=>window.print()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              Imprimir
            </button>
            <button className="btn-primary" onClick={()=>descargarPDF(alumno, materias)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Descargar PDF
            </button>
          </div>
          <BoletaPreview alumno={alumno} materias={materias} />
        </div>
      </div>
    </>
  )
}

export default function Boleta() {
  const token = sessionStorage.getItem('token')
  const currentUser = token ? decodeToken(token) : null
  if (currentUser?.role === 'admin') return <AdminBoletaView />
  return <AlumnoBoletaView />
}
