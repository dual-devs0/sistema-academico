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
  { nombre: 'Física I', profesor: 'Ana Torres', parcial1: 6.0, parcial2: 7.5, tp: 8.5, final: null },
  { nombre: 'Matemática Discreta', profesor: 'Carlos Méndez', parcial1: 9.0, parcial2: null, tp: 8.0, final: null },
  { nombre: 'Programación I', profesor: 'Luis Paredes', parcial1: 10.0, parcial2: 9.5, tp: 10.0, final: null },
]

function calcPromedio(m: Materia): string {
  const notas = [m.parcial1, m.parcial2, m.tp, m.final].filter((n): n is number => n !== null)
  if (!notas.length) return '—'
  return (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1)
}

function claseNota(n: number | null): string {
  if (n === null) return 'dash'
  if (n >= 8) return 'nota-alta'
  if (n >= 6) return 'nota-media'
  return 'nota-baja'
}

function calcPromedioGeneral(): string {
  const promedios = materias
    .map(m => parseFloat(calcPromedio(m)))
    .filter(n => !isNaN(n))
  if (!promedios.length) return '—'
  return (promedios.reduce((a, b) => a + b, 0) / promedios.length).toFixed(1)
}

export default function Boleta() {
  const boletaRef = useRef<HTMLDivElement>(null)

  const fechaEmision = new Date().toLocaleDateString('es-PY', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  async function descargarPDF() {
    const html2pdf = (await import('html2pdf.js')).default
    const el = boletaRef.current
    if (!el) return

    // Clonar el elemento para no tocar la UI dark
    const clone = el.cloneNode(true) as HTMLElement

    // Inyectar estilos light sobre el clon (sobreescriben los dark)
    const styleLight = document.createElement('style')
    styleLight.textContent = `
      .boleta-card { background: #ffffff !important; border: 1px solid #e2e8f0 !important; border-radius: 0 !important; font-family: 'Inter', Arial, sans-serif !important; }
      .boleta-header { background: #ffffff !important; border-bottom: 1px solid #e2e8f0 !important; }
      .boleta-logo-icon { background: #1e40af !important; }
      .boleta-inst-name { color: #0f172a !important; }
      .boleta-inst-sub { color: #64748b !important; }
      .boleta-doc-label { color: #94a3b8 !important; }
      .boleta-doc-date { color: #1e293b !important; }
      .boleta-meta { background: #f8fafc !important; border-bottom: 1px solid #e2e8f0 !important; }
      .boleta-meta label { color: #94a3b8 !important; }
      .boleta-meta span { color: #1e293b !important; }
      .boleta-badge { background: #dcfce7 !important; color: #166534 !important; border: 1px solid #bbf7d0 !important; }
      .boleta-section-title { color: #94a3b8 !important; }
      .boleta-table thead tr { background: #f8fafc !important; }
      .boleta-table th { color: #94a3b8 !important; }
      .boleta-table tbody tr { border-bottom: 1px solid #f1f5f9 !important; }
      .boleta-table td { color: #334155 !important; }
      .boleta-table td.materia { color: #0f172a !important; }
      .boleta-table td.profesor { color: #64748b !important; }
      .nota-alta { color: #1d4ed8 !important; }
      .nota-media { color: #b45309 !important; }
      .nota-baja { color: #dc2626 !important; }
      .dash { color: #cbd5e1 !important; }
      .boleta-promedio { background: #eff6ff !important; border-top: 2px solid #1d4ed8 !important; }
      .boleta-pf-label { color: #1e40af !important; }
      .boleta-pf-value { color: #1d4ed8 !important; }
      .boleta-footer { background: #f8fafc !important; border-top: 1px solid #e2e8f0 !important; }
      .boleta-footer span { color: #94a3b8 !important; }
    `
    clone.prepend(styleLight)

    // Montar fuera de pantalla
    const wrapper = document.createElement('div')
    wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;background:#ffffff'
    wrapper.appendChild(clone)
    document.body.appendChild(wrapper)

    const opt = {
      margin: [12, 14],
      filename: `boleta_${alumno.legajo}_sem${alumno.semestre}_2026.pdf`,
      image: { type: 'jpeg' as const, quality: 0.99 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }

    await html2pdf().set(opt as any).from(clone).save()
    document.body.removeChild(wrapper)
  }

  return (
    <div>
      <style>{`
        .boleta-card { background: #1a1d27; border: 0.5px solid #2e3244; border-radius: 12px; overflow: hidden; max-width: 760px; font-family: 'Inter', sans-serif; }
        .boleta-header { padding: 1.5rem 2rem; display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 0.5px solid #2e3244; }
        .boleta-logo-icon { width: 40px; height: 40px; background: #3b5bdb; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
        .boleta-inst-name { font-size: 16px; font-weight: 600; color: #e8eaf0; }
        .boleta-inst-sub { font-size: 12px; color: #7b82a0; margin-top: 2px; }
        .boleta-doc-label { font-size: 11px; color: #555c7a; text-transform: uppercase; letter-spacing: .06em; }
        .boleta-doc-date { font-size: 13px; font-weight: 500; color: #c5c9dc; margin-top: 2px; }
        .boleta-meta { padding: 1.25rem 2rem; display: grid; grid-template-columns: repeat(3,1fr); gap: 1rem; border-bottom: 0.5px solid #2e3244; background: #13161f; }
        .boleta-meta label { font-size: 11px; color: #555c7a; text-transform: uppercase; letter-spacing: .06em; display: block; margin-bottom: 3px; }
        .boleta-meta span { font-size: 14px; font-weight: 500; color: #c5c9dc; }
        .boleta-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 500; padding: 3px 8px; border-radius: 20px; background: #1a3a2a; color: #4ade80; border: 0.5px solid #2d5a3d; }
        .boleta-section-title { font-size: 11px; font-weight: 600; color: #555c7a; text-transform: uppercase; letter-spacing: .08em; padding: .75rem 2rem .5rem; }
        .boleta-table { width: 100%; border-collapse: collapse; }
        .boleta-table thead tr { background: #13161f; }
        .boleta-table th { font-size: 11px; font-weight: 600; color: #555c7a; text-transform: uppercase; letter-spacing: .06em; padding: .6rem 1rem; text-align: left; }
        .boleta-table th:not(:first-child):not(:nth-child(2)) { text-align: center; }
        .boleta-table tbody tr { border-bottom: 0.5px solid #2e3244; }
        .boleta-table tbody tr:last-child { border-bottom: none; }
        .boleta-table td { padding: .75rem 1rem; font-size: 13.5px; color: #c5c9dc; }
        .boleta-table td.materia { font-weight: 500; color: #e8eaf0; }
        .boleta-table td.num { text-align: center; font-variant-numeric: tabular-nums; }
        .boleta-table td.profesor { font-size: 12.5px; color: #7b82a0; }
        .nota-alta { color: #60a5fa; font-weight: 600; }
        .nota-media { color: #fbbf24; font-weight: 600; }
        .nota-baja { color: #f87171; font-weight: 600; }
        .dash { color: #3a3f57; }
        .boleta-promedio { padding: 1.25rem 2rem; display: flex; justify-content: space-between; align-items: center; background: #111827; border-top: 2px solid #3b5bdb; }
        .boleta-pf-label { font-size: 14px; font-weight: 600; color: #93a3d4; }
        .boleta-pf-value { font-size: 28px; font-weight: 700; color: #60a5fa; }
        .boleta-footer { padding: .75rem 2rem; display: flex; justify-content: space-between; border-top: 0.5px solid #2e3244; background: #13161f; }
        .boleta-footer span { font-size: 11px; color: #555c7a; }
      `}</style>

      {/* Acciones */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Boleta de notas
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Semestre 1 — 2026</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => window.print()}
            style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '9px 16px',
              fontSize: '13px', color: 'var(--text-secondary)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Imprimir
          </button>
          <button
            onClick={descargarPDF}
            style={{
              background: '#3b5bdb', border: 'none',
              borderRadius: '8px', padding: '9px 16px',
              fontSize: '13px', fontWeight: 500, color: 'white',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Descargar PDF
          </button>
        </div>
      </div>

      {/* Boleta */}
      <div ref={boletaRef} className="boleta-card">

        {/* Header */}
        <div className="boleta-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="boleta-logo-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
              </svg>
            </div>
            <div>
              <div className="boleta-inst-name">Universidad Católica</div>
              <div className="boleta-inst-sub">Sistema Académico — Boleta Oficial</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="boleta-doc-label">Fecha de emisión</div>
            <div className="boleta-doc-date">{fechaEmision}</div>
          </div>
        </div>

        {/* Datos alumno */}
        <div className="boleta-meta">
          <div><label>Alumno</label><span>{alumno.nombre}</span></div>
          <div><label>Legajo</label><span>{alumno.legajo}</span></div>
          <div><label>Carrera</label><span>{alumno.carrera}</span></div>
          <div><label>Año</label><span>{alumno.anio}° año</span></div>
          <div><label>Semestre</label><span>Semestre {alumno.semestre} · 2026</span></div>
          <div>
            <label>Estado</label>
            <span>
              {alumno.becado
                ? <span className="boleta-badge">★ Becado</span>
                : <span>Regular</span>}
            </span>
          </div>
        </div>

        {/* Título sección */}
        <div className="boleta-section-title">Detalle de calificaciones</div>

        {/* Tabla */}
        <table className="boleta-table">
          <thead>
            <tr>
              <th style={{ width: '30%' }}>Materia</th>
              <th style={{ width: '20%' }}>Profesor</th>
              <th>Parcial 1</th>
              <th>Parcial 2</th>
              <th>TP</th>
              <th>Final</th>
              <th>Promedio</th>
            </tr>
          </thead>
          <tbody>
            {materias.map(m => {
              const prom = calcPromedio(m)
              const promNum = parseFloat(prom)
              return (
                <tr key={m.nombre}>
                  <td className="materia">{m.nombre}</td>
                  <td className="profesor">{m.profesor}</td>
                  <td className={`num ${claseNota(m.parcial1)}`}>{m.parcial1 ?? '—'}</td>
                  <td className={`num ${claseNota(m.parcial2)}`}>{m.parcial2 ?? '—'}</td>
                  <td className={`num ${claseNota(m.tp)}`}>{m.tp ?? '—'}</td>
                  <td className={`num ${claseNota(m.final)}`}>{m.final ?? '—'}</td>
                  <td className={`num ${claseNota(isNaN(promNum) ? null : promNum)}`}>{prom}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Promedio general */}
        <div className="boleta-promedio">
          <div className="boleta-pf-label">Promedio general del semestre</div>
          <div className="boleta-pf-value">{calcPromedioGeneral()}</div>
        </div>

        {/* Footer */}
        <div className="boleta-footer">
          <span>Documento generado por el Sistema Académico UCA</span>
          <span>Legajo: {alumno.legajo} · Semestre {alumno.semestre} · 2026</span>
        </div>

      </div>
    </div>
  )
}