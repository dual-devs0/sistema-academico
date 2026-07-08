import { useState, useEffect } from 'react'
import { getCurrentUser } from '../lib/api'
import { getCuotasAlumno, getBecasActivas, formatGs, type Cuota, type BecaActiva } from '../services/finanzasService'

const css = `
  .mc-header { display:flex; align-items:center; gap:16px; margin-bottom:28px; flex-wrap:wrap; }
  .mc-title { font-size:22px; font-weight:700; color:var(--text-primary); }
  .mc-filters { display:flex; gap:10px; flex-wrap:wrap; }
  .mc-filter-btn {
    padding:6px 16px; border-radius:999px; font-size:13px; font-weight:600;
    border:1.5px solid var(--border-subtle); background:transparent;
    color:var(--text-secondary); cursor:pointer; transition:all .18s;
  }
  .mc-filter-btn.active { background:var(--accent-bright); color:#fff; border-color:var(--accent-bright); }
  .mc-summary { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:24px; }
  .mc-kpi {
    background:var(--bg-elevated); border:1px solid var(--border-subtle);
    border-radius:14px; padding:16px 20px;
  }
  .mc-kpi-label { font-size:11px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:.06em; margin-bottom:6px; }
  .mc-kpi-value { font-size:22px; font-weight:800; color:var(--text-primary); }
  .mc-kpi-value.danger { color:#ef4444; }
  .mc-kpi-value.success { color:#10b981; }
  .mc-list { display:flex; flex-direction:column; gap:12px; }
  .mc-card {
    background:var(--bg-elevated); border:1px solid var(--border-subtle);
    border-radius:16px; padding:18px 22px;
    display:grid; grid-template-columns:1fr auto; gap:12px; align-items:center;
    transition:border-color .18s;
  }
  .mc-card:hover { border-color:var(--accent-muted); }
  .mc-card.vencida { border-left:3px solid #ef4444; }
  .mc-card.pagada { border-left:3px solid #10b981; opacity:.8; }
  .mc-card.pendiente { border-left:3px solid #f59e0b; }
  .mc-periodo { font-size:15px; font-weight:700; color:var(--text-primary); }
  .mc-concepto { font-size:12px; color:var(--text-secondary); margin-top:3px; }
  .mc-beca-tag {
    display:inline-flex; align-items:center; gap:5px;
    padding:3px 10px; border-radius:999px; font-size:11px; font-weight:600;
    margin-top:6px;
  }
  .mc-beca-tag.externa { background:rgba(167,139,250,0.15); color:#a78bfa; border:1px solid rgba(167,139,250,0.3); }
  .mc-beca-tag.institucional { background:rgba(34,211,238,0.12); color:#22d3ee; border:1px solid rgba(34,211,238,0.3); }
  .mc-montos { text-align:right; }
  .mc-monto-original { font-size:12px; color:var(--text-secondary); text-decoration:line-through; }
  .mc-monto-pagar { font-size:18px; font-weight:800; color:var(--text-primary); }
  .mc-descuento { font-size:11px; color:#10b981; font-weight:600; margin-top:2px; }
  .mc-estado-badge {
    padding:4px 12px; border-radius:999px; font-size:11px; font-weight:700;
    text-transform:uppercase; letter-spacing:.05em;
  }
  .mc-estado-badge.pendiente { background:rgba(245,158,11,.15); color:#f59e0b; }
  .mc-estado-badge.vencida { background:rgba(239,68,68,.15); color:#ef4444; }
  .mc-estado-badge.pagada { background:rgba(16,185,129,.15); color:#10b981; }
  .mc-estado-badge.anulada { background:rgba(156,163,175,.15); color:#9ca3af; }
  .mc-vence { font-size:11px; color:var(--text-secondary); margin-top:4px; }
  .mc-empty { text-align:center; padding:48px; color:var(--text-secondary); font-size:15px; }
  @media(max-width:700px){ .mc-summary { grid-template-columns:1fr; } .mc-card { grid-template-columns:1fr; } .mc-montos { text-align:left; } }
`

type EstadoFilter = 'todos' | 'pendiente' | 'vencida' | 'pagada'

export default function MisCuotas() {
  const user = getCurrentUser()
  const alumnoId = user?.user_id

  const [cuotas, setCuotas] = useState<Cuota[]>([])
  const [becas, setBecas] = useState<BecaActiva[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<EstadoFilter>('todos')

  useEffect(() => {
    if (!alumnoId) return
    setLoading(true)
    Promise.all([
      getCuotasAlumno(alumnoId),
      getBecasActivas(alumnoId),
    ]).then(([c, b]) => {
      setCuotas(c)
      setBecas(b)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [alumnoId])

  const cuotasFiltradas = filtro === 'todos' ? cuotas : cuotas.filter(c => c.estado === filtro)

  const totalPendiente = cuotas
    .filter(c => c.estado === 'pendiente' || c.estado === 'vencida')
    .reduce((s, c) => s + parseFloat(c.monto_a_pagar), 0)

  const totalDescuento = cuotas
    .reduce((s, c) => s + parseFloat(c.monto_descuento), 0)

  const vencidas = cuotas.filter(c => c.estado === 'vencida').length

  function estadoLabel(estado: string) {
    const map: Record<string, string> = {
      pendiente: 'Pendiente', vencida: 'Vencida', pagada: 'Pagada', anulada: 'Anulada',
    }
    return map[estado] || estado
  }

  if (!alumnoId) return <div style={{ padding: 32 }}>No autenticado</div>

  return (
    <>
      <style>{css}</style>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 16px' }}>
        <div className="mc-header">
          <div className="mc-title">💳 Mis Cuotas</div>
          <div className="mc-filters">
            {(['todos', 'pendiente', 'vencida', 'pagada'] as EstadoFilter[]).map(f => (
              <button
                key={f}
                className={`mc-filter-btn${filtro === f ? ' active' : ''}`}
                onClick={() => setFiltro(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div className="mc-summary">
          <div className="mc-kpi">
            <div className="mc-kpi-label">Total pendiente</div>
            <div className={`mc-kpi-value${vencidas > 0 ? ' danger' : ''}`}>
              {formatGs(totalPendiente)}
            </div>
          </div>
          <div className="mc-kpi">
            <div className="mc-kpi-label">Cuotas vencidas</div>
            <div className={`mc-kpi-value${vencidas > 0 ? ' danger' : ' success'}`}>
              {vencidas}
            </div>
          </div>
          <div className="mc-kpi">
            <div className="mc-kpi-label">Ahorro becas</div>
            <div className="mc-kpi-value success">{formatGs(totalDescuento)}</div>
          </div>
        </div>

        {/* Becas activas resumen */}
        {becas.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            {becas.map(b => (
              <div
                key={b.id}
                style={{
                  background: b.es_externa ? 'rgba(167,139,250,0.08)' : 'rgba(34,211,238,0.06)',
                  border: `1px solid ${b.es_externa ? 'rgba(167,139,250,0.25)' : 'rgba(34,211,238,0.25)'}`,
                  borderRadius: 12, padding: '12px 16px', marginBottom: 8,
                  display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: 18 }}>{b.es_externa ? '🏦' : '🎓'}</span>
                <div>
                  <div style={{ fontWeight: 700, color: b.es_externa ? '#a78bfa' : '#22d3ee', fontSize: 13 }}>
                    {b.beca_nombre} — {b.fuente}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {parseFloat(b.porcentaje_descuento)}% descuento · Vigente {b.periodo_inicio} → {b.periodo_fin || '∞'}
                    {b.promedio_minimo_requerido && (
                      <> · Promedio mín: {b.promedio_minimo_requerido} (actual: {b.promedio_actual ?? '—'})</>
                    )}
                    {' · '}<span style={{ fontWeight: 600, color: b.estado_renovacion === 'vigente' ? '#10b981' : '#f59e0b' }}>
                      {b.estado_renovacion}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lista cuotas */}
        {loading ? (
          <div className="mc-empty">Cargando cuotas…</div>
        ) : cuotasFiltradas.length === 0 ? (
          <div className="mc-empty">No hay cuotas {filtro !== 'todos' ? `con estado "${filtro}"` : ''}.</div>
        ) : (
          <div className="mc-list">
            {cuotasFiltradas.map(cuota => {
              const descuentoPct = parseFloat(cuota.monto) > 0
                ? ((parseFloat(cuota.monto_descuento) / parseFloat(cuota.monto)) * 100).toFixed(0)
                : '0'
              const tieneDescuento = parseFloat(cuota.monto_descuento) > 0

              return (
                <div key={cuota.id} className={`mc-card ${cuota.estado}`}>
                  <div>
                    <div className="mc-periodo">Cuota {cuota.periodo}</div>
                    <div className="mc-vence">
                      Vence: {new Date(cuota.fecha_vencimiento).toLocaleDateString('es-PY')}
                    </div>
                    {/* Badge beca con trazabilidad */}
                    {tieneDescuento && cuota.beca_nombre && (
                      <div className={`mc-beca-tag ${cuota.es_beca_externa ? 'externa' : 'institucional'}`}>
                        {cuota.es_beca_externa ? '🏦' : '🎓'}
                        {cuota.beca_nombre} — {cuota.fuente_beca} ({descuentoPct}% desc.)
                      </div>
                    )}
                  </div>
                  <div className="mc-montos">
                    {tieneDescuento && (
                      <div className="mc-monto-original">{formatGs(cuota.monto)}</div>
                    )}
                    <div className="mc-monto-pagar">{formatGs(cuota.monto_a_pagar)}</div>
                    {tieneDescuento && (
                      <div className="mc-descuento">−{formatGs(cuota.monto_descuento)} becado</div>
                    )}
                    <div style={{ marginTop: 8 }}>
                      <span className={`mc-estado-badge ${cuota.estado}`}>
                        {estadoLabel(cuota.estado)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
