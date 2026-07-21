import { useState, useRef, useEffect, useCallback } from 'react'
import { api, getCurrentUser, emitToast } from '../lib/api'

/* ═══ Compartido ════════════════════════════════════════════════ */

const css = `
  .exp-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:22px; }
  .exp-cards { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:14px; }
  .ciclo-bars { display:flex; gap:14px; align-items:flex-end; overflow-x:auto; padding:10px 4px 4px; }
  .ciclo-bar { flex:1; min-width:88px; text-align:center; cursor:default; }
  .ciclo-rect { border-radius:12px; background:var(--accent-muted); transition:all .2s; margin-bottom:8px; }
  .ciclo-bar.actual .ciclo-rect { background:var(--accent); box-shadow:0 6px 24px var(--accent-hover); }
  .mat-card { background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:var(--radius); padding:16px 18px; }
  .mat-card.warn { border-color:rgba(245,158,11,.35); }
  .desglose-row { display:flex; justify-content:space-between; font-size:12px; padding:5px 0; color:var(--text-secondary); }
  .desglose-row b { color:var(--text-primary); font-family:var(--font-mono); }
  .pro-tabs { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px; }
  .pro-filtros { display:flex; gap:16px; align-items:center; padding:12px 18px; border-bottom:1px solid var(--border-subtle); flex-wrap:wrap; }
  .pro-filtro { display:flex; align-items:center; gap:6px; font-size:12px; color:var(--text-secondary); }
  .pro-filtro span.dot { width:7px; height:7px; border-radius:50%; display:inline-block; }
  .nota-input {
    width:60px; padding:6px 8px; text-align:center;
    background:var(--bg-input); border:1px solid var(--border-light);
    border-radius:8px; color:var(--text-primary); font-size:13px; font-weight:700;
    font-family:var(--font-mono); outline:none; transition:border-color .15s;
  }
  .nota-input:focus { border-color:var(--accent); }
  .nota-input:disabled { opacity:.4; cursor:not-allowed; }
  .prom-float {
    position:fixed; bottom:26px; right:26px; z-index:50;
    background:var(--bg-elevated); border:1px solid var(--accent-hover);
    border-radius:14px; padding:12px 18px; display:flex; align-items:center; gap:12px;
    box-shadow:0 12px 32px rgba(0,0,0,.5);
  }
  .pagi { display:flex; align-items:center; justify-content:space-between; padding:12px 18px; flex-wrap:wrap; gap:8px; }
  .pagi-btn {
    min-width:30px; height:30px; border-radius:8px; border:1px solid var(--border-subtle);
    background:var(--bg-surface); color:var(--text-secondary); font-family:var(--font-mono);
    font-size:12px; cursor:pointer;
  }
  .pagi-btn.active { background:var(--accent); color:#fff; border-color:var(--accent); }
  .pagi-btn:disabled { opacity:.4; cursor:not-allowed; }
  @media(max-width:900px){ .exp-stats { grid-template-columns:1fr; } }
  .stat-card {
    background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:var(--radius);
    padding:14px 20px; min-width:120px; border-left:4px solid var(--accent);
  }
  .stat-value { display:block; font-family:var(--font-mono); font-size:22px; font-weight:800; color:var(--accent-bright); }
  .stat-label { display:block; font-size:11.5px; font-weight:600; color:var(--text-secondary); margin-top:2px; text-transform:uppercase; letter-spacing:.04em; }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
`

type Puntaje = { id: number; user_id: number; materia_id: number; tipo: string; valor: number }
type MateriaApi = { id: number; nombre: string; profesor_nombre?: string | null; profesor_id?: number | null }

function notaColor(n: number | null): string {
  if (n === null) return 'var(--text-muted)'
  if (n >= 9) return 'var(--accent-bright)'
  if (n >= 7.5) return 'var(--success)'
  if (n >= 6) return 'var(--warning)'
  return 'var(--danger)'
}

function estadoDe(p: number | null): { label: string; bg: string; color: string } {
  if (p === null) return { label: 'SIN NOTAS', bg: 'rgba(148,163,184,0.12)', color: 'var(--text-secondary)' }
  if (p >= 9) return { label: 'PROMOCIONADO', bg: 'var(--accent-muted)', color: 'var(--accent-bright)' }
  if (p >= 6) return { label: 'APROBADO', bg: 'var(--success-subtle)', color: 'var(--success)' }
  return { label: 'REPROBADO', bg: 'var(--danger-subtle)', color: 'var(--danger)' }
}

/* ═══ ALUMNO — Expediente Académico ═════════════════════════════ */

type MateriaExp = {
  nombre: string; codigo: string; profesor: string
  p1: number | null; p2: number | null; tp: number | null; final: number | null
}

const ciclos = [
  { nombre: 'Ciclo I-22', altura: 46 }, { nombre: 'Ciclo II-22', altura: 60 },
  { nombre: 'Ciclo I-23', altura: 68 }, { nombre: 'Ciclo II-23', altura: 84, actual: true },
  { nombre: 'Ciclo I-24', altura: 30, futuro: true },
]

function promDe(m: MateriaExp): number | null {
  const ns = [m.p1, m.p2, m.tp, m.final].filter((n): n is number => n !== null)
  if (!ns.length) return null
  return Math.round((ns.reduce((a, b) => a + b, 0) / ns.length) * 10) / 10
}

function AlumnoView({ userId }: { userId: number }) {
  const [materias, setMaterias] = useState<MateriaExp[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<MateriaApi[]>('/materias/').catch(() => [] as MateriaApi[]),
      api.get<Puntaje[]>(`/puntajes/?user_id=${userId}`).catch(() => [] as Puntaje[]),
    ]).then(([mats, pts]) => {
      const rows: MateriaExp[] = mats.map(m => {
        const de = (tipo: string) => pts.find(p => p.materia_id === m.id && p.tipo === tipo)?.valor ?? null
        return {
          nombre: m.nombre,
          codigo: `MAT-${String(m.id).padStart(3, '0')}`,
          profesor: m.profesor_nombre || '—',
          p1: de('parcial1'), p2: de('parcial2'), tp: de('practico'), final: de('final'),
        }
      }).filter(m => m.p1 !== null || m.p2 !== null || m.tp !== null || m.final !== null)
      setMaterias(rows)
    }).finally(() => setLoading(false))
  }, [userId])

  const proms = materias.map(promDe).filter((p): p is number => p !== null)
  const promGeneral = proms.length ? Math.round(proms.reduce((a, b) => a + b, 0) / proms.length * 100) / 100 : 0
  const aprobadas = materias.filter(m => (promDe(m) ?? 0) >= 6).length
  const pctAprob = materias.length ? Math.round((aprobadas / materias.length) * 100) : 0
  const ringC = 2 * Math.PI * 34

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="mono-label" style={{ color: 'var(--accent-bright)', marginBottom: 4 }}>Expediente Académico</div>
          <h1 className="page-title">Mis Calificaciones</h1>
          <p className="page-subtitle">Semestre {new Date().getMonth() < 6 ? 1 : 2} · {new Date().getFullYear()} • Actualizado recientemente</p>
        </div>
        <button className="btn-primary" style={{ background: 'var(--accent-muted)', color: 'var(--accent-bright)' }}>
          <i className="ti ti-download" /> Reporte Académico
        </button>
      </div>

      {/* Stats */}
      <div className="exp-stats">
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="mono-label">Promedio General</span>
            <span className="badge" style={{ background: 'var(--success-subtle)', color: 'var(--success)' }}>+0.3 vs ciclo anterior</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <span className="kpi-value" style={{ fontSize: 36 }}>{promGeneral.toFixed(2)}<span className="kpi-unit"> / 10</span></span>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 34 }}>
              {[12, 16, 14, 20, 26, 34].map((h, i) => (
                <span key={i} style={{ width: 12, height: h, borderRadius: 4, background: i === 5 ? 'var(--accent)' : 'var(--accent-muted)' }} />
              ))}
            </div>
          </div>
        </div>
        <div className="kpi-card" style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
            <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="40" cy="40" r="34" stroke="var(--bg-elevated)" strokeWidth="7" fill="none" />
              <circle cx="40" cy="40" r="34" stroke="var(--accent)" strokeWidth="7" fill="none"
                strokeDasharray={ringC} strokeDashoffset={ringC * (1 - pctAprob / 100)} strokeLinecap="round" />
            </svg>
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 800 }}>{pctAprob}%</span>
          </div>
          <div>
            <div className="mono-label" style={{ marginBottom: 4 }}>Aprobación</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{aprobadas} de {materias.length} Materias</div>
            {pctAprob >= 80 && <span className="badge" style={{ background: 'var(--success-subtle)', color: 'var(--success)', marginTop: 6 }}>Sobresaliente</span>}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="mono-label">Créditos Acumulados</span>
            <i className="ti ti-certificate" style={{ color: 'var(--accent)', fontSize: 15 }} />
          </div>
          <span className="kpi-value" style={{ fontSize: 34 }}>164<span className="kpi-unit"> / 192</span></span>
          <div className="progress-track" style={{ marginTop: 12 }}><div className="progress-fill" style={{ width: `${164 / 192 * 100}%` }} /></div>
        </div>
      </div>

      {/* Proyección Semestral */}
      <div className="card" style={{ marginBottom: 22 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Proyección Semestral</h3>
        <div className="ciclo-bars">
          {ciclos.map(c => (
            <div key={c.nombre} className={`ciclo-bar${c.actual ? ' actual' : ''}`} style={{ opacity: c.futuro ? 0.35 : 1 }}>
              {c.actual && <div className="mono-label" style={{ color: 'var(--accent-bright)', marginBottom: 4 }}>{promGeneral || '8.9'}</div>}
              <div className="ciclo-rect" style={{ height: c.altura }} />
              <div className="mono-label" style={{ color: c.actual ? 'var(--text-primary)' : undefined }}>{c.nombre}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Detalle de Materias */}
      <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 12 }}>Detalle de Materias</h3>
      {loading ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Cargando expediente…</div>
      ) : materias.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 46 }}>
          <i className="ti ti-file-off" style={{ fontSize: 36, color: 'var(--text-muted)' }} />
          <p style={{ marginTop: 10, color: 'var(--text-secondary)', fontSize: 13 }}>Aún no tenés calificaciones cargadas.</p>
        </div>
      ) : (
        <div className="exp-cards">
          {materias.map(m => {
            const p = promDe(m)
            const pendienteP2 = m.p1 !== null && m.p2 === null
            return (
              <div key={m.nombre} className={`mat-card${pendienteP2 ? ' warn' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 800, paddingRight: 8 }}>{m.nombre}</div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 800, color: notaColor(p) }}>{p ?? '—'}</span>
                </div>
                <div className="mono-label" style={{ marginBottom: 10 }}>{m.codigo} • {m.profesor}</div>
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8, marginBottom: 10 }}>
                  <div className="desglose-row"><span>Examen Parcial 1 (30%)</span><b>{m.p1 ?? '—'}</b></div>
                  <div className="desglose-row">
                    <span style={{ color: pendienteP2 ? 'var(--warning)' : undefined }}>Examen Parcial 2 {pendienteP2 && '(Pendiente)'}</span>
                    <b>{m.p2 ?? '—'}</b>
                  </div>
                  <div className="desglose-row"><span>Trabajos Prácticos (40%)</span><b>{m.tp ?? '—'}</b></div>
                  <div className="desglose-row"><span>Examen Final (30%)</span><b>{m.final ?? '—'}</b></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="badge" style={{ background: estadoDe(p).bg, color: estadoDe(p).color }}>{estadoDe(p).label}</span>
                  <button style={{ background: 'none', border: 'none', color: 'var(--accent-bright)', fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700, cursor: 'pointer' }}>
                    Ver Feedback →
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

/* ═══ PROFESOR — Gestión de Calificaciones ══════════════════════ */

type MateriaSimple = { id: number; nombre: string }
type AlumnoRow = {
  alumno_id: number
  nombre: string
  username: string
  ids: { parcial1: number; parcial2: number; tp: number; final: number }
  vals: { parcial1: string; parcial2: string; tp: string; final: string }
  saving: boolean
}

function proCalcProm(v: AlumnoRow['vals']): number | null {
  const ns = [v.parcial1, v.parcial2, v.tp, v.final].map(s => parseFloat(s)).filter(n => !isNaN(n))
  if (!ns.length) return null
  return Math.round((ns.reduce((a, b) => a + b, 0) / ns.length) * 10) / 10
}

const PAGE_SIZE = 8

function ProfesorView({ profesorId }: { profesorId: number }) {
  const [materias, setMaterias] = useState<MateriaSimple[]>([])
  const [selectedMateria, setSelectedMateria] = useState<MateriaSimple | null>(null)
  const [alumnos, setAlumnos] = useState<AlumnoRow[]>([])
  const [loadingMaterias, setLoadingMaterias] = useState(true)
  const [loadingAlumnos, setLoadingAlumnos] = useState(false)
  const [page, setPage] = useState(1)

  const fetchAlumnos = useCallback(async (materia: MateriaSimple) => {
    setLoadingAlumnos(true)
    setPage(1)
    try {
      const [alumnosData, puntajesData] = await Promise.all([
        api.get<{ alumno_id: number; nombre: string; username: string }[]>(`/inscripciones/materia/${materia.id}`).catch(() => []),
        api.get<Puntaje[]>(`/puntajes/?materia_id=${materia.id}`).catch(() => []),
      ])
      const rows: AlumnoRow[] = alumnosData.map(a => {
        const pts = puntajesData.filter(p => p.user_id === a.alumno_id)
        const find = (tipo: string) => pts.find(p => p.tipo === tipo)
        const fid = (tipo: string) => find(tipo)?.id ?? 0
        const fval = (tipo: string) => { const v = find(tipo)?.valor; return v !== undefined ? String(v) : '' }
        return {
          alumno_id: a.alumno_id, nombre: a.nombre, username: a.username,
          ids: { parcial1: fid('parcial1'), parcial2: fid('parcial2'), tp: fid('practico'), final: fid('final') },
          vals: { parcial1: fval('parcial1'), parcial2: fval('parcial2'), tp: fval('practico'), final: fval('final') },
          saving: false,
        }
      })
      setAlumnos(rows)
    } finally { setLoadingAlumnos(false) }
  }, [])

  useEffect(() => {
    api.get<MateriaSimple[]>(`/materias/?profesor_id=${profesorId}`)
      .then(data => {
        setMaterias(data)
        if (data.length > 0) {
          setSelectedMateria(data[0])
          fetchAlumnos(data[0])
        }
      })
      .catch(() => {})
      .finally(() => setLoadingMaterias(false))
  }, [profesorId, fetchAlumnos])



  function updateVal(alumno_id: number, campo: keyof AlumnoRow['vals'], value: string) {
    if (value !== '' && !/^\d{0,2}(\.\d{0,1})?$/.test(value)) return
    const num = parseFloat(value)
    if (value !== '' && !isNaN(num) && (num < 0 || num > 10)) return
    setAlumnos(prev => prev.map(a => a.alumno_id === alumno_id ? { ...a, vals: { ...a.vals, [campo]: value } } : a))
  }

  async function saveRow(alumno_id: number) {
    const row = alumnos.find(a => a.alumno_id === alumno_id)
    if (!row || !selectedMateria) return
    setAlumnos(prev => prev.map(a => a.alumno_id === alumno_id ? { ...a, saving: true } : a))
    const tiposMap: { campo: keyof AlumnoRow['vals']; tipo: string }[] = [
      { campo: 'parcial1', tipo: 'parcial1' }, { campo: 'parcial2', tipo: 'parcial2' },
      { campo: 'tp', tipo: 'practico' }, { campo: 'final', tipo: 'final' },
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
      emitToast('Error al guardar notas', 'error')
      setAlumnos(prev => prev.map(a => a.alumno_id === alumno_id ? { ...a, saving: false } : a))
    }
  }

  function exportCSV() {
    const rows = [
      ['Legajo', 'Estudiante', 'Parcial 1', 'Parcial 2', 'Trabajos', 'Final', 'Estado'],
      ...alumnos.map(a => {
        const p = proCalcProm(a.vals)
        return [`#${a.alumno_id}`, a.nombre, a.vals.parcial1 || '-', a.vals.parcial2 || '-', a.vals.tp || '-', a.vals.final || '-', estadoDe(p).label]
      }),
    ]
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `calificaciones_${selectedMateria?.nombre ?? 'materia'}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
    emitToast('CSV exportado')
  }

  const proms = alumnos.map(a => proCalcProm(a.vals)).filter((p): p is number => p !== null)
  const promGeneral = proms.length ? Math.round(proms.reduce((a, b) => a + b, 0) / proms.length * 10) / 10 : 0
  const nAprob = alumnos.filter(a => { const p = proCalcProm(a.vals); return p !== null && p >= 6 && p < 9 }).length
  const nReprob = alumnos.filter(a => { const p = proCalcProm(a.vals); return p !== null && p < 6 }).length
  const nPromo = alumnos.filter(a => { const p = proCalcProm(a.vals); return p !== null && p >= 9 }).length
  const totalPages = Math.max(1, Math.ceil(alumnos.length / PAGE_SIZE))
  const pageRows = alumnos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Gestión de Calificaciones</h1>
          <p className="page-subtitle">Ciclo Lectivo: {new Date().getMonth() < 6 ? 'Primer' : 'Segundo'} Cuatrimestre {new Date().getFullYear()}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-ghost" onClick={exportCSV}><i className="ti ti-file-spreadsheet" /> Exportar CSV</button>
          <button className="btn-primary"><i className="ti ti-file-type-pdf" /> Generar Acta PDF</button>
        </div>
      </div>

      {loadingMaterias ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Cargando materias…</div>
      ) : materias.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 46 }}>
          <i className="ti ti-books-off" style={{ fontSize: 36, color: 'var(--text-muted)' }} />
          <p style={{ marginTop: 10, color: 'var(--text-secondary)', fontSize: 13 }}>El administrador aún no te asignó materias.</p>
        </div>
      ) : (
        <>
          <div className="pro-tabs">
            {materias.map(m => (
              <button key={m.id} className={`pill-tab${selectedMateria?.id === m.id ? ' active' : ''}`} onClick={() => { setSelectedMateria(m); fetchAlumnos(m) }}>
                {m.nombre}
              </button>
            ))}
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="pro-filtros">
              <span className="pro-filtro"><span className="dot" style={{ background: 'var(--success)' }} /> {nAprob} Aprobados</span>
              <span className="pro-filtro"><span className="dot" style={{ background: 'var(--danger)' }} /> {nReprob} Reprobados</span>
              <span className="pro-filtro"><span className="dot" style={{ background: 'var(--info)' }} /> {nPromo} Promocionados</span>
            </div>

            {loadingAlumnos ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Cargando alumnos…</div>
            ) : alumnos.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>Sin alumnos inscriptos en esta materia.</div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table className="table-uca">
                    <thead>
                      <tr>
                        <th>Legajo</th><th>Estudiante</th>
                        <th style={{ textAlign: 'center' }}>Parcial 1</th>
                        <th style={{ textAlign: 'center' }}>Parcial 2</th>
                        <th style={{ textAlign: 'center' }}>Trabajos</th>
                        <th style={{ textAlign: 'center' }}>Final</th>
                        <th style={{ textAlign: 'center' }}>Estado</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map(a => {
                        const p = proCalcProm(a.vals)
                        const est = estadoDe(p)
                        return (
                          <tr key={a.alumno_id}>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--accent-bright)' }}>#{String(a.alumno_id).padStart(5, '0')}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span className="avatar-initials" style={{ width: 28, height: 28, fontSize: 10 }}>
                                  {(a.nombre || a.username).slice(0, 2)}
                                </span>
                                <span style={{ fontWeight: 700, fontSize: 13 }}>{a.nombre || `@${a.username}`}</span>
                              </div>
                            </td>
                            {(['parcial1', 'parcial2', 'tp', 'final'] as const).map(campo => (
                              <td key={campo} style={{ textAlign: 'center' }}>
                                <input className="nota-input" type="text" inputMode="decimal" placeholder="—"
                                  value={a.vals[campo]} disabled={a.saving}
                                  onChange={e => updateVal(a.alumno_id, campo, e.target.value)} />
                              </td>
                            ))}
                            <td style={{ textAlign: 'center' }}>
                              <span className="badge" style={{ background: est.bg, color: est.color }}>{est.label}</span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button className="btn-ghost" style={{ padding: '5px 12px', fontSize: 11 }} disabled={a.saving} onClick={() => saveRow(a.alumno_id)}>
                                {a.saving ? '…' : <><i className="ti ti-check" /> Guardar</>}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="pagi">
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Mostrando {pageRows.length} de {alumnos.length} estudiantes
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="pagi-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                      <button key={n} className={`pagi-btn${n === page ? ' active' : ''}`} onClick={() => setPage(n)}>{n}</button>
                    ))}
                    <button className="pagi-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
                  </div>
                </div>
              </>
            )}
          </div>

          {alumnos.length > 0 && (
            <div className="prom-float">
              <span style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--accent-muted)', color: 'var(--accent-bright)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-chart-bar" />
              </span>
              <div>
                <div className="mono-label">Promedio General</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 800 }}>{promGeneral || '—'}</div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}

/* ═══ ADMIN — Gestión de Calificaciones ═════════════════════════ */

type AlumnoOpt = { id: number; nombre: string; username: string }
type MateriaAdm = { nombre: string; anio?: number | null; semestre?: number | null; codigo?: string | null; profesor: string; p1: number | null; p2: number | null; tp: number | null; final: number | null }
type CarreraOpt = { id: number; nombre: string }

const POLL_MS = 30000

function Skeleton({ width = '100%', height }: { width?: string | number; height: number }) {
  return (
    <div style={{
      width, height, borderRadius: 8,
      background: 'rgba(255,255,255,0.06)',
      animation: 'shimmer 1.4s ease-in-out infinite',
      backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 100%)',
      backgroundSize: '200% 100%',
    }} />
  )
}

function AdminView() {
  const [alumnos, setAlumnos] = useState<AlumnoOpt[]>([])
  const [carreras, setCarreras] = useState<CarreraOpt[]>([])
  const [carSelId, setCarSelId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [dropOpen, setDropOpen] = useState(false)
  const [selected, setSelected] = useState<AlumnoOpt | null>(null)
  const [materias, setMaterias] = useState<MateriaAdm[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [globalStats, setGlobalStats] = useState<{ alumnos: number; materias: number }>({ alumnos: 0, materias: 0 })
  const dropRef = useRef<HTMLDivElement>(null)

  async function fetchGlobalStats() {
    try {
      const [s, users] = await Promise.all([
        api.get<{ total_materias?: number }>('/materias/stats').catch(() => ({ total_materias: 0 })),
        api.get<(AlumnoOpt & { role: string })[]>('/users/').catch(() => []),
      ])
      setGlobalStats({
        materias: s.total_materias ?? 0,
        alumnos: users.filter(u => u.role === 'alumno').length,
      })
    } catch { /* ignore */ }
  }

  useEffect(() => {
    Promise.all([
      api.get<(AlumnoOpt & { role: string })[]>('/users/').then(d => d.filter(u => u.role === 'alumno')).catch(() => []),
      api.get<CarreraOpt[]>('/carreras/').catch(() => []),
      fetchGlobalStats(),
    ]).then(([al, cars]) => {
      setAlumnos(al)
      setCarreras(cars)
    })
  }, [])

  useEffect(() => {
    const timer = setInterval(fetchGlobalStats, POLL_MS)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    function h(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  async function selectAlumno(a: AlumnoOpt) {
    setSelected(a); setSearch(''); setDropOpen(false); setLoading(true)
    try {
      const [mats, pts] = await Promise.all([
        api.get<(MateriaApi & { anio?: number | null; semestre?: number | null; codigo?: string | null })[]>('/materias/'),
        api.get<Puntaje[]>(`/puntajes/?user_id=${a.id}`),
      ])
      const rows: MateriaAdm[] = mats.map(m => {
        const de = (tipo: string) => pts.find(p => p.materia_id === m.id && p.tipo === tipo)?.valor ?? null
        return {
          nombre: m.nombre, codigo: m.codigo, anio: m.anio, semestre: m.semestre,
          profesor: m.profesor_nombre || '—',
          p1: de('parcial1'), p2: de('parcial2'), tp: de('practico'), final: de('final'),
        }
      }).filter(m => m.p1 !== null || m.p2 !== null || m.tp !== null || m.final !== null)
      setMaterias(rows)
      setLastUpdate(new Date())
    } catch { /* ignore */ }
    setLoading(false)
  }

  async function handleRefresh() {
    if (!selected) return
    setRefreshing(true)
    await selectAlumno(selected)
    setRefreshing(false)
  }

  const filtered = search
    ? alumnos.filter(a =>
        (a.nombre || a.username).toLowerCase().includes(search.toLowerCase()) ||
        a.username.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 12)
    : []

  const calc = (m: MateriaAdm) => {
    const ns = [m.p1, m.p2, m.tp, m.final].filter((n): n is number => n !== null)
    return ns.length ? Math.round(ns.reduce((a, b) => a + b, 0) / ns.length * 10) / 10 : null
  }

  const proms = materias.map(calc).filter((p): p is number => p !== null)
  const promGeneral = proms.length ? Math.round(proms.reduce((a, b) => a + b, 0) / proms.length * 100) / 100 : null
  const aprobadas = materias.filter(m => (calc(m) ?? 0) >= 6).length

  /* ── Agrupar por año → semestre ──────────────────────────── */
  const grupos = new Map<number, Map<number, MateriaAdm[]>>()
  for (const m of materias) {
    const anio = m.anio ?? 1
    const sem = m.semestre ?? 1
    if (!grupos.has(anio)) grupos.set(anio, new Map())
    const g = grupos.get(anio)!
    if (!g.has(sem)) g.set(sem, [])
    g.get(sem)!.push(m)
  }
  const anios = [...grupos.entries()].sort(([a], [b]) => a - b)

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Calificaciones — Administrador</h1>
          <p className="page-subtitle">Consultá el expediente de cualquier alumno</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastUpdate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-muted)' }}>
              <i className="ti ti-refresh" style={{ fontSize: 14 }} />
              <span>{lastUpdate.toLocaleTimeString()}</span>
            </div>
          )}
          {selected && (
            <button className="btn-ghost" onClick={handleRefresh} disabled={refreshing} style={{ padding: '9px 14px', fontSize: 12 }}>
              <i className={`ti ti-refresh${refreshing ? ' ti-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* ── Stats siempre visibles ── */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="stat-card" style={{ borderLeftColor: 'var(--accent)' }}>
          <span className="stat-value">{selected ? materias.length : globalStats.materias}</span>
          <span className="stat-label">Materias</span>
        </div>
        <div className="stat-card" style={{ borderLeftColor: 'var(--info)' }}>
          <span className="stat-value" style={{ color: 'var(--info)' }}>
            {selected ? (promGeneral?.toFixed(2) ?? '—') : globalStats.alumnos}
          </span>
          <span className="stat-label">{selected ? 'Promedio General' : 'Alumnos'}</span>
        </div>
        {selected ? (
          <div className="stat-card" style={{ borderLeftColor: 'var(--success)' }}>
            <span className="stat-value" style={{ color: 'var(--success)' }}>{aprobadas}<span className="mono-label" style={{ fontSize: 12, color: 'var(--text-muted)' }}> /{materias.length}</span></span>
            <span className="stat-label">Aprobadas</span>
          </div>
        ) : (
          <div className="stat-card" style={{ borderLeftColor: 'var(--warning)' }}>
            <span className="stat-value" style={{ color: 'var(--warning)' }}>{carreras.length}</span>
            <span className="stat-label">Carreras</span>
          </div>
        )}
      </div>

      {/* ── Buscador + Carrera ── */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260, maxWidth: 380 }}>
          <div className="mono-label" style={{ marginBottom: 6 }}>Carrera (filtro)</div>
          <select className="input-uca" value={carSelId ?? ''}
            onChange={e => setCarSelId(Number(e.target.value) || null)}>
            <option value="">Todas las carreras</option>
            {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div style={{ flex: 2, minWidth: 260 }}>
          <div className="mono-label" style={{ marginBottom: 6 }}>Alumno</div>
          {selected ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'var(--accent-muted)', border: '1px solid var(--accent-hover)', borderRadius: 10, padding: '8px 14px' }}>
              <span className="avatar-initials" style={{ width: 24, height: 24, fontSize: 9 }}>{(selected.nombre || selected.username).slice(0, 2).toUpperCase()}</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{selected.nombre || selected.username}</span>
              <button onClick={() => { setSelected(null); setMaterias([]) }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
                <i className="ti ti-x" />
              </button>
            </div>
          ) : (
            <div ref={dropRef} style={{ position: 'relative' }}>
              <input className="input-uca" placeholder="Buscar alumno por nombre o usuario…" value={search}
                onChange={e => { setSearch(e.target.value); setDropOpen(true) }} onFocus={() => setDropOpen(true)} />
              {dropOpen && filtered.length > 0 && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 12, zIndex: 50, maxHeight: 230, overflowY: 'auto', boxShadow: '0 12px 32px rgba(0,0,0,.5)' }}>
                  {filtered.map(a => (
                    <div key={a.id} onClick={() => selectAlumno(a)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                      <span className="avatar-initials" style={{ width: 28, height: 28, fontSize: 10 }}>{(a.nombre || a.username).slice(0, 2).toUpperCase()}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{a.nombre || a.username}</div>
                        <div className="mono-label" style={{ fontSize: 9 }}>@{a.username}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {!selected ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <i className="ti ti-user-search" style={{ fontSize: 40, color: 'var(--text-muted)' }} />
          <p style={{ marginTop: 12, color: 'var(--text-secondary)', fontSize: 13 }}>Seleccioná un alumno para ver sus calificaciones.</p>
        </div>
      ) : loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2].map(i => (
            <div key={i} className="card" style={{ padding: '14px 18px' }}>
              <Skeleton width={140} height={16} />
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                {[1, 2, 3].map(j => <Skeleton key={j} width={60} height={40} />)}
              </div>
            </div>
          ))}
        </div>
      ) : materias.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 46 }}>
          <i className="ti ti-file-off" style={{ fontSize: 36, color: 'var(--text-muted)' }} />
          <p style={{ marginTop: 10, color: 'var(--text-secondary)', fontSize: 13 }}>Este alumno no tiene notas cargadas aún.</p>
        </div>
      ) : (
        <>
          {/* ── Pills por año ── */}
          {anios.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {anios.map(([anio]) => (
                <span key={anio} className="badge" style={{ background: 'var(--accent-muted)', color: 'var(--accent-bright)', fontSize: 11, padding: '5px 14px' }}>
                  <i className="ti ti-calendar-stats" style={{ marginRight: 4, fontSize: 11 }} />{anio}° Año
                </span>
              ))}
            </div>
          )}

          {/* ── Materias por semestre ── */}
          {anios.map(([anio, semMap]) => (
            <div key={anio} style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent-bright)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-calendar-stats" /> {anio}° Año
              </div>
              {[...semMap.entries()].sort(([a], [b]) => a - b).map(([sem, lista]) => (
                <div key={sem} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent-bright)' }} />
                    {sem}° Semestre · {lista.length} materia{lista.length !== 1 ? 's' : ''}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
                    {lista.map(m => {
                      const p = calc(m)
                      const est = estadoDe(p)
                      return (
                        <div key={m.nombre} className="card" style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.3 }}>{m.nombre}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 800, color: notaColor(p), flexShrink: 0, marginLeft: 8 }}>{p ?? '—'}</span>
                          </div>
                          <div className="mono-label" style={{ fontSize: 10, marginBottom: 8 }}>
                            {m.codigo || `MAT-${String(materias.indexOf(m) + 1).padStart(3, '0')}`} · {m.profesor}
                          </div>
                          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 6 }}>
                            <div className="desglose-row" style={{ fontSize: 11 }}><span>Parcial 1</span><b style={{ color: notaColor(m.p1) }}>{m.p1 ?? '—'}</b></div>
                            <div className="desglose-row" style={{ fontSize: 11 }}><span>Parcial 2</span><b style={{ color: notaColor(m.p2) }}>{m.p2 ?? '—'}</b></div>
                            <div className="desglose-row" style={{ fontSize: 11 }}><span>Trabajos</span><b style={{ color: notaColor(m.tp) }}>{m.tp ?? '—'}</b></div>
                            <div className="desglose-row" style={{ fontSize: 11 }}><span>Final</span><b style={{ color: notaColor(m.final) }}>{m.final ?? '—'}</b></div>
                          </div>
                          <div style={{ marginTop: 8 }}>
                            <span className="badge" style={{ background: est.bg, color: est.color, fontSize: 10 }}>{est.label}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </>
  )
}

/* ═══ Router por rol ════════════════════════════════════════════ */

export default function Puntajes() {
  const currentUser = getCurrentUser()

  return (
    <>
      <style>{css}</style>
      {currentUser?.role === 'profesor'
        ? <ProfesorView profesorId={Number(currentUser.user_id)} />
        : currentUser?.role === 'admin'
          ? <AdminView />
          : <AlumnoView userId={Number(currentUser?.user_id ?? 0)} />}
    </>
  )
}
