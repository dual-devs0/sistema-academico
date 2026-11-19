// Alumno, Profesor y Admin (contenido condicional por rol). Vista principal post-login: KPIs, próximas clases/vencimientos, calificaciones por materia.
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser, api } from '../lib/api'
import { obtenerCreditosAlumno, type CreditosAlumnoOut } from '../services/pensumService'
import { getCondicionEgreso, type CondicionEgreso } from '../services/graduacionService'
import { obtenerDashboardAdmin, type AdminDashboardData } from '../services/adminService'
import { obtenerDashboardProfesor, type ProfesorDashboardData } from '../services/profesorService'

/* ── Tipos y datos ─────────────────────────────────────────────── */
type MateriaRow = {
  nombre: string; profesor: string; ultimaNota: number | null; estado: string
  parcial1: number | null; parcial2: number | null; practico: number | null; final: number | null
}
type EventoRow = { hora: string; titulo: string; lugar: string; enVivo?: boolean }

const POLL_MS_ALUMNO = 30000

interface AlumnoDashboardResp {
  user: { nombre: string | null } | null
  eventosCercanos: { titulo: string; tipo: string; fecha: string | null; hora: string | null; descripcion: string | null }[]
  cuentaSaldoPendiente: number
  cuentaSaldoVencido: number
  cuentaHayCuotas: boolean
}

function saludoDelDia(): { texto: string; icon: string } {
  const h = new Date().getHours()
  if (h < 12) return { texto: 'Buenos días', icon: 'ti-sun-high' }
  if (h < 19) return { texto: 'Buenas tardes', icon: 'ti-cloud-sun' }
  return { texto: 'Buenas noches', icon: 'ti-moon-stars' }
}

const estadoBadge: Record<string, { bg: string; color: string }> = {
  REGULAR:        { bg: 'var(--success-subtle)', color: 'var(--success)' },
  DESTACADO:      { bg: 'var(--accent-muted)', color: 'var(--accent-bright)' },
  APROBADO:       { bg: 'var(--info-subtle)', color: 'var(--info)' },
  REPROBADO:      { bg: 'var(--danger-subtle)', color: 'var(--danger)' },
  'SIN CURSAR':   { bg: 'rgba(148,163,184,0.12)', color: 'var(--text-secondary)' },
  'EN CURSO':     { bg: 'var(--accent-muted)', color: 'var(--accent-bright)' },
}

const css = `
  .dash-live-events { display:flex; align-items:center; gap:7px; font-size:12.5px; color:var(--text-secondary); }
  .dash-live-dot { width:8px; height:8px; border-radius:50%; background:var(--success); animation:pulse-dot 1.6s infinite; display:inline-block; flex-shrink:0; }
  @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:.35} }

  .dash-kpis { display:grid; grid-template-columns:repeat(4,1fr); grid-auto-rows:auto; gap:16px; margin-bottom:32px; }
  .dash-kpis .kpi-dominant { grid-column:span 2; grid-row:span 2; }
  .dash-kpis .kpi-banner { grid-column:span 2; }

  .dash-grid { display:grid; grid-template-columns:1fr 340px; gap:24px; align-items:start; }
  .dash-section-head { display:flex; align-items:baseline; justify-content:space-between; margin-bottom:16px; }
  .dash-section-head h2 { font-size:16px; font-weight:800; color:var(--text-primary); margin:0; }

  .ring { position:relative; width:52px; height:52px; border-radius:50%; display:flex; align-items:center; justify-content:center; }
  .ring svg { position:absolute; inset:0; transform:rotate(-90deg); }

  .tl-row { display:flex; gap:16px; padding:16px 22px; border-left:2px solid transparent; }
  .tl-row.next { background:rgba(14,165,233,.06); border-left-color:var(--accent); }
  .tl-time { font-family:var(--font-mono); font-size:13px; font-weight:800; color:var(--text-muted); width:44px; flex-shrink:0; padding-top:1px; }
  .tl-row.next .tl-time { color:var(--accent-bright); }
  .tl-badge {
    display:inline-flex; align-items:center; gap:5px; margin-top:8px; padding:3px 9px; border-radius:999px;
    font-family:var(--font-mono); font-size:9.5px; font-weight:700; letter-spacing:.08em;
  }

  .dash-access-card {
    cursor:pointer; text-align:left; display:flex; flex-direction:column; gap:10px;
    padding:16px; border:1px solid var(--border-subtle); border-radius:14px; background:var(--bg-surface); transition:border-color .15s, transform .1s;
  }
  .dash-access-card:hover { border-color:var(--accent-hover); transform:translateY(-1px); }
  .dash-access-icon { width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center; background:var(--bg-elevated); color:var(--accent-bright); flex-shrink:0; }
  .dash-access-icon i { font-size:17px; }
  .dash-access-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-top:16px; }

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
  @media(max-width:1024px){ .dash-grid { grid-template-columns:1fr; } .dash-kpis { grid-template-columns:repeat(2,1fr); } .dash-kpis .kpi-dominant { grid-column:span 2; } .dash-kpis .kpi-banner { grid-column:span 2; } .kpi-grid-6 { grid-template-columns:repeat(2,1fr); } .dash-access-grid { grid-template-columns:repeat(2,1fr); } }
  @media(max-width:560px){ .dash-kpis { grid-template-columns:1fr; gap:10px; } .dash-kpis .kpi-dominant { grid-column:span 1; grid-row:span 1; } .dash-kpis .kpi-banner { grid-column:span 1; flex-wrap:wrap; } .page-head { padding-left:12px; } .kpi-grid-6 { grid-template-columns:1fr 1fr; } .modulo-grid { grid-template-columns:repeat(2,1fr); } .dash-access-grid { grid-template-columns:1fr 1fr; } }
  .skeleton { background:var(--bg-elevated); border-radius:var(--radius-md); animation:pulse 1.5s ease-in-out infinite; }
  @keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:1} }

  /* Diseño Web Adaptable — mobile-first, solo rol alumno/profesor (NO admin) */
  .dash-mat-cards { display:none; }
  .dash-mat-card {
    background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:var(--radius-md);
    padding:14px 16px; margin-bottom:10px;
  }
  .dash-mat-card:last-child { margin-bottom:0; }
  .dash-mat-card-head { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
  .dash-mat-notas-row { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:10px; }
  .dash-mat-nota-chip { background:var(--bg-elevated); border-radius:8px; padding:6px 4px; text-align:center; }
  .dash-mat-nota-chip .lbl { font-size:8.5px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; display:block; margin-bottom:3px; }
  .dash-mat-nota-chip .val { font-family:var(--font-mono); font-size:13px; font-weight:800; }
  .dash-mat-foot { display:flex; align-items:center; justify-content:space-between; }
  @media(max-width:680px){
    .dash-table-wrap { display:none; }
    .dash-mat-cards { display:block; }
  }
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

function AlumnoDash({ nombre, materias, eventos, promedio, asistencia, asistDetalle, creditos, cuotasPendientes, cuotasVencidas, hayCuotas, condicion, loading, error, refreshing, lastUpdate, onRefresh }:
  {
    nombre: string; materias: MateriaRow[]; eventos: EventoRow[]; promedio: number | null; asistencia: number | null
    asistDetalle: { total: number; presentes: number } | null; creditos: CreditosAlumnoOut | null
    cuotasPendientes: number; cuotasVencidas: number; hayCuotas: boolean; condicion: CondicionEgreso | null
    loading: boolean; error: string; refreshing: boolean; lastUpdate: Date | null; onRefresh: () => void
  }) {
  const navigate = useNavigate()
  const enCurso = materias.length
  const pctCreditos = creditos?.creditos_totales ? Math.round((creditos.creditos_acumulados / creditos.creditos_totales) * 100) : 0
  const saludo = saludoDelDia()

  const conNota = materias.filter((m): m is MateriaRow & { ultimaNota: number } => m.ultimaNota !== null)
  const mejorMateria = conNota.length ? conNota.reduce((a, b) => (b.ultimaNota > a.ultimaNota ? b : a)) : null
  const aReforzar = conNota.length > 1 ? conNota.reduce((a, b) => (b.ultimaNota < a.ultimaNota ? b : a)) : null
  const faltanCreditos = creditos?.creditos_totales != null ? creditos.creditos_totales - creditos.creditos_acumulados : null
  const proximoEvento = eventos[0] ?? null
  const faltasAsist = asistDetalle ? asistDetalle.total - asistDetalle.presentes : null
  const fechaHoy = new Date().toLocaleDateString('es-PY', { weekday: 'long', day: 'numeric', month: 'long' })
  const fechaHoyCap = fechaHoy.charAt(0).toUpperCase() + fechaHoy.slice(1)
  const montoCuota = cuotasVencidas > 0 ? cuotasVencidas : cuotasPendientes

  return (
    <>
      <div className="page-head" style={{ marginBottom: 32 }}>
        <div>
          <div className="page-eyebrow">{fechaHoyCap}</div>
          <div className="page-title">{saludo.texto}, {nombre}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {!loading && (
            <span className="dash-live-events">
              <span className="dash-live-dot" />
              {eventos.length > 0
                ? `${eventos.length} evento${eventos.length > 1 ? 's' : ''} hoy${proximoEvento ? ` · próximo ${proximoEvento.hora}` : ''}`
                : 'Sin eventos hoy'}
            </span>
          )}
          <button className="btn-ghost" onClick={onRefresh} disabled={refreshing} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-mono)', fontSize: 11.5, padding: '8px 14px' }}>
            <i className={`ti ti-refresh${refreshing ? ' ti-spin' : ''}`} /> {lastUpdate ? lastUpdate.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' }) : refreshing ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--danger-subtle)', color: 'var(--danger)', borderRadius: 10, padding: '10px 14px', fontSize: 12.5, marginBottom: 16 }}>
          <i className="ti ti-alert-circle" /> {error}
        </div>
      )}

      <div className="dash-kpis">
        <div className="kpi-dominant">
          <span className="mono-label">Promedio General</span>
          <span className="kpi-dominant-value">{loading ? '—' : promedio !== null ? promedio.toFixed(1) : '—'}</span>
          <div className="kpi-dominant-foot">
            <div>
              <div className="mono-label" style={{ marginBottom: 4 }}>Materias</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>
                {String(enCurso).padStart(2, '0')} <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>activas</span>
              </div>
            </div>
            {mejorMateria && (
              <div>
                <div className="mono-label" style={{ marginBottom: 4 }}>Mejor materia</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{mejorMateria.nombre} <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-bright)' }}>{mejorMateria.ultimaNota}</span></div>
              </div>
            )}
            {aReforzar && (
              <div>
                <div className="mono-label" style={{ marginBottom: 4 }}>A reforzar</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{aReforzar.nombre} <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--warning)' }}>{aReforzar.ultimaNota}</span></div>
              </div>
            )}
          </div>
        </div>

        <div className="kpi-secondary">
          <span className="mono-label" style={{ display: 'block', marginBottom: 16 }}>Asistencia</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Ring pct={asistencia ?? 0} />
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                {asistencia !== null ? asistencia : '—'}<span style={{ fontSize: 15, color: 'var(--text-secondary)' }}>%</span>
              </div>
              {faltasAsist !== null && asistDetalle && (
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 4 }}>{faltasAsist} falta{faltasAsist === 1 ? '' : 's'} de {asistDetalle.total} clases</div>
              )}
            </div>
          </div>
        </div>

        {creditos && (
          <div className="kpi-secondary">
            <span className="mono-label" style={{ display: 'block', marginBottom: 16 }}>Créditos de carrera</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 12 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{creditos.creditos_acumulados}</span>
              <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>/ {creditos.creditos_totales ?? '—'}</span>
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--accent-bright)' }}>{pctCreditos}%</span>
            </div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${pctCreditos}%` }} /></div>
            {faltanCreditos !== null && (
              <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 10 }}>Faltan {faltanCreditos} para graduarte</div>
            )}
          </div>
        )}

        {hayCuotas && (
          <div className={`kpi-banner${cuotasVencidas === 0 ? ' pending' : ''}`}>
            <span className="kpi-banner-icon" style={{ background: cuotasVencidas > 0 ? 'var(--danger-subtle)' : 'var(--warning-subtle)', color: cuotasVencidas > 0 ? 'var(--danger)' : 'var(--warning)' }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 20 }} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mono-label" style={{ color: cuotasVencidas > 0 ? 'var(--danger)' : 'var(--warning)', marginBottom: 5 }}>
                {cuotasVencidas > 0 ? 'Cuota vencida' : 'Cuota pendiente'}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>Gs. {montoCuota.toLocaleString('es-PY')}</div>
            </div>
            <button className="btn-primary" onClick={() => navigate('/mis-cuotas')} style={{ flexShrink: 0 }}>
              Ver mis cuotas <i className="ti ti-arrow-right" />
            </button>
          </div>
        )}
      </div>

      <div className="dash-grid">
        <div>
          <div className="dash-section-head">
            <h2>Calificaciones por materia</h2>
            <button onClick={() => navigate('/programa?tab=calificaciones')} style={{ background: 'none', border: 'none', color: 'var(--accent-bright)', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              Ver todas →
            </button>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="dash-table-wrap" style={{ overflowX: 'auto' }}>
              <table className="table-uca">
                <thead>
                  <tr>
                    <th>Materia</th>
                    <th style={{ textAlign: 'center' }}>Parcial 1</th>
                    <th style={{ textAlign: 'center' }}>Parcial 2</th>
                    <th style={{ textAlign: 'center' }}>T.P.</th>
                    <th style={{ textAlign: 'center' }}>Final</th>
                    <th style={{ textAlign: 'center' }}>Promedio</th>
                    <th style={{ textAlign: 'right' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)' }}>Cargando…</td></tr>
                  ) : materias.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)' }}>Sin materias inscriptas este período.</td></tr>
                  ) : materias.map(m => {
                    const b = estadoBadge[m.estado] ?? estadoBadge['EN CURSO']
                    return (
                      <tr key={m.nombre}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span className="avatar-initials" style={{ width: 30, height: 30, borderRadius: 8, fontSize: 12 }}>
                              <i className="ti ti-book-2" />
                            </span>
                            <div>
                              <span style={{ fontWeight: 700, fontSize: 13 }}>{m.nombre}</span>
                              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{m.profesor}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13 }}>{m.parcial1 ?? '—'}</td>
                        <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13 }}>{m.parcial2 ?? '—'}</td>
                        <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13 }}>{m.practico ?? '—'}</td>
                        <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13 }}>{m.final ?? '—'}</td>
                        <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 14 }}>{m.ultimaNota ?? '—'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="badge" style={{ background: b.bg, color: b.color }}>{m.estado}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Vista mobile: cards en vez de tabla horizontal */}
            <div className="dash-mat-cards" style={{ padding: 12 }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)', fontSize: 13 }}>Cargando…</div>
              ) : materias.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)', fontSize: 13 }}>Sin materias inscriptas este período.</div>
              ) : materias.map(m => {
                const b = estadoBadge[m.estado] ?? estadoBadge['EN CURSO']
                return (
                  <div key={m.nombre} className="dash-mat-card">
                    <div className="dash-mat-card-head">
                      <span className="avatar-initials" style={{ width: 32, height: 32, borderRadius: 8, fontSize: 12, flexShrink: 0 }}>
                        <i className="ti ti-book-2" />
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{m.nombre}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{m.profesor}</div>
                      </div>
                    </div>
                    <div className="dash-mat-notas-row">
                      <div className="dash-mat-nota-chip"><span className="lbl">P1</span><span className="val">{m.parcial1 ?? '—'}</span></div>
                      <div className="dash-mat-nota-chip"><span className="lbl">P2</span><span className="val">{m.parcial2 ?? '—'}</span></div>
                      <div className="dash-mat-nota-chip"><span className="lbl">T.P.</span><span className="val">{m.practico ?? '—'}</span></div>
                      <div className="dash-mat-nota-chip"><span className="lbl">Final</span><span className="val">{m.final ?? '—'}</span></div>
                    </div>
                    <div className="dash-mat-foot">
                      <span className="badge" style={{ background: b.bg, color: b.color }}>{m.estado}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 16, color: 'var(--accent-bright)' }}>{m.ultimaNota ?? '—'}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="dash-access-grid">
            <button type="button" onClick={() => navigate('/mi-graduacion')} className="dash-access-card">
              <span className="dash-access-icon"><i className={`ti ${condicion?.puede_graduarse ? 'ti-certificate' : 'ti-graduation-cap'}`} /></span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>Mi Graduación</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {faltanCreditos !== null ? `Faltan ${faltanCreditos} créditos` : condicion?.motivo || 'Verificá tu condición'}
                </div>
              </div>
            </button>
            <button type="button" onClick={() => navigate('/mis-equivalencias')} className="dash-access-card">
              <span className="dash-access-icon"><i className="ti ti-arrows-exchange" /></span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>Equivalencias</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>Convalidación</div>
              </div>
            </button>
            <button type="button" onClick={() => navigate('/mis-pasantias')} className="dash-access-card">
              <span className="dash-access-icon"><i className="ti ti-briefcase" /></span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>Pasantías</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>Prácticas profesionales</div>
              </div>
            </button>
            <button type="button" onClick={() => navigate('/tramites')} className="dash-access-card">
              <span className="dash-access-icon"><i className="ti ti-file-description" /></span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>Trámites</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>Solicitudes y gestiones</div>
              </div>
            </button>
          </div>
        </div>

        <div>
          <div className="dash-section-head">
            <h2>Hoy</h2>
            <span className="mono-label">{eventos.length} evento{eventos.length === 1 ? '' : 's'}</span>
          </div>
          <div className="card" style={{ padding: '8px 0', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)', fontSize: 13 }}>Cargando…</div>
            ) : eventos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)', fontSize: 13 }}>Sin eventos hoy.</div>
            ) : eventos.map((ev, i) => (
              <div key={i} className={`tl-row${i === 0 ? ' next' : ''}`}>
                <div className="tl-time">{ev.hora}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{ev.titulo}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{ev.lugar}</div>
                  {i === 0 && (
                    <span className="tl-badge" style={{ background: 'var(--accent-muted)', color: 'var(--accent-bright)' }}>PRÓXIMA</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => navigate('/asistencia/scan')} className="card"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', color: 'var(--text-primary)', fontWeight: 700, padding: 14, fontSize: 13, cursor: 'pointer', marginTop: 16 }}>
            <i className="ti ti-qrcode" style={{ fontSize: 17, color: 'var(--accent-bright)' }} /> Escanear QR de asistencia
          </button>
        </div>
      </div>
    </>
  )
}

function ProfesorDash({ nombre, data, loading, refreshing, error, lastUpdate, onRefresh }:
  { nombre: string; data: ProfesorDashboardData | null; loading: boolean; refreshing: boolean; error: string; lastUpdate: Date | null; onRefresh: (manual?: boolean) => void }) {
  const navigate = useNavigate()

  const r = data?.resumen
  const agenda = data?.agenda_hoy ?? []
  const materias = data?.materias ?? []
  const alertas = data?.alertas ?? []

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', display: 'inline-block', fontSize: 24, marginBottom: 12 }} />
        <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Cargando dashboard…</div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <i className="ti ti-alert-circle" style={{ fontSize: 32, color: '#ef4444', marginBottom: 12 }} />
        <div style={{ color: '#ef4444', fontSize: 14, marginBottom: 8 }}>No se pudo cargar el dashboard</div>
        <button className="ag-btn" onClick={() => onRefresh(true)}>Reintentar</button>
      </div>
    )
  }

  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  const horariosStr = (h: { dia: number; hora_inicio: string; hora_fin: string; aula: string | null }[]) =>
    h.map(d => `${diasSemana[d.dia] ?? '?'} ${d.hora_inicio.slice(0, 5)}-${d.hora_fin.slice(0, 5)}`).join(', ') || '—'

  const fechaHoy = new Date().toLocaleDateString('es-PY', { weekday: 'long', day: 'numeric', month: 'long' })
  const fechaHoyCap = fechaHoy.charAt(0).toUpperCase() + fechaHoy.slice(1)
  const aprobacionColor = r?.porcentaje_aprobacion != null && r.porcentaje_aprobacion < 60 ? 'var(--danger)' : 'var(--success)'

  return (
    <>
      <div className="page-head" style={{ marginBottom: 32 }}>
        <div>
          <div className="page-eyebrow">{fechaHoyCap}</div>
          <div className="page-title">¡Hola, {nombre}!</div>
        </div>
        <button className="btn-ghost" onClick={() => onRefresh(true)} disabled={refreshing}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-mono)', fontSize: 11.5, padding: '8px 14px' }}>
          <i className={`ti ti-refresh${refreshing ? ' ti-spin' : ''}`} />
          {lastUpdate ? lastUpdate.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' }) : refreshing ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      <div className="dash-kpis">
        <div className="kpi-dominant" style={{ gridColumn: 'span 2', gridRow: 'span 2' }}>
          <span className="mono-label">Aprobación general</span>
          <div className="kpi-dominant-value" style={{ color: aprobacionColor }}>
            {r?.porcentaje_aprobacion != null ? `${r.porcentaje_aprobacion}%` : '—'}
          </div>
          <div className="kpi-dominant-foot">
            <div>
              <div className="mono-label" style={{ marginBottom: 4 }}>Materias activas</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>{String(r?.materias_activas ?? 0).padStart(2, '0')}</div>
            </div>
            <div>
              <div className="mono-label" style={{ marginBottom: 4 }}>Total alumnos</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>{r?.total_alumnos ?? 0}</div>
            </div>
          </div>
        </div>

        <div className="kpi-secondary">
          <span className="mono-label" style={{ display: 'block', marginBottom: 16 }}>Asistencia promedio</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Ring pct={r?.asistencia_promedio ?? 0} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
              {r?.asistencia_promedio != null ? r.asistencia_promedio : '—'}<span style={{ fontSize: 15, color: 'var(--text-secondary)' }}>%</span>
            </div>
          </div>
        </div>

        <div className="kpi-secondary">
          <span className="mono-label" style={{ display: 'block', marginBottom: 16 }}>Alertas activas</span>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 800, color: alertas.length > 0 ? 'var(--warning)' : 'var(--text-primary)', lineHeight: 1 }}>
            {alertas.length}
          </div>
          {alertas.length > 0 && <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 10 }}>alumnos con alta inasistencia</div>}
        </div>
      </div>

      <div className="dash-grid">
        <div>
          <div className="dash-section-head">
            <h2>Cursos activos</h2>
            <button onClick={() => navigate('/puntajes')} style={{ background: 'none', border: 'none', color: 'var(--accent-bright)', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              Gestionar notas →
            </button>
          </div>
          {materias.length === 0 ? (
            <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
              No tenés cursos activos este período.
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="dash-table-wrap" style={{ overflowX: 'auto' }}>
                <table className="table-uca">
                  <thead>
                    <tr>
                      <th>Materia</th>
                      <th style={{ textAlign: 'center' }}>Alumnos</th>
                      <th>Horarios</th>
                      <th style={{ textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materias.map(m => (
                      <tr key={m.oferta_id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span className="avatar-initials" style={{ width: 30, height: 30, borderRadius: 8, fontSize: 12 }}><i className="ti ti-book-2" /></span>
                            <div>
                              <span style={{ fontWeight: 700, fontSize: 13 }}>{m.nombre}</span>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{m.carrera || '—'} · {m.periodo}{m.codigo ? ` · ${m.codigo}` : ''}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{m.cantidad_alumnos}</td>
                        <td style={{ fontSize: 10, color: 'var(--text-secondary)', maxWidth: 200 }}>
                          {horariosStr(m.horarios)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn-ghost" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => navigate('/asistencia')}>
                            <i className="ti ti-qrcode" /> Asistencia
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Vista mobile: cards en vez de tabla horizontal */}
              <div className="dash-mat-cards" style={{ padding: 12 }}>
                {materias.map(m => (
                  <div key={m.oferta_id} className="dash-mat-card">
                    <div className="dash-mat-card-head">
                      <span className="avatar-initials" style={{ width: 32, height: 32, borderRadius: 8, fontSize: 12, flexShrink: 0 }}><i className="ti ti-book-2" /></span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{m.nombre}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{m.carrera || '—'} · {m.periodo}{m.codigo ? ` · ${m.codigo}` : ''}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10 }}>{horariosStr(m.horarios)}</div>
                    <div className="dash-mat-foot">
                      <span className="mono-label">{m.cantidad_alumnos} alumnos</span>
                      <button className="btn-ghost" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => navigate('/asistencia')}>
                        <i className="ti ti-qrcode" /> Asistencia
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {alertas.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-alert-triangle" style={{ color: '#ef4444' }} /> Alertas ({alertas.length})
              </h2>
              <div className="card" style={{ padding: '12px 16px' }}>
                {alertas.slice(0, 5).map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: i < Math.min(alertas.length, 5) - 1 ? '1px solid var(--border-subtle)' : 'none', fontSize: 12 }}>
                    <i className="ti ti-user" style={{ color: 'var(--text-muted)' }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 700 }}>{a.alumno_nombre}</span>
                      <span style={{ color: 'var(--text-secondary)' }}> en {a.materia_nombre}</span>
                    </div>
                    <span style={{ color: a.inasistencia_pct >= 25 ? '#ef4444' : '#f59e0b', fontWeight: 700, fontSize: 11 }}>
                      {a.inasistencia_pct}% inasist.
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="dash-section-head">
            <h2>Agenda de hoy</h2>
            <span className="mono-label">{agenda.length} actividad{agenda.length === 1 ? '' : 'es'}</span>
          </div>
          <div className="card" style={{ padding: '8px 0', overflow: 'hidden' }}>
            {agenda.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)', fontSize: 13 }}>
                Sin actividades para hoy.
              </div>
            ) : (
              agenda.map((ev, i) => (
                <div key={i} className={`tl-row${ev.tipo === 'clase' && i === 0 ? ' next' : ''}`}>
                  <div className="tl-time">{ev.hora_inicio}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{ev.titulo}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{ev.aula}{ev.materia ? ` · ${ev.materia}` : ''}</div>
                    {ev.tipo === 'clase' && i === 0 && (
                      <span className="tl-badge" style={{ background: 'var(--accent-muted)', color: 'var(--accent-bright)' }}>PRÓXIMA</span>
                    )}
                  </div>
                </div>
              ))
            )}
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
  const [error, setError] = useState(false)
  const [tab, setTab] = useState<'gestion' | 'alertas' | 'usuarios'>('gestion')

  const fetchData = useCallback(async () => {
    try {
      const res = await obtenerDashboardAdmin()
      setData(res)
      setError(false)
      setLoading(false)
    } catch {
      setError(true)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const load = () => fetchData()
    load()
    const interval = setInterval(fetchData, 30_000)
    return () => clearInterval(interval)
  }, [fetchData])

  const modulos = [
    { icon: 'ti-users', color: 'var(--info)', titulo: 'Usuarios y Roles', sub: 'CRUD completo de usuarios', path: '/usuarios', badge: data?.resumen?.total_alumnos },
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
    { icon: 'ti-file-description', color: 'var(--success)', titulo: 'Trámites', sub: 'Solicitudes pendientes', path: '/tramites', badge: data?.resumen?.tramites_pendientes },
    { icon: 'ti-calendar', color: 'var(--orange)', titulo: 'Calendario', sub: 'Eventos académicos', path: '/calendario' },
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

  if (error || !data) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <i className="ti ti-alert-circle" style={{ fontSize: 32, color: '#ef4444', marginBottom: 12 }} />
        <div style={{ color: '#ef4444', fontSize: 14, marginBottom: 8 }}>No se pudo cargar el dashboard</div>
        <button className="ag-btn" onClick={() => { setLoading(true); fetchData() }}>Reintentar</button>
      </div>
    )
  }

  const r = data.resumen
  const k = data.kpis
  const pctBecados = r.total_alumnos ? Math.round(r.total_becados / r.total_alumnos * 100) : 0

  return (
    <>
      <div className="page-head" style={{ marginBottom: 32 }}>
        <div>
          <div className="page-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span className="live-dot" /> Sistema operativo
          </div>
          <div className="page-title">Hola, {nombre}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={() => navigate('/usuarios')}>
            <i className="ti ti-users" /> Gestionar usuarios
          </button>
          <button className="btn-ghost" onClick={() => navigate('/reportes')}>
            <i className="ti ti-report-analytics" /> Reportes
          </button>
        </div>
      </div>

      <div className="dash-kpis" style={{ marginBottom: 32 }}>
        <div className="kpi-dominant" style={{ gridColumn: 'span 2', gridRow: 'span 2' }}>
          <span className="mono-label">Aprobación general</span>
          <div className="kpi-dominant-value" style={{ color: k.aprobacion_pct < 60 ? 'var(--danger)' : 'var(--success)' }}>{k.aprobacion_pct}%</div>
          <div className="kpi-dominant-foot">
            <div>
              <div className="mono-label" style={{ marginBottom: 4 }}>Promedio general</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>{k.promedio_general.toFixed(1)}</div>
            </div>
            <div>
              <div className="mono-label" style={{ marginBottom: 4 }}>Materias</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 17, fontWeight: 800, color: r.materias_sin_oferta > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>
                {r.total_materias.toLocaleString('es-PY')}
                {r.materias_sin_oferta > 0 && <span style={{ fontSize: 11, color: 'var(--warning)', fontWeight: 600, marginLeft: 6 }}>{r.materias_sin_oferta} sin oferta</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="kpi-secondary">
          <span className="mono-label" style={{ display: 'block', marginBottom: 16 }}>Asistencia global</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Ring pct={k.asistencia_pct} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{k.asistencia_pct}<span style={{ fontSize: 15, color: 'var(--text-secondary)' }}>%</span></div>
          </div>
        </div>

        <div className="kpi-secondary">
          <span className="mono-label" style={{ display: 'block', marginBottom: 16 }}>Alumnos becados</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{r.total_becados.toLocaleString('es-PY')}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>{pctBecados}%</span>
          </div>
          <div className="progress-track" style={{ marginTop: 14 }}><div className="progress-fill" style={{ width: `${pctBecados}%`, background: 'var(--success)' }} /></div>
        </div>

        <div className="kpi-secondary">
          <span className="mono-label" style={{ display: 'block', marginBottom: 16 }}>Total alumnos</span>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{r.total_alumnos.toLocaleString('es-PY')}</div>
        </div>

        <div className="kpi-secondary">
          <span className="mono-label" style={{ display: 'block', marginBottom: 16 }}>Profesores</span>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{r.total_profesores.toLocaleString('es-PY')}</div>
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


  const [profData, setProfData] = useState<ProfesorDashboardData | null>(null)
  const [profLoading, setProfLoading] = useState(true)
  const [profRefreshing, setProfRefreshing] = useState(false)
  const [profError, setProfError] = useState('')
  const [profLastUpdate, setProfLastUpdate] = useState<Date | null>(null)

  // ── Estado del dashboard de alumno (datos reales, sin mocks) ──
  const [alMaterias, setAlMaterias] = useState<MateriaRow[]>([])
  const [alEventos, setAlEventos] = useState<EventoRow[]>([])
  const [alPromedio, setAlPromedio] = useState<number | null>(null)
  const [alAsistencia, setAlAsistencia] = useState<number | null>(null)
  const [alCreditos, setAlCreditos] = useState<CreditosAlumnoOut | null>(null)
  const [alCuotasPendientes, setAlCuotasPendientes] = useState(0)
  const [alCuotasVencidas, setAlCuotasVencidas] = useState(0)
  const [alAsistDetalle, setAlAsistDetalle] = useState<{ total: number; presentes: number } | null>(null)
  const [alHayCuotas, setAlHayCuotas] = useState(false)
  const [alNombre, setAlNombre] = useState<string | null>(null)
  const [alCondicion, setAlCondicion] = useState<CondicionEgreso | null>(null)
  const [alLoading, setAlLoading] = useState(true)
  const [alRefreshing, setAlRefreshing] = useState(false)
  const [alError, setAlError] = useState('')
  const [alLastUpdate, setAlLastUpdate] = useState<Date | null>(null)

  const cargarAlumno = useCallback(async (manual = false) => {
    if (!user || user.role !== 'alumno') return
    const uid = Number(user.user_id)
    if (manual) setAlRefreshing(true)
    try {
      const [misMaterias, misNotas, misAsistencias, dash, creditos, condicion] = await Promise.all([
        api.get<{ id: number; nombre: string; profesor: string | null }[]>('/alumno/mis-materias'),
        api.get<{ materia_id: number; promedio: number | null; parcial1: number | null; parcial2: number | null; practico: number | null; final: number | null }[]>('/alumno/mis-notas'),
        api.get<{ total_clases: number; presentes: number }[]>('/alumno/mi-asistencia'),
        api.get<AlumnoDashboardResp>('/alumno/dashboard'),
        !isNaN(uid) ? obtenerCreditosAlumno(uid).catch(() => null) : Promise.resolve(null),
        !isNaN(uid) ? getCondicionEgreso(uid).catch(() => null) : Promise.resolve(null),
      ])
      setAlCondicion(condicion)

      const totalClases = misAsistencias.reduce((a, x) => a + x.total_clases, 0)
      const totalPresentes = misAsistencias.reduce((a, x) => a + x.presentes, 0)
      setAlAsistencia(totalClases > 0 ? Math.round((totalPresentes / totalClases) * 100) : null)
      setAlAsistDetalle(totalClases > 0 ? { total: totalClases, presentes: totalPresentes } : null)

      const notaMap = new Map(misNotas.map(n => [n.materia_id, n]))
      const rows: MateriaRow[] = misMaterias.map(m => {
        const n = notaMap.get(m.id)
        const prom = n?.promedio ?? null
        // Escala oficial UC (Art. 24): nota final entera 1-5, aprobado >= 2, destacado = 5 (nota maxima real)
        const estado = prom === null ? 'EN CURSO' : prom >= 5 ? 'DESTACADO' : prom >= 2 ? 'REGULAR' : 'REPROBADO'
        return {
          nombre: m.nombre, profesor: m.profesor || '—', ultimaNota: prom, estado,
          parcial1: n?.parcial1 ?? null, parcial2: n?.parcial2 ?? null, practico: n?.practico ?? null, final: n?.final ?? null,
        }
      })
      setAlMaterias(rows)

      const proms = rows.map(r => r.ultimaNota).filter((v): v is number => v !== null)
      setAlPromedio(proms.length ? Math.round(proms.reduce((a, b) => a + b, 0) / proms.length * 10) / 10 : null)

      const hoy = new Date().toISOString().slice(0, 10)
      setAlEventos(
        dash.eventosCercanos
          .filter(e => e.fecha === hoy)
          .map(e => ({ hora: e.hora || '—', titulo: e.titulo, lugar: e.descripcion || e.tipo }))
      )
      setAlCuotasPendientes(dash.cuentaSaldoPendiente)
      setAlCuotasVencidas(dash.cuentaSaldoVencido)
      setAlHayCuotas(dash.cuentaHayCuotas)
      setAlCreditos(creditos)
      if (dash.user?.nombre) setAlNombre(dash.user.nombre)
      setAlError('')
      setAlLastUpdate(new Date())
    } catch (e) {
      setAlError(e instanceof Error ? e.message : 'No se pudo cargar el dashboard')
    } finally {
      setAlLoading(false)
      setAlRefreshing(false)
    }
  }, [user])

  useEffect(() => {
    const load = () => {
      if (!user || user.role !== 'alumno') return
      cargarAlumno()
    }
    load()
    const id = setInterval(() => cargarAlumno(), POLL_MS_ALUMNO)
    return () => clearInterval(id)
  }, [user, cargarAlumno])

  const cargarProfesor = useCallback(async (manual = false) => {
    if (!user || user.role !== 'profesor') return
    if (manual) setProfRefreshing(true)
    try {
      const data = await obtenerDashboardProfesor()
      setProfData(data)
      setProfError('')
      setProfLastUpdate(new Date())
    } catch {
      setProfError('No se pudo cargar el dashboard')
    } finally {
      setProfLoading(false)
      setProfRefreshing(false)
    }
  }, [user])

  useEffect(() => {
    const load = () => {
      if (!user || user.role !== 'profesor') return
      cargarProfesor()
    }
    load()
    const id = setInterval(() => cargarProfesor(), POLL_MS_ALUMNO)
    return () => clearInterval(id)
  }, [user, cargarProfesor])

  const nombre = user?.username || 'Usuario'

  return (
    <>
      <style>{css}</style>
      {user?.role === 'admin'
        ? <AdminDash nombre={nombre} />
        : user?.role === 'profesor'
          ? <ProfesorDash nombre={nombre} data={profData} loading={profLoading} refreshing={profRefreshing} error={profError} lastUpdate={profLastUpdate} onRefresh={cargarProfesor} />
          : <AlumnoDash nombre={alNombre || nombre} materias={alMaterias} eventos={alEventos} promedio={alPromedio} asistencia={alAsistencia} asistDetalle={alAsistDetalle} creditos={alCreditos}
              cuotasPendientes={alCuotasPendientes} cuotasVencidas={alCuotasVencidas} hayCuotas={alHayCuotas} condicion={alCondicion}
              loading={alLoading} error={alError} refreshing={alRefreshing} lastUpdate={alLastUpdate} onRefresh={() => cargarAlumno(true)} />}
    </>
  )
}
