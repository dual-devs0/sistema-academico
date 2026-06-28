import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from 'recharts'
import { api } from '../lib/api'

interface Puntaje   { id: number; user_id: number; materia_id: number; tipo: string; valor: number }
interface Materia   { id: number; nombre: string; profesor_id: number; carrera_id: number | null; anio: number | null; semestre: number | null }
interface Asistencia{ id: number; user_id: number; materia_id: number; fecha: string; presente: boolean }

const MOCK_PUNTAJES: Puntaje[] = [
  { id:1, user_id:1, materia_id:1, tipo:'parcial1', valor:8.5 },
  { id:2, user_id:1, materia_id:1, tipo:'parcial2', valor:7.0 },
  { id:3, user_id:2, materia_id:1, tipo:'parcial1', valor:6.0 },
  { id:4, user_id:2, materia_id:2, tipo:'parcial1', valor:9.5 },
  { id:5, user_id:3, materia_id:2, tipo:'parcial1', valor:4.5 },
  { id:6, user_id:3, materia_id:1, tipo:'final',    valor:7.5 },
  { id:7, user_id:4, materia_id:3, tipo:'parcial1', valor:8.0 },
  { id:8, user_id:5, materia_id:3, tipo:'parcial1', valor:5.5 },
]
const MOCK_MATERIAS: Materia[] = [
  { id:1, nombre:'Programación I',  profesor_id:1, carrera_id:1, anio:1, semestre:1 },
  { id:2, nombre:'Matemática',      profesor_id:1, carrera_id:1, anio:1, semestre:1 },
  { id:3, nombre:'Física',          profesor_id:2, carrera_id:1, anio:1, semestre:1 },
]
const MOCK_ASISTENCIAS: Asistencia[] = [
  { id:1, user_id:1, materia_id:1, fecha:'2026-03-01', presente:true  },
  { id:2, user_id:1, materia_id:1, fecha:'2026-03-08', presente:true  },
  { id:3, user_id:2, materia_id:1, fecha:'2026-03-01', presente:false },
  { id:4, user_id:2, materia_id:2, fecha:'2026-03-01', presente:true  },
  { id:5, user_id:3, materia_id:2, fecha:'2026-03-01', presente:false },
  { id:6, user_id:3, materia_id:3, fecha:'2026-03-01', presente:true  },
  { id:7, user_id:4, materia_id:3, fecha:'2026-03-01', presente:true  },
  { id:8, user_id:5, materia_id:3, fecha:'2026-03-08', presente:false },
]

const CYAN   = '#00b4d8'
const GREEN  = '#22c55e'
const YELLOW = '#f59e0b'
const RED    = '#ef4444'

const css = `
  *, *::before, *::after { box-sizing:border-box; }
  @keyframes est-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

  .est-root { display:flex; flex-direction:column; flex:1; font-family:Inter,system-ui,sans-serif; color:#f0f4f8; min-height:0; }

  .est-topbar {
    display:flex; align-items:center; padding:0 24px; height:56px;
    border-bottom:1px solid #1e2d3d; background:#0b0f14;
    position:sticky; top:0; z-index:20; flex-shrink:0;
  }
  .est-topbar h1 { font-size:17px; font-weight:700; color:#f0f4f8; letter-spacing:-.01em; margin:0; }
  .est-topbar p  { font-size:12px; color:#506070; margin:2px 0 0; }

  .est-content { padding:20px 24px; flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:14px; }

  .est-kpi-row { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
  .est-kpi {
    background:#131920; border:1px solid #1e2d3d; border-radius:14px;
    padding:16px; display:flex; flex-direction:column; gap:10px;
    transition:border-color .15s;
  }
  .est-kpi:hover { border-color:#243447; }
  .est-kpi-icon { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .est-kpi-icon svg { width:16px; height:16px; }
  .est-kpi-val  { font-size:28px; font-weight:900; line-height:1; }
  .est-kpi-lbl  { font-size:11px; color:#506070; margin-top:1px; }
  .est-kpi-bar  { height:4px; background:#1e2d3d; border-radius:2px; overflow:hidden; }
  .est-kpi-fill { height:100%; border-radius:2px; }

  .est-charts-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .est-card {
    background:#131920; border:1px solid #1e2d3d; border-radius:14px; overflow:hidden;
  }
  .est-card-hdr { padding:14px 18px 12px; border-bottom:1px solid #1e2d3d; }
  .est-card-hdr h3 { font-size:13px; font-weight:700; color:#f0f4f8; margin:0; }
  .est-card-hdr p  { font-size:11px; color:#506070; margin:3px 0 0; }
  .est-card-body { padding:16px 18px; }

  .est-skeleton {
    border-radius:6px;
    background:linear-gradient(90deg,#131920 25%,#1a2230 50%,#131920 75%);
    background-size:200% 100%;
    animation:est-shimmer 1.4s infinite;
  }
  .est-empty { display:flex; align-items:center; justify-content:center; font-size:12px; color:#506070; }

  @media(max-width:900px){ .est-charts-row { grid-template-columns:1fr; } .est-kpi-row { grid-template-columns:repeat(2,1fr); } }
  @media(max-width:768px){ .est-content { padding:14px; } .est-topbar { padding:0 14px; } }
  @media(max-width:480px){ .est-kpi-row { grid-template-columns:1fr 1fr; } }
`

const tooltipStyle = {
  background: '#131920',
  border: '1px solid #1e2d3d',
  borderRadius: 8,
  color: '#f0f4f8',
  fontSize: 12,
}
const axisStyle = { fill: '#506070', fontSize: 11 }

function truncate(s: string, n = 10) { return s.length > n ? s.slice(0, n) + '…' : s }

function SkeletonChart({ h = 200 }: { h?: number }) {
  return <div className="est-skeleton" style={{ height: h }} />
}

export default function Estadisticas() {
  const [loading,     setLoading]     = useState(true)
  const [puntajes,    setPuntajes]    = useState<Puntaje[]>([])
  const [materias,    setMaterias]    = useState<Materia[]>([])
  const [asistencias, setAsistencias] = useState<Asistencia[]>([])

  useEffect(() => {
    Promise.allSettled([
      api.get<Puntaje[]>('/puntajes/'),
      api.get<Materia[]>('/materias/'),
      api.get<Asistencia[]>('/asistencias/'),
    ]).then(([pR, mR, aR]) => {
      setPuntajes(pR.status    === 'fulfilled' && pR.value?.length    ? pR.value    : MOCK_PUNTAJES)
      setMaterias(mR.status   === 'fulfilled' && mR.value?.length    ? mR.value    : MOCK_MATERIAS)
      setAsistencias(aR.status === 'fulfilled' && aR.value?.length   ? aR.value    : MOCK_ASISTENCIAS)
    }).finally(() => setLoading(false))
  }, [])

  // KPI computations
  const kpis = useMemo(() => {
    if (!puntajes.length) return { promedio: 0, aprobacion: 0, alumnos: 0 }
    const vals = puntajes.map(p => Number(p.valor))
    return {
      promedio:   Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10,
      aprobacion: Math.round(vals.filter(v => v >= 6).length / vals.length * 100),
      alumnos:    new Set(puntajes.map(p => p.user_id)).size,
    }
  }, [puntajes])

  const asistenciaPct = useMemo(() => {
    if (!asistencias.length) return 0
    return Math.round(asistencias.filter(a => a.presente).length / asistencias.length * 100)
  }, [asistencias])

  // BarChart: promedio por materia
  const barData = useMemo(() => {
    const sums: Record<number, { sum: number; n: number }> = {}
    for (const p of puntajes) {
      if (!sums[p.materia_id]) sums[p.materia_id] = { sum: 0, n: 0 }
      sums[p.materia_id].sum += Number(p.valor)
      sums[p.materia_id].n++
    }
    const matMap: Record<number, string> = {}
    for (const m of materias) matMap[m.id] = m.nombre
    return Object.entries(sums).map(([mid, s]) => ({
      name:     truncate(matMap[Number(mid)] ?? `Mat.${mid}`),
      promedio: Math.round(s.sum / s.n * 10) / 10,
    }))
  }, [puntajes, materias])

  // PieChart: distribución de notas
  const pieData = useMemo(() => {
    const b = { excelente: 0, bueno: 0, regular: 0, riesgo: 0 }
    for (const p of puntajes) {
      const v = Number(p.valor)
      if (v >= 9)      b.excelente++
      else if (v >= 7) b.bueno++
      else if (v >= 6) b.regular++
      else             b.riesgo++
    }
    return [
      { name: 'Excelente (≥9)', value: b.excelente, color: GREEN  },
      { name: 'Bueno (≥7)',     value: b.bueno,     color: CYAN   },
      { name: 'Regular (≥6)',   value: b.regular,   color: YELLOW },
      { name: 'En riesgo (<6)', value: b.riesgo,    color: RED    },
    ].filter(d => d.value > 0)
  }, [puntajes])

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
      bg:    '#00b4d815',
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

        <header className="est-topbar">
          <div>
            <h1>Estadísticas</h1>
            <p>Semestre 1 · 2026</p>
          </div>
        </header>

        <div className="est-content">

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
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" vertical={false} />
                      <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 10]} tick={axisStyle} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        cursor={{ fill:'#1e2d3d55' }}
                        formatter={(v: number) => [v, 'Promedio']}
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
                        formatter={(v: number, name: string) => [v, name]}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        formatter={(value: string) => (
                          <span style={{ color:'#8fa3b8', fontSize:11 }}>{value}</span>
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" vertical={false} />
                    <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ stroke:'#1e2d3d', strokeWidth:1 }}
                      formatter={(v: number) => [`${v}%`, 'Asistencia']}
                    />
                    <Line
                      type="monotone"
                      dataKey="asistencia"
                      stroke={GREEN}
                      strokeWidth={2}
                      dot={{ fill:GREEN, r:4, strokeWidth:0 }}
                      activeDot={{ r:6, fill:GREEN, stroke:'#131920', strokeWidth:2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
