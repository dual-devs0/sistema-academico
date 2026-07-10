import { useState, useEffect } from 'react'
import { getCurrentUser, emitToast } from '../lib/api'
import {
  getTiposTramite, crearSolicitud, getMisSolicitudes, getDescargaUrl, resolverSolicitud,
  type TipoTramite, type Solicitud,
} from '../services/tramitesService'

const css = `
  .tr-title { font-size:22px; font-weight:800; margin-bottom:20px; color:var(--text-primary); }
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
`

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
  const [solicitando, setSolicitando] = useState<number | null>(null)

  const cargar = () => {
    Promise.all([getTiposTramite(), getMisSolicitudes()])
      .then(([t, s]) => { setTipos(t); setSolicitudes(s) })
      .catch(() => emitToast('Error cargando trámites', 'error'))
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

  if (loading) return <div className="tr-empty">Cargando…</div>

  return (
    <>
      <div className="tr-section">
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
          Trámites disponibles
        </h3>
        {tipos.map(t => (
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
              {solicitando === t.id ? 'Solicitando…' : 'Solicitar'}
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
                    {tipos.find(t => t.id === s.tipo_tramite_id)?.nombre || `Trámite #${s.tipo_tramite_id}`}
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
                    <button className="tr-btn secondary" onClick={() => descargar(s.id)}>⬇ Descargar</button>
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
function VistaAdmin() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [tipos, setTipos] = useState<TipoTramite[]>([])
  const [loading, setLoading] = useState(true)
  const [resolviendo, setResolviendo] = useState<number | null>(null)
  const [motivo, setMotivo] = useState<Record<number, string>>({})

  const cargar = () => {
    Promise.all([getTiposTramite(), getMisSolicitudes('pendiente')])
      .then(([t, s]) => { setTipos(t); setSolicitudes(s) })
      .catch(() => emitToast('Error cargando solicitudes', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [])

  const resolver = async (id: number, estado: 'resuelta' | 'rechazada') => {
    setResolviendo(id)
    try {
      await resolverSolicitud(id, estado, estado === 'rechazada' ? motivo[id] : undefined)
      emitToast(`Solicitud ${estadoLabel(estado).toLowerCase()}`, 'success')
      cargar()
    } catch {
      emitToast('Error al resolver', 'error')
    } finally {
      setResolviendo(null)
    }
  }

  if (loading) return <div className="tr-empty">Cargando…</div>

  return (
    <div className="tr-section">
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
        Solicitudes pendientes de resolución manual
      </h3>
      {solicitudes.length === 0 ? (
        <div className="tr-empty">No hay solicitudes pendientes.</div>
      ) : (
        solicitudes.map(s => (
          <div key={s.id} className="tr-card">
            <div className="tr-tipo-nombre">
              #{s.id} — {tipos.find(t => t.id === s.tipo_tramite_id)?.nombre || `Trámite #${s.tipo_tramite_id}`}
            </div>
            <div className="tr-tipo-desc">
              Alumno #{s.alumno_id} · Solicitado: {new Date(s.fecha_solicitud).toLocaleDateString('es-PY')}
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                placeholder="Motivo de rechazo (opcional)"
                value={motivo[s.id] || ''}
                onChange={e => setMotivo(m => ({ ...m, [s.id]: e.target.value }))}
                style={{
                  flex: 1, minWidth: 200, background: 'var(--bg-base)', border: '1px solid var(--border-subtle)',
                  borderRadius: 8, padding: '7px 12px', color: 'var(--text-primary)', fontSize: 13,
                }}
              />
              <button className="tr-btn" disabled={resolviendo === s.id} onClick={() => resolver(s.id, 'resuelta')}>
                ✓ Aprobar
              </button>
              <button className="tr-btn danger" disabled={resolviendo === s.id} onClick={() => resolver(s.id, 'rechazada')}>
                ✗ Rechazar
              </button>
            </div>
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
        <div className="tr-title">📄 Solicitudes y Trámites</div>
        {esAdmin ? <VistaAdmin /> : <VistaAlumno />}
      </div>
    </>
  )
}
