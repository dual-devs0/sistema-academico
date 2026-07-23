import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { api, getCurrentUser, emitToast } from '../lib/api'
import { obtenerCreditosAlumno, type CreditosAlumnoOut } from '../services/pensumService'

/* ═══ Compartido ════════════════════════════════════════════════ */

const css = `
  .exp-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:22px; }
  .exp-cards { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:14px; }
  .mat-card { background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:var(--radius); padding:16px 18px; }
  .mat-card.warn { border-color:rgba(245,158,11,.35); }
  .desglose-row { display:flex; justify-content:space-between; font-size:12px; padding:5px 0; color:var(--text-secondary); }
  .desglose-row b { color:var(--text-primary); font-family:var(--font-mono); }
  .pro-tabs { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px; }
  .pro-filtros { display:flex; gap:16px; align-items:center; padding:12px 18px; border-bottom:1px solid var(--border-subtle); flex-wrap:wrap; }
  .pro-filtro { display:flex; align-items:center; gap:6px; font-size:12px; color:var(--text-secondary); }
  .pro-filtro span.dot { width:7px; height:7px; border-radius:50%; display:inline-block; }
  .nota-input {
    width:56px; padding:6px 6px; text-align:center;
    background:var(--bg-input); border:1px solid var(--border-light);
    border-radius:8px; color:var(--text-primary); font-size:13px; font-weight:700;
    font-family:var(--font-mono); outline:none; transition:border-color .15s;
  }
  .nota-input:focus { border-color:var(--accent); }
  .nota-input:disabled { opacity:.4; cursor:not-allowed; }
  .oport-chip { display:flex; gap:2px; justify-content:center; margin-bottom:4px; }
  .oport-btn {
    width:16px; height:16px; border-radius:4px; border:1px solid var(--border-subtle);
    background:var(--bg-surface); color:var(--text-muted); font-size:9px; font-weight:700;
    cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;
  }
  .oport-btn.active { background:var(--accent); color:#fff; border-color:var(--accent); }
  .pagi { display:flex; align-items:center; justify-content:space-between; padding:12px 18px; flex-wrap:wrap; gap:8px; }
  .pagi-btn {
    min-width:30px; height:30px; border-radius:8px; border:1px solid var(--border-subtle);
    background:var(--bg-surface); color:var(--text-secondary); font-family:var(--font-mono);
    font-size:12px; cursor:pointer;
  }
  .pagi-btn.active { background:var(--accent); color:#fff; border-color:var(--accent); }
  .pagi-btn:disabled { opacity:.4; cursor:not-allowed; }
  .pesos-panel { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; padding:14px 18px; border-bottom:1px solid var(--border-subtle); background:var(--bg-input); }
  .pesos-field label { display:block; font-size:10px; color:var(--text-muted); margin-bottom:4px; text-transform:uppercase; letter-spacing:.04em; }
  .pesos-field input { width:100%; padding:7px 8px; border-radius:8px; background:var(--bg-surface); border:1px solid var(--border-subtle); color:var(--text-primary); font-family:var(--font-mono); font-size:13px; }
  @media(max-width:900px){ .exp-stats { grid-template-columns:1fr; } .pesos-panel { grid-template-columns:repeat(2,1fr); } }
  .stat-card {
    background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:var(--radius);
    padding:14px 20px; min-width:120px; border-left:4px solid var(--accent);
  }
  .stat-value { display:block; font-family:var(--font-mono); font-size:22px; font-weight:800; color:var(--accent-bright); }
  .stat-label { display:block; font-size:11.5px; font-weight:600; color:var(--text-secondary); margin-top:2px; text-transform:uppercase; letter-spacing:.04em; }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
`

type Pesos = { parcial1: number; parcial2: number; practico: number; final: number }
const PESOS_DEFAULT: Pesos = { parcial1: 20, parcial2: 20, practico: 10, final: 50 }

type NotaMateria = {
  materia_id: number
  materia_nombre: string
  parcial1: number | null
  parcial2: number | null
  practico: number | null
  final1: number | null
  final2: number | null
  final3: number | null
  promedio: number | null
  pesos: Pesos
}

type MateriaApi = { id: number; nombre: string; profesor_nombre?: string | null; profesor_id?: number | null }

function finalEfectivo(m: { final1: number | null; final2: number | null; final3: number | null }): number | null {
  const vals = [m.final1, m.final2, m.final3].filter((v): v is number => v !== null)
  return vals.length ? Math.max(...vals) : null
}

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

function AlumnoView({ userId }: { userId: number }) {
  const [materias, setMaterias] = useState<NotaMateria[]>([])
  const [creditos, setCreditos] = useState<CreditosAlumnoOut | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<NotaMateria[]>('/alumno/mis-notas').catch(() => [] as NotaMateria[]),
      obtenerCreditosAlumno(userId).catch(() => null),
    ]).then(([notas, cred]) => {
      setMaterias(notas.filter(m => m.parcial1 !== null || m.parcial2 !== null || m.practico !== null || finalEfectivo(m) !== null))
      setCreditos(cred)
    }).finally(() => setLoading(false))
  }, [userId])

  const proms = materias.map(m => m.promedio).filter((p): p is number => p !== null)
  const promGeneral = proms.length ? Math.round(proms.reduce((a, b) => a + b, 0) / proms.length * 100) / 100 : 0
  const aprobadas = materias.filter(m => (m.promedio ?? 0) >= 6).length
  const pctAprob = materias.length ? Math.round((aprobadas / materias.length) * 100) : 0
  const ringC = 2 * Math.PI * 34
  const pctCreditos = creditos?.creditos_totales ? Math.round((creditos.creditos_acumulados / creditos.creditos_totales) * 100) : 0

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="mono-label" style={{ color: 'var(--accent-bright)', marginBottom: 4 }}>Expediente Académico</div>
          <h1 className="page-title">Mis Calificaciones</h1>
          <p className="page-subtitle">Semestre {new Date().getMonth() < 6 ? 1 : 2} · {new Date().getFullYear()}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="exp-stats">
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="mono-label">Promedio General</span>
          </div>
          <span className="kpi-value" style={{ fontSize: 36 }}>{loading ? '—' : promGeneral.toFixed(2)}<span className="kpi-unit"> / 10</span></span>
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
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="mono-label">Créditos Acumulados</span>
            <i className="ti ti-certificate" style={{ color: 'var(--accent)', fontSize: 15 }} />
          </div>
          <span className="kpi-value" style={{ fontSize: 34 }}>
            {creditos ? creditos.creditos_acumulados : '—'}<span className="kpi-unit"> / {creditos?.creditos_totales ?? '—'}</span>
          </span>
          <div className="progress-track" style={{ marginTop: 12 }}><div className="progress-fill" style={{ width: `${pctCreditos}%` }} /></div>
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
            const p = m.promedio
            const pesos = m.pesos || PESOS_DEFAULT
            const fin = finalEfectivo(m)
            const pendienteP2 = m.parcial1 !== null && m.parcial2 === null
            return (
              <div key={m.materia_id} className={`mat-card${pendienteP2 ? ' warn' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 800, paddingRight: 8 }}>{m.materia_nombre}</div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 800, color: notaColor(p) }}>{p ?? '—'}</span>
                </div>
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8, marginBottom: 10 }}>
                  <div className="desglose-row"><span>Parcial 1 ({pesos.parcial1} pts)</span><b>{m.parcial1 ?? '—'}</b></div>
                  <div className="desglose-row">
                    <span style={{ color: pendienteP2 ? 'var(--warning)' : undefined }}>Parcial 2 ({pesos.parcial2} pts) {pendienteP2 && '· Pendiente'}</span>
                    <b>{m.parcial2 ?? '—'}</b>
                  </div>
                  <div className="desglose-row"><span>Trabajo Práctico ({pesos.practico} pts)</span><b>{m.practico ?? '—'}</b></div>
                  <div className="desglose-row"><span>Final ({pesos.final} pts)</span><b>{fin ?? '—'}</b></div>
                </div>
                <span className="badge" style={{ background: estadoDe(p).bg, color: estadoDe(p).color }}>{estadoDe(p).label}</span>
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
  ids: { parcial1: number; parcial2: number; tp: number; final1: number; final2: number; final3: number }
  vals: { parcial1: string; parcial2: string; tp: string; final1: string; final2: string; final3: string }
  oportunidadActiva: 1 | 2 | 3
  saving: boolean
}

function calcPromedio(vals: AlumnoRow['vals'], pesos: Pesos): number | null {
  const fins = [vals.final1, vals.final2, vals.final3].map(s => parseFloat(s)).filter(n => !isNaN(n))
  const finalEf = fins.length ? Math.max(...fins) : null
  const partes: { v: number; max: number }[] = []
  const p1 = parseFloat(vals.parcial1); if (!isNaN(p1)) partes.push({ v: p1, max: pesos.parcial1 })
  const p2 = parseFloat(vals.parcial2); if (!isNaN(p2)) partes.push({ v: p2, max: pesos.parcial2 })
  const tp = parseFloat(vals.tp); if (!isNaN(tp)) partes.push({ v: tp, max: pesos.practico })
  if (finalEf !== null) partes.push({ v: finalEf, max: pesos.final })
  if (!partes.length) return null
  const maxTotal = partes.reduce((a, x) => a + x.max, 0)
  const puntos = partes.reduce((a, x) => a + x.v, 0)
  return maxTotal > 0 ? Math.round(puntos / maxTotal * 10 * 100) / 100 : null
}

const PAGE_SIZE = 8

function ProfesorView({ profesorId }: { profesorId: number }) {
  const [materias, setMaterias] = useState<MateriaSimple[]>([])
  const [selectedMateria, setSelectedMateria] = useState<MateriaSimple | null>(null)
  const [alumnos, setAlumnos] = useState<AlumnoRow[]>([])
  const [pesos, setPesos] = useState<Pesos>(PESOS_DEFAULT)
  const [pesosEdit, setPesosEdit] = useState<Pesos | null>(null)
  const [savingPesos, setSavingPesos] = useState(false)
  const [loadingMaterias, setLoadingMaterias] = useState(true)
  const [loadingAlumnos, setLoadingAlumnos] = useState(false)
  const [page, setPage] = useState(1)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const [dirtyCount, setDirtyCount] = useState(0)
  const [savingAll, setSavingAll] = useState(false)
  const originalRef = useRef<string>('')

  const fetchAlumnos = useCallback(async (materia: MateriaSimple) => {
    setLoadingAlumnos(true)
    setPage(1)
    setDirtyCount(0)
    try {
      const [alumnosData, puntajesData, pesosData] = await Promise.all([
        api.get<{ alumno_id: number; nombre: string; username: string }[]>(`/inscripciones/materia/${materia.id}`).catch(() => []),
        api.get<{ id: number; user_id: number; tipo: string; valor: number }[]>(`/puntajes/?materia_id=${materia.id}`).catch(() => []),
        api.get<{ parcial1_max: number; parcial2_max: number; practico_max: number; final_max: number }>(`/puntajes/pesos/${materia.id}`).catch(() => null),
      ])
      const pesosResueltos: Pesos = pesosData
        ? { parcial1: pesosData.parcial1_max, parcial2: pesosData.parcial2_max, practico: pesosData.practico_max, final: pesosData.final_max }
        : PESOS_DEFAULT
      setPesos(pesosResueltos)
      const rows: AlumnoRow[] = alumnosData.map(a => {
        const pts = puntajesData.filter(p => p.user_id === a.alumno_id)
        const find = (tipo: string) => pts.find(p => p.tipo === tipo)
        const fid = (tipo: string) => find(tipo)?.id ?? 0
        const fval = (tipo: string) => { const v = find(tipo)?.valor; return v !== undefined ? String(v) : '' }
        const oportunidadActiva: 1 | 2 | 3 = fval('final1') ? 1 : fval('final2') ? 2 : fval('final3') ? 3 : 1
        return {
          alumno_id: a.alumno_id, nombre: a.nombre, username: a.username,
          ids: { parcial1: fid('parcial1'), parcial2: fid('parcial2'), tp: fid('practico'), final1: fid('final1'), final2: fid('final2'), final3: fid('final3') },
          vals: { parcial1: fval('parcial1'), parcial2: fval('parcial2'), tp: fval('practico'), final1: fval('final1'), final2: fval('final2'), final3: fval('final3') },
          oportunidadActiva,
          saving: false,
        }
      })
      originalRef.current = JSON.stringify(rows.map(r => r.vals))
      setAlumnos(rows)
      setLastUpdate(new Date().toLocaleTimeString())
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

  const valsSnapshot = useMemo(() => JSON.stringify(alumnos.map(r => r.vals)), [alumnos])
  useEffect(() => {
    if (originalRef.current && valsSnapshot !== originalRef.current) {
      const current = JSON.parse(valsSnapshot) as AlumnoRow['vals'][]
      const orig = JSON.parse(originalRef.current) as AlumnoRow['vals'][]
      let dirty = 0
      for (let i = 0; i < current.length; i++) {
        const c = current[i]; const o = orig[i]
        if (c.parcial1 !== o.parcial1 || c.parcial2 !== o.parcial2 || c.tp !== o.tp ||
            c.final1 !== o.final1 || c.final2 !== o.final2 || c.final3 !== o.final3) dirty++
      }
      setDirtyCount(dirty)
    } else {
      setDirtyCount(0)
    }
  }, [valsSnapshot])

  function updateVal(alumno_id: number, campo: 'parcial1' | 'parcial2' | 'tp' | 'final', value: string) {
    if (value !== '' && !/^\d{0,3}(\.\d{0,1})?$/.test(value)) return
    const num = parseFloat(value)
    const max = campo === 'final' ? pesos.final : campo === 'tp' ? pesos.practico : campo === 'parcial1' ? pesos.parcial1 : pesos.parcial2
    if (value !== '' && !isNaN(num) && (num < 0 || num > max)) return
    setAlumnos(prev => prev.map(a => {
      if (a.alumno_id !== alumno_id) return a
      if (campo === 'final') {
        const key = `final${a.oportunidadActiva}` as 'final1' | 'final2' | 'final3'
        return { ...a, vals: { ...a.vals, [key]: value } }
      }
      return { ...a, vals: { ...a.vals, [campo]: value } }
    }))
  }

  function setOportunidad(alumno_id: number, op: 1 | 2 | 3) {
    setAlumnos(prev => prev.map(a => a.alumno_id === alumno_id ? { ...a, oportunidadActiva: op } : a))
  }

  async function saveAll() {
    if (!selectedMateria) return
    setSavingAll(true)
    let successCount = 0; let errorCount = 0
    const tiposMap: { campo: keyof AlumnoRow['vals']; tipo: string }[] = [
      { campo: 'parcial1', tipo: 'parcial1' }, { campo: 'parcial2', tipo: 'parcial2' },
      { campo: 'tp', tipo: 'practico' },
      { campo: 'final1', tipo: 'final1' }, { campo: 'final2', tipo: 'final2' }, { campo: 'final3', tipo: 'final3' },
    ]
    for (const row of alumnos) {
      for (const { campo, tipo } of tiposMap) {
        const valStr = row.vals[campo]
        if (valStr === '') continue
        const valor = parseFloat(valStr)
        if (isNaN(valor)) continue
        try {
          if (row.ids[campo]) {
            await api.put(`/puntajes/${row.ids[campo]}`, { user_id: row.alumno_id, materia_id: selectedMateria.id, tipo, valor })
          } else {
            const created = await api.post<{ id: number }>('/puntajes/', { user_id: row.alumno_id, materia_id: selectedMateria.id, tipo, valor })
            setAlumnos(prev => prev.map(a => a.alumno_id === row.alumno_id
              ? { ...a, ids: { ...a.ids, [campo]: created.id } } : a))
          }
          successCount++
        } catch { errorCount++ }
      }
    }
    originalRef.current = JSON.stringify(alumnos.map(r => r.vals))
    setDirtyCount(0)
    setSavingAll(false)
    setLastUpdate(new Date().toLocaleTimeString())
    if (errorCount > 0) {
      emitToast(`Guardado parcial: ${successCount} ok, ${errorCount} errores`, 'warning')
    } else {
      emitToast(`Todas las notas guardadas (${successCount} registros)`)
    }
  }

  async function guardarPesos() {
    if (!selectedMateria || !pesosEdit) return
    const suma = pesosEdit.parcial1 + pesosEdit.parcial2 + pesosEdit.practico + pesosEdit.final
    if (Math.round(suma * 100) / 100 !== 100) {
      emitToast(`Los pesos deben sumar 100 (suma actual: ${suma})`, 'error')
      return
    }
    setSavingPesos(true)
    try {
      await api.put(`/puntajes/pesos/${selectedMateria.id}`, {
        parcial1_max: pesosEdit.parcial1, parcial2_max: pesosEdit.parcial2,
        practico_max: pesosEdit.practico, final_max: pesosEdit.final,
      })
      setPesos(pesosEdit)
      setPesosEdit(null)
      emitToast('Puntaje de la materia actualizado')
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al guardar pesos', 'error')
    } finally { setSavingPesos(false) }
  }

  function exportCSV() {
    const rows = [
      ['Legajo', 'Estudiante', 'Parcial 1', 'Parcial 2', 'Trabajos', 'Final', 'Promedio', 'Estado'],
      ...alumnos.map(a => {
        const p = calcPromedio(a.vals, pesos)
        const fin = [a.vals.final1, a.vals.final2, a.vals.final3].map(v => parseFloat(v)).filter(n => !isNaN(n))
        return [`#${a.alumno_id}`, a.nombre, a.vals.parcial1 || '-', a.vals.parcial2 || '-', a.vals.tp || '-', fin.length ? String(Math.max(...fin)) : '-', p !== null ? p.toFixed(2) : '-', estadoDe(p).label]
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

  const nAprob = alumnos.filter(a => { const p = calcPromedio(a.vals, pesos); return p !== null && p >= 6 && p < 9 }).length
  const nReprob = alumnos.filter(a => { const p = calcPromedio(a.vals, pesos); return p !== null && p < 6 }).length
  const nPromo = alumnos.filter(a => { const p = calcPromedio(a.vals, pesos); return p !== null && p >= 9 }).length
  const totalPages = Math.max(1, Math.ceil(alumnos.length / PAGE_SIZE))
  const pageRows = alumnos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Gestión de Calificaciones</h1>
          <p className="page-subtitle">Ciclo Lectivo: {new Date().getMonth() < 6 ? 'Primer' : 'Segundo'} Cuatrimestre {new Date().getFullYear()}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastUpdate && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-refresh" /> {lastUpdate}
            </span>
          )}
          {selectedMateria && (
            <button className="btn-ghost" onClick={() => setPesosEdit(pesosEdit ? null : { ...pesos })}>
              <i className="ti ti-adjustments" /> Pesos
            </button>
          )}
          <button className="btn-ghost" onClick={exportCSV}><i className="ti ti-file-spreadsheet" /> CSV</button>
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
              <button key={m.id} className={`pill-tab${selectedMateria?.id === m.id ? ' active' : ''}`} onClick={() => { setSelectedMateria(m); setPesosEdit(null); fetchAlumnos(m) }}>
                {m.nombre}
              </button>
            ))}
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {pesosEdit && (
              <div className="pesos-panel">
                <div className="pesos-field">
                  <label>Parcial 1 (pts)</label>
                  <input type="number" min={0} value={pesosEdit.parcial1} onChange={e => setPesosEdit({ ...pesosEdit, parcial1: Number(e.target.value) })} />
                </div>
                <div className="pesos-field">
                  <label>Parcial 2 (pts)</label>
                  <input type="number" min={0} value={pesosEdit.parcial2} onChange={e => setPesosEdit({ ...pesosEdit, parcial2: Number(e.target.value) })} />
                </div>
                <div className="pesos-field">
                  <label>Trabajo Práctico (pts)</label>
                  <input type="number" min={0} value={pesosEdit.practico} onChange={e => setPesosEdit({ ...pesosEdit, practico: Number(e.target.value) })} />
                </div>
                <div className="pesos-field">
                  <label>Final (pts)</label>
                  <input type="number" min={0} value={pesosEdit.final} onChange={e => setPesosEdit({ ...pesosEdit, final: Number(e.target.value) })} />
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="mono-label" style={{ color: (pesosEdit.parcial1 + pesosEdit.parcial2 + pesosEdit.practico + pesosEdit.final) === 100 ? 'var(--success)' : 'var(--danger)' }}>
                    Suma: {pesosEdit.parcial1 + pesosEdit.parcial2 + pesosEdit.practico + pesosEdit.final} / 100
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-ghost" onClick={() => setPesosEdit(null)}>Cancelar</button>
                    <button className="btn-primary" disabled={savingPesos} onClick={guardarPesos}>{savingPesos ? 'Guardando…' : 'Guardar'}</button>
                  </div>
                </div>
              </div>
            )}
            <div className="pro-filtros">
              <span className="pro-filtro"><span className="dot" style={{ background: 'var(--success)' }} /> {nAprob} Aprobados</span>
              <span className="pro-filtro"><span className="dot" style={{ background: 'var(--danger)' }} /> {nReprob} Reprobados</span>
              <span className="pro-filtro"><span className="dot" style={{ background: 'var(--info)' }} /> {nPromo} Promocionados</span>
              <span style={{ flex: 1 }} />
              <span className="pro-filtro" style={{ fontSize: 10 }}>P1 /{pesos.parcial1} · P2 /{pesos.parcial2} · TP /{pesos.practico} · Final /{pesos.final}</span>
              {dirtyCount > 0 && (
                <button className="btn-primary" style={{ padding: '4px 14px', fontSize: 11 }} disabled={savingAll} onClick={saveAll}>
                  {savingAll ? 'Guardando…' : `Guardar (${dirtyCount})`}
                </button>
              )}
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
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map(a => {
                        const p = calcPromedio(a.vals, pesos)
                        const est = estadoDe(p)
                        const finalKey = `final${a.oportunidadActiva}` as 'final1' | 'final2' | 'final3'
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
                            <td style={{ textAlign: 'center' }}>
                              <input className="nota-input" type="text" inputMode="decimal" placeholder="—"
                                value={a.vals.parcial1} disabled={savingAll}
                                onChange={e => updateVal(a.alumno_id, 'parcial1', e.target.value)} />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input className="nota-input" type="text" inputMode="decimal" placeholder="—"
                                value={a.vals.parcial2} disabled={savingAll}
                                onChange={e => updateVal(a.alumno_id, 'parcial2', e.target.value)} />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input className="nota-input" type="text" inputMode="decimal" placeholder="—"
                                value={a.vals.tp} disabled={savingAll}
                                onChange={e => updateVal(a.alumno_id, 'tp', e.target.value)} />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div className="oport-chip">
                                {([1, 2, 3] as const).map(op => (
                                  <button key={op} type="button" className={`oport-btn${a.oportunidadActiva === op ? ' active' : ''}`}
                                    onClick={() => setOportunidad(a.alumno_id, op)}>{op}</button>
                                ))}
                              </div>
                              <input className="nota-input" type="text" inputMode="decimal" placeholder="—"
                                value={a.vals[finalKey]} disabled={savingAll}
                                onChange={e => updateVal(a.alumno_id, 'final', e.target.value)} />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="badge" style={{ background: est.bg, color: est.color }}>{est.label}</span>
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


        </>
      )}
    </>
  )
}

/* ═══ ADMIN — Gestión de Calificaciones ═════════════════════════ */

type AlumnoOpt = { id: number; nombre: string; username: string }
type MateriaAdm = {
  materia_id: number; nombre: string; anio?: number | null; semestre?: number | null; codigo?: string | null; profesor: string
  parcial1: number | null; parcial2: number | null; practico: number | null; final1: number | null; final2: number | null; final3: number | null
  promedio: number | null; pesos: Pesos
}
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
      const mats = await api.get<(MateriaApi & { anio?: number | null; semestre?: number | null; codigo?: string | null })[]>('/materias/')
      const detalles = await Promise.all(
        mats.map(m =>
          api.get<{ user_id: number; nombre: string; parcial1: number | null; parcial2: number | null; practico: number | null; final1: number | null; final2: number | null; final3: number | null; promedio_final: number | null }>(
            `/puntajes/alumno/${a.id}/promedio-final?materia_id=${m.id}`
          ).catch(() => null)
        )
      )
      const rows: MateriaAdm[] = mats.map((m, i) => {
        const d = detalles[i]
        return {
          materia_id: m.id, nombre: m.nombre, codigo: m.codigo, anio: m.anio, semestre: m.semestre,
          profesor: m.profesor_nombre || '—',
          parcial1: d?.parcial1 ?? null, parcial2: d?.parcial2 ?? null, practico: d?.practico ?? null,
          final1: d?.final1 ?? null, final2: d?.final2 ?? null, final3: d?.final3 ?? null,
          promedio: d?.promedio_final ?? null,
          pesos: PESOS_DEFAULT,
        }
      }).filter(m => m.parcial1 !== null || m.parcial2 !== null || m.practico !== null || finalEfectivo(m) !== null)
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

  const proms = materias.map(m => m.promedio).filter((p): p is number => p !== null)
  const promGeneral = proms.length ? Math.round(proms.reduce((a, b) => a + b, 0) / proms.length * 100) / 100 : null
  const aprobadas = materias.filter(m => (m.promedio ?? 0) >= 6).length

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
                      const p = m.promedio
                      const est = estadoDe(p)
                      const fin = finalEfectivo(m)
                      return (
                        <div key={m.materia_id} className="card" style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.3 }}>{m.nombre}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 800, color: notaColor(p), flexShrink: 0, marginLeft: 8 }}>{p ?? '—'}</span>
                          </div>
                          <div className="mono-label" style={{ fontSize: 10, marginBottom: 8 }}>
                            {m.codigo || `MAT-${String(m.materia_id).padStart(3, '0')}`} · {m.profesor}
                          </div>
                          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 6 }}>
                            <div className="desglose-row" style={{ fontSize: 11 }}><span>Parcial 1</span><b style={{ color: notaColor(m.parcial1) }}>{m.parcial1 ?? '—'}</b></div>
                            <div className="desglose-row" style={{ fontSize: 11 }}><span>Parcial 2</span><b style={{ color: notaColor(m.parcial2) }}>{m.parcial2 ?? '—'}</b></div>
                            <div className="desglose-row" style={{ fontSize: 11 }}><span>Trabajos</span><b style={{ color: notaColor(m.practico) }}>{m.practico ?? '—'}</b></div>
                            <div className="desglose-row" style={{ fontSize: 11 }}><span>Final</span><b style={{ color: notaColor(fin) }}>{fin ?? '—'}</b></div>
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
