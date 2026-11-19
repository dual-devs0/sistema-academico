// Alumno. Cuotas propias, pago online (Stripe), comprobantes de facturación. Depende de: /finanzas/alumno/{id}/cuotas, /finanzas/pagos/*.
import { useState, useEffect, useCallback } from 'react'
import { getCurrentUser, emitToast } from '../lib/api'
import { Skeleton } from 'boneyard-js/react'
import { PageHead, KpiRow, RefreshButton } from '../components/common/PageKpi'
import { getCuotasAlumno, getBecasActivas, initPagoOnline, formatGs, type Cuota, type BecaActiva } from '../services/finanzasService'

const POLL_MS = 30000

const css = `
  .mc-list { background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); overflow:hidden; }
  .mc-row {
    display:grid; grid-template-columns:minmax(0,1fr) 110px 150px 150px; gap:16px; align-items:center;
    padding:14px 20px; border-top:1px solid var(--border-subtle);
  }
  .mc-row:first-child { border-top:none; }
  .mc-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; margin-top:6px; }
  .mc-periodo { font-size:13.5px; font-weight:700; color:var(--text-primary); }
  .mc-sub { font-size:11.5px; color:var(--text-secondary); margin-top:2px; }
  .mc-estado { font-family:var(--font-mono); font-size:11px; font-weight:700; }
  .mc-montos { text-align:right; }
  .mc-monto-original { font-family:var(--font-mono); font-size:10.5px; color:var(--text-muted); text-decoration:line-through; }
  .mc-monto-pagar { font-family:var(--font-mono); font-size:15px; font-weight:800; color:var(--text-primary); }
  .mc-accion { display:flex; justify-content:flex-end; }
  .mc-comprobante-link {
    color:var(--success); font-weight:700; text-decoration:none; font-size:11.5px;
    display:inline-flex; align-items:center; gap:5px;
  }
  .mc-comprobante-link:hover { text-decoration:underline; }
  .mc-comprobante-pendiente { color:var(--text-muted); font-size:11px; font-style:italic; text-align:right; }
  .mc-empty { text-align:center; padding:48px; color:var(--text-secondary); font-size:14px; }
  @media(max-width:760px){
    .mc-row { grid-template-columns:1fr auto; }
    .mc-estado { grid-column:2; grid-row:1; text-align:right; }
    .mc-montos { text-align:left; }
  }
`

type EstadoFilter = 'todos' | 'pendiente' | 'vencida' | 'pagada'

export default function MisCuotas() {
  const user = getCurrentUser()
  const alumnoId = user?.user_id

  const [cuotas, setCuotas] = useState<Cuota[]>([])
  const [becas, setBecas] = useState<BecaActiva[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [filtro, setFiltro] = useState<EstadoFilter>('todos')
  const [pagandoId, setPagandoId] = useState<number | null>(null)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  const cargarCuotas = useCallback((manual = false) => {
    if (!alumnoId) return
    if (manual) setRefreshing(true)
    Promise.allSettled([
      getCuotasAlumno(alumnoId),
      getBecasActivas(alumnoId),
    ]).then(([c, b]) => {
      const fails: string[] = []
      if (c.status === 'fulfilled') setCuotas(c.value)
      else fails.push('cuotas')
      if (b.status === 'fulfilled') setBecas(b.value)
      else fails.push('becas')
      setError(fails.length ? `No se pudo cargar: ${fails.join(', ')}. Mostrando último dato disponible.` : '')
      setLastUpdate(new Date())
    }).finally(() => { setLoading(false); setRefreshing(false) })
  }, [alumnoId])

  useEffect(() => {
    const load = () => cargarCuotas()
    load()
    const id = setInterval(() => cargarCuotas(), POLL_MS)
    return () => clearInterval(id)
  }, [cargarCuotas])

  useEffect(() => {
    const load = () => {
      const params = new URLSearchParams(window.location.search)
      const stripeStatus = params.get('stripe')
      if (stripeStatus === 'success') {
        setStatusMsg('Pago realizado con éxito. La cuota se actualizará en breve.')
        cargarCuotas()
        window.history.replaceState({}, '', window.location.pathname)
      } else if (stripeStatus === 'cancel') {
        setStatusMsg('Pago cancelado. Puedes intentar nuevamente cuando quieras.')
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
    load()
  }, [cargarCuotas])

  const cuotasFiltradas = filtro === 'todos' ? cuotas : cuotas.filter(c => c.estado === filtro)

  const totalPendiente = cuotas
    .filter(c => c.estado === 'pendiente' || c.estado === 'vencida')
    .reduce((s, c) => s + parseFloat(c.monto_a_pagar), 0)

  const totalDescuento = cuotas
    .reduce((s, c) => s + parseFloat(c.monto_descuento), 0)

  const vencidas = cuotas.filter(c => c.estado === 'vencida').length
  const abiertas = cuotas
    .filter(c => c.estado === 'pendiente' || c.estado === 'vencida')
    .sort((x, y) => x.fecha_vencimiento.localeCompare(y.fecha_vencimiento))
  const proxima = abiertas.find(c => c.estado === 'vencida') ?? abiertas[0] ?? null
  const primeraVencida = abiertas.find(c => c.estado === 'vencida') ?? null
  const diasDesde = (f: string) => Math.max(0, Math.floor((Date.now() - new Date(f).getTime()) / 86400000))

  async function pagar(cuota: Cuota) {
    setPagandoId(cuota.id)
    try {
      const returnUrl = `${window.location.origin}/mis-cuotas`
      const res = await initPagoOnline(cuota.id, `${returnUrl}?stripe=success`, `${returnUrl}?stripe=cancel`)
      window.location.href = res.redirect_url
    } catch {
      emitToast('Error al iniciar pago', 'error')
    } finally {
      setPagandoId(null)
    }
  }

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
      <div>
        <PageHead eyebrow="Estado de cuenta · facturación" title="Mis cuotas"
          actions={<RefreshButton onClick={() => cargarCuotas(true)} refreshing={refreshing} lastUpdate={lastUpdate} />} />

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: 12.5, color: 'var(--danger)', marginBottom: 16 }}>
            <i className="ti ti-alert-triangle" /> {error}
          </div>
        )}

        {/* Mensaje de estado Stripe */}
        {statusMsg && (
          <div style={{
            padding: '12px 18px', borderRadius: 12, marginBottom: 18,
            background: statusMsg.includes('éxito') ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
            border: `1px solid ${statusMsg.includes('éxito') ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
            color: statusMsg.includes('éxito') ? '#10b981' : '#f59e0b',
            fontWeight: 600, fontSize: 13,
          }}>
            {statusMsg}
          </div>
        )}

        {/* Dato dominante: total pendiente; vencidas y ahorro subordinados */}
        <KpiRow
          dominant={{
            label: <span style={{ color: vencidas > 0 ? 'var(--danger)' : undefined }}>Total pendiente</span>,
            value: formatGs(totalPendiente).replace(/^Gs\.?\s*/, ''),
            unit: 'Gs.',
            compact: true,
            tone: vencidas > 0 ? 'danger' : 'default',
            badge: primeraVencida ? (
              <span className="badge" style={{ background: 'var(--danger-subtle)', color: 'var(--danger)' }}>
                <i className="ti ti-alert-triangle" /> {vencidas} vencida{vencidas === 1 ? '' : 's'} · {diasDesde(primeraVencida.fecha_vencimiento)} días
              </span>
            ) : undefined,
            children: proxima ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <button type="button" className="btn-primary" disabled={pagandoId === proxima.id} onClick={() => pagar(proxima)}>
                  <i className="ti ti-credit-card" /> {pagandoId === proxima.id ? 'Procesando…' : proxima.estado === 'vencida' ? 'Pagar cuota vencida' : 'Pagar próxima cuota'}
                </button>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{abiertas.length} cuota{abiertas.length === 1 ? '' : 's'} abierta{abiertas.length === 1 ? '' : 's'} de {cuotas.length}</span>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--success)' }}><i className="ti ti-circle-check" /> Sin cuotas pendientes</div>
            ),
          }}
          secondary={[
            {
              label: 'Cuotas vencidas', value: String(vencidas).padStart(2, '0'), alert: vencidas > 0, tone: vencidas > 0 ? 'danger' : 'success',
              sub: primeraVencida ? `${primeraVencida.periodo} · ${formatGs(primeraVencida.monto_a_pagar)}` : 'Al día',
            },
            {
              label: 'Ahorro por becas', value: formatGs(totalDescuento).replace(/^Gs\.?\s*/, ''), tone: totalDescuento > 0 ? 'success' : 'default',
              sub: becas.length > 0 ? becas.map(b => `${b.beca_nombre} ${parseFloat(b.porcentaje_descuento)}%`).join(' · ') : 'Sin becas activas',
            },
          ]}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['todos', 'pendiente', 'vencida', 'pagada'] as EstadoFilter[]).map(f => (
              <button key={f} type="button" className={`pill-tab${filtro === f ? ' active' : ''}`} onClick={() => setFiltro(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <span className="mono-label">{cuotasFiltradas.length} cuota{cuotasFiltradas.length === 1 ? '' : 's'}</span>
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
                <span style={{ fontSize: 18, color: b.es_externa ? '#a78bfa' : '#22d3ee' }}><i className={`ti ${b.es_externa ? 'ti-building-bank' : 'ti-school'}`} /></span>
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
        <Skeleton name="mis-cuotas" loading={loading}>
        {cuotasFiltradas.length === 0 ? (
          <div className="mc-empty">No hay cuotas {filtro !== 'todos' ? `con estado "${filtro}"` : ''}.</div>
        ) : (
          <div className="mc-list">
            {cuotasFiltradas.map(cuota => {
              const descuentoPct = parseFloat(cuota.monto) > 0
                ? ((parseFloat(cuota.monto_descuento) / parseFloat(cuota.monto)) * 100).toFixed(0)
                : '0'
              const tieneDescuento = parseFloat(cuota.monto_descuento) > 0

              const estadoColor = { pendiente: 'var(--warning)', vencida: 'var(--danger)', pagada: 'var(--success)', anulada: 'var(--text-secondary)' }[cuota.estado] ?? 'var(--text-secondary)'

              const venceTxt = cuota.estado === 'vencida'
                ? `Venció hace ${diasDesde(cuota.fecha_vencimiento)} días`
                : cuota.estado === 'pagada' ? `Vencimiento ${new Date(cuota.fecha_vencimiento).toLocaleDateString('es-PY')}`
                : `Vence ${new Date(cuota.fecha_vencimiento).toLocaleDateString('es-PY')}`

              return (
                <div key={cuota.id} className="mc-row" style={{ opacity: cuota.estado === 'pagada' ? .8 : 1 }}>
                  <div style={{ display: 'flex', gap: 12, minWidth: 0 }}>
                    <span className="mc-dot" style={{ background: estadoColor }} />
                    <div style={{ minWidth: 0 }}>
                      <div className="mc-periodo">Cuota {cuota.periodo}</div>
                      <div className="mc-sub">
                        {venceTxt}
                        {tieneDescuento && cuota.beca_nombre && <> · {cuota.beca_nombre} {descuentoPct}%</>}
                      </div>
                    </div>
                  </div>
                  <span className="mc-estado" style={{ color: estadoColor }}>{estadoLabel(cuota.estado)}</span>
                  <div className="mc-montos">
                    {tieneDescuento && <div className="mc-monto-original">{formatGs(cuota.monto)}</div>}
                    <div className="mc-monto-pagar">{formatGs(cuota.monto_a_pagar)}</div>
                  </div>
                  <div className="mc-accion">
                    {cuota.estado === 'pagada' && (
                      cuota.comprobante_estado === 'emitido' && cuota.comprobante_url_pdf ? (
                        <a className="mc-comprobante-link" href={cuota.comprobante_url_pdf} target="_blank" rel="noopener noreferrer">
                          <i className="ti ti-file-check" /> Comprobante
                        </a>
                      ) : (
                        <span className="mc-comprobante-pendiente">Comprobante en proceso</span>
                      )
                    )}
                    {(cuota.estado === 'pendiente' || cuota.estado === 'vencida') && (
                      <button type="button" className={cuota.estado === 'vencida' ? 'btn-primary' : 'btn-ghost'}
                        style={{ padding: '6px 16px', fontSize: 12 }}
                        disabled={pagandoId === cuota.id} onClick={() => pagar(cuota)}>
                        {pagandoId === cuota.id ? 'Procesando…' : 'Pagar'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Skeleton>
      </div>
    </>
  )
}
