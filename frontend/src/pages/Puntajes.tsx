import { useState, useRef, useEffect, useCallback } from 'react'
import { api, decodeToken, emitToast } from '../lib/api'

/* ─────────────────────────────────────────────
   PROFESOR VIEW
   ───────────────────────────────────────────── */
type MateriaSimple = { id: number; nombre: string }
type AlumnoRow = {
  alumno_id: number
  nombre: string
  username: string
  // puntaje ids (0 = aún no existe)
  ids: { parcial1: number; parcial2: number; tp: number; final: number }
  // valores editables
  vals: { parcial1: string; parcial2: string; tp: string; final: string }
  saving: boolean
}

const cssPro = `
  *, *::before, *::after { box-sizing:border-box; }
  .pro-root { display:flex; flex-direction:column; flex:1; font-family:'Inter',system-ui,sans-serif; color:#f0f4f8; min-height:100%; }

  .pro-topbar {
    display:flex; align-items:center; justify-content:space-between;
    padding:0 24px; height:56px;
    border-bottom:1px solid #1e2d3d; background:#0b0f14;
    position:sticky; top:0; z-index:20; flex-shrink:0;
  }
  .pro-topbar h1 { font-size:17px; font-weight:700; color:#f0f4f8; letter-spacing:-.01em; }
  .pro-topbar p  { font-size:11px; color:#506070; margin-top:1px; }

  .pro-content { padding:20px 24px 60px; flex:1; }

  .pro-materia-tabs {
    display:flex; gap:8px; flex-wrap:wrap; margin-bottom:20px;
  }
  .pro-tab {
    padding:6px 16px; border-radius:20px; border:1px solid #1e2d3d;
    background:#131920; color:#8fa3b8; font-size:12px; font-weight:600;
    cursor:pointer; transition:all .15s; font-family:inherit;
  }
  .pro-tab:hover { border-color:#00b4d8; color:#f0f4f8; }
  .pro-tab.active { background:#00b4d818; border-color:#00b4d8; color:#00b4d8; }

  .pro-empty {
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    padding:60px 24px; text-align:center; gap:12px;
  }
  .pro-empty svg { width:48px; height:48px; color:#1e2d3d; }
  .pro-empty h3 { font-size:16px; font-weight:600; color:#506070; margin:0; }
  .pro-empty p  { font-size:13px; color:#3a4f6a; margin:0; }

  .pro-alumnos-head {
    display:flex; align-items:center; justify-content:space-between;
    margin-bottom:12px; flex-wrap:wrap; gap:8px;
  }
  .pro-alumnos-head h2 { font-size:14px; font-weight:700; color:#f0f4f8; margin:0; }
  .pro-alumnos-head span { font-size:11px; color:#506070; }

  /* Table desktop */
  .pro-tbl-wrap { background:#131920; border:1px solid #1e2d3d; border-radius:14px; overflow:hidden; }
  .pro-tbl-wrap table { width:100%; border-collapse:collapse; }
  .pro-tbl-wrap thead tr { background:#0d1117; }
  .pro-tbl-wrap th {
    padding:9px 14px; font-size:10px; font-weight:600;
    color:#506070; text-transform:uppercase; letter-spacing:.07em;
    text-align:left; border-bottom:1px solid #1e2d3d; white-space:nowrap;
  }
  .pro-tbl-wrap th.c { text-align:center; }
  .pro-tbl-wrap tbody tr { border-bottom:1px solid #1e2d3d1a; transition:background .12s; }
  .pro-tbl-wrap tbody tr:last-child { border-bottom:none; }
  .pro-tbl-wrap tbody tr:hover { background:#1a2230; }
  .pro-tbl-wrap td { padding:10px 14px; vertical-align:middle; }
  .pro-tbl-wrap td.c { text-align:center; }
  .alumno-name { font-weight:600; color:#f0f4f8; font-size:13px; }
  .alumno-user { font-size:11px; color:#506070; }

  .nota-input {
    width:64px; padding:5px 8px; text-align:center;
    background:#0d1117; border:1px solid #1e2d3d;
    border-radius:7px; color:#f0f4f8; font-size:13px; font-weight:700;
    font-family:inherit; outline:none; transition:border-color .15s;
  }
  .nota-input:focus { border-color:#00b4d8; }
  .nota-input:disabled { opacity:.4; cursor:not-allowed; }

  .btn-save-row {
    display:inline-flex; align-items:center; gap:5px;
    padding:5px 12px; border-radius:7px;
    background:#00b4d818; border:1px solid #00b4d840;
    color:#00b4d8; font-size:11px; font-weight:700;
    font-family:inherit; cursor:pointer;
    transition:all .15s; white-space:nowrap;
  }
  .btn-save-row:hover:not(:disabled) { background:#00b4d830; border-color:#00b4d8; }
  .btn-save-row:disabled { opacity:.5; cursor:not-allowed; }
  .btn-save-row svg { width:12px; height:12px; }

  .pro-prom-chip {
    display:inline-flex; align-items:center;
    padding:3px 10px; border-radius:20px;
    font-size:12px; font-weight:800; border:1px solid;
  }

  /* Mobile cards */
  .pro-cards { display:none; }
  .pro-alumno-card {
    background:#131920; border:1px solid #1e2d3d; border-radius:14px;
    margin-bottom:12px; overflow:hidden;
  }
  .pro-alumno-card-head {
    display:flex; align-items:center; justify-content:space-between;
    padding:12px 14px; border-bottom:1px solid #1e2d3d;
  }
  .pro-notas-grid {
    display:grid; grid-template-columns:repeat(4,1fr);
    border-bottom:1px solid #1e2d3d;
  }
  .pro-nota-cell {
    padding:12px 8px; text-align:center;
    border-right:1px solid #1e2d3d;
  }
  .pro-nota-cell:last-child { border-right:none; }
  .pro-nota-lbl { font-size:9px; color:#506070; text-transform:uppercase; letter-spacing:.05em; margin-bottom:6px; }
  .pro-alumno-card-footer { padding:10px 14px; display:flex; justify-content:flex-end; gap:8px; align-items:center; }

  .pro-spinner {
    display:flex; align-items:center; justify-content:center; padding:40px;
    color:#506070; font-size:13px; gap:8px;
  }
  .spin-icon { animation:spin .8s linear infinite; width:18px; height:18px; }
  @keyframes spin { to { transform:rotate(360deg); } }

  @media(max-width:768px){
    .pro-tbl-wrap { display:none; }
    .pro-cards { display:block; }
    .pro-content { padding:14px 14px 80px; }
    .pro-topbar { padding:0 14px; }
    .pro-materia-tabs { gap:6px; }
    .pro-tab { font-size:11px; padding:5px 12px; }
    .nota-input { width:54px; }
  }
`

function proChipStyle(n: number | null) {
  if (n === null) return { color: '#506070', bg: '#1e2d3d18', border: '#1e2d3d' }
  if (n >= 9)  return { color: '#22c55e', bg: '#22c55e15', border: '#22c55e40' }
  if (n >= 7.5) return { color: '#00b4d8', bg: '#00b4d815', border: '#00b4d840' }
  if (n >= 6)  return { color: '#f59e0b', bg: '#f59e0b15', border: '#f59e0b40' }
  return { color: '#ef4444', bg: '#ef444415', border: '#ef444440' }
}

function proCalcProm(v: AlumnoRow['vals']): number | null {
  const ns = [v.parcial1, v.parcial2, v.tp, v.final]
    .map(s => parseFloat(s))
    .filter(n => !isNaN(n))
  if (!ns.length) return null
  return Math.round((ns.reduce((a, b) => a + b, 0) / ns.length) * 10) / 10
}

function ProfesorView({ profesorId }: { profesorId: number }) {
  const [materias, setMaterias] = useState<MateriaSimple[]>([])
  const [selectedMateria, setSelectedMateria] = useState<MateriaSimple | null>(null)
  const [alumnos, setAlumnos] = useState<AlumnoRow[]>([])
  const [loadingMaterias, setLoadingMaterias] = useState(true)
  const [loadingAlumnos, setLoadingAlumnos] = useState(false)

  // Fetch materias del profesor
  useEffect(() => {
    api.get<{ id: number; nombre: string }[]>(`/materias/?profesor_id=${profesorId}`)
      .then(data => {
        setMaterias(data)
        if (data.length > 0) setSelectedMateria(data[0])
      })
      .catch(() => {})
      .finally(() => setLoadingMaterias(false))
  }, [profesorId])

  // Fetch alumnos + puntajes when materia changes
  const fetchAlumnos = useCallback(async (materia: MateriaSimple) => {
    setLoadingAlumnos(true)
    try {
      const [alumnosData, puntajesData] = await Promise.all([
        api.get<{ alumno_id: number; nombre: string; username: string }[]>(
          `/inscripciones/materia/${materia.id}`
        ).catch(() => []),
        api.get<{ id: number; user_id: number; tipo: string; valor: number }[]>(
          `/puntajes/?materia_id=${materia.id}`
        ).catch(() => []),
      ])

      const rows: AlumnoRow[] = alumnosData.map(a => {
        const pts = puntajesData.filter(p => p.user_id === a.alumno_id)
        const find = (tipo: string) => pts.find(p => p.tipo === tipo)
        const findId = (tipo: string) => find(tipo)?.id ?? 0
        const findVal = (tipo: string) => {
          const v = find(tipo)?.valor
          return v !== undefined ? String(v) : ''
        }
        return {
          alumno_id: a.alumno_id,
          nombre: a.nombre,
          username: a.username,
          ids: { parcial1: findId('parcial1'), parcial2: findId('parcial2'), tp: findId('practico'), final: findId('final') },
          vals: { parcial1: findVal('parcial1'), parcial2: findVal('parcial2'), tp: findVal('practico'), final: findVal('final') },
          saving: false,
        }
      })
      setAlumnos(rows)
    } finally {
      setLoadingAlumnos(false)
    }
  }, [])

  useEffect(() => {
    if (selectedMateria) fetchAlumnos(selectedMateria)
  }, [selectedMateria, fetchAlumnos])

  function updateVal(alumno_id: number, campo: keyof AlumnoRow['vals'], value: string) {
    // Allow only numbers 0-10 with 1 decimal
    if (value !== '' && !/^\d{0,2}(\.\d{0,1})?$/.test(value)) return
    const num = parseFloat(value)
    if (value !== '' && !isNaN(num) && (num < 0 || num > 10)) return
    setAlumnos(prev => prev.map(a => a.alumno_id === alumno_id
      ? { ...a, vals: { ...a.vals, [campo]: value } }
      : a
    ))
  }

  async function saveRow(alumno_id: number) {
    const row = alumnos.find(a => a.alumno_id === alumno_id)
    if (!row || !selectedMateria) return
    setAlumnos(prev => prev.map(a => a.alumno_id === alumno_id ? { ...a, saving: true } : a))

    const tiposMap: { campo: keyof AlumnoRow['vals']; tipo: string }[] = [
      { campo: 'parcial1', tipo: 'parcial1' },
      { campo: 'parcial2', tipo: 'parcial2' },
      { campo: 'tp',       tipo: 'practico' },
      { campo: 'final',    tipo: 'final' },
    ]

    let newIds = { ...row.ids }
    try {
      for (const { campo, tipo } of tiposMap) {
        const valStr = row.vals[campo]
        if (valStr === '') continue
        const valor = parseFloat(valStr)
        if (isNaN(valor)) continue
        const existingId = row.ids[campo]
        if (existingId) {
          await api.put(`/puntajes/${existingId}`, { user_id: alumno_id, materia_id: selectedMateria.id, tipo, valor })
        } else {
          const created = await api.post<{ id: number }>('/puntajes/', { user_id: alumno_id, materia_id: selectedMateria.id, tipo, valor })
          newIds = { ...newIds, [campo]: created.id }
        }
      }
      setAlumnos(prev => prev.map(a => a.alumno_id === alumno_id ? { ...a, ids: newIds, saving: false } : a))
      emitToast('Notas guardadas correctamente')
    } catch {
      emitToast('Error al guardar notas')
      setAlumnos(prev => prev.map(a => a.alumno_id === alumno_id ? { ...a, saving: false } : a))
    }
  }

  if (loadingMaterias) {
    return (
      <>
        <style>{cssPro}</style>
        <div className="pro-root">
          <header className="pro-topbar"><div><h1>Cargar Puntajes</h1><p>Mis materias</p></div></header>
          <div className="pro-spinner">
            <svg className="spin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Cargando materias...
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{cssPro}</style>
      <div className="pro-root">
        <header className="pro-topbar">
          <div>
            <h1>Cargar Puntajes</h1>
            <p>{selectedMateria?.nombre ?? 'Seleccioná una materia'}</p>
          </div>
        </header>

        <div className="pro-content">
          {materias.length === 0 ? (
            <div className="pro-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h3>Sin materias asignadas</h3>
              <p>El administrador aún no te asignó materias.</p>
            </div>
          ) : (
            <>
              {/* Tabs materias */}
              <div className="pro-materia-tabs">
                {materias.map(m => (
                  <button
                    key={m.id}
                    className={`pro-tab${selectedMateria?.id === m.id ? ' active' : ''}`}
                    onClick={() => setSelectedMateria(m)}
                  >
                    {m.nombre}
                  </button>
                ))}
              </div>

              {loadingAlumnos ? (
                <div className="pro-spinner">
                  <svg className="spin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Cargando alumnos...
                </div>
              ) : alumnos.length === 0 ? (
                <div className="pro-empty">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <h3>Sin alumnos inscriptos</h3>
                  <p>No hay alumnos inscriptos en esta materia aún.</p>
                </div>
              ) : (
                <>
                  <div className="pro-alumnos-head">
                    <h2>Alumnos · {selectedMateria?.nombre}</h2>
                    <span>{alumnos.length} alumno{alumnos.length !== 1 ? 's' : ''}</span>
                  </div>

                  {/* Desktop table */}
                  <div className="pro-tbl-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Alumno</th>
                          <th className="c">Parcial 1</th>
                          <th className="c">Parcial 2</th>
                          <th className="c">TP</th>
                          <th className="c">Final</th>
                          <th className="c">Promedio</th>
                          <th className="c">Guardar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alumnos.map(a => {
                          const prom = proCalcProm(a.vals)
                          const chip = proChipStyle(prom)
                          return (
                            <tr key={a.alumno_id}>
                              <td>
                                <div className="alumno-name">{a.nombre}</div>
                                <div className="alumno-user">@{a.username}</div>
                              </td>
                              {(['parcial1', 'parcial2', 'tp', 'final'] as const).map(campo => (
                                <td key={campo} className="c">
                                  <input
                                    className="nota-input"
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="—"
                                    value={a.vals[campo]}
                                    disabled={a.saving}
                                    onChange={e => updateVal(a.alumno_id, campo, e.target.value)}
                                  />
                                </td>
                              ))}
                              <td className="c">
                                <span className="pro-prom-chip" style={{ color: chip.color, background: chip.bg, borderColor: chip.border }}>
                                  {prom ?? '—'}
                                </span>
                              </td>
                              <td className="c">
                                <button
                                  className="btn-save-row"
                                  disabled={a.saving}
                                  onClick={() => saveRow(a.alumno_id)}
                                >
                                  {a.saving ? (
                                    <svg className="spin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                    </svg>
                                  ) : (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  )}
                                  {a.saving ? 'Guardando...' : 'Guardar'}
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="pro-cards">
                    {alumnos.map(a => {
                      const prom = proCalcProm(a.vals)
                      const chip = proChipStyle(prom)
                      const campos: { campo: keyof AlumnoRow['vals']; label: string }[] = [
                        { campo: 'parcial1', label: 'P1' },
                        { campo: 'parcial2', label: 'P2' },
                        { campo: 'tp',       label: 'TP' },
                        { campo: 'final',    label: 'FN' },
                      ]
                      return (
                        <div key={a.alumno_id} className="pro-alumno-card">
                          <div className="pro-alumno-card-head">
                            <div>
                              <div className="alumno-name">{a.nombre}</div>
                              <div className="alumno-user">@{a.username}</div>
                            </div>
                            <span className="pro-prom-chip" style={{ color: chip.color, background: chip.bg, borderColor: chip.border }}>
                              Prom: {prom ?? '—'}
                            </span>
                          </div>
                          <div className="pro-notas-grid">
                            {campos.map(({ campo, label }) => (
                              <div key={campo} className="pro-nota-cell">
                                <div className="pro-nota-lbl">{label}</div>
                                <input
                                  className="nota-input"
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="—"
                                  value={a.vals[campo]}
                                  disabled={a.saving}
                                  onChange={e => updateVal(a.alumno_id, campo, e.target.value)}
                                />
                              </div>
                            ))}
                          </div>
                          <div className="pro-alumno-card-footer">
                            <button
                              className="btn-save-row"
                              disabled={a.saving}
                              onClick={() => saveRow(a.alumno_id)}
                            >
                              {a.saving ? 'Guardando...' : 'Guardar notas'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

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
    { nombre: 'Análisis Matemático I', profesor: 'Carlos Méndez', parcial1: 7.5, parcial2: 8, tp: 9, final: null },
    { nombre: 'Física I', profesor: 'Ana Torres', parcial1: 6, parcial2: 7.5, tp: 8.5, final: null },
    { nombre: 'Matemática Discreta', profesor: 'Carlos Méndez', parcial1: 9, parcial2: null, tp: 8, final: null },
    { nombre: 'Programación I', profesor: 'Luis Paredes', parcial1: 10, parcial2: 9.5, tp: 10, final: null },
    { nombre: 'Historia y Filosofía', profesor: 'Pedro Rojas', parcial1: 7, parcial2: 6.5, tp: 8, final: null },
  ],
  'Semestre 2 · 2025': [
    { nombre: 'Cálculo II', profesor: 'Carlos Méndez', parcial1: 8, parcial2: 8.5, tp: 9, final: 7.5 },
    { nombre: 'Álgebra Lineal', profesor: 'Ana Torres', parcial1: 7, parcial2: 7, tp: 8, final: 6.5 },
    { nombre: 'Física II', profesor: 'Luis Paredes', parcial1: 6.5, parcial2: 7, tp: 7.5, final: null },
  ],
  'Semestre 1 · 2025': [
    { nombre: 'Cálculo I', profesor: 'Carlos Méndez', parcial1: 9, parcial2: 8.5, tp: 9.5, final: 9 },
    { nombre: 'Química General', profesor: 'María Ruiz', parcial1: 7.5, parcial2: 8, tp: 8, final: 7 },
  ],
}

const semestres = Object.keys(datosPorSemestre)

function calcProm(m: Materia): number | null {
  const ns = [m.parcial1, m.parcial2, m.tp, m.final].filter(n => n !== null) as number[]
  if (!ns.length) return null
  return Math.round((ns.reduce((a, b) => a + b, 0) / ns.length) * 10) / 10
}
function notaColor(n: number | null) {
  if (n === null) return '#2a3a55'
  if (n >= 9) return '#22c55e'
  if (n >= 7.5) return '#00b4d8'
  if (n >= 6) return '#f59e0b'
  return '#ef4444'
}
function chipStyle(p: number | null) {
  if (p === null) return { color: '#506070', bg: '#1e2d3d18', border: '#1e2d3d' }
  if (p >= 9) return { color: '#22c55e', bg: '#22c55e15', border: '#22c55e40' }
  if (p >= 7.5) return { color: '#00b4d8', bg: '#00b4d815', border: '#00b4d840' }
  if (p >= 6) return { color: '#f59e0b', bg: '#f59e0b15', border: '#f59e0b40' }
  return { color: '#ef4444', bg: '#ef444415', border: '#ef444440' }
}
function estadoChip(m: Materia) {
  const p = calcProm(m)
  if (m.final !== null) return { label: 'Aprobado', color: '#22c55e', bg: '#22c55e15' }
  if (p === null) return { label: 'Sin notas', color: '#506070', bg: '#1e2d3d18' }
  if (p < 6) return { label: 'En riesgo', color: '#ef4444', bg: '#ef444415' }
  return { label: 'En curso', color: '#f59e0b', bg: '#f59e0b15' }
}

// Exportar a PDF con jsPDF
async function exportarPDF(materias: Materia[], semestre: string, promGeneral: number) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210, margin = 14

  // Header
  doc.setFillColor(11, 15, 20)
  doc.rect(0, 0, W, 30, 'F')
  doc.setTextColor(0, 180, 216)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Sistema Académico UCA', margin, 12)
  doc.setTextColor(240, 244, 248)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('Registro de Puntajes — ' + semestre, margin, 20)
  doc.setTextColor(80, 96, 112)
  doc.setFontSize(9)
  doc.text('Generado el ' + new Date().toLocaleDateString('es-PY'), margin, 27)

  let y = 38

  // KPI row
  const kpis = [
    { l: 'Materias', v: String(materias.length) },
    { l: 'Promedio', v: String(promGeneral) },
    { l: 'Mejor nota', v: String(Math.max(...materias.flatMap(m => [m.parcial1, m.parcial2, m.tp, m.final]).filter(n => n !== null) as number[])) },
    { l: 'Finales pend.', v: String(materias.filter(m => m.final === null).length) },
  ]
  const kW = (W - margin * 2) / 4 - 2
  kpis.forEach((k, i) => {
    const x = margin + i * (kW + 2)
    doc.setFillColor(19, 25, 32)
    doc.roundedRect(x, y, kW, 16, 2, 2, 'F')
    doc.setTextColor(80, 96, 112)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(k.l.toUpperCase(), x + 3, y + 6)
    doc.setTextColor(0, 180, 216)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text(k.v, x + 3, y + 13)
  })
  y += 22

  // Tabla header
  const cols = ['Materia', 'Profesor', 'P1', 'P2', 'TP', 'Final', 'Prom.', 'Estado']
  const colW = [52, 36, 12, 12, 12, 12, 14, 22]
  doc.setFillColor(13, 17, 23)
  doc.rect(margin, y, W - margin * 2, 8, 'F')
  doc.setTextColor(80, 96, 112)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  let cx = margin
  cols.forEach((c, i) => { doc.text(c, cx + 2, y + 5.5); cx += colW[i] })
  y += 8

  // Filas
  materias.forEach((m, idx) => {
    const p = calcProm(m)
    const est = m.final !== null ? 'Aprobado' : p === null ? 'Sin notas' : p < 6 ? 'En riesgo' : 'En curso'
    const bg = idx % 2 === 0 ? [19, 25, 32] : [15, 20, 27]
    doc.setFillColor(bg[0], bg[1], bg[2])
    doc.rect(margin, y, W - margin * 2, 9, 'F')

    doc.setTextColor(240, 244, 248)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')

    const vals = [
      m.nombre, m.profesor,
      m.parcial1 != null ? String(m.parcial1) : '—',
      m.parcial2 != null ? String(m.parcial2) : '—',
      m.tp != null ? String(m.tp) : '—',
      m.final != null ? String(m.final) : '—',
      p != null ? String(p) : '—',
      est,
    ]
    cx = margin
    vals.forEach((v, i) => {
      if (i === 0) {
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(240, 244, 248)
      } else {
        doc.setFont('helvetica', 'normal')
        // color nota
        if (i >= 2 && i <= 6) {
          const n = parseFloat(v)
          if (!isNaN(n)) {
            if (n >= 9) doc.setTextColor(34, 197, 94)
            else if (n >= 7.5) doc.setTextColor(0, 180, 216)
            else if (n >= 6) doc.setTextColor(245, 158, 11)
            else doc.setTextColor(239, 68, 68)
          } else doc.setTextColor(143, 163, 184)
        }
        // truncar texto largo
        const maxW = colW[i] - 3
        let txt = v
        while (doc.getTextWidth(txt) > maxW && txt.length > 1) txt = txt.slice(0, -1)
        doc.text(txt, cx + 2, y + 6)
        cx += colW[i]
      }
    })
    y += 9
    if (y > 270) { doc.addPage(); y = 14 }
  })

  // Footer
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setTextColor(42, 58, 85)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('Universidad Católica Caacupé · Sistema Académico · ' + semestre, margin, 290)
    doc.text('Pág. ' + i + '/' + totalPages, W - margin, 290, { align: 'right' })
  }

  doc.save('puntajes_' + semestre.replace(/[·\s]/g, '_') + '.pdf')
}

function exportarCSV(materias: Materia[], semestre: string) {
  const rows = [
    ['Materia', 'Parcial 1', 'Parcial 2', 'Trabajo Práctico', 'Examen Final', 'Promedio', 'Progreso', 'Estado'],
    ...materias.map(m => {
      const p = calcProm(m)
      const st = estadoChip(m).label
      const completadas = [m.parcial1, m.parcial2, m.tp, m.final].filter(n => n !== null).length
      return [
        m.nombre, m.parcial1 ?? '-', m.parcial2 ?? '-', m.tp ?? '-', m.final ?? '-',
        p !== null ? p.toFixed(1) : '-', Math.round((completadas / 4) * 100) + '%', st
      ]
    })
  ]
  const csv = rows.map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `puntajes_${semestre.replace(/[·\s]/g, '_')}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
  import('../lib/api').then(m => m.emitToast('Archivo CSV descargado'))
}

const css = `
  *, *::before, *::after { box-sizing:border-box; }
  .puntajes-root { display:flex; flex-direction:column; font-family:'Inter',system-ui,sans-serif; color:#f0f4f8; min-height:100%; }

  .topbar {
    display:flex; align-items:center; justify-content:space-between;
    padding:0 24px; height:56px;
    border-bottom:1px solid #1e2d3d; background:#0b0f14;
    position:sticky; top:0; z-index:20; flex-shrink:0;
  }
  .topbar h1 { font-size:17px; font-weight:700; color:#f0f4f8; letter-spacing:-.01em; }
  .topbar p  { font-size:11px; color:#506070; margin-top:1px; }

  .content { padding:20px 24px 60px; flex:1; }

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
    .content { padding:14px 14px 80px; }
    .topbar  { padding:0 14px; }
    .custom-select-dropdown { position:fixed; left:14px; right:14px; top:auto; }
  }
`

export default function Puntajes() {
  const token = sessionStorage.getItem('token')
  const currentUser = token ? decodeToken(token) : null
  if (currentUser?.role === 'profesor') {
    return <ProfesorView profesorId={Number(currentUser.user_id)} />
  }
  if (currentUser?.role === 'admin') {
    return <AdminView />
  }
  return <AlumnoAdminView />
}

/* ─── ADMIN VIEW ─────────────────────────────── */
type AlumnoOpt = { id: number; nombre: string; username: string }

const cssAdmin = `
  .adm-root { display:flex; flex-direction:column; flex:1; font-family:'Inter',system-ui,sans-serif; color:#f0f4f8; min-height:100%; }
  .adm-topbar { display:flex; align-items:center; padding:0 24px; height:56px; border-bottom:1px solid #1e2d3d; background:#0b0f14; position:sticky; top:0; z-index:20; }
  .adm-topbar h1 { font-size:17px; font-weight:700; color:#f0f4f8; letter-spacing:-.01em; }
  .adm-content { padding:20px 24px 60px; flex:1; }

  .adm-sel-bar { display:flex; gap:12px; margin-bottom:20px; flex-wrap:wrap; align-items:flex-end; }
  .adm-sel-group { display:flex; flex-direction:column; gap:5px; flex:1; min-width:220px; }
  .adm-sel-group label { font-size:10px; font-weight:600; color:#506070; text-transform:uppercase; letter-spacing:.07em; }
  .adm-sel-wrap { position:relative; }
  .adm-search { width:100%; background:#131920; border:1px solid #1e2d3d; border-radius:9px; color:#f0f4f8; font-size:13px; font-family:inherit; outline:none; padding:9px 14px; transition:border-color .15s; }
  .adm-search:focus { border-color:#00b4d8; }
  .adm-search::placeholder { color:#506070; }
  .adm-drop { position:absolute; top:calc(100% + 4px); left:0; right:0; background:#131920; border:1px solid #1e2d3d; border-radius:10px; z-index:50; max-height:220px; overflow-y:auto; box-shadow:0 8px 24px rgba(0,0,0,.5); }
  .adm-opt { display:flex; align-items:center; gap:10px; padding:10px 14px; cursor:pointer; transition:background .12s; }
  .adm-opt:hover { background:#1a2230; }
  .adm-av { width:30px; height:30px; border-radius:50%; background:#1e2d3d; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; color:#00b4d8; flex-shrink:0; }
  .adm-opt-name { font-size:13px; font-weight:600; color:#f0f4f8; }
  .adm-opt-user { font-size:11px; color:#506070; }
  .adm-chip { display:inline-flex; align-items:center; gap:8px; background:#00b4d812; border:1px solid #00b4d830; border-radius:9px; padding:7px 12px; font-size:13px; color:#f0f4f8; font-weight:600; }
  .adm-chip-clear { background:none; border:none; cursor:pointer; color:#506070; padding:0; display:flex; margin-left:4px; }
  .adm-chip-clear:hover { color:#ef4444; }
  .adm-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:80px 24px; text-align:center; gap:14px; }
  .adm-empty svg { width:52px; height:52px; color:#1e2d3d; }
  .adm-empty h3 { font-size:16px; font-weight:600; color:#506070; margin:0; }
  .adm-empty p { font-size:13px; color:#3a4a5a; margin:0; }
  .adm-kpi-row { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:20px; }
  .adm-kpi { background:#131920; border:1px solid #1e2d3d; border-radius:12px; padding:14px 16px; }
  .adm-kpi-lbl { font-size:10px; color:#506070; font-weight:600; text-transform:uppercase; letter-spacing:.07em; margin-bottom:6px; }
  .adm-kpi-val { font-size:22px; font-weight:800; letter-spacing:-.02em; }
  .adm-tbl-wrap { background:#131920; border:1px solid #1e2d3d; border-radius:14px; overflow:hidden; }
  .adm-tbl-wrap table { width:100%; border-collapse:collapse; }
  .adm-tbl-wrap thead th { padding:10px 16px; font-size:10px; font-weight:600; color:#506070; text-transform:uppercase; letter-spacing:.07em; text-align:center; border-bottom:1px solid #1e2d3d; background:#0d1117; }
  .adm-tbl-wrap thead th:first-child { text-align:left; }
  .adm-tbl-wrap tbody td { padding:12px 16px; border-bottom:1px solid #1e2d3d18; text-align:center; vertical-align:middle; }
  .adm-tbl-wrap tbody tr:last-child td { border-bottom:none; }
  .adm-tbl-wrap tbody tr:hover { background:#1a2230; }
  .adm-m-name { font-size:13px; font-weight:600; color:#f0f4f8; text-align:left; }
  .adm-m-prof { font-size:11px; color:#506070; text-align:left; margin-top:2px; }
  .adm-nota { font-size:13px; font-weight:700; }
  .adm-prom { display:inline-flex; align-items:center; justify-content:center; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:700; border:1px solid; }
  .adm-cards { display:none; flex-direction:column; gap:10px; }
  .adm-card { background:#131920; border:1px solid #1e2d3d; border-radius:14px; padding:14px 16px; }
  .adm-card-head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; }
  .adm-card-notas { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
  .adm-nota-cell { background:#0d1117; border-radius:8px; padding:8px; text-align:center; }
  .adm-nota-lbl { font-size:9px; color:#506070; font-weight:600; text-transform:uppercase; margin-bottom:4px; }
  .adm-nota-num { font-size:15px; font-weight:700; }
  @media(max-width:768px) {
    .adm-content { padding:14px; }
    .adm-kpi-row { grid-template-columns:repeat(2,1fr); }
    .adm-tbl-wrap { display:none; }
    .adm-cards { display:flex; }
  }
`

function AdminView() {
  const [alumnos,    setAlumnos]    = useState<AlumnoOpt[]>([])
  const [search,     setSearch]     = useState('')
  const [dropOpen,   setDropOpen]   = useState(false)
  const [selected,   setSelected]   = useState<AlumnoOpt | null>(null)
  const [materias,   setMaterias]   = useState<Materia[]>([])
  const [loading,    setLoading]    = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.get<{ id: number; nombre: string; username: string; role: string }[]>('/users/').then(data => {
      setAlumnos(data.filter(u => u.role === 'alumno'))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    function h(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  function selectAlumno(a: AlumnoOpt) {
    setSelected(a); setSearch(''); setDropOpen(false)
    setLoading(true)
    Promise.all([
      api.get<{ id: number; nombre: string; profesor_nombre?: string | null }[]>('/materias/'),
      api.get<{ materia_id: number; tipo: string; valor: number }[]>(`/puntajes/?user_id=${a.id}`),
    ]).then(([mats, pts]) => {
      const rows: Materia[] = mats.map(m => ({
        nombre: m.nombre,
        profesor: m.profesor_nombre || '—',
        parcial1: pts.find(p => p.materia_id === m.id && p.tipo === 'parcial1')?.valor ?? null,
        parcial2: pts.find(p => p.materia_id === m.id && p.tipo === 'parcial2')?.valor ?? null,
        tp:       pts.find(p => p.materia_id === m.id && p.tipo === 'practico')?.valor  ?? null,
        final:    pts.find(p => p.materia_id === m.id && p.tipo === 'final')?.valor     ?? null,
      })).filter(m => m.parcial1 !== null || m.parcial2 !== null || m.tp !== null || m.final !== null)
      setMaterias(rows)
    }).finally(() => setLoading(false))
  }

  const filtered = alumnos.filter(a =>
    (a.nombre || a.username).toLowerCase().includes(search.toLowerCase()) ||
    a.username.toLowerCase().includes(search.toLowerCase())
  )

  const promGeneral = (() => {
    const ps = materias.map(calcProm).filter((p): p is number => p !== null)
    return ps.length ? Math.round((ps.reduce((a, b) => a + b, 0) / ps.length) * 10) / 10 : 0
  })()

  function notaClr(n: number | null) {
    if (n === null) return '#3a4a5a'
    return n >= 7 ? '#22c55e' : n >= 5 ? '#f59e0b' : '#ef4444'
  }
  function promStyle(p: number | null) {
    if (p === null) return { color: '#506070', bg: '#1e2d3d', border: '#1e2d3d' }
    return p >= 7 ? { color: '#22c55e', bg: '#22c55e12', border: '#22c55e30' }
         : p >= 5 ? { color: '#f59e0b', bg: '#f59e0b12', border: '#f59e0b30' }
         :          { color: '#ef4444', bg: '#ef444412', border: '#ef444430' }
  }

  return (
    <>
      <style>{css}</style>
      <style>{cssAdmin}</style>
      <div className="adm-root">
        <header className="adm-topbar">
          <h1>Puntajes — Vista Administrador</h1>
        </header>
        <div className="adm-content">

          {/* Selector alumno */}
          <div className="adm-sel-bar">
            <div className="adm-sel-group">
              <label>Alumno</label>
              {selected ? (
                <div className="adm-chip">
                  <div className="adm-av">{(selected.nombre || selected.username)[0].toUpperCase()}</div>
                  <span>{selected.nombre || selected.username}</span>
                  <button className="adm-chip-clear" onClick={() => { setSelected(null); setMaterias([]) }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="adm-sel-wrap" ref={dropRef}>
                  <input
                    className="adm-search"
                    placeholder="Buscar alumno..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setDropOpen(true) }}
                    onFocus={() => setDropOpen(true)}
                  />
                  {dropOpen && filtered.length > 0 && (
                    <div className="adm-drop">
                      {filtered.map(a => (
                        <div key={a.id} className="adm-opt" onClick={() => selectAlumno(a)}>
                          <div className="adm-av">{(a.nombre || a.username)[0].toUpperCase()}</div>
                          <div>
                            <div className="adm-opt-name">{a.nombre || a.username}</div>
                            <div className="adm-opt-user">@{a.username}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Empty state */}
          {!selected && (
            <div className="adm-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <h3>Selecciona un alumno</h3>
              <p>Elige un alumno del selector para ver sus puntajes</p>
            </div>
          )}

          {selected && loading && (
            <div className="adm-empty"><p style={{color:'#506070'}}>Cargando puntajes...</p></div>
          )}

          {selected && !loading && materias.length === 0 && (
            <div className="adm-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <h3>Sin puntajes registrados</h3>
              <p>Este alumno no tiene notas cargadas aún</p>
            </div>
          )}

          {selected && !loading && materias.length > 0 && (
            <>
              {/* KPIs */}
              <div className="adm-kpi-row">
                <div className="adm-kpi">
                  <div className="adm-kpi-lbl">Materias</div>
                  <div className="adm-kpi-val" style={{color:'#00b4d8'}}>{materias.length}</div>
                </div>
                <div className="adm-kpi">
                  <div className="adm-kpi-lbl">Promedio</div>
                  <div className="adm-kpi-val" style={{color: promGeneral >= 7 ? '#22c55e' : promGeneral >= 5 ? '#f59e0b' : '#ef4444'}}>{promGeneral}</div>
                </div>
                <div className="adm-kpi">
                  <div className="adm-kpi-lbl">Mejor nota</div>
                  <div className="adm-kpi-val" style={{color:'#22c55e'}}>
                    {(() => { const ns = materias.flatMap(m => [m.parcial1,m.parcial2,m.tp,m.final]).filter((n): n is number => n !== null); return ns.length ? Math.max(...ns) : '—' })()}
                  </div>
                </div>
                <div className="adm-kpi">
                  <div className="adm-kpi-lbl">Finales pendientes</div>
                  <div className="adm-kpi-val" style={{color:'#f59e0b'}}>{materias.filter(m => m.final === null).length}</div>
                </div>
              </div>

              {/* Tabla desktop */}
              <div className="adm-tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{textAlign:'left'}}>Materia</th>
                      <th>Parc. 1</th><th>Parc. 2</th><th>TP</th><th>Final</th><th>Promedio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materias.map(m => {
                      const p = calcProm(m)
                      const ps = promStyle(p)
                      return (
                        <tr key={m.nombre}>
                          <td>
                            <div className="adm-m-name">{m.nombre}</div>
                            <div className="adm-m-prof">{m.profesor}</div>
                          </td>
                          {[m.parcial1, m.parcial2, m.tp, m.final].map((n, i) => (
                            <td key={i}><span className="adm-nota" style={{color: notaClr(n)}}>{n ?? '—'}</span></td>
                          ))}
                          <td>
                            <span className="adm-prom" style={{color:ps.color, background:ps.bg, borderColor:ps.border}}>{p ?? '—'}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Cards mobile */}
              <div className="adm-cards">
                {materias.map(m => {
                  const p = calcProm(m)
                  const ps = promStyle(p)
                  return (
                    <div key={m.nombre} className="adm-card">
                      <div className="adm-card-head">
                        <div>
                          <div className="adm-m-name">{m.nombre}</div>
                          <div className="adm-m-prof">{m.profesor}</div>
                        </div>
                        <span className="adm-prom" style={{color:ps.color, background:ps.bg, borderColor:ps.border}}>{p ?? '—'}</span>
                      </div>
                      <div className="adm-card-notas">
                        {[m.parcial1, m.parcial2, m.tp, m.final].map((n, i) => (
                          <div key={i} className="adm-nota-cell">
                            <div className="adm-nota-lbl">{['P1','P2','TP','FN'][i]}</div>
                            <div className="adm-nota-num" style={{color: notaClr(n)}}>{n ?? '—'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

function AlumnoAdminView() {
  const [semestre, setSemestre] = useState(semestres[0])
  const [dropOpen, setDropOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [materias, setMaterias] = useState<Materia[]>([])
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const token = sessionStorage.getItem('token')
    const user = token ? decodeToken(token) : null
    if (!user) return
    const isAlumno = user.role === 'alumno'
    const uid = Number(user.user_id)
    const puntajesUrl = isAlumno && !isNaN(uid) ? `/puntajes/?user_id=${uid}` : '/puntajes/'
    Promise.all([
      api.get<{ id: number; nombre: string; profesor_id: number; profesor_nombre?: string | null }[]>('/materias/').catch(() => []),
      api.get<{ id: number; user_id: number; materia_id: number; tipo: string; valor: number }[]>(puntajesUrl).catch(() => []),
    ]).then(([materiasData, puntajesData]) => {
      const grouped: Materia[] = materiasData.map(m => {
        const pts = puntajesData.filter(p => p.materia_id === m.id)
        return {
          nombre: m.nombre,
          profesor: m.profesor_nombre || (m.profesor_id ? `Prof. #${m.profesor_id}` : '—'),
          parcial1: pts.find(p => p.tipo === 'parcial1')?.valor ?? null,
          parcial2: pts.find(p => p.tipo === 'parcial2')?.valor ?? null,
          tp: pts.find(p => p.tipo === 'practico')?.valor ?? null,
          final: pts.find(p => p.tipo === 'final')?.valor ?? null,
        }
      })
      if (grouped.length > 0) setMaterias(grouped)
    }).catch(() => {})
  }, [])

  const materiasActuales = materias.length > 0 ? materias : (datosPorSemestre[semestre] ?? [])
  const filtered = materiasActuales.filter(m => m.nombre.toLowerCase().includes(search.toLowerCase()))
  const promGeneral = (() => {
    const ps = materiasActuales.map(calcProm).filter(p => p !== null) as number[]
    if (!ps.length) return 0
    return Math.round((ps.reduce((a, b) => a + b, 0) / ps.length) * 10) / 10
  })()

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
          <div className="kpi-row">
            <div className="kpi">
              <div className="kpi-lbl">Materias</div>
              <div className="kpi-val" style={{ color: '#00b4d8' }}>{materiasActuales.length}</div>
            </div>
            <div className="kpi">
              <div className="kpi-lbl">Promedio general</div>
              <div className="kpi-val" style={{ color: '#22c55e' }}>{promGeneral}</div>
            </div>
            <div className="kpi">
              <div className="kpi-lbl">Mejor nota</div>
              <div className="kpi-val" style={{ color: '#22c55e' }}>
                {(() => { const ns = materiasActuales.flatMap(m => [m.parcial1,m.parcial2,m.tp,m.final]).filter(n=>n!==null) as number[]; return ns.length ? Math.max(...ns) : '—' })()}
              </div>
            </div>
            <div className="kpi">
              <div className="kpi-lbl">Finales pendientes</div>
              <div className="kpi-val" style={{ color: '#f59e0b' }}>{materiasActuales.filter(m => m.final === null).length}</div>
            </div>
          </div>

          <div className="toolbar">
            <div className="toolbar-left">
              {materiasActuales.length} materias · Promedio: <strong>{promGeneral}</strong>
            </div>
            <div className="toolbar-right">
              <div className="search-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input placeholder="Buscar materia..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="custom-select-wrap" ref={dropRef}>
                <button className={`custom-select-btn${dropOpen ? ' open' : ''}`} onClick={() => setDropOpen(!dropOpen)}>
                  <span>{semestre}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                </button>
                {dropOpen && (
                  <div className="custom-select-dropdown">
                    {semestres.map(s => (
                      <button key={s} className={`custom-select-opt${s===semestre?' selected':''}`}
                        onClick={() => { setSemestre(s); setDropOpen(false); setSearch('') }}>
                        <span>{s}</span>
                        {s === semestre && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn-export" onClick={() => exportarCSV(filtered, semestre)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Exportar CSV
                </button>
                <button className="btn-export" onClick={() => exportarPDF(filtered, semestre, promGeneral)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
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
                  <th className="c">Parc. 1</th><th className="c">Parc. 2</th>
                  <th className="c">TP</th><th className="c">Final</th>
                  <th className="c">Promedio</th><th>Progreso</th><th className="c">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => {
                  const p = calcProm(m)
                  const chip = chipStyle(p)
                  const est = estadoChip(m)
                  const prog = [m.parcial1,m.parcial2,m.tp,m.final].filter(n=>n!==null).length
                  return (
                    <tr key={m.nombre}>
                      <td>
                        <div className="mat-name">{m.nombre}</div>
                        <div className="mat-prof">{m.profesor}</div>
                      </td>
                      {[m.parcial1,m.parcial2,m.tp,m.final].map((n,i) => (
                        <td key={i} className="c"><span className="nota" style={{color:notaColor(n)}}>{n??'—'}</span></td>
                      ))}
                      <td className="c">
                        <span className="prom-chip" style={{color:chip.color,background:chip.bg,borderColor:chip.border}}>{p??'—'}</span>
                      </td>
                      <td style={{minWidth:100}}>
                        <div className="prog-track">
                          <div className="prog-fill" style={{width:`${(prog/4)*100}%`,background:prog>=3?'#22c55e':prog>=2?'#00b4d8':'#f59e0b'}}/>
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
              const p = calcProm(m)
              const chip = chipStyle(p)
              const est = estadoChip(m)
              const prog = [m.parcial1,m.parcial2,m.tp,m.final].filter(n=>n!==null).length
              return (
                <div key={m.nombre} className="mat-card">
                  <div className="mat-card-head">
                    <div>
                      <div className="mat-name">{m.nombre}</div>
                      <div className="mat-prof">{m.profesor}</div>
                    </div>
                    <span className="estado-chip" style={{color:est.color,background:est.bg}}>{est.label}</span>
                  </div>
                  <div className="mat-card-notas">
                    {[m.parcial1,m.parcial2,m.tp,m.final].map((n,i) => (
                      <div key={i} className="nota-cell">
                        <div className="nota-lbl">{['P1','P2','TP','FN'][i]}</div>
                        <div className="nota-num" style={{color:notaColor(n)}}>{n??'—'}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mat-card-footer">
                    <span className="prom-chip" style={{color:chip.color,background:chip.bg,borderColor:chip.border}}>{p??'—'}</span>
                    <div>
                      <div className="prog-track">
                        <div className="prog-fill" style={{width:`${(prog/4)*100}%`,background:prog>=3?'#22c55e':prog>=2?'#00b4d8':'#f59e0b'}}/>
                      </div>
                      <div className="prog-lbl">{prog}/4 notas</div>
                    </div>
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
