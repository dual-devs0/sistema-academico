import { useState, useEffect, useCallback, useRef } from 'react'
import { api, emitToast } from '../lib/api'
import {
  aprobarPasantia, finalizarPasantia,
  type Pasantia,
} from '../services/pasantiasService'

interface PasantiaSolicitud extends Pasantia {
  fecha_solicitud: string
  motivo_rechazo?: string
}

const POLL_MS = 30000

const css = `
  .ps-topbar {
    display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;
    padding:0 24px; min-height:56px;
    border-bottom:1px solid var(--border-subtle); background:var(--bg-base);
    position:sticky; top:-24px; z-index:20;
    margin:-24px -24px 20px; width:calc(100% + 48px);
  }
  .ps-title { font-size:22px; font-weight:800; color:var(--text-primary); margin:12px 0; }
  .ps-topbar-r { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin:10px 0; }
  .ps-last-upd { display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); }
  .ps-last-upd svg { width:13px; height:13px; }
  .ps-last-upd svg.spin { animation:ps-spin 1s linear infinite; }
  @keyframes ps-spin { to{transform:rotate(360deg)} }
  .ps-btn-refresh {
    display:inline-flex; align-items:center; gap:6px; padding:7px 14px; border-radius:9px;
    background:transparent; border:1px solid var(--border-subtle); color:var(--text-secondary);
    font-size:12px; font-weight:700; font-family:inherit; cursor:pointer; transition:border-color .15s,color .15s;
  }
  .ps-btn-refresh:hover { border-color:var(--accent-bright); color:var(--text-primary); }
  .ps-btn-refresh:disabled { opacity:.5; cursor:not-allowed; }
  .ps-btn-refresh svg { width:12px; height:12px; }
  .ps-err-banner { display:flex; align-items:center; gap:8px; background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.25); color:#ef4444; border-radius:10px; padding:10px 14px; font-size:12px; font-weight:600; margin-bottom:16px; }
  .ps-tabs { display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap; }
  .ps-tab {
    padding:8px 18px; border-radius:10px; font-size:13px; font-weight:700;
    border:1px solid var(--border-subtle); cursor:pointer;
    background:var(--bg-elevated); color:var(--text-secondary); transition:all .18s;
  }
  .ps-tab:hover { border-color:var(--accent-bright); color:var(--text-primary); }
  .ps-tab.active { background:var(--accent-bright); color:#fff; border-color:var(--accent-bright); }
  .ps-table-wrap {
    background:var(--bg-elevated); border:1px solid var(--border-subtle);
    border-radius:16px; overflow-x:auto;
  }
  .ps-table { width:100%; border-collapse:collapse; min-width:640px; }
  .ps-table th {
    padding:12px 14px; text-align:left; font-size:11px; font-weight:700;
    color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em;
    border-bottom:1px solid var(--border-subtle); background:var(--bg-elevated);
  }
  .ps-table td {
    padding:12px 14px; font-size:13px; color:var(--text-primary);
    border-bottom:1px solid var(--border-subtle);
  }
  .ps-table tr:last-child td { border-bottom:none; }
  .ps-table tbody tr { transition:background .15s; }
  .ps-table tbody tr:hover { background:rgba(255,255,255,.02); }
  .ps-badge {
    padding:4px 12px; border-radius:999px; font-size:11px; font-weight:700;
    text-transform:uppercase; letter-spacing:.05em;
  }
  .ps-badge.pendiente { background:rgba(245,158,11,.15); color:#f59e0b; }
  .ps-badge.en_curso { background:rgba(59,130,246,.15); color:#3b82f6; }
  .ps-badge.completada { background:rgba(16,185,129,.15); color:#10b981; }
  .ps-badge.rechazada { background:rgba(239,68,68,.15); color:#ef4444; }
  .ps-btn {
    padding:6px 14px; border-radius:8px; font-size:12px; font-weight:700;
    border:none; cursor:pointer; transition:opacity .18s; font-family:inherit;
  }
  .ps-btn:hover { opacity:.85; }
  .ps-btn:disabled { opacity:.5; cursor:not-allowed; }
  .ps-btn.primary { background:var(--accent-bright); color:#fff; }
  .ps-btn.secondary { background:var(--bg-base); color:var(--text-primary); border:1px solid var(--border-subtle); }
  .ps-btn.danger { background:rgba(239,68,68,.15); color:#ef4444; border:1px solid rgba(239,68,68,.25); }
  .ps-btn.success { background:rgba(16,185,129,.15); color:#10b981; border:1px solid rgba(16,185,129,.25); }
  .ps-actions { display:flex; gap:6px; flex-wrap:wrap; }
  .ps-modal-overlay {
    position:fixed; inset:0; background:rgba(0,0,0,.6);
    display:flex; align-items:center; justify-content:center; z-index:999;
  }
  .ps-modal {
    background:var(--bg-elevated); border:1px solid var(--border-subtle);
    border-radius:16px; padding:24px; min-width:380px; max-width:520px; width:100%;
  }
  .ps-modal-title { font-size:16px; font-weight:800; margin-bottom:16px; color:var(--text-primary); }
  .ps-input {
    padding:8px 12px; border-radius:10px; font-size:13px;
    background:var(--bg-base); border:1px solid var(--border-subtle);
    color:var(--text-primary); width:100%; margin-bottom:12px; box-sizing:border-box;
  }
  .ps-input:focus { outline:none; border-color:var(--accent-bright); }
  .ps-textarea {
    padding:8px 12px; border-radius:10px; font-size:13px;
    background:var(--bg-base); border:1px solid var(--border-subtle);
    color:var(--text-primary); width:100%; margin-bottom:12px; box-sizing:border-box;
    resize:vertical; min-height:80px; font-family:inherit;
  }
  .ps-textarea:focus { outline:none; border-color:var(--accent-bright); }
  .ps-label { font-size:12px; font-weight:600; color:var(--text-primary); margin-bottom:4px; display:block; }
  .ps-modal-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:16px; }
  .ps-empty { text-align:center; padding:40px; color:var(--text-secondary); font-size:14px; }
  .ps-loading { text-align:center; padding:40px; color:var(--text-secondary); font-size:14px; }
  .ps-detail-grid { display:grid; gap:10px; font-size:13px; }
  .ps-detail-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border-subtle); }
  .ps-detail-label { color:var(--text-muted); font-weight:600; }
  .ps-detail-value { color:var(--text-primary); text-align:right; }
`

const TABS = ['pendiente', 'en_curso', 'completada', 'rechazada', 'todas'] as const
type Tab = typeof TABS[number]

const TAB_LABELS: Record<Tab, string> = {
  pendiente: 'Pendientes',
  en_curso: 'En curso',
  completada: 'Completadas',
  rechazada: 'Rechazadas',
  todas: 'Todas',
}

function estadoLabel(e: string) {
  return (TAB_LABELS as Record<string, string>)[e] ?? e.charAt(0).toUpperCase() + e.slice(1)
}

export default function PasantiasAdmin() {
  const [pasantias, setPasantias] = useState<PasantiaSolicitud[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('pendiente')
  const [selected, setSelected] = useState<PasantiaSolicitud | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showApprove, setShowApprove] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [tutorId, setTutorId] = useState('')
  const [motivo, setMotivo] = useState('')
  const [processing, setProcessing] = useState(false)
  const [finalizando, setFinalizando] = useState<number | null>(null)
  const firstLoad = useRef(true)

  const fetchData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    if (firstLoad.current) setLoading(true)
    try {
      const data = await api.get<PasantiaSolicitud[]>('/pasantias/solicitudes')
      setPasantias(data)
      setError('')
      setLastUpdate(new Date())
    } catch {
      setError('No se pudieron cargar las solicitudes. Mostrando último dato disponible.')
      emitToast('Error al cargar solicitudes de pasantía', 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
      firstLoad.current = false
    }
  }, [])

  useEffect(() => {
    fetchData()
    const id = setInterval(() => fetchData(), POLL_MS)
    return () => clearInterval(id)
  }, [fetchData])

  const filtered = pasantias.filter(p => tab === 'todas' || p.estado === tab)

  const openDetail = (p: PasantiaSolicitud) => {
    setSelected(p)
    setShowDetail(true)
  }

  const openApproveModal = (p: PasantiaSolicitud) => {
    setSelected(p)
    setTutorId('')
    setShowDetail(false)
    setShowApprove(true)
  }

  const openRejectModal = (p: PasantiaSolicitud) => {
    setSelected(p)
    setMotivo('')
    setShowDetail(false)
    setShowReject(true)
  }

  const handleAprobar = async () => {
    if (!selected || !tutorId) { emitToast('Ingresá el ID del tutor académico', 'warning'); return }
    setProcessing(true)
    try {
      await aprobarPasantia(selected.id, Number(tutorId))
      emitToast('Pasantía aprobada correctamente', 'success')
      setShowApprove(false)
      setSelected(null)
      setTutorId('')
      fetchData()
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al aprobar la pasantía', 'error')
    } finally {
      setProcessing(false)
    }
  }

  const handleRechazar = async () => {
    if (!selected) return
    setProcessing(true)
    try {
      await api.put(`/pasantias/${selected.id}/rechazar?motivo=${encodeURIComponent(motivo)}`, {})
      emitToast('Pasantía rechazada', 'success')
      setShowReject(false)
      setSelected(null)
      setMotivo('')
      fetchData()
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al rechazar la pasantía', 'error')
    } finally {
      setProcessing(false)
    }
  }

  const handleFinalizar = async (id: number) => {
    setFinalizando(id)
    try {
      await finalizarPasantia(id)
      emitToast('Pasantía finalizada', 'success')
      setShowDetail(false)
      setSelected(null)
      fetchData()
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al finalizar la pasantía', 'error')
    } finally {
      setFinalizando(null)
    }
  }

  return (
    <div>
      <style>{css}</style>

      <div className="ps-topbar">
        <h2 className="ps-title">Pasantías — Admin</h2>
        <div className="ps-topbar-r">
          {lastUpdate && (
            <span className="ps-last-upd">
              <svg className={refreshing ? 'spin' : ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
              {lastUpdate.toLocaleTimeString('es-PY')}
            </span>
          )}
          <button className="ps-btn-refresh" onClick={() => fetchData(true)} disabled={refreshing}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
            {refreshing ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      {error && (
        <div className="ps-err-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
        </div>
      )}

      <div className="ps-tabs">
        {TABS.map(t => (
          <button key={t} className={`ps-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="ps-loading">Cargando solicitudes…</div>
      ) : filtered.length === 0 ? (
        <div className="ps-empty">No hay solicitudes de pasantía en esta categoría.</div>
      ) : (
        <div className="ps-table-wrap">
          <table className="ps-table">
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Empresa</th>
                <th>Fecha solicitud</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>{p.alumno_nombre ?? `#${p.alumno_id}`}</td>
                  <td>{p.empresa_nombre ?? `#${p.empresa_id}`}</td>
                  <td>{p.fecha_solicitud ? new Date(p.fecha_solicitud).toLocaleDateString('es-PY') : '—'}</td>
                  <td><span className={`ps-badge ${p.estado}`}>{estadoLabel(p.estado)}</span></td>
                  <td>
                    <div className="ps-actions">
                      <button className="ps-btn secondary" onClick={() => openDetail(p)}>Ver</button>
                      {p.estado === 'pendiente' && (
                        <>
                          <button className="ps-btn success" onClick={() => openApproveModal(p)}>Aprobar</button>
                          <button className="ps-btn danger" onClick={() => openRejectModal(p)}>Rechazar</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal detalle ─────────────────────────────────────── */}
      {showDetail && selected && (
        <div className="ps-modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="ps-modal" onClick={e => e.stopPropagation()}>
            <div className="ps-modal-title">Detalle de pasantía #{selected.id}</div>
            <div className="ps-detail-grid">
              <div className="ps-detail-row">
                <span className="ps-detail-label">Alumno</span>
                <span className="ps-detail-value">{selected.alumno_nombre ?? `#${selected.alumno_id}`}</span>
              </div>
              <div className="ps-detail-row">
                <span className="ps-detail-label">Empresa</span>
                <span className="ps-detail-value">{selected.empresa_nombre ?? `#${selected.empresa_id}`}</span>
              </div>
              <div className="ps-detail-row">
                <span className="ps-detail-label">Fecha solicitud</span>
                <span className="ps-detail-value">
                  {selected.fecha_solicitud ? new Date(selected.fecha_solicitud).toLocaleDateString('es-PY') : '—'}
                </span>
              </div>
              <div className="ps-detail-row">
                <span className="ps-detail-label">Fecha inicio</span>
                <span className="ps-detail-value">
                  {selected.fecha_inicio ? new Date(selected.fecha_inicio).toLocaleDateString('es-PY') : '—'}
                </span>
              </div>
              <div className="ps-detail-row">
                <span className="ps-detail-label">Fecha fin</span>
                <span className="ps-detail-value">
                  {selected.fecha_fin ? new Date(selected.fecha_fin).toLocaleDateString('es-PY') : '—'}
                </span>
              </div>
              <div className="ps-detail-row">
                <span className="ps-detail-label">Horas requeridas</span>
                <span className="ps-detail-value">{selected.horas_requeridas}</span>
              </div>
              <div className="ps-detail-row">
                <span className="ps-detail-label">Horas completadas</span>
                <span className="ps-detail-value">{selected.horas_completadas}</span>
              </div>
              <div className="ps-detail-row">
                <span className="ps-detail-label">Tutor académico</span>
                <span className="ps-detail-value">{selected.tutor_nombre ?? (selected.tutor_academico_id ? `#${selected.tutor_academico_id}` : '—')}</span>
              </div>
              <div className="ps-detail-row">
                <span className="ps-detail-label">Estado</span>
                <span className="ps-detail-value">
                  <span className={`ps-badge ${selected.estado}`}>{estadoLabel(selected.estado)}</span>
                </span>
              </div>
              {selected.motivo_rechazo && (
                <div className="ps-detail-row">
                  <span className="ps-detail-label">Motivo rechazo</span>
                  <span className="ps-detail-value" style={{ color: '#ef4444' }}>{selected.motivo_rechazo}</span>
                </div>
              )}
            </div>

            <div className="ps-modal-actions" style={{ marginTop: 20 }}>
              {selected.estado === 'pendiente' && (
                <>
                  <button className="ps-btn success" onClick={() => openApproveModal(selected)}>Aprobar</button>
                  <button className="ps-btn danger" onClick={() => openRejectModal(selected)}>Rechazar</button>
                </>
              )}
              {selected.estado === 'en_curso' && (
                <button
                  className="ps-btn primary"
                  disabled={finalizando === selected.id}
                  onClick={() => handleFinalizar(selected.id)}
                >
                  {finalizando === selected.id ? 'Finalizando…' : 'Finalizar'}
                </button>
              )}
              <button className="ps-btn secondary" onClick={() => setShowDetail(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal aprobar ─────────────────────────────────────── */}
      {showApprove && selected && (
        <div className="ps-modal-overlay" onClick={() => setShowApprove(false)}>
          <div className="ps-modal" onClick={e => e.stopPropagation()}>
            <div className="ps-modal-title">Aprobar pasantía #{selected.id}</div>
            <label className="ps-label">ID del tutor académico</label>
            <input
              className="ps-input" type="number" value={tutorId}
              onChange={e => setTutorId(e.target.value)}
              placeholder="Ej: 5"
            />
            <div className="ps-modal-actions">
              <button className="ps-btn secondary" onClick={() => setShowApprove(false)} disabled={processing}>Cancelar</button>
              <button className="ps-btn primary" onClick={handleAprobar} disabled={processing || !tutorId}>
                {processing ? 'Aprobando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal rechazar ────────────────────────────────────── */}
      {showReject && selected && (
        <div className="ps-modal-overlay" onClick={() => setShowReject(false)}>
          <div className="ps-modal" onClick={e => e.stopPropagation()}>
            <div className="ps-modal-title">Rechazar pasantía #{selected.id}</div>
            <label className="ps-label">Motivo del rechazo</label>
            <textarea
              className="ps-textarea" value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Indicá el motivo del rechazo…"
            />
            <div className="ps-modal-actions">
              <button className="ps-btn secondary" onClick={() => setShowReject(false)} disabled={processing}>Cancelar</button>
              <button className="ps-btn danger" onClick={handleRechazar} disabled={processing}>
                {processing ? 'Rechazando…' : 'Confirmar rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
