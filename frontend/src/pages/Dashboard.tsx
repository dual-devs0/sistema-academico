import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser, api, emitHelp } from '../lib/api'
import { obtenerCreditosAlumno, type CreditosAlumnoOut } from '../services/pensumService'
import { obtenerDashboardAdmin, type AdminDashboardData } from '../services/adminService'

/* ── Tipos y datos ─────────────────────────────────────────────── */
type MateriaRow = { nombre: string; profesor: string; ultimaNota: number | null; estado: string }
type EventoRow = { hora: string; titulo: string; lugar: string; enVivo?: boolean }

const materiasMock: MateriaRow[] = [
  { nombre: 'Análisis Matemático II', profesor: 'Dr. Gomez, Roberto', ultimaNota: 9.0, estado: 'REGULAR' },
  { nombre: 'Programación Orientada a Objetos', profesor: 'Ing. Rossi, Lucía', ultimaNota: 8.5, estado: 'REGULAR' },
  { nombre: 'Arquitectura de Computadoras', profesor: 'Lic. Benítez, Mario', ultimaNota: 7.2, estado: 'PROMOCIONANDO' },
  { nombre: 'Historia de la Tecnología', profesor: 'Dra. Sosa, Ana', ultimaNota: null, estado: 'SIN CURSAR' },
]

const eventosMock: EventoRow[] = [
  { hora: '08:00 - 10:00', titulo: 'Análisis Matemático II', lugar: 'Aula Magna B, Piso 2', enVivo: true },
  { hora: '10:30 - 12:30', titulo: 'Arquitectura de Computadoras', lugar: 'Laboratorio de Redes' },
  { hora: '13:00 - 14:00', titulo: 'Almuerzo', lugar: 'Comedor Central' },
  { hora: '15:00 - 17:00', titulo: 'Taller de Programación', lugar: 'Remoto (Teams)' },
]

const estadoBadge: Record<string, { bg: string; color: string }> = {
  REGULAR:        { bg: 'var(--success-subtle)', color: 'var(--success)' },
  PROMOCIONANDO:  { bg: 'var(--accent-muted)', color: 'var(--accent-bright)' },
  PROMOCIONADO:   { bg: 'var(--accent-muted)', color: 'var(--accent-bright)' },
  APROBADO:       { bg: 'var(--info-subtle)', color: 'var(--info)' },
  REPROBADO:      { bg: 'var(--danger-subtle)', color: 'var(--danger)' },
  'SIN CURSAR':   { bg: 'rgba(148,163,184,0.12)', color: 'var(--text-secondary)' },
  'EN CURSO':     { bg: 'var(--accent-muted)', color: 'var(--accent-bright)' },
}

const css = `
  .dash-kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:24px; }
  .dash-grid { display:grid; grid-template-columns:1fr 320px; gap:20px; align-items:start; }
  .greet-banner {
    position:relative; overflow:hidden;
    background:linear-gradient(100deg, var(--bg-surface) 55%, var(--accent-muted));
    border:1px solid var(--border-subtle); border-radius:var(--radius-lg);
    padding:22px 26px; margin-bottom:22px;
    display:flex; align-items:center; justify-content:space-between; gap:16px;
  }
  .greet-icon {
    width:64px; height:64px; border-radius:18px; flex-shrink:0;
    background:linear-gradient(135deg, var(--accent), var(--accent-bright));
    display:flex; align-items:center; justify-content:center;
    font-size:26px; color:#fff; box-shadow:0 10px 30px var(--accent-hover);
  }
  .spark { display:flex; align-items:flex-end; gap:3px; height:26px; }
  .spark span { width:5px; border-radius:2px; background:var(--accent); opacity:.75; }
  .ring { position:relative; width:52px; height:52px; border-radius:50%; display:flex; align-items:center; justify-content:center; }
  .ring svg { position:absolute; inset:0; transform:rotate(-90deg); }
  .tl-item { display:flex; gap:12px; padding:12px 0; position:relative; }
  .tl-dot {
    width:26px; height:26px; border-radius:50%; flex-shrink:0; z-index:1;
    display:flex; align-items:center; justify-content:center;
    background:var(--bg-elevated); border:2px solid var(--border-light); color:var(--text-muted); font-size:11px;
  }
  .tl-dot.live { background:var(--accent-muted); border-color:var(--accent); color:var(--accent-bright); }
  .tl-line { position:absolute; left:12px; top:36px; bottom:-12px; width:2px; background:var(--border-subtle); }
  .dash-access-card {
    cursor:pointer; text-align:left; display:flex; align-items:center; gap:14px;
    padding:16px 18px; border:1px solid var(--border-subtle); transition:border-color .15s;
  }
  .dash-access-card:hover { border-color:var(--accent-hover); }
  .kpi-grid-6 { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:24px; }
  .modulo-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:10px; margin-bottom:24px; }
  .modulo-card {
    display:flex; flex-direction:column; align-items:center; gap:8px;
    padding:18px 12px; border:1px solid var(--border-subtle); border-radius:var(--radius-md);
    cursor:pointer; transition:border-color .15s, transform .1s; text-align:center;
  }
  .modulo-card:hover { border-color:var(--accent-hover); transform:translateY(-1px); }
  .modulo-card i { font-size:24px; }
  .modulo-card span { font-size:12.5px; font-weight:700; }
  .modulo-card small { font-size:10.5px; color:var(--text-secondary); }
  @media(max-width:1024px){ .dash-grid { grid-template-columns:1fr; } .dash-kpis { grid-template-columns:repeat(2,1fr); } .kpi-grid-6 { grid-template-columns:repeat(2,1fr); } }
  @media(max-width:560px){ .dash-kpis { grid-template-columns:1fr 1fr; gap:10px; } .greet-banner{ padding:16px 18px; } .greet-icon{ display:none; } .kpi-grid-6 { grid-template-columns:1fr 1fr; } .modulo-grid { grid-template-columns:repeat(2,1fr); } }
  .skeleton { background:var(--bg-elevated); border-radius:var(--radius-md); animation:pulse 1.5s ease-in-out infinite; }
  @keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:1} }
`

/* ── Sub-vistas por rol ────────────────────────────────────────── */

function Ring({ pct, size = 52 }: { pct: number; size?: number }) {
  const r = (size - 8) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--bg-elevated)" strokeWidth="5" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--accent)" strokeWidth="5" fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} strokeLinecap="round" />
      </svg>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: size > 60 ? 14 : 9, fontWeight: 800, color: 'var(--accent-bright)' }}>{pct}%</span>
    </div>
  )
}

function SkeletonCard({ height = 100 }: { height?: number }) {
  return <div className="skeleton" style={{ height }} />
}

function AlumnoDash({ nombre, materias, eventos, promedio, asistencia, creditos }:
  { nombre: string; materias: MateriaRow[]; eventos: EventoRow[]; promedio: number; asistencia: number; creditos: CreditosAlumnoOut | null }) {
  const navigate = useNavigate()
  const enCurso = materias.filter(m => m.estado !== 'SIN CURSAR').length
  const pctCreditos = creditos?.creditos_totales ? Math.round((creditos.creditos_acumulados / creditos.creditos_totales) * 100) : 0
  return (
    <>
      <div className="greet-banner">
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>¡Hola, {nombre}! 👋</div>
          <div style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>
            Buen día para seguir aprendiendo. Tienes {eventos.length} clases hoy.
          </div>
        </div>
        <div className="greet-icon"><i className="ti ti-sparkles" /></div>
      </div>

      <div className="dash-kpis">
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="mono-label">Promedio General</span>
            <span className="badge" style={{ background: 'var(--success-subtle)', color: 'var(--success)' }}>+0.4</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <span className="kpi-value">{promedio.toFixed(1)}</span>
            <div className="spark">{[10, 14, 9, 17, 13, 20, 24].map((h, i) => <span key={i} style={{ height: h }} />)}</div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="mono-label">Asistencia</span>
            <i className="ti ti-calendar-check" style={{ color: 'var(--accent)', fontSize: 15 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Ring pct={asistencia} />
            <span className="kpi-value">{asistencia}<span className="kpi-unit">%</span></span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="mono-label">Materias en Curso</span>
            <i className="ti ti-book" style={{ color: 'var(--accent)', fontSize: 15 }} />
          </div>
          <span className="kpi-value">{String(enCurso).padStart(2, '0')}</span>
          <span className="kpi-unit" style={{ marginLeft: 8 }}>activas</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="mono-label">TPs Pendientes</span>
            <i className="ti ti-clipboard-text" style={{ color: 'var(--warning)', fontSize: 15 }} />
          </div>
          <span className="kpi-value">03</span>
          <span className="kpi-unit" style={{ marginLeft: 8 }}>esta semana</span>
        </div>
        {creditos && (
          <div className="kpi-card">
            <div className="kpi-top">
              <span className="mono-label">Créditos de Carrera</span>
              <i className="ti ti-hierarchy-3" style={{ color: 'var(--accent)', fontSize: 15 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
              <span className="kpi-value">{creditos.creditos_acumulados}</span>
              <span className="kpi-unit">/ {creditos.creditos_totales ?? '—'}</span>
            </div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${pctCreditos}%` }} /></div>
          </div>
        )}
      </div>

      <div className="dash-grid">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: 19, fontWeight: 800 }}>Materias Semestrales</h2>
            <button onClick={() => navigate('/puntajes')} style={{ background: 'none', border: 'none', color: 'var(--accent-bright)', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              Ver todas →
            </button>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="table-uca">
                <thead>
                  <tr><th>Nombre</th><th>Profesor</th><th>Última Nota</th><th style={{ textAlign: 'right' }}>Estado</th></tr>
                </thead>
                <tbody>
                  {materias.map(m => {
                    const b = estadoBadge[m.estado] ?? estadoBadge['SIN CURSAR']
                    return (
                      <tr key={m.nombre}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span className="avatar-initials" style={{ width: 30, height: 30, borderRadius: 8, fontSize: 12 }}>
                              <i className="ti ti-book-2" />
                            </span>
                            <span style={{ fontWeight: 700, fontSize: 13 }}>{m.nombre}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: 12.5 }}>{m.profesor}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 14 }}>{m.ultimaNota ?? '—'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="badge" style={{ background: b.bg, color: b.color }}>{m.estado}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 12 }}>Timeline de Hoy</h2>
          <div className="card" style={{ padding: '14px 18px' }}>
            {eventos.map((ev, i) => (
              <div key={i} className="tl-item">
                {i < eventos.length - 1 && <div className="tl-line" />}
                <div className={`tl-dot${ev.enVivo ? ' live' : ''}`}>
                  <i className={`ti ${ev.enVivo ? 'ti-player-play-filled' : 'ti-clock'}`} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span className="mono-label" style={{ color: ev.enVivo ? 'var(--accent-bright)' : undefined }}>{ev.hora}</span>
                    {ev.enVivo && <span className="badge" style={{ background: 'var(--accent-muted)', color: 'var(--accent-bright)' }}>EN VIVO</span>}
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{ev.titulo}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{ev.lugar}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginTop: 20 }}>
        <button type="button" onClick={() => navigate('/mi-graduacion')}
          className="card dash-access-card">
          <span style={{ fontSize: 28 }}>🎓</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Mi Graduación</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Verificá tu condición de egreso</div>
          </div>
          <i className="ti ti-chevron-right" style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
        </button>
        <button type="button" onClick={() => navigate('/mis-equivalencias')}
          className="card dash-access-card">
          <span style={{ fontSize: 28 }}>🔄</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Equivalencias</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Solicitud de convalidación de materias</div>
          </div>
          <i className="ti ti-chevron-right" style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
        </button>
        <button type="button" onClick={() => navigate('/mis-pasantias')}
          className="card dash-access-card">
          <span style={{ fontSize: 28 }}>💼</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Pasantías</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Gestioná tus prácticas profesionales</div>
          </div>
          <i className="ti ti-chevron-right" style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
        </button>
        <button type="button" onClick={() => navigate('/tramites')}
          className="card dash-access-card">
          <span style={{ fontSize: 28 }}>📋</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Trámites</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Solicitudes y gestiones académicas</div>
          </div>
          <i className="ti ti-chevron-right" style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
        </button>
      </div>

      <button className="fab" onClick={() => emitHelp()} aria-label="Centro de Ayuda">
        <i className="ti ti-plus" />
      </button>
    </>
  )
}

function ProfesorDash({ nombre, materias, eventos }:
  { nombre: string; materias: MateriaRow[]; eventos: EventoRow[] }) {
  const navigate = useNavigate()
  return (
    <>
      <div className="greet-banner">
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>¡Hola, {nombre}! 👋</div>
          <div style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>
            Tienes {materias.length} cursos activos este ciclo.
          </div>
        </div>
        <div className="greet-icon"><i className="ti ti-school" /></div>
      </div>

      <div className="dash-kpis">
        <div className="kpi-card">
          <div className="kpi-top"><span className="mono-label">Materias Dictadas</span><i className="ti ti-book" style={{ color: 'var(--accent)', fontSize: 15 }} /></div>
          <span className="kpi-value">{String(materias.length).padStart(2, '0')}</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="mono-label">Alumnos Totales</span><i className="ti ti-users" style={{ color: 'var(--accent)', fontSize: 15 }} /></div>
          <span className="kpi-value">—</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="mono-label">Promedio Clase</span><i className="ti ti-chart-bar" style={{ color: 'var(--success)', fontSize: 15 }} /></div>
          <span className="kpi-value">7.8</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="mono-label">Próxima Clase</span><i className="ti ti-clock" style={{ color: 'var(--warning)', fontSize: 15 }} /></div>
          <span className="kpi-value" style={{ fontSize: 22 }}>{eventos[0]?.hora?.split(' ')[0] ?? '—'}</span>
        </div>
      </div>

      <div className="dash-grid">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: 19, fontWeight: 800 }}>Cursos Activos</h2>
            <button onClick={() => navigate('/puntajes')} style={{ background: 'none', border: 'none', color: 'var(--accent-bright)', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              Gestionar notas →
            </button>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table-uca">
              <thead><tr><th>Materia</th><th style={{ textAlign: 'right' }}>Acciones</th></tr></thead>
              <tbody>
                {materias.map(m => (
                  <tr key={m.nombre}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="avatar-initials" style={{ width: 30, height: 30, borderRadius: 8, fontSize: 12 }}><i className="ti ti-book-2" /></span>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{m.nombre}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn-ghost" style={{ padding: '5px 12px', fontSize: 11 }} onClick={() => navigate('/asistencia')}>
                        <i className="ti ti-qrcode" /> Asistencia
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 12 }}>Agenda de Hoy</h2>
          <div className="card" style={{ padding: '14px 18px' }}>
            {eventos.map((ev, i) => (
              <div key={i} className="tl-item">
                {i < eventos.length - 1 && <div className="tl-line" />}
                <div className={`tl-dot${ev.enVivo ? ' live' : ''}`}><i className="ti ti-clock" /></div>
                <div style={{ flex: 1 }}>
                  <span className="mono-label">{ev.hora}</span>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{ev.titulo}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ev.lugar}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

/* ── Admin Dashboard (real data + live polling) ────────────────── */

interface AdminDashProps {
  nombre: string
}

function AdminDash({ nombre }: AdminDashProps) {
  const navigate = useNavigate()
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'gestion' | 'alertas' | 'usuarios'>('gestion')

  useEffect(() => {
    let mounted = true
    const fetchData = async () => {
      try {
        const res = await obtenerDashboardAdmin()
        if (mounted) {
          setData(res)
          setLoading(false)
        }
      } catch {
        if (mounted) setLoading(false)
      }
    }
    fetchData()
    const interval = setInterval(fetchData, 30_000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const modulos = [
    { icon: 'ti-users', color: 'var(--info)', titulo: 'Usuarios y Roles', sub: 'CRUD completo de usuarios', path: '/usuarios', badge: data?.resumen.total_alumnos },
    { icon: 'ti-hierarchy-2', color: 'var(--accent)', titulo: 'Malla Curricular', sub: 'Pensum y correlatividades', path: '/malla' },
    { icon: 'ti-building-bank', color: 'var(--warning)', titulo: 'Finanzas', sub: 'Conceptos, cuotas, pagos, becas', path: '/finanzas' },
    { icon: 'ti-school', color: 'var(--purple)', titulo: 'Asignaciones', sub: 'Profesores a materias', path: '/gestion-asignaciones' },
    { icon: 'ti-file-text', color: 'var(--success)', titulo: 'Expediente', sub: 'Cierre de materias', path: '/expediente' },
    { icon: 'ti-clipboard-list', color: 'var(--orange)', titulo: 'Inscripciones', sub: 'Inscripciones activas', path: '/inscripciones' },
    { icon: 'ti-report-analytics', color: 'var(--danger)', titulo: 'Reportes', sub: 'PDF y estadísticas', path: '/reportes' },
    { icon: 'ti-chart-pie', color: 'var(--info)', titulo: 'Estadísticas', sub: 'Gráficos y análisis', path: '/estadisticas' },
    { icon: 'ti-certificate-2', color: 'var(--accent)', titulo: 'Graduación', sub: 'Candidatos y procesos', path: '/graduacion-admin' },
    { icon: 'ti-briefcase', color: 'var(--warning)', titulo: 'Pasantías', sub: 'Solicitudes y tutorías', path: '/pasantias-admin' },
    { icon: 'ti-arrows-shuffle', color: 'var(--purple)', titulo: 'Equivalencias', sub: 'Convalidación de materias', path: '/equivalencias-admin' },
    { icon: 'ti-file-description', color: 'var(--success)', titulo: 'Trámites', sub: 'Solicitudes pendientes', path: '/tramites', badge: data?.resumen.tramites_pendientes },
    { icon: 'ti-calendar', color: 'var(--orange)', titulo: 'Calendario', sub: 'Eventos académicos', path: '/calendario' },
    { icon: 'ti-messages', color: 'var(--info)', titulo: 'Foro', sub: 'Comunicaciones', path: '/foro' },
  ]

  const roleColor: Record<string, string> = {
    admin: 'var(--danger)',
    profesor: 'var(--info)',
    alumno: 'var(--success)',
  }

  if (loading) {
    return (
      <>
        <div style={{ display: 'flex', gap: 22, alignItems: 'center', marginBottom: 20 }}>
          <SkeletonCard height={84} />
          <div style={{ flex: 1 }}>
            <SkeletonCard height={24} />
            <SkeletonCard height={14} />
          </div>
        </div>
        <div className="kpi-grid-6">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} height={90} />)}
        </div>
      </>
    )
  }

  const r = data!.resumen
  const k = data!.kpis

  return (
    <>
      {/* Hero */}
      <div className="card" style={{ display: 'flex', gap: 22, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="avatar-initials" style={{ width: 84, height: 84, borderRadius: 20, fontSize: 28 }}>
          {(nombre || '?').slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 24, fontWeight: 900 }}>{nombre}</h1>
            <span className="badge" style={{ background: 'var(--accent-muted)', color: 'var(--accent-bright)' }}>Administrador</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 520, marginBottom: 12 }}>
            Panel de control del sistema académico UCA. Gestión de usuarios, materias, finanzas y más.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => navigate('/usuarios')}>
              <i className="ti ti-users" /> Gestionar Usuarios
            </button>
            <button className="btn-ghost" onClick={() => navigate('/reportes')}>
              <i className="ti ti-report-analytics" /> Reportes
            </button>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="mono-label">Sistema</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 17, fontWeight: 800, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'flex-end' }}>
            <span className="live-dot" /> OPERATIVO
          </div>
          <div className="mono-label" style={{ marginTop: 8 }}>Alumnos activos</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: 'var(--accent-bright)' }}>{k.alumnos_activos.toLocaleString('es-PY')}</div>
        </div>
      </div>

      {/* KPIs Reales (3 columns) */}
      <div className="kpi-grid-6">
        <div className="kpi-card">
          <div className="kpi-top"><span className="mono-label">Total Alumnos</span><i className="ti ti-users" style={{ color: 'var(--info)', fontSize: 15 }} /></div>
          <span className="kpi-value">{r.total_alumnos.toLocaleString('es-PY')}</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="mono-label">Profesores</span><i className="ti ti-school" style={{ color: 'var(--accent)', fontSize: 15 }} /></div>
          <span className="kpi-value">{r.total_profesores.toLocaleString('es-PY')}</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="mono-label">Materias</span><i className="ti ti-book" style={{ color: 'var(--warning)', fontSize: 15 }} /></div>
          <span className="kpi-value">{r.total_materias.toLocaleString('es-PY')}</span>
          {r.materias_sin_oferta > 0 && (
            <div className="mono-label" style={{ color: 'var(--warning)', marginTop: 4 }}>{r.materias_sin_oferta} sin oferta</div>
          )}
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="mono-label">Alumnos Becados</span><i className="ti ti-affiliate" style={{ color: 'var(--success)', fontSize: 15 }} /></div>
          <span className="kpi-value">{r.total_becados.toLocaleString('es-PY')}</span>
          <div className="progress-track" style={{ marginTop: 6 }}>
            <div className="progress-fill" style={{ width: `${r.total_alumnos ? Math.round(r.total_becados / r.total_alumnos * 100) : 0}%`, background: 'var(--success)' }} />
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="mono-label">Promedio General</span><i className="ti ti-chart-bar" style={{ color: 'var(--accent)', fontSize: 15 }} /></div>
          <span className="kpi-value">{k.promedio_general.toFixed(1)}</span>
          <div className="mono-label">Aprobación: {k.aprobacion_pct}%</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="mono-label">Asistencia Global</span><i className="ti ti-calendar-check" style={{ color: 'var(--accent)', fontSize: 15 }} /></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Ring pct={k.asistencia_pct} />
            <span className="kpi-value">{k.asistencia_pct}<span className="kpi-unit">%</span></span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="line-tabs" style={{ marginBottom: 20 }}>
        <button className={`line-tab${tab === 'gestion' ? ' active' : ''}`} onClick={() => setTab('gestion')}>
          <i className="ti ti-layout-grid" /> Módulos
        </button>
        <button className={`line-tab${tab === 'alertas' ? ' active' : ''}`} onClick={() => setTab('alertas')}>
          <i className="ti ti-alert-triangle" /> Alertas {data!.alertas.length > 0 && <span className="badge" style={{ background: 'var(--danger-subtle)', color: 'var(--danger)', marginLeft: 6 }}>{data!.alertas.length}</span>}
        </button>
        <button className={`line-tab${tab === 'usuarios' ? ' active' : ''}`} onClick={() => setTab('usuarios')}>
          <i className="ti ti-user-plus" /> Últimos Registros
        </button>
      </div>

      {/* Tab: Módulos */}
      {tab === 'gestion' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800 }}>Módulos del Sistema</h2>
            <span className="mono-label" style={{ fontSize: 11 }}>{data!.timestamp ? new Date(data!.timestamp).toLocaleTimeString('es-PY') : ''}</span>
          </div>
          <div className="modulo-grid">
            {modulos.map(m => (
              <button key={m.titulo} onClick={() => navigate(m.path)}
                className="card modulo-card">
                <span style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-elevated)', color: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                  <i className={`ti ${m.icon}`} />
                </span>
                <span>{m.titulo}</span>
                <small>{m.sub}</small>
                {m.badge !== undefined && (
                  <span className="badge" style={{ background: 'var(--accent-muted)', color: 'var(--accent-bright)', fontSize: 10 }}>
                    {m.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Tab: Alertas */}
      {tab === 'alertas' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 800 }}>Estudiantes en Riesgo de Deserción</h3>
            <div className="mono-label">Top alumnos con mayor inasistencia y bajo rendimiento</div>
          </div>
          {data!.alertas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 36, color: 'var(--text-secondary)', fontSize: 13 }}>
              <i className="ti ti-check" style={{ fontSize: 32, color: 'var(--success)' }} /><br />
              No hay alertas activas. Todos los estudiantes tienen asistencia regular.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table-uca">
                <thead>
                  <tr><th>Estudiante</th><th>Inasistencia</th><th>Promedio</th><th>Nivel de Riesgo</th></tr>
                </thead>
                <tbody>
                  {data!.alertas.map(a => {
                    const riesgo = a.inasistencia_pct >= 40 ? 'CRÍTICO' : a.inasistencia_pct >= 25 ? 'ALTO' : 'MEDIO'
                    const color = a.inasistencia_pct >= 40 ? 'var(--danger)' : a.inasistencia_pct >= 25 ? 'var(--warning)' : 'var(--orange)'
                    return (
                      <tr key={a.user_id}>
                        <td style={{ fontWeight: 700, fontSize: 13 }}>{a.nombre}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--danger)' }}>{a.inasistencia_pct}%</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{a.promedio !== null ? a.promedio.toFixed(1) : '—'}</td>
                        <td><span className="badge" style={{ background: 'var(--bg-elevated)', color }}>{riesgo}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Últimos Usuarios */}
      {tab === 'usuarios' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px' }}>
            <h3 style={{ fontSize: 15, fontWeight: 800 }}>Últimos Usuarios Registrados</h3>
            <button onClick={() => navigate('/usuarios')}
              style={{ background: 'none', border: 'none', color: 'var(--accent-bright)', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              Ver todos →
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table-uca">
              <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Registro</th></tr></thead>
              <tbody>
                {data!.ultimos_usuarios.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 700, fontSize: 13 }}>{u.nombre}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u.email || '—'}</td>
                    <td>
                      <span className="badge" style={{
                        background: 'var(--bg-elevated)',
                        color: roleColor[u.role] ?? 'var(--text-secondary)',
                        textTransform: 'capitalize',
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('es-PY') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

/* ── Contenedor ────────────────────────────────────────────────── */

export default function Dashboard() {
  const [user] = useState(() => getCurrentUser())
  const [materias, setMaterias] = useState<MateriaRow[]>(materiasMock)
  const [eventos, setEventos] = useState<EventoRow[]>(eventosMock)
  const [promedio, setPromedio] = useState(8.7)
  const [asistencia, setAsistencia] = useState(92)
  const [creditos, setCreditos] = useState<CreditosAlumnoOut | null>(null)

  useEffect(() => {
    if (!user) return
    const isAlumno = user.role === 'alumno'
    const isProfesor = user.role === 'profesor'
    const uid = Number(user.user_id)

    ;(async () => {
      try {
        if (user.role === 'admin') return
        const [materiasRes, puntajesRes, asistenciasRes, eventosRes] = await Promise.all([
          api.get<{id:number;nombre:string;profesor_nombre:string|null;profesor_id:number}[]>(isProfesor && !isNaN(uid) ? `/materias/?profesor_id=${uid}` : '/materias/').catch(() => []),
          api.get<{materia_id:number;valor:number}[]>(isAlumno && !isNaN(uid) ? `/puntajes/?user_id=${uid}` : '/puntajes/').catch(() => []),
          api.get<{presente:boolean}[]>(isAlumno && !isNaN(uid) ? `/asistencias/?user_id=${uid}` : '/asistencias/').catch(() => []),
          api.get<{fecha:string;titulo:string;descripcion:string|null}[]>('/eventos/').catch(() => []),
        ])

        if (materiasRes.length > 0) {
          const rows: MateriaRow[] = materiasRes.map((m) => {
            const pts = puntajesRes.filter((p) => p.materia_id === m.id)
            const vals = pts.map((p) => Number(p.valor)).filter((v: number) => !isNaN(v))
            const ultima = vals.length ? vals[vals.length - 1] : null
            const prom = vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : null
            const estado = prom === null ? 'SIN CURSAR' : prom >= 9 ? 'PROMOCIONANDO' : prom >= 6 ? 'REGULAR' : 'REPROBADO'
            return {
              nombre: m.nombre,
              profesor: m.profesor_nombre || (m.profesor_id ? `Prof. #${m.profesor_id}` : '—'),
              ultimaNota: ultima !== null ? Math.round(ultima * 10) / 10 : null,
              estado,
            }
          })
          setMaterias(rows)
          const proms = rows.map(r => r.ultimaNota).filter((v): v is number => v !== null)
          if (proms.length) setPromedio(Math.round(proms.reduce((a, b) => a + b, 0) / proms.length * 10) / 10)
        }
        if (asistenciasRes.length > 0) {
          const pres = asistenciasRes.filter((a) => a.presente).length
          setAsistencia(Math.round((pres / asistenciasRes.length) * 100))
        }
        if (eventosRes.length > 0) {
          setEventos(eventosRes.slice(0, 4).map((e, i: number) => ({
            hora: e.fecha?.slice(5, 10) ?? '—',
            titulo: e.titulo,
            lugar: e.descripcion || 'Campus UCA',
            enVivo: i === 0,
          })))
        }
        if (isAlumno && !isNaN(uid)) {
          obtenerCreditosAlumno(uid).then(setCreditos).catch(() => {})
        }
      } catch { /* mocks quedan */ }
    })()
  }, [user])

  const nombre = user?.username || 'Usuario'

  return (
    <>
      <style>{css}</style>
      {user?.role === 'admin'
        ? <AdminDash nombre={nombre} />
        : user?.role === 'profesor'
          ? <ProfesorDash nombre={nombre} materias={materias} eventos={eventos} />
          : <AlumnoDash nombre={nombre} materias={materias} eventos={eventos} promedio={promedio} asistencia={asistencia} creditos={creditos} />}
    </>
  )
}
