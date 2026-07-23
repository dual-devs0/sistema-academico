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
  .dash-access-icon { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .dash-access-icon i { font-size:20px; }
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

function AlumnoDash({ nombre, materias, eventos, promedio, asistencia, creditos, cuotasPendientes, cuotasVencidas, hayCuotas, condicion, loading, error, refreshing, lastUpdate, onRefresh }:
  {
    nombre: string; materias: MateriaRow[]; eventos: EventoRow[]; promedio: number | null; asistencia: number | null; creditos: CreditosAlumnoOut | null
    cuotasPendientes: number; cuotasVencidas: number; hayCuotas: boolean; condicion: CondicionEgreso | null
    loading: boolean; error: string; refreshing: boolean; lastUpdate: Date | null; onRefresh: () => void
  }) {
  const navigate = useNavigate()
  const enCurso = materias.length
  const pctCreditos = creditos?.creditos_totales ? Math.round((creditos.creditos_acumulados / creditos.creditos_totales) * 100) : 0
  const saludo = saludoDelDia()
  return (
    <>
      <div className="greet-banner">
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 2, letterSpacing: -0.3 }}>{saludo.texto}, {nombre}</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', opacity: 0.9 }}>
            {loading ? 'Cargando tu día…' : eventos.length > 0 ? `Tenés ${eventos.length} evento${eventos.length > 1 ? 's' : ''} hoy.` : 'Sin eventos programados para hoy.'}
          </div>
        </div>
        <div className="greet-icon"><i className="ti ti-graduation-cap" style={{ fontSize: 26 }} /></div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--danger-subtle)', color: 'var(--danger)', borderRadius: 10, padding: '10px 14px', fontSize: 12.5, marginBottom: 16 }}>
          <i className="ti ti-alert-circle" /> {error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        {lastUpdate && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
            <i className={`ti ti-refresh${refreshing ? ' ti-spin' : ''}`} style={{ fontSize: 13 }} />
            {lastUpdate.toLocaleTimeString('es-PY')}
          </span>
        )}
        <button className="btn-ghost" onClick={onRefresh} disabled={refreshing} style={{ padding: '6px 12px', fontSize: 11.5 }}>
          <i className={`ti ti-refresh${refreshing ? ' ti-spin' : ''}`} /> {refreshing ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      <div className="dash-kpis">
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="mono-label">Promedio General</span>
          </div>
          <span className="kpi-value">{loading ? '—' : promedio !== null ? promedio.toFixed(1) : '—'}</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="mono-label">Asistencia</span>
            <i className="ti ti-calendar-check" style={{ color: 'var(--accent)', fontSize: 15 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Ring pct={asistencia ?? 0} />
            <span className="kpi-value">{asistencia !== null ? asistencia : '—'}<span className="kpi-unit">%</span></span>
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
            <span className="mono-label">{cuotasVencidas > 0 ? 'Cuotas Vencidas' : 'Cuotas Pendientes'}</span>
            <i className="ti ti-coin" style={{ color: cuotasVencidas > 0 ? 'var(--danger)' : 'var(--warning)', fontSize: 15 }} />
          </div>
          {hayCuotas ? (
            <span className="kpi-value" style={{ fontSize: 20 }}>
              Gs. {(cuotasVencidas > 0 ? cuotasVencidas : cuotasPendientes).toLocaleString('es-PY')}
            </span>
          ) : (
            <span className="kpi-value" style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Sin cuotas</span>
          )}
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
            <h2 style={{ fontSize: 19, fontWeight: 800 }}>Calificaciones por Materia</h2>
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
        </div>

        <div>
          <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 12 }}>Timeline de Hoy</h2>
          <div className="card" style={{ padding: '14px 18px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)', fontSize: 13 }}>Cargando…</div>
            ) : eventos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)', fontSize: 13 }}>Sin eventos hoy.</div>
            ) : eventos.map((ev, i) => (
              <div key={i} className="tl-item">
                {i < eventos.length - 1 && <div className="tl-line" />}
                <div className="tl-dot">
                  <i className="ti ti-clock" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span className="mono-label">{ev.hora}</span>
                  <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 3 }}>{ev.titulo}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{ev.lugar}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginTop: 20 }}>
        <button type="button" onClick={() => navigate('/mi-graduacion')}
          className="card dash-access-card" style={{ borderColor: condicion?.puede_graduarse ? 'var(--success)' : undefined }}>
          <span className="dash-access-icon" style={{
            background: condicion?.puede_graduarse ? 'rgba(16,185,129,.15)' : 'var(--accent-muted)',
            color: condicion?.puede_graduarse ? 'var(--success)' : 'var(--accent-bright)',
          }}>
            <i className={`ti ${condicion?.puede_graduarse ? 'ti-certificate' : 'ti-graduation-cap'}`} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, display:'flex', alignItems:'center', gap:8 }}>
              Mi Graduación
              {condicion && (
                <span className="badge" style={{
                  background: condicion.puede_graduarse ? 'rgba(16,185,129,.15)' : 'rgba(239,68,68,.12)',
                  color: condicion.puede_graduarse ? 'var(--success)' : 'var(--danger)',
                  border: `1px solid ${condicion.puede_graduarse ? 'rgba(16,185,129,.3)' : 'rgba(239,68,68,.3)'}`,
                }}>
                  {condicion.puede_graduarse ? 'ELEGIBLE' : 'PENDIENTE'}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {condicion?.puede_graduarse
                ? '¡Podés solicitar tu graduación!'
                : condicion?.motivo || 'Verificá tu condición de egreso'}
            </div>
          </div>
          <i className="ti ti-chevron-right" style={{ color: 'var(--text-muted)' }} />
        </button>
        <button type="button" onClick={() => navigate('/mis-equivalencias')}
          className="card dash-access-card">
          <span className="dash-access-icon" style={{ background: 'rgba(168,85,247,.15)', color: '#a855f7' }}><i className="ti ti-arrows-exchange" /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Equivalencias</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Solicitud de convalidación de materias</div>
          </div>
          <i className="ti ti-chevron-right" style={{ color: 'var(--text-muted)' }} />
        </button>
        <button type="button" onClick={() => navigate('/mis-pasantias')}
          className="card dash-access-card">
          <span className="dash-access-icon" style={{ background: 'rgba(245,158,11,.15)', color: '#f59e0b' }}><i className="ti ti-briefcase" /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Pasantías</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Gestioná tus prácticas profesionales</div>
          </div>
          <i className="ti ti-chevron-right" style={{ color: 'var(--text-muted)' }} />
        </button>
        <button type="button" onClick={() => navigate('/tramites')}
          className="card dash-access-card">
          <span className="dash-access-icon" style={{ background: 'rgba(34,197,94,.15)', color: '#22c55e' }}><i className="ti ti-file-description" /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Trámites</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Solicitudes y gestiones académicas</div>
          </div>
          <i className="ti ti-chevron-right" style={{ color: 'var(--text-muted)' }} />
        </button>
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

  const kpis = [
    { label: 'Materias', value: String(r?.materias_activas ?? 0).padStart(2, '0'), icon: 'ti-book', color: 'var(--accent)' },
    { label: 'Alumnos', value: String(r?.total_alumnos ?? 0), icon: 'ti-users', color: 'var(--accent)' },
    { label: 'Asistencia', value: r?.asistencia_promedio != null ? `${r.asistencia_promedio}%` : '—', icon: 'ti-clock', color: 'var(--success)' },
    { label: 'Aprobación', value: r?.porcentaje_aprobacion != null ? `${r.porcentaje_aprobacion}%` : '—', icon: 'ti-trending-up', color: r?.porcentaje_aprobacion != null && r.porcentaje_aprobacion < 60 ? '#ef4444' : 'var(--info)' },
  ]

  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  const horariosStr = (h: { dia: number; hora_inicio: string; hora_fin: string; aula: string | null }[]) =>
    h.map(d => `${diasSemana[d.dia] ?? '?'} ${d.hora_inicio.slice(0, 5)}-${d.hora_fin.slice(0, 5)}`).join(', ') || '—'

  return (
    <>
      <div className="greet-banner">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>¡Hola, {nombre}!</div>
            <div style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>
              {r?.materias_activas ? `Tienes ${r.materias_activas} curso(s) activo(s) y ${r.total_alumnos} alumno(s) en total.` : 'Bienvenido a tu panel docente.'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {lastUpdate && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)' }}>
                <svg className={refreshing ? 'spin' : ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
                {lastUpdate.toLocaleTimeString('es-PY')}
              </span>
            )}
            <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => onRefresh(true)} disabled={refreshing}>
              <i className="ti ti-refresh" /> {refreshing ? '…' : 'Actualizar'}
            </button>
          </div>
        </div>
        <div className="greet-icon"><i className="ti ti-school" /></div>
      </div>

      <div className="dash-kpis">
        {kpis.map(k => (
          <div className="kpi-card" key={k.label}>
            <div className="kpi-top"><span className="mono-label">{k.label}</span><i className={k.icon} style={{ color: k.color, fontSize: 15 }} /></div>
            <span className="kpi-value" style={{ color: k.color }}>{k.value}</span>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: 19, fontWeight: 800 }}>Cursos Activos</h2>
            <button onClick={() => navigate('/puntajes')} className="btn-ghost" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700 }}>
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
          <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 12 }}>Agenda de Hoy</h2>
          <div className="card" style={{ padding: '14px 18px' }}>
            {agenda.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--text-secondary)', fontSize: 12 }}>
                Sin actividades para hoy.
              </div>
            ) : (
              agenda.map((ev, i) => (
                <div key={i} className="tl-item">
                  {i < agenda.length - 1 && <div className="tl-line" />}
                  <div className={`tl-dot${ev.tipo === 'clase' ? ' live' : ev.tipo === 'evento' ? '' : ''}`}>
                    <i className={ev.tipo === 'recordatorio' ? 'ti ti-notebook' : 'ti ti-clock'} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span className="mono-label">{ev.hora_inicio}{ev.hora_fin ? ` - ${ev.hora_fin}` : ''}</span>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{ev.titulo}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ev.aula}{ev.materia ? ` · ${ev.materia}` : ''}</div>
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
    { icon: 'ti-file-description', color: 'var(--success)', titulo: 'Trámites', sub: 'Solicitudes pendientes', path: '/tramites', badge: data?.resumen.tramites_pendientes },
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

      const notaMap = new Map(misNotas.map(n => [n.materia_id, n]))
      const rows: MateriaRow[] = misMaterias.map(m => {
        const n = notaMap.get(m.id)
        const prom = n?.promedio ?? null
        const estado = prom === null ? 'EN CURSO' : prom >= 9 ? 'PROMOCIONANDO' : prom >= 6 ? 'REGULAR' : 'REPROBADO'
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
    if (!user || user.role !== 'alumno') return
    cargarAlumno()
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
    if (!user || user.role !== 'profesor') return
    cargarProfesor()
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
          : <AlumnoDash nombre={alNombre || nombre} materias={alMaterias} eventos={alEventos} promedio={alPromedio} asistencia={alAsistencia} creditos={alCreditos}
              cuotasPendientes={alCuotasPendientes} cuotasVencidas={alCuotasVencidas} hayCuotas={alHayCuotas} condicion={alCondicion}
              loading={alLoading} error={alError} refreshing={alRefreshing} lastUpdate={alLastUpdate} onRefresh={() => cargarAlumno(true)} />}
    </>
  )
}
