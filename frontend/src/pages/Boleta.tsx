import { useRef } from 'react'

interface Materia {
  nombre: string
  profesor: string
  parcial1: number | null
  parcial2: number | null
  tp: number | null
  final: number | null
}

const alumno = {
  nombre: 'María González',
  legajo: '2024-0123',
  carrera: 'Ingeniería Informática',
  anio: 2,
  semestre: 1,
  email: 'maria.gonzalez@uca.edu.py',
  becado: true,
}

const materias: Materia[] = [
  { nombre: 'Análisis Matemático I', profesor: 'Carlos Méndez', parcial1: 7.5, parcial2: 8.0, tp: 9.0, final: null },
  { nombre: 'Física I',              profesor: 'Ana Torres',    parcial1: 6.0, parcial2: 7.5, tp: 8.5, final: null },
  { nombre: 'Matemática Discreta',   profesor: 'Carlos Méndez', parcial1: 9.0, parcial2: null, tp: 8.0, final: null },
  { nombre: 'Programación I',        profesor: 'Luis Paredes',  parcial1: 10.0, parcial2: 9.5, tp: 10.0, final: null },
]

function calcPromedio(m: Materia): string {
  const notas = [m.parcial1, m.parcial2, m.tp, m.final].filter((n): n is number => n !== null)
  if (!notas.length) return '—'
  return (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1)
}

function calcPromedioGeneral(): string {
  const promedios = materias.map(m => parseFloat(calcPromedio(m))).filter(n => !isNaN(n))
  if (!promedios.length) return '—'
  return (promedios.reduce((a, b) => a + b, 0) / promedios.length).toFixed(1)
}

function colorPromedio(prom: string): string {
  const n = parseFloat(prom)
  if (isNaN(n)) return '#8fa3b8'
  if (n >= 8) return '#22c55e'
  if (n >= 6) return '#f59e0b'
  return '#ef4444'
}

function colorNota(n: number | null): string {
  if (n === null) return '#506070'
  if (n >= 8) return '#f0f4f8'
  if (n >= 6) return '#f59e0b'
  return '#ef4444'
}

const css = `
  .bol-root { display:flex; flex-direction:column; font-family:'Inter',system-ui,sans-serif; }
  .topbar { display:flex; align-items:center; justify-content:space-between; padding:16px 28px; border-bottom:1px solid #1e2d3d; background:#0b0f14; position:sticky; top:0; z-index:10; }
  .topbar h1 { font-size:18px; font-weight:700; color:#f0f4f8; letter-spacing:-.01em; font-family:'Plus Jakarta Sans',sans-serif; }
  .topbar p { font-size:11px; color:#506070; margin-top:1px; }
  .topbar-right { display:flex; align-items:center; gap:10px; }
  .topbar-btn { display:flex; align-items:center; justify-content:center; width:34px; height:34px; background:#131920; border:1px solid #243447; border-radius:8px; color:#8fa3b8; cursor:pointer; }
  .topbar-btn svg { width:15px; height:15px; }
  .topbar-btn:hover { border-color:#00b4d8; color:#f0f4f8; }
  .avatar { width:34px; height:34px; background:linear-gradient(135deg,#00b4d8,#0ea5e9); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; color:#000; cursor:pointer; }
  .content { padding:24px 28px; }
  .actions { display:flex; align-items:center; justify-content:flex-end; gap:10px; margin-bottom:24px; }
  .btn-primary { display:inline-flex; align-items:center; gap:8px; padding:9px 18px; background:#00b4d8; border:none; border-radius:9px; color:#000; font-size:13px; font-weight:700; font-family:inherit; cursor:pointer; }
  .btn-primary:hover { opacity:.88; }
  .btn-primary svg { width:14px; height:14px; }
  .btn-secondary { display:inline-flex; align-items:center; gap:8px; padding:9px 18px; background:#1a2230; border:1px solid #243447; border-radius:9px; color:#8fa3b8; font-size:13px; font-weight:500; font-family:inherit; cursor:pointer; }
  .btn-secondary:hover { border-color:#00b4d8; color:#f0f4f8; }
  .btn-secondary svg { width:14px; height:14px; }
  .boleta { max-width:800px; margin:0 auto; background:#131920; border:1px solid #1e2d3d; border-radius:14px; overflow:hidden; }
  .bol-header { padding:22px 28px; border-bottom:1px solid #1e2d3d; display:flex; align-items:center; justify-content:space-between; }
  .bol-logo { width:44px; height:44px; background:linear-gradient(135deg,#00b4d8,#0ea5e9); border-radius:10px; display:flex; align-items:center; justify-content:center; }
  .bol-logo svg { width:22px; height:22px; }
  .bol-inst-name { font-family:'Plus Jakarta Sans',sans-serif; font-size:16px; font-weight:800; color:#f0f4f8; }
  .bol-inst-sub { font-size:12px; color:#506070; margin-top:2px; }
  .bol-emit-label { font-size:10px; color:#506070; text-transform:uppercase; letter-spacing:.07em; text-align:right; }
  .bol-emit-date { font-size:14px; font-weight:600; color:#f0f4f8; margin-top:2px; text-align:right; }
  .bol-meta { padding:18px 28px; border-bottom:1px solid #1e2d3d; display:grid; grid-template-columns:repeat(3,1fr); gap:18px; background:#1a2230; }
  .bol-meta-label { font-size:10px; color:#506070; text-transform:uppercase; letter-spacing:.07em; margin-bottom:4px; }
  .bol-meta-value { font-size:14px; font-weight:600; color:#f0f4f8; }
  .bol-meta-cyan { font-size:14px; font-weight:700; color:#00b4d8; font-family:'Plus Jakarta Sans',sans-serif; }
  .bol-badge { display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:600; padding:3px 9px; border-radius:20px; background:#15803d18; color:#22c55e; }
  .bol-section { font-size:10px; color:#506070; text-transform:uppercase; letter-spacing:.08em; padding:16px 28px 10px; }
  .bol-table { width:100%; border-collapse:collapse; }
  .bol-table th { padding:9px 20px; font-size:10px; font-weight:600; color:#506070; text-transform:uppercase; letter-spacing:.07em; text-align:left; border-bottom:1px solid #1e2d3d; white-space:nowrap; }
  .bol-table th.center { text-align:center; }
  .bol-table td { padding:13px 20px; border-bottom:1px solid #1e2d3d44; vertical-align:middle; font-size:13px; }
  .bol-table tr:last-child td { border-bottom:none; }
  .bol-table tr:hover td { background:#1a2230; }
  .bol-table td.center { text-align:center; font-weight:700; }
  .bol-total { padding:18px 28px; border-top:2px solid #00b4d8; display:flex; justify-content:space-between; align-items:center; }
  .bol-total-label { font-size:14px; font-weight:700; color:#00b4d8; }
  .bol-total-value { font-family:'Plus Jakarta Sans',sans-serif; font-size:28px; font-weight:800; color:#00b4d8; }
  .bol-footer { padding:12px 28px; background:#1a2230; border-top:1px solid #1e2d3d; display:flex; justify-content:space-between; align-items:center; }
  .bol-footer span { font-size:11px; color:#506070; }
`

export default function Boleta() {
  const boletaRef = useRef<HTMLDivElement>(null)

  const fechaEmision = new Date().toLocaleDateString('es-PY', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  async function descargarPDF() {
    const html2pdf = (await import('html2pdf.js')).default
    const el = boletaRef.current
    if (!el) return

    const clone = el.cloneNode(true) as HTMLElement

    const styleLight = document.createElement('style')
    styleLight.textContent = `
      .boleta { background:#ffffff !important; border:1px solid #e2e8f0 !important; border-radius:0 !important; }
      .bol-header { background:#ffffff !important; border-bottom:1px solid #e2e8f0 !important; }
      .bol-inst-name { color:#0f172a !important; }
      .bol-inst-sub { color:#64748b !important; }
      .bol-emit-label { color:#94a3b8 !important; }
      .bol-emit-date { color:#1e293b !important; }
      .bol-meta { background:#f8fafc !important; border-bottom:1px solid #e2e8f0 !important; }
      .bol-meta-label { color:#94a3b8 !important; }
      .bol-meta-value { color:#1e293b !important; }
      .bol-meta-cyan { color:#0284c7 !important; }
      .bol-badge { background:#dcfce7 !important; color:#166534 !important; }
      .bol-section { color:#94a3b8 !important; }
      .bol-table th { color:#94a3b8 !important; border-bottom:1px solid #e2e8f0 !important; }
      .bol-table td { color:#334155 !important; border-bottom:1px solid #f1f5f9 !important; }
      .bol-table tr:hover td { background:#f8fafc !important; }
      .bol-total { background:#eff6ff !important; border-top:2px solid #0284c7 !important; }
      .bol-total-label { color:#1e40af !important; }
      .bol-total-value { color:#0284c7 !important; }
      .bol-footer { background:#f8fafc !important; border-top:1px solid #e2e8f0 !important; }
      .bol-footer span { color:#94a3b8 !important; }
    `
    clone.prepend(styleLight)

    const wrapper = document.createElement('div')
    wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;background:#ffffff'
    wrapper.appendChild(clone)
    document.body.appendChild(wrapper)

    await html2pdf().set({
      margin: [12, 14],
      filename: `boleta_${alumno.legajo}_sem${alumno.semestre}_2026.pdf`,
      image: { type: 'jpeg' as const, quality: 0.99 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    } as any).from(clone).save()

    document.body.removeChild(wrapper)
  }

  return (
    <>
      <style>{css}</style>
      <div className="bol-root">

        <header className="topbar">
          <div>
            <h1>Boleta de notas</h1>
            <p>Semestre 1 — 2026</p>
          </div>
          <div className="topbar-right">
            <button className="topbar-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            <button className="topbar-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
            </button>
            <div className="avatar">MG</div>
          </div>
        </header>

        <div className="content">
          <div className="actions">
            <button className="btn-secondary" onClick={() => window.print()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Imprimir
            </button>
            <button className="btn-primary" onClick={descargarPDF}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Descargar PDF
            </button>
          </div>

          <div ref={boletaRef} className="boleta">

            {/* Header */}
            <div className="bol-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="bol-logo">
                  <svg viewBox="0 0 24 24" fill="white"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg>
                </div>
                <div>
                  <div className="bol-inst-name">Universidad Católica</div>
                  <div className="bol-inst-sub">Sistema Académico — Boleta Oficial</div>
                </div>
              </div>
              <div>
                <div className="bol-emit-label">Fecha de emisión</div>
                <div className="bol-emit-date">{fechaEmision}</div>
              </div>
            </div>

            {/* Datos alumno */}
            <div className="bol-meta">
              <div><div className="bol-meta-label">Alumno</div><div className="bol-meta-value">{alumno.nombre}</div></div>
              <div><div className="bol-meta-label">Legajo</div><div className="bol-meta-cyan">{alumno.legajo}</div></div>
              <div><div className="bol-meta-label">Carrera</div><div className="bol-meta-value">{alumno.carrera}</div></div>
              <div><div className="bol-meta-label">Año</div><div className="bol-meta-value">{alumno.anio}° año</div></div>
              <div><div className="bol-meta-label">Semestre</div><div className="bol-meta-value">Semestre {alumno.semestre} · 2026</div></div>
              <div>
                <div className="bol-meta-label">Estado</div>
                {alumno.becado
                  ? <span className="bol-badge">★ Becada</span>
                  : <div className="bol-meta-value">Regular</div>}
              </div>
            </div>

            {/* Sección */}
            <div className="bol-section">Detalle de calificaciones</div>

            {/* Tabla */}
            <table className="bol-table">
              <thead>
                <tr>
                  <th>Materia</th>
                  <th>Profesor</th>
                  <th className="center">Parcial 1</th>
                  <th className="center">Parcial 2</th>
                  <th className="center">TP</th>
                  <th className="center">Final</th>
                  <th className="center">Promedio</th>
                </tr>
              </thead>
              <tbody>
                {materias.map(m => {
                  const prom = calcPromedio(m)
                  return (
                    <tr key={m.nombre}>
                      <td style={{ fontWeight: 600, color: '#f0f4f8' }}>{m.nombre}</td>
                      <td style={{ color: '#00b4d8', fontSize: 12 }}>{m.profesor}</td>
                      <td className="center" style={{ color: colorNota(m.parcial1) }}>{m.parcial1 ?? '—'}</td>
                      <td className="center" style={{ color: colorNota(m.parcial2) }}>{m.parcial2 ?? '—'}</td>
                      <td className="center" style={{ color: colorNota(m.tp) }}>{m.tp ?? '—'}</td>
                      <td className="center" style={{ color: '#506070' }}>{m.final ?? '—'}</td>
                      <td className="center">
                        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 800, color: colorPromedio(prom) }}>
                          {prom}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Promedio general */}
            <div className="bol-total">
              <div className="bol-total-label">Promedio general del semestre</div>
              <div className="bol-total-value">{calcPromedioGeneral()}</div>
            </div>

            {/* Footer */}
            <div className="bol-footer">
              <span>Documento generado por el Sistema Académico UCA</span>
              <span>Legajo: {alumno.legajo} · Semestre {alumno.semestre} · 2026</span>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}