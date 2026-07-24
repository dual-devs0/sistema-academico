import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from 'recharts'
import { api, getCurrentUser } from '../lib/api'

const POLL_MS = 30000

const CYAN   = 'var(--accent)'
const GREEN  = '#22c55e'
const YELLOW = '#f59e0b'
const RED    = '#ef4444'

const css = `
  *, *::before, *::after { box-sizing:border-box; }
  @keyframes est-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

  .est-root { display:flex; flex-direction:column; flex:1; font-family:Inter,system-ui,sans-serif; color:var(--text-primary); min-height:0; }

  .est-last-upd { display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); }
  .est-last-upd svg { width:13px; height:13px; }
  .est-last-upd svg.spin { animation:est-spin 1s linear infinite; }
  @keyframes est-spin { to{transform:rotate(360deg)} }

  .est-content { padding:20px 24px; flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:14px; }

  .est-kpi-row { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
  .est-kpi {
    background:var(--bg-surface); border:1px solid #2a3040; border-radius:14px;
    padding:16px; display:flex; flex-direction:column; gap:10px;
    transition:border-color .15s;
  }
  .est-kpi:hover { border-color:var(--border-light); }
  .est-kpi-icon { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .est-kpi-icon svg { width:16px; height:16px; }
  .est-kpi-val  { font-size:28px; font-weight:900; line-height:1; }
  .est-kpi-lbl  { font-size:11px; color:var(--text-muted); margin-top:1px; }
  .est-kpi-bar  { height:4px; background:#2a3040; border-radius:2px; overflow:hidden; }
  .est-kpi-fill { height:100%; border-radius:2px; }

  .est-charts-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .est-card {
    background:var(--bg-surface); border:1px solid #2a3040; border-radius:14px; overflow:hidden;
  }
  .est-card-hdr { padding:14px 18px 12px; border-bottom:1px solid #2a3040; }
  .est-card-hdr h3 { font-size:13px; font-weight:700; color:var(--text-primary); margin:0; }
  .est-card-hdr p  { font-size:11px; color:var(--text-muted); margin:3px 0 0; }
  .est-card-body { padding:16px 18px; }

  .est-skeleton {
    border-radius:6px;
    background:linear-gradient(90deg,var(--bg-surface) 25%,var(--bg-hover) 50%,var(--bg-surface) 75%);
    background-size:200% 100%;
    animation:est-shimmer 1.4s infinite;
  }
  .est-empty { display:flex; align-items:center; justify-content:center; font-size:12px; color:var(--text-muted); }

  @media(max-width:900px){ .est-charts-row { grid-template-columns:1fr; } .est-kpi-row { grid-template-columns:repeat(2,1fr); } }
  @media(max-width:768px){ .est-content { padding:14px; } .est-topbar { padding:0 14px; } }
  @media(max-width:480px){ .est-kpi-row { grid-template-columns:1fr 1fr; } }
`

const tooltipStyle = {
  background: 'var(--bg-surface)',
  border: '1px solid #2a3040',
  borderRadius: 8,
  color: 'var(--text-primary)',
  fontSize: 12,
}
const axisStyle = { fill: 'var(--text-muted)', fontSize: 11 }

function truncate(s: string, n = 10) { return s.length > n ? s.slice(0, n) + '…' : s }

function SkeletonChart({ h = 200 }: { h?: number }) {
  return <div className="est-skeleton" style={{ height: h }} />
}

// ── Interfaz para datos del profesor ─────────────────────────────────────────

interface ProfesorMateriaStat {
  materia_id: number
  materia_nombre: string
  total_alumnos: number
  total_notas: number
  promedio_grupo: number
  distribucion: Record<string, number>
  aprobados: number
  en_riesgo: number
}

interface ProfesorEstadisticas {
  kpis: {
    promedio_general: number | null
    aprobacion_pct: number | null
    asistencia_promedio: number | null
    total_alumnos: number
    materias_activas: number
  }
  materias: ProfesorMateriaStat[]
  asistencia_por_materia: { materia_id: number; materia_nombre: string; asistencia_pct: number }[]
  alertas: { user_id: number; nombre: string; inasistencia_pct: number; promedio: number | null }[]
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function Estadisticas() {
  const user = getCurrentUser()
  const esAdmin = user?.role === 'admin'
  const esProfesor = user?.role === 'profesor'

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ProfesorEstadisticas | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    try {
      if (esAdmin) {
        const res = await api.get<{
          kpis: { promedio_general: number; aprobacion_pct: number; asistencia_pct: number; alumnos_activos: number }
          materias: {
            materia_id: number; materia_nombre: string; total_alumnos: number; total_notas: number
            promedio_grupo: number; distribucion: Record<string, number>; aprobados: number; en_riesgo: number
          }[]
          asistencia_por_materia: { materia_id: number; materia_nombre: string; asistencia_pct: number }[]
          alertas: { user_id: number; nombre: string; inasistencia_pct: number; promedio: number | null }[]
        }>('/reportes/dashboard')
        setData({
          kpis: {
            promedio_general: res.kpis.promedio_general,
            aprobacion_pct: res.kpis.aprobacion_pct,
            asistencia_promedio: res.kpis.asistencia_pct,
            total_alumnos: res.kpis.alumnos_activos,
            materias_activas: res.materias.length,
          },
          materias: res.materias,
          asistencia_por_materia: res.asistencia_por_materia,
          alertas: res.alertas,
        })
      } else {
        const dash = await api.get<{
          resumen: { materias_activas: number; total_alumnos: number; promedio_general: number | null; porcentaje_aprobacion: number | null; asistencia_promedio: number | null }
          materias: { id: number; nombre: string; oferta_id: number; codigo: string | null; cantidad_alumnos: number; promedio: number | null }[]
          alertas: { alumno_id: number; alumno_nombre: string; inasistencia_pct: number; materia_nombre: string }[]
        }>('/profesor/dashboard')

        const materiasConStats = await Promise.all(
          dash.materias.map(async m => {
            let total_notas = 0
            let distribucion: Record<string, number> = { '0-3': 0, '3-5': 0, '5-6': 0, '6-7': 0, '7-9': 0, '9-10': 0 }
            let aprobados = 0
            let en_riesgo = 0
            let asistencia = 0
            try {
              const stats = await api.get<{
                total_alumnos: number; total_notas: number; promedio_grupo: number
                distribucion: Record<string, number>; aprobados: number; en_riesgo: number
              }>(`/puntajes/materia/${m.id}/estadisticas`)
              total_notas = stats.total_notas ?? 0
              distribucion = stats.distribucion || distribucion
              aprobados = stats.aprobados ?? 0
              en_riesgo = stats.en_riesgo ?? 0
            } catch { /* sin notas */ }
            try {
              const alumnos = await api.get<{ porcentaje: number }[]>(`/asistencias/materia/${m.id}/alumnos`)
              asistencia = alumnos.length ? Math.round(alumnos.reduce((s, a) => s + (a.porcentaje ?? 0), 0) / alumnos.length) : 0
            } catch { /* ok */ }
            return {
              materia_id: m.id,
              materia_nombre: m.nombre,
              total_alumnos: m.cantidad_alumnos,
              total_notas,
              promedio_grupo: m.promedio ?? 0,
              distribucion,
              aprobados,
              en_riesgo,
              asistencia_pct: asistencia,
            }
          })
        )

        setData({
          kpis: {
            promedio_general: dash.resumen.promedio_general,
            aprobacion_pct: dash.resumen.porcentaje_aprobacion,
            asistencia_promedio: dash.resumen.asistencia_promedio,
            total_alumnos: dash.resumen.total_alumnos,
            materias_activas: dash.resumen.materias_activas,
          },
          materias: materiasConStats,
          asistencia_por_materia: materiasConStats.map(m => ({
            materia_id: m.materia_id,
            materia_nombre: m.materia_nombre,
            asistencia_pct: m.asistencia_pct,
          })),
          alertas: dash.alertas.map(a => ({
            user_id: a.alumno_id,
            nombre: a.alumno_nombre,
            inasistencia_pct: a.inasistencia_pct,
            promedio: null,
          })),
        })
      }
      setError(null)
      setLastUpdate(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar estadísticas')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [esAdmin])

  useEffect(() => {
    const run = () => load()
    run()
    const id = setInterval(() => load(), POLL_MS)
    return () => clearInterval(id)
  }, [load])

  const sinDatos = !loading && !error && data?.materias.every(m => (m.total_notas ?? 0) === 0)

  const kpis = data?.kpis ?? {
    promedio_general: null,
    aprobacion_pct: null,
    asistencia_promedio: null,
    total_alumnos: 0,
    materias_activas: 0,
  }

  const promVal = kpis.promedio_general ?? 0
  const aprobVal = kpis.aprobacion_pct ?? 0
  const asistVal = kpis.asistencia_promedio ?? 0

  // ── Bar chart: promedio por materia ──
  const barData = (data?.materias ?? [])
    .filter(m => (m.total_notas ?? 0) > 0)
    .map(m => ({ name: truncate(m.materia_nombre), promedio: m.promedio_grupo }))

  // ── Pie chart: distribución global ──
  const pieData = useMemo(() => {
    if (!data) return []
    const b = { excelente: 0, bueno: 0, regular: 0, riesgo: 0 }
    for (const m of data.materias) {
      const d = m.distribucion
      b.excelente += d['9-10'] ?? 0
      b.bueno     += d['7-9']  ?? 0
      b.regular   += d['6-7']  ?? 0
      b.riesgo    += (d['5-6'] ?? 0) + (d['3-5'] ?? 0) + (d['0-3'] ?? 0)
    }
    return [
      { name: 'Excelente (≥9)', value: b.excelente, color: GREEN  },
      { name: 'Bueno (≥7)',     value: b.bueno,     color: CYAN   },
      { name: 'Regular (≥6)',   value: b.regular,   color: YELLOW },
      { name: 'En riesgo (<6)', value: b.riesgo,    color: RED    },
    ].filter(d => d.value > 0)
  }, [data])

  // ── Line chart: asistencia por materia ──
  const lineData = (data?.asistencia_por_materia ?? [])
    .map(m => ({ name: truncate(m.materia_nombre), asistencia: m.asistencia_pct }))

  const alertas = data?.alertas ?? []

  const kpiCards = [
    {
      label: 'Promedio general',
      value: loading ? '—' : String(promVal),
      color: CYAN,
      bg:    'var(--accent-muted)',
      bar:   Math.min(promVal / 10 * 100, 100),
    },
    {
      label: 'Aprobación',
      value: loading ? '—' : `${aprobVal}%`,
      color: GREEN,
      bg:    '#22c55e15',
      bar:   aprobVal,
    },
    {
      label: 'Asistencia',
      value: loading ? '—' : `${asistVal}%`,
      color: YELLOW,
      bg:    '#f59e0b15',
      bar:   asistVal,
    },
    {
      label: 'Alumnos',
      value: loading ? '—' : String(kpis.total_alumnos),
      color: '#a855f7',
      bg:    '#a855f715',
      bar:   100,
    },
  ]

  return (
    <>
      <style>{css}</style>
      <div className="est-root">

        <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '4px 24px 0', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title" style={{ fontSize: 27 }}>
              {esProfesor ? 'Estadísticas de Cátedra' : 'Estadísticas Institucionales'}
            </h1>
            <p className="page-subtitle">
              {esProfesor
                ? 'Rendimiento, asistencia y alertas de tus materias activas.'
                : 'Vista completa de KPIs institucionales y estabilidad académica.'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {lastUpdate && (
              <span className="est-last-upd">
                <svg className={refreshing ? 'spin' : ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                {lastUpdate.toLocaleTimeString('es-PY')}
              </span>
            )}
            <button className="btn-ghost" onClick={() => load(true)} disabled={refreshing}>
              <i className="ti ti-refresh" /> {refreshing ? 'Actualizando…' : 'Actualizar'}
            </button>
          </div>
        </header>

        <div className="est-content">

          {error && (
            <div className="est-card" style={{ padding: 16, borderColor: RED, color: RED, fontSize: 13 }}>
              <strong>Error:</strong> {error}
              {error.toLowerCase().includes('no autorizado') && esProfesor && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                  La página de Estadísticas del profesor usa sus propios datos de cátedra.
                  Si el error persiste, contactá al administrador.
                </div>
              )}
            </div>
          )}

          {sinDatos && (
            <div className="est-card" style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
              Sin notas cargadas todavía. Las estadísticas aparecerán cuando haya evaluaciones registradas.
            </div>
          )}

          <div className="est-kpi-row">
            {kpiCards.map(k => (
              <div key={k.label} className="est-kpi">
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
                  <div className="est-kpi-icon" style={{ background:k.bg }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke={k.color} strokeWidth="2" style={{ width:16, height:16 }}>
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                </div>
                <div>
                  <div className="est-kpi-val" style={{ color:k.color }}>{k.value}</div>
                  <div className="est-kpi-lbl">{k.label}</div>
                </div>
                <div className="est-kpi-bar">
                  <div className="est-kpi-fill" style={{ width:`${loading ? 0 : k.bar}%`, background:k.color, transition:'width .6s ease' }} />
                </div>
              </div>
            ))}
          </div>

          <div className="est-charts-row">

            <div className="est-card">
              <div className="est-card-hdr">
                <h3>Promedio por materia</h3>
                <p>Promedio general de cada asignatura</p>
              </div>
              <div className="est-card-body">
                {loading ? (
                  <SkeletonChart h={220} />
                ) : barData.length === 0 ? (
                  <div className="est-empty" style={{ height:220 }}>Sin datos de puntajes.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={barData} margin={{ top:4, right:8, left:-20, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a3040" vertical={false} />
                      <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 10]} tick={axisStyle} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill:'#2a304055' }} formatter={(value) => [String(value ?? ''), 'Promedio']} />
                      <Bar dataKey="promedio" fill={CYAN} radius={[5, 5, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="est-card">
              <div className="est-card-hdr">
                <h3>Distribución de notas</h3>
                <p>Por rango de calificación</p>
              </div>
              <div className="est-card-body">
                {loading ? (
                  <SkeletonChart h={220} />
                ) : pieData.length === 0 ? (
                  <div className="est-empty" style={{ height:220 }}>Sin datos de puntajes.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="45%"
                        outerRadius={78} innerRadius={38} paddingAngle={3} strokeWidth={0}>
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [String(value ?? ''), String(name)]} />
                      <Legend iconType="circle" iconSize={8} formatter={(value: string) => (
                        <span style={{ color:'var(--text-secondary)', fontSize:11 }}>{value}</span>
                      )} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>

          <div className="est-card">
            <div className="est-card-hdr">
              <h3>Asistencia por materia</h3>
              <p>Porcentaje de presencia registrada por asignatura</p>
            </div>
            <div className="est-card-body">
              {loading ? (
                <SkeletonChart h={200} />
              ) : lineData.length === 0 ? (
                <div className="est-empty" style={{ height:200 }}>Sin registros de asistencia.</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={lineData} margin={{ top:4, right:16, left:-20, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a3040" vertical={false} />
                    <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ stroke:'#2a3040', strokeWidth:1 }} formatter={(value) => [`${String(value ?? '')}%`, 'Asistencia']} />
                    <Line type="monotone" dataKey="asistencia" stroke={GREEN} strokeWidth={2}
                      dot={{ fill:GREEN, r:4, strokeWidth:0 }} activeDot={{ r:6, fill:GREEN, stroke:'var(--bg-surface)', strokeWidth:2 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="est-card">
            <div className="est-card-hdr" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Alertas de Inasistencia</h3>
              <span className="mono-label" style={{ color: 'var(--accent-bright)' }}>
                {esProfesor ? 'Tus materias' : 'Todas las materias'}
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table-uca">
                <thead>
                  <tr><th>Estudiante</th><th>Inasistencia</th><th style={{ textAlign: 'right' }}>Riesgo</th></tr>
                </thead>
                <tbody>
                  {alertas.length === 0 ? (
                    <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12.5 }}>Sin alertas críticas este período.</td></tr>
                  ) : alertas.map(r => {
                    const nivel = r.inasistencia_pct >= 25
                      ? { l: 'ALTO', c: 'var(--danger)', bg: 'var(--danger-subtle)' }
                      : r.inasistencia_pct >= 15
                        ? { l: 'MEDIO', c: 'var(--warning)', bg: 'var(--warning-subtle)' }
                        : { l: 'BAJO', c: 'var(--success)', bg: 'var(--success-subtle)' }
                    return (
                      <tr key={r.user_id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span className="avatar-initials" style={{ width: 28, height: 28, fontSize: 10 }}>#</span>
                            <span style={{ fontWeight: 700, fontSize: 13 }}>{r.nombre}</span>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: nivel.c }}>{r.inasistencia_pct}%</td>
                        <td style={{ textAlign: 'right' }}><span className="badge" style={{ background: nivel.bg, color: nivel.c }}>{nivel.l}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
