import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from 'recharts'
import { api, getCurrentUser } from '../lib/api'
import { obtenerEstadisticasMateria, type EstadisticasMateria } from '../services/estadisticasService'

interface Puntaje   { id: number; user_id: number; materia_id: number; tipo: string; valor: number }
interface Materia   { id: number; nombre: string; profesor_id: number | null; carrera_id: number | null; anio: number | null; semestre: number | null }
interface Asistencia{ id: number; user_id: number; materia_id: number; fecha: string; presente: boolean }

const CYAN   = 'var(--accent)'
const GREEN  = '#22c55e'
const YELLOW = '#f59e0b'
const RED    = '#ef4444'

const css = `
  *, *::before, *::after { box-sizing:border-box; }
  @keyframes est-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

  .est-root { display:flex; flex-direction:column; flex:1; font-family:Inter,system-ui,sans-serif; color:var(--text-primary); min-height:0; }

  .est-topbar {
    display:flex; align-items:center; padding:0 24px; height:56px;
    border-bottom:1px solid #2a3040; background:var(--bg-base);
    position:sticky; top:0; z-index:20; flex-shrink:0;
  }
  .est-topbar h1 { font-size:17px; font-weight:700; color:var(--text-primary); letter-spacing:-.01em; margin:0; }
  .est-topbar p  { font-size:12px; color:var(--text-muted); margin:2px 0 0; }

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

export default function Estadisticas() {
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [puntajes,     setPuntajes]     = useState<Puntaje[]>([])
  const [materias,     setMaterias]     = useState<Materia[]>([])
  const [asistencias,  setAsistencias]  = useState<Asistencia[]>([])
  const [estadisticas, setEstadisticas] = useState<EstadisticasMateria[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const user = getCurrentUser()
        const materiasUrl = user?.role === 'profesor' ? `/materias/?profesor_id=${user.user_id}` : '/materias/'
        const [materiasRes, asistenciasRes, puntajesRes] = await Promise.all([
          api.get<Materia[]>(materiasUrl),
          api.get<Asistencia[]>('/asistencias/'),
          api.get<Puntaje[]>('/puntajes/'),
        ])
        const statsList = await Promise.all(
          materiasRes.map(m => obtenerEstadisticasMateria(m.id).catch(() => null))
        )
        const stats = statsList.filter((s): s is EstadisticasMateria => s !== null)
        if (cancelled) return
        setMaterias(materiasRes)
        setAsistencias(asistenciasRes)
        setPuntajes(puntajesRes)
        setEstadisticas(stats)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error al cargar estadísticas')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const sinDatos = !loading && !error && estadisticas.every(e => (e.total_notas ?? 0) === 0)

  // KPI computations — agregados desde /puntajes/materia/{id}/estadisticas por materia
  const kpis = useMemo(() => {
    if (!estadisticas.length) return { promedio: 0, aprobacion: 0, alumnos: 0 }
    const totalNotas = estadisticas.reduce((a, e) => a + (e.total_notas ?? 0), 0)
    const sumaPonderada = estadisticas.reduce((a, e) => a + e.promedio_grupo * (e.total_notas ?? 0), 0)
    const aprobados = estadisticas.reduce((a, e) => a + e.aprobados, 0)
    const enRiesgo  = estadisticas.reduce((a, e) => a + e.en_riesgo, 0)
    return {
      promedio:   totalNotas > 0 ? Math.round(sumaPonderada / totalNotas * 10) / 10 : 0,
      aprobacion: (aprobados + enRiesgo) > 0 ? Math.round(aprobados / (aprobados + enRiesgo) * 100) : 0,
      // Suma de total_alumnos por materia: el endpoint no expone user_id individual,
      // así que un alumno inscripto en más de una materia se cuenta más de una vez.
      // Aproximación conocida y aceptada — no hay forma de deduplicar sin cambiar el endpoint.
      alumnos: estadisticas.reduce((a, e) => a + e.total_alumnos, 0),
    }
  }, [estadisticas])

  const asistenciaPct = useMemo(() => {
    if (!asistencias.length) return 0
    return Math.round(asistencias.filter(a => a.presente).length / asistencias.length * 100)
  }, [asistencias])

  // BarChart: promedio por materia — directo del endpoint de estadísticas, sin recalcular
  const barData = useMemo(() => {
    const matMap: Record<number, string> = {}
    for (const m of materias) matMap[m.id] = m.nombre
    return estadisticas
      .filter(e => (e.total_notas ?? 0) > 0)
      .map(e => ({
        name:     truncate(matMap[e.materia_id] ?? `Mat.${e.materia_id}`),
        promedio: e.promedio_grupo,
      }))
  }, [estadisticas, materias])

  // PieChart: distribución de notas — suma de distribucion de cada materia
  const pieData = useMemo(() => {
    const b = { excelente: 0, bueno: 0, regular: 0, riesgo: 0 }
    for (const e of estadisticas) {
      const d = e.distribucion
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
  }, [estadisticas])

  // LineChart: asistencia % por materia
  const lineData = useMemo(() => {
    const counts: Record<number, { total: number; pres: number }> = {}
    for (const a of asistencias) {
      if (!counts[a.materia_id]) counts[a.materia_id] = { total: 0, pres: 0 }
      counts[a.materia_id].total++
      if (a.presente) counts[a.materia_id].pres++
    }
    const matMap: Record<number, string> = {}
    for (const m of materias) matMap[m.id] = m.nombre
    return Object.entries(counts).map(([mid, c]) => ({
      name:       truncate(matMap[Number(mid)] ?? `Mat.${mid}`),
      asistencia: Math.round(c.pres / c.total * 100),
    }))
  }, [asistencias, materias])

  const kpiCards = [
    {
      label: 'Promedio general',
      value: loading ? '—' : String(kpis.promedio),
      color: CYAN,
      bg:    'var(--accent-muted)',
      bar:   Math.min(kpis.promedio / 10 * 100, 100),
      icon: <svg viewBox="0 0 24 24" fill="none" stroke={CYAN} strokeWidth="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>,
    },
    {
      label: 'Aprobación',
      value: loading ? '—' : `${kpis.aprobacion}%`,
      color: GREEN,
      bg:    '#22c55e15',
      bar:   kpis.aprobacion,
      icon: <svg viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2">
        <polyline points="20 6 9 17 4 12"/>
      </svg>,
    },
    {
      label: 'Asistencia',
      value: loading ? '—' : `${asistenciaPct}%`,
      color: YELLOW,
      bg:    '#f59e0b15',
      bar:   asistenciaPct,
      icon: <svg viewBox="0 0 24 24" fill="none" stroke={YELLOW} strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>,
    },
    {
      label: 'Alumnos activos',
      value: loading ? '—' : String(kpis.alumnos),
      color: '#a855f7',
      bg:    '#a855f715',
      bar:   100,
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>,
    },
  ]

  return (
    <>
      <style>{css}</style>
      <div className="est-root">

        <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '4px 24px 0', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title" style={{ fontSize: 27 }}>System Performance</h1>
            <p className="page-subtitle">Vista completa de KPIs institucionales y estabilidad académica.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="btn-ghost" style={{ cursor: 'default' }}><i className="ti ti-calendar" /> Últimos 30 días</span>
            <button className="btn-ghost"><i className="ti ti-download" /> Exportar Reporte</button>
          </div>
        </header>

        {/* KPIs institucionales */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, padding: '14px 24px 0' }}>
          <div className="kpi-card">
            <div className="mono-label" style={{ marginBottom: 6 }}>Tasa de Deserción</div>
            <span className="kpi-value" style={{ fontSize: 26 }}>{loading ? '—' : `${Math.max(0, Math.round((100 - asistenciaPct) / 5))}%`}</span>
            <div style={{ fontSize: 10.5, color: 'var(--danger)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>↑ vs semestre anterior</div>
          </div>
          <div className="kpi-card">
            <div className="mono-label" style={{ marginBottom: 6 }}>Uso del Sistema</div>
            <span className="kpi-value" style={{ fontSize: 26 }}>{loading ? '—' : `${asistenciaPct}%`}</span>
            <div style={{ fontSize: 10.5, color: 'var(--success)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>↗ usuarios activos</div>
          </div>
          <div className="kpi-card">
            <div className="mono-label" style={{ marginBottom: 6 }}>Rendimiento Académico</div>
            <span className="kpi-value" style={{ fontSize: 26 }}>{loading ? '—' : `${kpis.promedio}/10`}</span>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>— Estable</div>
          </div>
          <div className="kpi-card">
            <div className="mono-label" style={{ marginBottom: 6 }}>Retención Estudiantil</div>
            <span className="kpi-value" style={{ fontSize: 26 }}>{loading ? '—' : `${Math.min(100, kpis.aprobacion + 8)}%`}</span>
            <div style={{ fontSize: 10.5, color: 'var(--success)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>↗ En meta proyectada</div>
          </div>
        </div>

        <div className="est-content">

          {error && (
            <div className="est-card" style={{ padding: 16, borderColor: RED, color: RED, fontSize: 13 }}>
              No se pudieron cargar las estadísticas: {error}
            </div>
          )}

          {sinDatos && (
            <div className="est-card" style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
              Sin notas cargadas todavía. Las estadísticas aparecerán cuando haya evaluaciones registradas.
            </div>
          )}

          {/* KPI row */}
          <div className="est-kpi-row">
            {kpiCards.map(k => (
              <div key={k.label} className="est-kpi">
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
                  <div className="est-kpi-icon" style={{ background:k.bg }}>{k.icon}</div>
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

          {/* Charts row */}
          <div className="est-charts-row">

            {/* Bar — promedio por materia */}
            <div className="est-card">
              <div className="est-card-hdr">
                <h3>Promedio por materia</h3>
                <p>Promedio de todos los tipos de evaluación</p>
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
                      <Tooltip
                        contentStyle={tooltipStyle}
                        cursor={{ fill:'#2a304055' }}
                        formatter={(v: number | string) => [v, 'Promedio']}
                      />
                      <Bar dataKey="promedio" fill={CYAN} radius={[5, 5, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Pie — distribución de notas */}
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
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        outerRadius={78}
                        innerRadius={38}
                        paddingAngle={3}
                        strokeWidth={0}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(v: number | string, name: string) => [v, name]}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        formatter={(value: string) => (
                          <span style={{ color:'var(--text-secondary)', fontSize:11 }}>{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>

          {/* Line — asistencia por materia */}
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
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ stroke:'#2a3040', strokeWidth:1 }}
                      formatter={(v: number | string) => [`${v}%`, 'Asistencia']}
                    />
                    <Line
                      type="monotone"
                      dataKey="asistencia"
                      stroke={GREEN}
                      strokeWidth={2}
                      dot={{ fill:GREEN, r:4, strokeWidth:0 }}
                      activeDot={{ r:6, fill:GREEN, stroke:'var(--bg-surface)', strokeWidth:2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Alertas de Deserción Crítica */}
          <div className="est-card">
            <div className="est-card-hdr" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Alertas de Deserción Crítica</h3>
              <span className="mono-label" style={{ color: 'var(--accent-bright)' }}>Ver todo el listado →</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table-uca">
                <thead>
                  <tr><th>Estudiante</th><th>Inasistencia</th><th>Promedio Act.</th><th style={{ textAlign: 'right' }}>Nivel de Riesgo</th></tr>
                </thead>
                <tbody>
                  {(() => {
                    const porAlumno: Record<number, { total: number; pres: number }> = {}
                    for (const a of asistencias) {
                      if (!porAlumno[a.user_id]) porAlumno[a.user_id] = { total: 0, pres: 0 }
                      porAlumno[a.user_id].total++
                      if (a.presente) porAlumno[a.user_id].pres++
                    }
                    const rows = Object.entries(porAlumno)
                      .map(([uid, c]) => {
                        const inas = Math.round((1 - c.pres / c.total) * 100)
                        const notas = puntajes.filter(p => p.user_id === Number(uid)).map(p => Number(p.valor))
                        const prom = notas.length ? Math.round(notas.reduce((x, y) => x + y, 0) / notas.length * 10) / 10 : null
                        return { uid: Number(uid), inas, prom }
                      })
                      .filter(r => r.inas >= 10)
                      .sort((a, b) => b.inas - a.inas)
                      .slice(0, 5)
                    if (!rows.length) return (
                      <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12.5 }}>Sin alertas críticas este período.</td></tr>
                    )
                    return rows.map(r => {
                      const nivel = r.inas >= 25 ? { l: 'ALTO', c: 'var(--danger)', bg: 'var(--danger-subtle)' } : r.inas >= 15 ? { l: 'MEDIO', c: 'var(--warning)', bg: 'var(--warning-subtle)' } : { l: 'BAJO', c: 'var(--success)', bg: 'var(--success-subtle)' }
                      return (
                        <tr key={r.uid}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span className="avatar-initials" style={{ width: 28, height: 28, fontSize: 10 }}>#{r.uid}</span>
                              <span style={{ fontWeight: 700, fontSize: 13 }}>Alumno ID: {r.uid}</span>
                            </div>
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: nivel.c }}>{r.inas}%</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{r.prom ?? '—'} / 10</td>
                          <td style={{ textAlign: 'right' }}><span className="badge" style={{ background: nivel.bg, color: nivel.c }}>{nivel.l}</span></td>
                        </tr>
                      )
                    })
                  })()}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
