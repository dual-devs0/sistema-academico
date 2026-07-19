import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser, api, emitHelp } from '../lib/api'
import { obtenerCreditosAlumno, type CreditosAlumnoOut } from '../services/pensumService'

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
  @media(max-width:1024px){ .dash-grid { grid-template-columns:1fr; } .dash-kpis { grid-template-columns:repeat(2,1fr); } }
  @media(max-width:560px){ .dash-kpis { grid-template-columns:1fr 1fr; gap:10px; } .greet-banner{ padding:16px 18px; } .greet-icon{ display:none; } }
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
        {/* Materias Semestrales */}
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

        {/* Timeline de Hoy */}
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

      {/* Cards de acceso rápido: Graduación y Equivalencias */}
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

function AdminDash({ nombre, totalUsuarios }: { nombre: string; totalUsuarios: number }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'gestion' | 'seguridad' | 'logs'>('gestion')

  const modulos = [
    { icon: 'ti-database', color: 'var(--info)', titulo: 'Base de Datos Estudiantil', sub: 'Modificar registros, historial académico', path: '/usuarios' },
    { icon: 'ti-building-bank', color: 'var(--warning)', titulo: 'Gestión Financiera', sub: 'Aranceles, becas y conciliaciones', path: '/reportes' },
    { icon: 'ti-api', color: 'var(--purple)', titulo: 'Configuración API', sub: 'Integraciones externas, Webhooks', path: '/perfil' },
  ]
  const micro = [
    { nombre: 'Autenticación Auth0', estado: 'SANO', color: 'var(--success)' },
    { nombre: 'Gestor de Archivos (S3)', estado: 'SANO', color: 'var(--success)' },
    { nombre: 'Motor de Calificaciones', estado: 'LATENCIA', color: 'var(--warning)' },
    { nombre: 'Base de Datos Core (PostgreSQL)', estado: 'SANO', color: 'var(--success)' },
  ]
  const logs = [
    { evento: 'Intento de Login Fallido', usuario: '192.168.1.144', modulo: 'Auth_Service', ts: 'Hoy, 14:32:01', nivel: 'ALTO', color: 'var(--danger)' },
    { evento: 'Actualización de API Key', usuario: 'admin_master_01', modulo: 'Integration_Hub', ts: 'Hoy, 13:15:44', nivel: 'INFO', color: 'var(--success)' },
    { evento: 'Exportación masiva de datos', usuario: 'm_rodriguez_adm', modulo: 'DB_Manager', ts: 'Hoy, 10:02:11', nivel: 'MEDIO', color: 'var(--warning)' },
  ]

  return (
    <>
      {/* Hero */}
      <div className="card" style={{ display: 'flex', gap: 22, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="avatar-initials" style={{ width: 84, height: 84, borderRadius: 20, fontSize: 28 }}>
          {(nombre || '?').slice(0, 2)}
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 24, fontWeight: 900 }}>{nombre}</h1>
            <span className="badge" style={{ background: 'var(--accent-muted)', color: 'var(--accent-bright)' }}>Administrador Senior</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 520, marginBottom: 12 }}>
            Responsable de la integridad del ecosistema digital UCA. Acceso total a módulos de seguridad,
            gestión de datos maestros y auditoría de sistemas de alto nivel.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => navigate('/usuarios')}>
              <i className="ti ti-shield-lock" /> Panel de Control Total
            </button>
            <button className="btn-ghost"><i className="ti ti-mail" /> Mensajes del Sistema</button>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="mono-label">Estado del Sistema</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 17, fontWeight: 800, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'flex-end' }}>
            <span className="live-dot" /> OPERATIVO
          </div>
          <div className="mono-label" style={{ marginTop: 8 }}>Última auditoría</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Hace 14 minutos</div>
        </div>
      </div>

      {/* KPIs */}
      <div className="dash-kpis" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="kpi-card">
          <div className="kpi-top"><span className="mono-label">Usuarios Activos</span><span className="badge" style={{ background: 'var(--success-subtle)', color: 'var(--success)' }}>+12%</span></div>
          <span className="kpi-value">{totalUsuarios ? totalUsuarios.toLocaleString('es-PY') : '—'}</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="mono-label">Reportes Pendientes</span><span className="badge" style={{ background: 'var(--warning-subtle)', color: 'var(--warning)' }}>Nivel 2 Crítico</span></div>
          <span className="kpi-value">08</span>
          <div className="progress-track" style={{ marginTop: 10 }}><div className="progress-fill" style={{ width: '65%', background: 'var(--warning)' }} /></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="mono-label">Uptime Sistema</span><span className="badge" style={{ background: 'var(--success-subtle)', color: 'var(--success)' }}>SLA Cumplido</span></div>
          <span className="kpi-value">99.98%</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="line-tabs" style={{ marginBottom: 20 }}>
        <button className={`line-tab${tab === 'gestion' ? ' active' : ''}`} onClick={() => setTab('gestion')}><i className="ti ti-layout-grid" /> Gestión</button>
        <button className={`line-tab${tab === 'seguridad' ? ' active' : ''}`} onClick={() => setTab('seguridad')}><i className="ti ti-shield" /> Seguridad (MFA)</button>
        <button className={`line-tab${tab === 'logs' ? ' active' : ''}`} onClick={() => setTab('logs')}><i className="ti ti-list-details" /> Logs de Actividad</button>
      </div>

      {tab === 'gestion' && (
        <div className="dash-grid" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 14 }}>Módulos de Acceso Rápido</h2>
            {modulos.map(m => (
              <button key={m.titulo} onClick={() => navigate(m.path)}
                className="card" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, cursor: 'pointer', textAlign: 'left', padding: '16px 18px' }}>
                <span style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--bg-elevated)', color: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                  <i className={`ti ${m.icon}`} />
                </span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{m.titulo}</span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{m.sub}</span>
                </span>
                <i className="ti ti-chevron-right" style={{ color: 'var(--text-muted)' }} />
              </button>
            ))}
          </div>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800 }}>Estado de Microservicios</h3>
              <i className="ti ti-refresh" style={{ color: 'var(--text-muted)', cursor: 'pointer' }} />
            </div>
            {micro.map(s => (
              <div key={s.nombre} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{s.nombre}</span>
                <span className="badge" style={{ background: 'transparent', color: s.color }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, display: 'inline-block' }} /> {s.estado}
                </span>
              </div>
            ))}
            <div className="mono-label" style={{ marginTop: 14, fontStyle: 'italic' }}>
              Próximo mantenimiento programado: 24/09 — 02:00 AM
            </div>
          </div>
        </div>
      )}

      {tab === 'seguridad' && (
        <div className="card" style={{ textAlign: 'center', padding: 46 }}>
          <i className="ti ti-shield-lock" style={{ fontSize: 40, color: 'var(--accent)' }} />
          <h3 style={{ fontSize: 16, fontWeight: 800, margin: '12px 0 6px' }}>Autenticación Multifactor</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Configuración MFA disponible próximamente para cuentas administrativas.</p>
        </div>
      )}

      {tab === 'logs' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px' }}>
            <h3 style={{ fontSize: 15, fontWeight: 800 }}>Logs de Seguridad Recientes</h3>
            <button style={{ background: 'none', border: 'none', color: 'var(--accent-bright)', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              Exportar a CSV <i className="ti ti-download" />
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table-uca">
              <thead><tr><th>Evento</th><th>Usuario / IP</th><th>Módulo</th><th>Timestamp</th><th>Nivel</th></tr></thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.evento}>
                    <td style={{ fontWeight: 700, fontSize: 12.5 }}>{l.evento}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--info)' }}>{l.usuario}</td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{l.modulo}</td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{l.ts}</td>
                    <td><span className="badge" style={{ background: 'var(--bg-elevated)', color: l.color }}>{l.nivel}</span></td>
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
  const [totalUsuarios, setTotalUsuarios] = useState(0)
  const [creditos, setCreditos] = useState<CreditosAlumnoOut | null>(null)

  useEffect(() => {
    if (!user) return
    const isAlumno = user.role === 'alumno'
    const isProfesor = user.role === 'profesor'
    const uid = Number(user.user_id)

    ;(async () => {
      try {
        if (user.role === 'admin') {
          const users = await api.get<unknown[]>('/users/').catch(() => [] as unknown[])
          if (users.length) setTotalUsuarios(users.length)
          return
        }
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
        ? <AdminDash nombre={nombre} totalUsuarios={totalUsuarios} />
        : user?.role === 'profesor'
          ? <ProfesorDash nombre={nombre} materias={materias} eventos={eventos} />
          : <AlumnoDash nombre={nombre} materias={materias} eventos={eventos} promedio={promedio} asistencia={asistencia} creditos={creditos} />}
    </>
  )
}
