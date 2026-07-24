import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, emitToast } from '../lib/api'
import { obtenerMiHistorico, type PeriodoHistorico } from '../services/historicoService'
import { obtenerMiAgenda, crearRecordatorio, actualizarRecordatorio, eliminarRecordatorio, type ItemAgenda } from '../services/agendaService'

type Tab = 'activas' | 'historico' | 'agenda'

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const POLL_MS = 30_000

// ─── helpers ──────────────────────────────────────────────────────────────────

function promColor(val: number | null): string {
  if (val === null) return 'var(--text-muted)'
  if (val >= 9) return '#639922'
  if (val >= 7) return '#BA7517'
  return '#ef4444'
}

function pctColor(val: number | null): string {
  if (val === null) return 'var(--text-muted)'
  if (val >= 75) return '#22c55e'
  if (val >= 50) return '#f59e0b'
  return '#ef4444'
}

function inicioSemana(d: Date) {
  const dia = (d.getDay() + 6) % 7
  const r = new Date(d)
  r.setDate(r.getDate() - dia)
  r.setHours(0, 0, 0, 0)
  return r
}

function fmt(d: Date) { return d.toISOString().slice(0, 10) }

function fmtHora(iso: string | undefined) {
  if (!iso) return ''
  return iso.slice(0, 5)
}

// ─── StatsStrip ───────────────────────────────────────────────────────────────

function StatsStrip({ stats, loading }: { stats: { lbl: string; val: string; highlight?: boolean }[]; loading?: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10, marginBottom: 18 }}>
      {stats.map(s => (
        <div key={s.lbl} style={{ background: 'var(--bg-input)', border: '0.5px solid var(--border-subtle)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{s.lbl}</div>
          <div style={{ fontSize: loading ? 14 : 20, fontWeight: 600, color: s.highlight ? '#D85A30' : 'var(--text-primary)' }}>
            {loading ? '…' : s.val}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Mini barra de distribución ──────────────────────────────────────────────

function DistribucionBar({ dist }: { dist: { label: string; count: number; color: string; pct: number }[] }) {
  const total = dist.reduce((s, d) => s + d.count, 0)
  if (total === 0) return null
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', height: 5, borderRadius: 999, overflow: 'hidden', gap: 1 }}>
        {dist.map(d => d.count > 0 && (
          <div key={d.label} style={{ flex: d.count, background: d.color, minWidth: 4 }} title={`${d.label}: ${d.count} alumno(s)`} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
        {dist.map(d => d.count > 0 && (
          <span key={d.label} style={{ fontSize: 9, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
            {d.label}: {d.count}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── SubjectCard (Activas) ────────────────────────────────────────────────────

interface SubjectActiva {
  id: number
  code: string
  name: string
  career: string
  students: number
  avgGrade: number | null
  attendance: number
  approvalPct: number | null
  distribution: { '0-3': number; '3-5': number; '5-6': number; '6-7': number; '7-9': number; '9-10': number }
  loading: boolean
}

const DIST_COLORS: Record<string, string> = {
  '0-3': '#ef4444', '3-5': '#f97316', '5-6': '#eab308',
  '6-7': '#22c55e', '7-9': '#639922', '9-10': '#0ea5e9',
}

function SubjectCard({ s, onVerNotas, onVerAsistencia, onVerPrograma }: {
  s: SubjectActiva
  onVerNotas: () => void
  onVerAsistencia: () => void
  onVerPrograma: () => void
}) {
  const distEntries = Object.entries(s.distribution).map(([k, v]) => ({
    label: k, count: v, color: DIST_COLORS[k] || 'var(--text-muted)',
    pct: s.students > 0 ? Math.round(v / s.students * 100) : 0,
  }))

  return (
    <div className="card" style={{
      padding: 18, display: 'flex', flexDirection: 'column', transition: 'all .2s',
      border: '1px solid var(--border-subtle)', position: 'relative', overflow: 'hidden',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-muted)'; e.currentTarget.style.boxShadow = '0 8px 24px -8px var(--accent-muted)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.boxShadow = 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <span className="mono-label" style={{ color: 'var(--accent-bright)', fontSize: 10 }}>{s.code}</span>
          <h4 style={{ fontSize: 15, fontWeight: 700, marginTop: 1 }}>{s.name}</h4>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.career}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 800, color: promColor(s.avgGrade), lineHeight: 1 }}>
            {s.loading ? '…' : (s.avgGrade !== null ? s.avgGrade.toFixed(1) : '—')}
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>promedio</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, background: 'var(--bg-input)', borderRadius: 8, padding: '7px 10px', textAlign: 'center' }}>
          <div className="mono-label" style={{ fontSize: 8, marginBottom: 1 }}>Alumnos</div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--accent-bright)' }}>{s.students}</span>
        </div>
        <div style={{ flex: 1, background: 'var(--bg-input)', borderRadius: 8, padding: '7px 10px', textAlign: 'center' }}>
          <div className="mono-label" style={{ fontSize: 8, marginBottom: 1 }}>Asistencia</div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: pctColor(s.attendance) }}>{s.attendance}%</span>
        </div>
        <div style={{ flex: 1, background: 'var(--bg-input)', borderRadius: 8, padding: '7px 10px', textAlign: 'center' }}>
          <div className="mono-label" style={{ fontSize: 8, marginBottom: 1 }}>Aprobación</div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: pctColor(s.approvalPct) }}>
            {s.loading ? '…' : (s.approvalPct !== null ? `${s.approvalPct}%` : '—')}
          </span>
        </div>
      </div>

      {!s.loading && <DistribucionBar dist={distEntries} />}

      <div style={{ display: 'flex', gap: 5, marginTop: 'auto', paddingTop: 12 }}>
        <button className="btn-primary" style={{ flex: 1, fontSize: 10.5, padding: '5px 0' }} onClick={onVerNotas}>
          <i className="ti ti-pencil" /> Notas
        </button>
        <button className="btn-ghost" style={{ flex: 1, fontSize: 10.5, padding: '5px 0' }} onClick={onVerAsistencia}>
          <i className="ti ti-qrcode" /> Asistencia
        </button>
        <button className="btn-ghost" style={{ flex: 1, fontSize: 10.5, padding: '5px 0' }} onClick={onVerPrograma}>
          <i className="ti ti-notebook" /> Programa
        </button>
      </div>
    </div>
  )
}

// ─── Modal recordatorio ──────────────────────────────────────────────────────

function RecordatorioModal({ fecha, onClose, onSaved }: { fecha: string; onClose: () => void; onSaved: () => void }) {
  const [titulo, setTitulo] = useState('')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)

  async function guardar() {
    if (!titulo.trim()) return
    setSaving(true)
    try {
      await crearRecordatorio({ titulo: titulo.trim(), descripcion: desc || null, fecha: `${fecha}T09:00:00` })
      emitToast('Recordatorio creado')
      onSaved()
      onClose()
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al crear', 'error')
    } finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="card card-elevated" style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800 }}>Nuevo Recordatorio</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><i className="ti ti-x" /></button>
        </div>
        <div className="mono-label" style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>{fecha}</div>
        <input className="input-uca" placeholder="Título" value={titulo} onChange={e => setTitulo(e.target.value)} style={{ marginBottom: 12 }} autoFocus />
        <input className="input-uca" placeholder="Descripción (opcional)" value={desc} onChange={e => setDesc(e.target.value)} style={{ marginBottom: 18 }} />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={saving || !titulo.trim()} onClick={guardar}>{saving ? '…' : 'Crear'}</button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════════════════

export default function MisMaterias() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('activas')

  // ── Activas ──
  const [careers, setCareers] = useState<SubjectActiva[][]>([])
  const [careerNames, setCareerNames] = useState<string[]>([])
  const [loadingActivas, setLoadingActivas] = useState(true)
  const [dashboardData, setDashboardData] = useState<{ materias_activas: number; total_alumnos: number; promedio_general: number | null; porcentaje_aprobacion: number | null; asistencia_promedio: number | null } | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cargarActivas = useCallback(async () => {
    try {
      const [materias, dash] = await Promise.all([
        api.get<{ id: number; nombre: string; codigo: string | null; carrera: string | null }[]>('/profesor/materias'),
        api.get<{ resumen: typeof dashboardData }>('/profesor/dashboard').catch(() => null),
      ])
      if (dash) setDashboardData(dash.resumen)

      const withStats = await Promise.all(materias.map(async m => {
        let avg = null as number | null
        let approval = null as number | null
        let dist = { '0-3': 0, '3-5': 0, '5-6': 0, '6-7': 0, '7-9': 0, '9-10': 0 }
        try {
          const stats = await api.get<{
            total_alumnos: number; promedio_grupo: number; aprobados: number; distribucion: typeof dist
          }>(`/puntajes/materia/${m.id}/estadisticas`)
          avg = stats.promedio_grupo
          approval = stats.total_alumnos > 0 ? Math.round(stats.aprobados / stats.total_alumnos * 100) : null
          dist = stats.distribucion || dist
        } catch { /* sin notas aún */ }

        let attendance = 0
        try {
          const alumnos = await api.get<{ porcentaje: number }[]>(`/asistencias/materia/${m.id}/alumnos`)
          attendance = alumnos.length ? Math.round(alumnos.reduce((s, a) => s + (a.porcentaje ?? 0), 0) / alumnos.length) : 0
        } catch { /* ok */ }

        return {
          id: m.id,
          code: m.codigo || `MAT-${String(m.id).padStart(3, '0')}`,
          name: m.nombre,
          career: m.carrera || 'General',
          students: dist ? Object.values(dist).reduce((a, b) => a + b, 0) : 0,
          avgGrade: avg,
          attendance,
          approvalPct: approval,
          distribution: dist,
          loading: false,
        } as SubjectActiva
      }))

      const grouped = new Map<string, SubjectActiva[]>()
      for (const s of withStats) {
        const list = grouped.get(s.career) || []
        list.push(s)
        grouped.set(s.career, list)
      }
      setCareerNames([...grouped.keys()])
      setCareers([...grouped.values()])
    } finally { setLoadingActivas(false) }
  }, [])

  useEffect(() => {
    cargarActivas()
    pollRef.current = setInterval(cargarActivas, POLL_MS)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [cargarActivas])

  // ── Histórico ──
  const [historico, setHistorico] = useState<PeriodoHistorico[]>([])
  const [loadingHistorico, setLoadingHistorico] = useState(true)
  const [filterAnio, setFilterAnio] = useState<string>('')

  useEffect(() => {
    if (tab !== 'historico') return
    obtenerMiHistorico().then(setHistorico).catch(() => setHistorico([])).finally(() => setLoadingHistorico(false))
  }, [tab])

  const historicoFiltrado = useMemo(() => {
    if (!filterAnio) return historico
    return historico.filter(p => p.periodo.startsWith(filterAnio))
  }, [historico, filterAnio])

  const aniosDisponibles = useMemo(() => {
    const set = new Set<string>()
    for (const p of historico) {
      const anio = p.periodo.split('-')[0]
      if (anio) set.add(anio)
    }
    return [...set].sort().reverse()
  }, [historico])

  // ── Agenda ──
  const [semanaInicio, setSemanaInicio] = useState(() => inicioSemana(new Date()))
  const [items, setItems] = useState<ItemAgenda[]>([])
  const [loadingAgenda, setLoadingAgenda] = useState(true)
  const [nuevoRecFecha, setNuevoRecFecha] = useState<string | null>(null)

  const semanaFin = useMemo(() => { const f = new Date(semanaInicio); f.setDate(f.getDate() + 6); return f }, [semanaInicio])

  const cargarAgenda = useCallback(() => {
    obtenerMiAgenda(fmt(semanaInicio), fmt(semanaFin))
      .then(res => setItems(res.items))
      .catch(() => setItems([]))
      .finally(() => setLoadingAgenda(false))
  }, [semanaInicio, semanaFin])

  useEffect(() => { if (tab === 'agenda') cargarAgenda() }, [tab, cargarAgenda])

  const itemsPorDia = useMemo(() => {
    const m: Record<string, ItemAgenda[]> = {}
    for (const it of items) {
      const key = it.fecha.slice(0, 10)
      if (!m[key]) m[key] = []
      m[key].push(it)
    }
    return m
  }, [items])

  async function toggleRecordatorio(it: ItemAgenda) {
    if (!it.id) return
    try {
      await actualizarRecordatorio(it.id, { completado: !it.completado })
      cargarAgenda()
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al actualizar', 'error')
    }
  }

  async function eliminarRec(id: number) {
    try {
      await eliminarRecordatorio(id)
      emitToast('Recordatorio eliminado')
      cargarAgenda()
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al eliminar', 'error')
    }
  }

  // ── Stats derivados ──

  const activasStats = useMemo(() => {
    const totalSubj = careers.reduce((s, c) => s + c.length, 0)
    const totalStud = careers.reduce((s, c) => s + c.reduce((a, sub) => a + sub.students, 0), 0)
    const proms = careers.flatMap(c => c.map(s => s.avgGrade).filter(Boolean) as number[])
    const promGen = proms.length ? (proms.reduce((a, b) => a + b, 0) / proms.length).toFixed(1) : '—'
    const atts = careers.flatMap(c => c.map(s => s.attendance))
    const promAtt = atts.length ? Math.round(atts.reduce((a, b) => a + b, 0) / atts.length) : 0
    const aprob = dashboardData?.porcentaje_aprobacion
    return [
      { lbl: 'Materias activas', val: String(totalSubj), highlight: true },
      { lbl: 'Total alumnos', val: String(totalStud) },
      { lbl: 'Promedio general', val: promGen !== '—' ? promGen : '—' },
      { lbl: 'Aprobación', val: aprob !== null ? `${aprob}%` : '—' },
      { lbl: 'Asistencia prom.', val: `${promAtt}%` },
    ]
  }, [careers, dashboardData])

  const historicoStats = useMemo(() => {
    const totalMaterias = historico.reduce((s, p) => s + p.catedras.length, 0)
    const totalAlumnos = historico.reduce((s, p) => s + p.catedras.reduce((a, c) => a + c.cantidad_alumnos, 0), 0)
    const promedios = historico.flatMap(p => p.catedras.map(c => c.promedio_grupo).filter(Boolean) as number[])
    const promGen = promedios.length ? (promedios.reduce((a, b) => a + b, 0) / promedios.length).toFixed(2) : '—'
    return [
      { lbl: 'Semestres dictados', val: String(historico.length), highlight: true },
      { lbl: 'Materias distintas', val: String(totalMaterias) },
      { lbl: 'Promedio histórico', val: promGen },
      { lbl: 'Alumnos totales', val: String(totalAlumnos) },
    ]
  }, [historico])

  const ahora = useMemo(() => new Date(), [])
  const ahoraKey = fmt(ahora)
  const ahoraMinutos = ahora.getHours() * 60 + ahora.getMinutes()

  function esClaseAhora(it: ItemAgenda): boolean {
    if (!it.hora_inicio || !it.hora_fin || it.tipo !== 'clase' || it.fecha.slice(0, 10) !== ahoraKey) return false
    const [h, m] = it.hora_inicio.split(':').map(Number)
    const [h2, m2] = it.hora_fin.split(':').map(Number)
    const inicio = h * 60 + m
    const fin = h2 * 60 + m2
    return ahoraMinutos >= inicio && ahoraMinutos <= fin
  }

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 28 }}>Mis Materias</h1>
          <p className="page-subtitle">Cátedras activas, histórico docente y agenda personal.</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {([['activas', 'Activas'], ['historico', 'Histórico'], ['agenda', 'Agenda']] as [Tab, string][]).map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                padding: '7px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                cursor: 'pointer', transition: 'all .15s',
                background: tab === t ? '#D85A30' : 'transparent',
                color: tab === t ? '#fff' : 'var(--text-secondary)',
                border: tab === t ? 'none' : '0.5px solid var(--border-strong)',
              }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ ACTIVAS ═══ */}
      {tab === 'activas' && (
        loadingActivas ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Cargando materias…</div>
        ) : careers.length === 0 || careers.every(c => c.length === 0) ? (
          <div className="card" style={{ textAlign: 'center', padding: 46 }}>
            <i className="ti ti-books-off" style={{ fontSize: 36, color: 'var(--text-muted)' }} />
            <p style={{ marginTop: 10, color: 'var(--text-secondary)', fontSize: 13 }}>El administrador aún no te asignó materias.</p>
          </div>
        ) : <>
          <StatsStrip stats={activasStats} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 11, color: 'var(--text-muted)' }}>
            <i className="ti ti-refresh" />
            <span>Actualizado automáticamente cada 30s</span>
          </div>
          {careers.map((subjects, ci) => (
            <div key={careerNames[ci]} style={{ marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <i className="ti ti-building-community" style={{ color: 'var(--accent-bright)', fontSize: 18 }} />
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>{careerNames[ci]}</h3>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{subjects.length} materia(s)</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {subjects.map(s => (
                  <SubjectCard
                    key={s.id}
                    s={s}
                    onVerNotas={() => navigate(`/puntajes?materia_id=${s.id}`)}
                    onVerAsistencia={() => navigate(`/asistencia?materia_id=${s.id}`)}
                    onVerPrograma={() => navigate(`/programa?materia_id=${s.id}`)}
                  />
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {/* ═══ HISTÓRICO ═══ */}
      {tab === 'historico' && (
        loadingHistorico ? (
          <div className="card" style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>Cargando histórico…</div>
        ) : historico.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Todavía no tenés cátedras dictadas en períodos anteriores.
          </div>
        ) : (
          <div>
            <StatsStrip stats={historicoStats} />
            {aniosDisponibles.length > 1 && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                <button onClick={() => setFilterAnio('')}
                  style={{
                    padding: '5px 14px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', transition: 'all .15s',
                    background: filterAnio === '' ? 'var(--accent)' : 'transparent',
                    color: filterAnio === '' ? '#fff' : 'var(--text-secondary)',
                    border: '0.5px solid var(--border-strong)',
                  }}>Todos</button>
                {aniosDisponibles.map(a => (
                  <button key={a} onClick={() => setFilterAnio(a)}
                    style={{
                      padding: '5px 14px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', transition: 'all .15s',
                      background: filterAnio === a ? 'var(--accent)' : 'transparent',
                      color: filterAnio === a ? '#fff' : 'var(--text-secondary)',
                      border: '0.5px solid var(--border-strong)',
                    }}>{a}</button>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {historicoFiltrado.map(p => (
                <div key={p.periodo}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                    background: 'var(--bg-elevated)', border: '0.5px solid var(--border-subtle)', borderBottom: 'none',
                    borderRadius: '12px 12px 0 0',
                  }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#712B13', background: '#FAECE7', borderRadius: 6, padding: '4px 10px' }}>
                      📅 {p.periodo}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.catedras.length} materia(s)</span>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      prom. grupo: {(() => {
                        const vals = p.catedras.map(c => c.promedio_grupo).filter(Boolean) as number[]
                        return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : '—'
                      })()}
                    </span>
                  </div>
                  <div style={{ overflow: 'hidden', background: 'var(--bg-elevated)', border: '0.5px solid var(--border-subtle)', borderRadius: '0 0 12px 12px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <colgroup>
                        <col style={{ width: '38%' }} />
                        <col style={{ width: '13%' }} />
                        <col style={{ width: '15%' }} />
                        <col style={{ width: '16%' }} />
                        <col style={{ width: '18%' }} />
                      </colgroup>
                      <thead>
                        <tr style={{ background: 'var(--bg-input)' }}>
                          {['Materia', 'Alumnos', 'Promedio', '% Aprobación', 'Nivel'].map((h, i) => (
                            <th key={h} style={{
                              fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', padding: '9px 14px',
                              letterSpacing: '.04em', textAlign: i > 0 ? 'center' : 'left',
                              borderBottom: '0.5px solid var(--border-subtle)',
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {p.catedras.map((c, idx) => (
                          <tr key={c.materia_id}
                            style={{
                              borderBottom: idx < p.catedras.length - 1 ? '0.5px solid var(--border-subtle)' : 'none',
                              transition: 'background .15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                            <td style={{ padding: '11px 14px' }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{c.materia_nombre}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{c.carrera_nombre ?? '—'}</div>
                            </td>
                            <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: c.cantidad_alumnos === 0 ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                                {c.cantidad_alumnos}
                              </span>
                            </td>
                            <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                              {c.promedio_grupo !== null ? (
                                <span style={{ fontSize: 13, fontWeight: 700, color: promColor(c.promedio_grupo), fontFamily: 'var(--font-mono)' }}>
                                  {c.promedio_grupo.toFixed(2)}
                                </span>
                              ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                            </td>
                            <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                              {c.porcentaje_aprobacion !== null ? (
                                <span style={{
                                  display: 'inline-block', fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
                                  background: c.porcentaje_aprobacion >= 70 ? '#EAF3DE' : c.porcentaje_aprobacion >= 50 ? '#FEF3C7' : '#FEE2E2',
                                  color: c.porcentaje_aprobacion >= 70 ? '#27500A' : c.porcentaje_aprobacion >= 50 ? '#92400E' : '#991B1B',
                                }}>
                                  {c.porcentaje_aprobacion}%
                                </span>
                              ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                            </td>
                            <td style={{ padding: '11px 14px' }}>
                              <div style={{ width: 80, height: 6, borderRadius: 999, background: 'var(--bg-input)' }}>
                                <div style={{
                                  height: 6, borderRadius: 999, background: c.promedio_grupo !== null ? promColor(c.promedio_grupo) : '#2a3040',
                                  width: `${c.promedio_grupo !== null ? Math.round(c.promedio_grupo / 10 * 100) : 0}%`,
                                  transition: 'width .5s ease',
                                }} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
            {filterAnio && historicoFiltrado.length === 0 && (
              <div className="card" style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No hay períodos registrados para {filterAnio}.
              </div>
            )}
          </div>
        )
      )}

      {/* ═══ AGENDA ═══ */}
      {tab === 'agenda' && (
        loadingAgenda ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>Cargando agenda…</div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-elevated)', border: '0.5px solid var(--border-subtle)', borderRadius: '12px 12px 0 0' }}>
              <button onClick={() => setSemanaInicio(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', border: '0.5px solid var(--border-strong)', borderRadius: 6, padding: '5px 12px', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>
                ← Anterior
              </button>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{fmt(semanaInicio)} — {fmt(semanaFin)}</span>
              <button onClick={() => setSemanaInicio(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', border: '0.5px solid var(--border-strong)', borderRadius: 6, padding: '5px 12px', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>
                Siguiente →
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', border: '0.5px solid var(--border-subtle)', borderTop: 'none', borderBottom: 'none', background: 'var(--bg-input)' }}>
              {DIAS.map((d, i) => {
                const fecha = new Date(semanaInicio); fecha.setDate(fecha.getDate() + i)
                const key = fmt(fecha)
                const esHoy = key === ahoraKey
                return (
                  <div key={d} style={{
                    padding: '8px 0', textAlign: 'center', fontSize: 11, fontWeight: 600,
                    color: esHoy ? '#D85A30' : 'var(--text-muted)',
                    borderBottom: '0.5px solid var(--border-subtle)',
                    background: esHoy ? '#FAECE7' : 'transparent',
                  }}>
                    {d.toUpperCase()} {fecha.getDate()}
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', border: '0.5px solid var(--border-subtle)', borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden', background: 'var(--bg-elevated)' }}>
              {DIAS.map((_, i) => {
                const fecha = new Date(semanaInicio); fecha.setDate(fecha.getDate() + i)
                const key = fmt(fecha)
                const delDia = (itemsPorDia[key] || []).sort((a, b) => (a.hora_inicio || '').localeCompare(b.hora_inicio || ''))
                const esHoy = key === ahoraKey
                const esFinde = i >= 5
                return (
                  <div key={key} style={{
                    minHeight: 110, padding: 8, display: 'flex', flexDirection: 'column',
                    borderRight: i < 6 ? '0.5px solid var(--border-subtle)' : 'none',
                    borderBottom: '0.5px solid var(--border-subtle)',
                    background: esHoy ? '#FAECE7' : esFinde ? 'var(--bg-input)' : 'transparent',
                    opacity: esFinde && !esHoy ? 0.6 : 1,
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                      {delDia.length > 0 ? delDia.map((it, idx) => {
                        const bg = it.tipo === 'clase' ? '#FAECE7' : it.tipo === 'evento' ? '#EAF3DE' : '#E6F1FB'
                        const tx = it.tipo === 'clase' ? '#712B13' : it.tipo === 'evento' ? '#27500A' : '#0C447C'
                        const border = it.tipo === 'clase' ? '1px solid #F5D6C9' : it.tipo === 'evento' ? '1px solid #D4E5C0' : '1px solid #C8DEEE'
                        const ahora = esClaseAhora(it)
                        return (
                          <div key={idx} style={{
                            fontSize: 10.5, fontWeight: 600, padding: '3px 6px', borderRadius: 5,
                            background: bg, color: tx, border: ahora ? `2px solid ${tx}` : border,
                            position: 'relative',
                          }}>
                            {it.tipo === 'clase' && (
                              <span>{fmtHora(it.hora_inicio)} {it.materia_nombre || ''}</span>
                            )}
                            {it.tipo === 'evento' && <span>{it.titulo}</span>}
                            {it.tipo === 'recordatorio' && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <input type="checkbox" checked={!!it.completado} onChange={() => toggleRecordatorio(it)}
                                  style={{ accentColor: 'var(--accent)', width: 10, height: 10, cursor: 'pointer' }} />
                                <span style={{ textDecoration: it.completado ? 'line-through' : 'none', flex: 1 }}>{it.titulo}</span>
                                {it.id && (
                                  <button onClick={e => { e.stopPropagation(); eliminarRec(it.id!) }}
                                    style={{ background: 'none', border: 'none', color: tx, opacity: 0.5, cursor: 'pointer', padding: 0, fontSize: 9 }}>
                                    <i className="ti ti-x" />
                                  </button>
                                )}
                              </div>
                            )}
                            {ahora && <span style={{ position: 'absolute', top: -3, right: -3, width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }} />}
                          </div>
                        )
                      }) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.5 }}>—</span>
                        </div>
                      )}
                    </div>
                    <button onClick={() => setNuevoRecFecha(key)}
                      style={{
                        marginTop: 'auto', width: '100%', fontSize: 10, color: 'var(--text-muted)',
                        border: '0.5px dashed var(--border-strong)', borderRadius: 5, padding: '2px 0',
                        background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', opacity: 0.7,
                      }}>
                      + Recordatorio
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      )}

      {nuevoRecFecha && (
        <RecordatorioModal
          fecha={nuevoRecFecha}
          onClose={() => setNuevoRecFecha(null)}
          onSaved={cargarAgenda}
        />
      )}
    </div>
  )
}
