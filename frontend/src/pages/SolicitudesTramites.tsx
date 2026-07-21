import { useState, useEffect, type CSSProperties } from 'react'
import { getCurrentUser, emitToast } from '../lib/api'
import {
  getTiposTramite, crearSolicitud, getMisSolicitudes, getDescargaUrl, resolverSolicitud,
  getStatsTramites,
  type TipoTramite, type Solicitud, type TramitesStats,
} from '../services/tramitesService'

const POLL_MS = 30000

const css = `
  .tr-title { font-size:22px; font-weight:800; margin-bottom:20px; color:var(--text-primary); display:flex; align-items:center; gap:10px; }
  .tr-section { max-width:900px; margin: 0 auto 32px; }
  .tr-card {
    background:var(--bg-elevated); border:1px solid var(--border-subtle);
    border-radius:16px; padding:18px 22px; margin-bottom:12px;
  }
  .tr-tipo-row { display:flex; justify-content:space-between; align-items:center; gap:12px; }
  .tr-tipo-nombre { font-weight:700; color:var(--text-primary); font-size:14px; }
  .tr-tipo-desc { font-size:12px; color:var(--text-secondary); margin-top:3px; }
  .tr-btn {
    padding:8px 18px; border-radius:10px; font-size:13px; font-weight:700;
    border:none; cursor:pointer; background:var(--accent-bright); color:#fff; transition:opacity .18s;
    display:inline-flex; align-items:center; gap:6px;
  }
  .tr-btn:hover { opacity:.88; }
  .tr-btn:disabled { opacity:.5; cursor:not-allowed; }
  .tr-btn.secondary { background:var(--bg-base); color:var(--text-primary); border:1px solid var(--border-subtle); }
  .tr-btn.danger { background:rgba(239,68,68,.15); color:#ef4444; border:1px solid rgba(239,68,68,.3); }
  .tr-estado-badge {
    padding:4px 12px; border-radius:999px; font-size:11px; font-weight:700;
    text-transform:uppercase; letter-spacing:.05em;
  }
  .tr-estado-badge.pendiente { background:rgba(245,158,11,.15); color:#f59e0b; }
  .tr-estado-badge.en_proceso { background:rgba(99,102,241,.15); color:#818cf8; }
  .tr-estado-badge.resuelta { background:rgba(16,185,129,.15); color:#10b981; }
  .tr-estado-badge.rechazada { background:rgba(239,68,68,.15); color:#ef4444; }
  .tr-empty { text-align:center; padding:32px; color:var(--text-secondary); font-size:14px; }
  .tr-motivo { font-size:12px; color:#ef4444; margin-top:6px; }
  .tr-skeleton { border-radius:16px; height:64px; margin-bottom:12px; background:linear-gradient(90deg,var(--bg-elevated) 25%,var(--bg-hover) 50%,var(--bg-elevated) 75%); background-size:200% 100%; animation:tr-shimmer 1.4s infinite; }
  @keyframes tr-shimmer { 0% { background-position:200% 0; } 100% { background-position:-200% 0; } }
  .tr-empty-icon { font-size:32px; margin-bottom:10px; opacity:.6; }
  .tr-empty-title { font-weight:700; color:var(--text-primary); margin-bottom:4px; }
  .tr-stat-card {
    background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:var(--radius);
    padding:14px 20px; min-width:120px; flex:1 1 130px; border-left:4px solid var(--accent);
  }
  .tr-stat-value { display:block; font-family:var(--font-mono); font-size:22px; font-weight:800; color:var(--accent-bright); }
  .tr-stat-label { display:block; font-size:11.5px; font-weight:600; color:var(--text-secondary); margin-top:2px; text-transform:uppercase; letter-spacing:.04em; }
  .tr-chip {
    padding:6px 14px; border-radius:20px; border:1px solid var(--border-subtle); font-size:12.5px; font-weight:700;
    cursor:pointer; background:var(--bg-surface); color:var(--text-secondary); transition:all .15s;
  }
  .tr-chip.active { background:var(--accent); color:#fff; border-color:var(--accent); }
`

const statCardStyle = (color: string): CSSProperties => ({
  background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)',
  padding: '14px 20px', minWidth: 120, flex: '1 1 130px', borderLeft: `4px solid ${color}`,
})
const statValueStyle = (color: string): CSSProperties => ({
  display: 'block', fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 800, color,
})
const statLabelStyle: CSSProperties = {
  display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 2,
  textTransform: 'uppercase', letterSpacing: '.04em',
}

function estadoLabel(estado: string) {
  const map: Record<string, string> = {
    pendiente: 'Pendiente', en_proceso: 'En proceso', resuelta: 'Resuelta', rechazada: 'Rechazada',
  }
  return map[estado] || estado
}

// ── Vista alumno ─────────────────────────────────────────────────────
function VistaAlumno() {
  const [tipos, setTipos] = useState<TipoTramite[]>([])
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [solicitando, setSolicitando] = useState<number | null>(null)

  const cargar = () => {
    setLoadError(false)
    Promise.all([getTiposTramite(), getMisSolicitudes()])
      .then(([t, s]) => { setTipos(t); setSolicitudes(s) })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [])

  const solicitar = async (tipoId: number) => {
    setSolicitando(tipoId)
    try {
      await crearSolicitud(tipoId)
      emitToast('Solicitud creada', 'success')
      setLoading(true); cargar()
    } catch (e: unknown) {
      emitToast(e instanceof Error ? e.message : 'No se pudo crear la solicitud', 'error')
    } finally {
      setSolicitando(null)
    }
  }

  const descargar = async (id: number) => {
    try {
      const { download_url } = await getDescargaUrl(id)
      window.open(download_url, '_blank')
    } catch {
      emitToast('Error obteniendo el documento', 'error')
    }
  }

  if (loading) {
    return (
      <div className="tr-section">
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
          Trámites disponibles
        </h3>
        {[0, 1, 2, 3].map(i => <div key={i} className="tr-skeleton" />)}
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="tr-section">
        <div className="tr-empty">
          <div className="tr-empty-icon"><i className="ti ti-file-off" /></div>
          <div className="tr-empty-title">Trámites próximamente disponibles</div>
          <div>Estamos preparando el catálogo de solicitudes académicas.</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="tr-section">
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
          Trámites disponibles
        </h3>
        {tipos.length === 0 ? (
          <div className="tr-empty">
            <div className="tr-empty-icon"><i className="ti ti-file-off" /></div>
            <div className="tr-empty-title">Trámites próximamente disponibles</div>
            <div>Estamos preparando el catálogo de solicitudes académicas.</div>
          </div>
        ) : tipos.map(t => (
          <div key={t.id} className="tr-card tr-tipo-row">
            <div>
              <div className="tr-tipo-nombre">{t.nombre}</div>
              {t.descripcion && <div className="tr-tipo-desc">{t.descripcion}</div>}
              {t.dias_estimados !== null && (
                <div className="tr-tipo-desc">
                  {t.requiere_aprobacion ? `Estimado: ${t.dias_estimados} días` : 'Generación automática'}
                </div>
              )}
            </div>
            <button className="tr-btn" disabled={solicitando === t.id} onClick={() => solicitar(t.id)}>
              <i className="ti ti-send" /> {solicitando === t.id ? 'Solicitando…' : 'Solicitar'}
            </button>
          </div>
        ))}
      </div>

      <div className="tr-section">
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
          Mis solicitudes
        </h3>
        {solicitudes.length === 0 ? (
          <div className="tr-empty">No tenés solicitudes todavía.</div>
        ) : (
          solicitudes.map(s => (
            <div key={s.id} className="tr-card">
              <div className="tr-tipo-row">
                <div>
                  <div className="tr-tipo-nombre">
                    {s.tipo_tramite_nombre || tipos.find(t => t.id === s.tipo_tramite_id)?.nombre || `Trámite #${s.tipo_tramite_id}`}
                  </div>
                  <div className="tr-tipo-desc">
                    Solicitado: {new Date(s.fecha_solicitud).toLocaleDateString('es-PY')}
                  </div>
                  {s.estado === 'rechazada' && s.motivo_rechazo && (
                    <div className="tr-motivo">Motivo: {s.motivo_rechazo}</div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={`tr-estado-badge ${s.estado}`}>{estadoLabel(s.estado)}</span>
                  {s.estado === 'resuelta' && s.storage_key_resultado && (
                    <button className="tr-btn secondary" onClick={() => descargar(s.id)}>
                      <i className="ti ti-download" /> Descargar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}

// ── Vista admin ──────────────────────────────────────────────────────
const ESTADO_CHIPS: { key: string; label: string }[] = [
  { key: '', label: 'Todas' },
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'en_proceso', label: 'En proceso' },
  { key: 'resuelta', label: 'Resueltas' },
  { key: 'rechazada', label: 'Rechazadas' },
]

function VistaAdmin() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [tipos, setTipos] = useState<TipoTramite[]>([])
  const [stats, setStats] = useState<TramitesStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [resolviendo, setResolviendo] = useState<number | null>(null)
  const [motivo, setMotivo] = useState<Record<number, string>>({})
  const [archivo, setArchivo] = useState<Record<number, File | null>>({})
  const [filtroEstado, setFiltroEstado] = useState('pendiente')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [busquedaDebounced, setBusquedaDebounced] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setBusquedaDebounced(busqueda), 300)
    return () => clearTimeout(t)
  }, [busqueda])

  function cargar(silent?: boolean) {
    if (!silent) setLoading(true)
    return Promise.all([
      getTiposTramite(),
      getMisSolicitudes({
        estado: filtroEstado || undefined,
        tipo_tramite_id: filtroTipo ? Number(filtroTipo) : undefined,
        q: busquedaDebounced || undefined,
      }),
      getStatsTramites(),
    ])
      .then(([t, s, st]) => { setTipos(t); setSolicitudes(s); setStats(st); setLastUpdate(new Date()) })
      .catch(() => emitToast('Error cargando solicitudes', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [filtroEstado, filtroTipo, busquedaDebounced])

  useEffect(() => {
    const timer = setInterval(() => cargar(true), POLL_MS)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEstado, filtroTipo, busquedaDebounced])

  async function handleRefresh() {
    setRefreshing(true)
    await cargar(true)
    setRefreshing(false)
  }

  const verDocumento = async (id: number) => {
    try {
      const { download_url } = await getDescargaUrl(id)
      window.open(download_url, '_blank')
    } catch {
      emitToast('Error obteniendo el documento', 'error')
    }
  }

  const resolver = async (id: number, estado: 'resuelta' | 'rechazada') => {
    setResolviendo(id)
    try {
      await resolverSolicitud(id, estado, estado === 'rechazada' ? motivo[id] : undefined, archivo[id] || undefined)
      emitToast(`Solicitud ${estadoLabel(estado).toLowerCase()}`, 'success')
      cargar(true)
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al resolver', 'error')
    } finally {
      setResolviendo(null)
    }
  }

  return (
    <div className="tr-section" style={{ maxWidth: 900 }}>
      {/* KPIs */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={statCardStyle('var(--accent-bright)')}>
          <span style={statValueStyle('var(--accent-bright)')}>{stats?.total ?? '—'}</span>
          <span style={statLabelStyle}>Total</span>
        </div>
        <div style={statCardStyle('var(--warning)')}>
          <span style={statValueStyle('var(--warning)')}>{stats?.pendientes ?? '—'}</span>
          <span style={statLabelStyle}>Pendientes</span>
        </div>
        <div style={statCardStyle('#818cf8')}>
          <span style={statValueStyle('#818cf8')}>{stats?.en_proceso ?? '—'}</span>
          <span style={statLabelStyle}>En Proceso</span>
        </div>
        <div style={statCardStyle('var(--success)')}>
          <span style={statValueStyle('var(--success)')}>{stats?.resueltas ?? '—'}</span>
          <span style={statLabelStyle}>Resueltas</span>
        </div>
        <div style={statCardStyle('var(--danger)')}>
          <span style={statValueStyle('var(--danger)')}>{stats?.rechazadas ?? '—'}</span>
          <span style={statLabelStyle}>Rechazadas</span>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {ESTADO_CHIPS.map(c => (
            <button key={c.key} type="button" className={`tr-chip${filtroEstado === c.key ? ' active' : ''}`}
              onClick={() => setFiltroEstado(c.key)}>
              {c.label}
            </button>
          ))}
        </div>
        {lastUpdate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-muted)' }}>
              <i className="ti ti-refresh" style={{ fontSize: 14 }} />
              <span>{lastUpdate.toLocaleTimeString()}</span>
            </div>
            <button className="tr-btn secondary" style={{ padding: '6px 10px' }} onClick={handleRefresh} disabled={refreshing}>
              <i className={`ti ti-refresh${refreshing ? ' ti-spin' : ''}`} />
            </button>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input className="input-uca" placeholder="Buscar por alumno…" value={busqueda} onChange={e => setBusqueda(e.target.value)}
          style={{ flex: 1, minWidth: 220 }} />
        <select className="input-uca" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ minWidth: 200 }}>
          <option value="">Todos los tipos</option>
          {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
      </div>

      {loading ? (
        <>{[0, 1, 2].map(i => <div key={i} className="tr-skeleton" />)}</>
      ) : solicitudes.length === 0 ? (
        <div className="tr-empty">
          <div className="tr-empty-icon"><i className="ti ti-inbox" /></div>
          No hay solicitudes {filtroEstado ? `en estado "${estadoLabel(filtroEstado)}"` : ''} con los filtros actuales.
        </div>
      ) : (
        solicitudes.map(s => (
          <div key={s.id} className="tr-card">
            <div className="tr-tipo-row">
              <div>
                <div className="tr-tipo-nombre">
                  #{s.id} — {s.tipo_tramite_nombre || tipos.find(t => t.id === s.tipo_tramite_id)?.nombre || `Trámite #${s.tipo_tramite_id}`}
                </div>
                <div className="tr-tipo-desc">
                  {s.alumno_nombre || s.alumno_username || `Alumno #${s.alumno_id}`}
                  {s.alumno_username && s.alumno_nombre ? ` (@${s.alumno_username})` : ''}
                  {' · '}Solicitado: {new Date(s.fecha_solicitud).toLocaleDateString('es-PY')}
                  {s.fecha_resolucion && ` · Resuelto: ${new Date(s.fecha_resolucion).toLocaleDateString('es-PY')}`}
                </div>
                {s.estado === 'rechazada' && s.motivo_rechazo && (
                  <div className="tr-motivo">Motivo: {s.motivo_rechazo}</div>
                )}
              </div>
              <span className={`tr-estado-badge ${s.estado}`}>{estadoLabel(s.estado)}</span>
            </div>

            {s.estado === 'pendiente' && (
              <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  placeholder="Motivo de rechazo (opcional)"
                  value={motivo[s.id] || ''}
                  onChange={e => setMotivo(m => ({ ...m, [s.id]: e.target.value }))}
                  style={{
                    flex: 1, minWidth: 180, background: 'var(--bg-base)', border: '1px solid var(--border-subtle)',
                    borderRadius: 8, padding: '7px 12px', color: 'var(--text-primary)', fontSize: 13,
                  }}
                />
                <label className="tr-btn secondary" style={{ cursor: 'pointer' }}>
                  <i className="ti ti-paperclip" /> {archivo[s.id]?.name || 'Adjuntar PDF'}
                  <input type="file" accept="application/pdf" style={{ display: 'none' }}
                    onChange={e => setArchivo(a => ({ ...a, [s.id]: e.target.files?.[0] || null }))} />
                </label>
                <button className="tr-btn" disabled={resolviendo === s.id} onClick={() => resolver(s.id, 'resuelta')}>
                  <i className="ti ti-check" /> Aprobar
                </button>
                <button className="tr-btn danger" disabled={resolviendo === s.id} onClick={() => resolver(s.id, 'rechazada')}>
                  <i className="ti ti-x" /> Rechazar
                </button>
              </div>
            )}

            {s.estado === 'resuelta' && s.storage_key_resultado && (
              <div style={{ marginTop: 10 }}>
                <button className="tr-btn secondary" onClick={() => verDocumento(s.id)}>
                  <i className="ti ti-file-check" /> Ver documento resuelto
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}

export default function SolicitudesTramites() {
  const user = getCurrentUser()
  const esAdmin = user?.role === 'admin'

  return (
    <>
      <style>{css}</style>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 16px' }}>
        <div className="tr-title"><i className="ti ti-file-text" style={{ color: 'var(--accent-bright)' }} /> Solicitudes y Trámites</div>
        {esAdmin ? <VistaAdmin /> : <VistaAlumno />}
      </div>
    </>
  )
}
