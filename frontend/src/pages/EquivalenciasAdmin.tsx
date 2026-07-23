import { useState, useEffect, useCallback } from 'react'
import { emitToast } from '../lib/api'
import { api } from '../lib/api'
import { getTodasSolicitudes, getMateriasEquivalencia, type SolicitudEquivalencia, type MateriaItem } from '../services/equivalenciasService'

type Tab = 'pendientes' | 'resueltas' | 'todas'

const POLL_MS = 30000

const css = `
  .eqa-header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:20px; }
  .eqa-title { display:flex; align-items:center; gap:10px; font-size:22px; font-weight:800; color:var(--text-primary); margin:0; }
  .eqa-title i { color:var(--accent-bright); font-size:22px; }
  .eqa-last-upd { display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); }
  .eqa-last-upd svg { width:13px; height:13px; }
  .eqa-last-upd svg.spin { animation:eqa-spin 1s linear infinite; }
  @keyframes eqa-spin { to { transform:rotate(360deg); } }
  .eqa-card {
    background:var(--bg-elevated); border:1px solid var(--border-subtle);
    border-radius:16px; padding:18px 22px; margin-bottom:12px;
  }
  .eqa-search-row { display:flex; gap:10px; align-items:flex-end; }
  .eqa-search-row > div:first-child { flex:1; }
  .eqa-input {
    padding:8px 12px; border-radius:10px; font-size:13px;
    background:var(--bg-base); border:1px solid var(--border-subtle);
    color:var(--text-primary); width:100%; box-sizing:border-box;
  }
  .eqa-input:focus { outline:none; border-color:var(--accent-bright); }
  .eqa-select {
    padding:8px 12px; border-radius:10px; font-size:13px;
    background:var(--bg-base); border:1px solid var(--border-subtle);
    color:var(--text-primary); width:100%; box-sizing:border-box; cursor:pointer;
  }
  .eqa-select:focus { outline:none; border-color:var(--accent-bright); }
  .eqa-select option { background:var(--bg-elevated); color:var(--text-primary); }
  .eqa-btn {
    padding:9px 18px; border-radius:10px; font-size:13px; font-weight:700;
    border:none; cursor:pointer; background:var(--accent-bright); color:#fff; transition:opacity .18s;
    display:inline-flex; align-items:center; gap:6px; white-space:nowrap;
  }
  .eqa-btn:hover { opacity:.88; }
  .eqa-btn:disabled { opacity:.5; cursor:not-allowed; }
  .eqa-btn.ghost { background:transparent; color:var(--text-primary); border:1px solid var(--border-subtle); }
  .eqa-btn.ghost:hover { background:var(--bg-base); opacity:1; }
  .eqa-btn.danger { background:rgba(239,68,68,.15); color:#ef4444; border:1px solid rgba(239,68,68,.3); }
  .eqa-label { font-size:12px; font-weight:600; color:var(--text-primary); margin-bottom:4px; }
  .eqa-badge {
    padding:4px 12px; border-radius:999px; font-size:11px; font-weight:700;
    text-transform:uppercase; letter-spacing:.05em; white-space:nowrap;
  }
  .eqa-badge.pendiente { background:rgba(245,158,11,.15); color:#f59e0b; }
  .eqa-badge.en_proceso { background:rgba(59,130,246,.15); color:#3b82f6; }
  .eqa-badge.resuelta { background:rgba(16,185,129,.15); color:#10b981; }
  .eqa-badge.rechazada { background:rgba(239,68,68,.15); color:#ef4444; }
  .eqa-tabs { display:flex; gap:4px; margin-bottom:16px; }
  .eqa-tab {
    padding:8px 18px; border-radius:10px; font-size:13px; font-weight:700;
    border:1px solid var(--border-subtle); cursor:pointer;
    background:transparent; color:var(--text-secondary); transition:all .18s;
  }
  .eqa-tab.active { background:var(--accent-bright); color:#fff; border-color:var(--accent-bright); }
  .eqa-table { width:100%; border-collapse:collapse; font-size:13px; }
  .eqa-table th { text-align:left; padding:10px 14px; font-size:11px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:.05em; border-bottom:1px solid var(--border-subtle); }
  .eqa-table td { padding:12px 14px; border-bottom:1px solid var(--border-subtle); color:var(--text-primary); vertical-align:middle; }
  .eqa-table tr:last-child td { border-bottom:none; }
  .eqa-empty { text-align:center; padding:32px; color:var(--text-secondary); font-size:14px; }
  .eqa-err { background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.3); color:#ef4444; border-radius:10px; padding:10px 14px; font-size:12px; margin-bottom:12px; display:flex; align-items:center; gap:8px; }
`

function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-PY')
}

export default function EquivalenciasAdmin() {
  const [solicitudes, setSolicitudes] = useState<SolicitudEquivalencia[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('pendientes')
  const [materias, setMaterias] = useState<MateriaItem[]>([])

  const [detalle, setDetalle] = useState<SolicitudEquivalencia | null>(null)

  const [resolver, setResolver] = useState<SolicitudEquivalencia | null>(null)
  const [resolucion, setResolucion] = useState('aprobada')
  const [materiaDestinoId, setMateriaDestinoId] = useState('')
  const [motivo, setMotivo] = useState('')

  const [examen, setExamen] = useState<SolicitudEquivalencia | null>(null)
  const [examMateriaId, setExamMateriaId] = useState('')
  const [examFecha, setExamFecha] = useState('')

  const [saving, setSaving] = useState(false)

  const loadMaterias = useCallback(async () => {
    try {
      const lista = await getMateriasEquivalencia()
      setMaterias(lista)
    } catch {
      // si falla, se deja la lista vacía
    }
  }, [])

  useEffect(() => { loadMaterias() }, [loadMaterias])

  const fetchData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    else setLoading(true)
    try {
      const data = await getTodasSolicitudes()
      setSolicitudes(data)
      setError('')
      setLastUpdate(new Date())
    } catch {
      setError('No se pudieron cargar las equivalencias. Mostrando el último dato disponible.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const id = setInterval(() => fetchData(), POLL_MS)
    return () => clearInterval(id)
  }, [fetchData])

  const filtradas = solicitudes.filter(s => {
    if (tab === 'pendientes') return s.estado === 'pendiente' || s.estado === 'en_proceso'
    if (tab === 'resueltas') return s.estado === 'resuelta' || s.estado === 'rechazada'
    return true
  })

  const abrirResolver = (s: SolicitudEquivalencia) => {
    setResolver(s)
    setResolucion('aprobada')
    setMateriaDestinoId('')
    setMotivo('')
  }

  const handleResolver = async () => {
    if (!resolver) return
    setSaving(true)
    try {
      await api.put(`/equivalencias/${resolver.id}/resolver`, {
        resolucion,
        materia_destino_id: materiaDestinoId ? Number(materiaDestinoId) : undefined,
        motivo: motivo || undefined,
      })
      emitToast('Solicitud resuelta', 'success')
      setResolver(null)
      fetchData()
    } catch (e: unknown) {
      emitToast(e instanceof Error ? e.message : 'Error al resolver', 'error')
    } finally { setSaving(false) }
  }

  const abrirExamen = (s: SolicitudEquivalencia) => {
    setExamen(s)
    setExamMateriaId('')
    setExamFecha('')
  }

  const handleRegistrarExamen = async () => {
    if (!examen || !examMateriaId || !examFecha) {
      emitToast('Completá todos los campos', 'warning')
      return
    }
    setSaving(true)
    try {
      await api.post('/equivalencias/examenes-suficiencia', {
        alumno_id: examen.alumno_id,
        materia_id: Number(examMateriaId),
        fecha: examFecha,
      })
      emitToast('Examen registrado', 'success')
      setExamen(null)
      fetchData()
    } catch (e: unknown) {
      emitToast(e instanceof Error ? e.message : 'Error al registrar examen', 'error')
    } finally { setSaving(false) }
  }

  return (
    <div>
      <style>{css}</style>

      <div className="eqa-header">
        <h2 className="eqa-title"><i className="ti ti-arrows-exchange" /> Equivalencias — Admin</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastUpdate && (
            <span className="eqa-last-upd">
              <svg className={refreshing ? 'spin' : ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
              {lastUpdate.toLocaleTimeString('es-PY')}
            </span>
          )}
          <button className="eqa-btn ghost" onClick={() => fetchData(true)} disabled={refreshing}>
            <i className="ti ti-refresh" /> {refreshing ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      {error && (
        <div className="eqa-err"><i className="ti ti-alert-circle" /> {error}</div>
      )}

      <div className="eqa-tabs">
        {(['pendientes', 'resueltas', 'todas'] as Tab[]).map(t => (
          <button key={t} className={`eqa-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t === 'pendientes' ? 'Pendientes' : t === 'resueltas' ? 'Resueltas' : 'Todas'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="eqa-card eqa-empty">Cargando solicitudes…</div>
      ) : filtradas.length === 0 ? (
        <div className="eqa-card eqa-empty">No hay solicitudes de equivalencia en esta categoría.</div>
      ) : (
        <div className="eqa-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="eqa-table">
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Tipo</th>
                <th>Universidad Origen</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(s => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{s.alumno_nombre || `Alumno #${s.alumno_id}`}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>ID {s.alumno_id}</div>
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{s.tipo}</td>
                  <td>{s.universidad_origen || '—'}</td>
                  <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-secondary)' }}>{formatDate(s.created_at)}</td>
                  <td><span className={`eqa-badge ${s.estado}`}>{s.estado.replace('_', ' ')}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="eqa-btn ghost" onClick={() => setDetalle(s)}
                        style={{ padding: '4px 10px', fontSize: 11 }}>Ver</button>
                      {(s.estado === 'pendiente' || s.estado === 'en_proceso') && (
                        <>
                          <button className="eqa-btn" onClick={() => abrirResolver(s)}
                            style={{ padding: '4px 10px', fontSize: 11 }}>Resolver</button>
                          <button className="eqa-btn ghost" onClick={() => abrirExamen(s)}
                            style={{ padding: '4px 10px', fontSize: 11 }}>Examen</button>
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

      {/* Modal Detalle */}
      {detalle && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card card-elevated" style={{ width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>Detalle de solicitud #{detalle.id}</h3>
              <button onClick={() => setDetalle(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><i className="ti ti-x" /></button>
            </div>
            <div style={{ display: 'grid', gap: 10, fontSize: 13 }}>
              <div><strong>Alumno:</strong> {detalle.alumno_nombre || `Alumno #${detalle.alumno_id}`} <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>(ID {detalle.alumno_id})</span></div>
              <div><strong>Tipo:</strong> {detalle.tipo}</div>
              <div><strong>Universidad origen:</strong> {detalle.universidad_origen || '—'}</div>
              <div><strong>Fecha solicitud:</strong> {formatDate(detalle.created_at)}</div>
              <div><strong>Estado:</strong> <span className={`eqa-badge ${detalle.estado}`}>{detalle.estado.replace('_', ' ')}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Resolver */}
      {resolver && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card card-elevated" style={{ width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>Resolver solicitud #{resolver.id}</h3>
              <button onClick={() => setResolver(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><i className="ti ti-x" /></button>
            </div>
            <div className="eqa-label">Resolución</div>
            <select className="eqa-select" value={resolucion} onChange={e => setResolucion(e.target.value)}>
              <option value="aprobada">Aprobada</option>
              <option value="rechazada">Rechazada</option>
            </select>
            <div className="eqa-label">Materia destino</div>
            <select className="eqa-select" value={materiaDestinoId} onChange={e => setMateriaDestinoId(e.target.value)}>
              <option value="">Seleccioná una materia…</option>
              {materias.map(m => (
                <option key={m.id} value={m.id}>{m.codigo ? `[${m.codigo}] ` : ''}{m.nombre}</option>
              ))}
            </select>
            <div className="eqa-label">Motivo</div>
            <textarea className="eqa-input" value={motivo}
              onChange={e => setMotivo(e.target.value)} placeholder="Motivo (opcional)"
              rows={3} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="eqa-btn ghost" onClick={() => setResolver(null)}>Cancelar</button>
              <button className="eqa-btn" disabled={saving} onClick={handleResolver}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Examen de suficiencia */}
      {examen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card card-elevated" style={{ width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>Examen de suficiencia</h3>
              <button onClick={() => setExamen(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><i className="ti ti-x" /></button>
            </div>
            <div className="eqa-label">Materia</div>
            <select className="eqa-select" value={examMateriaId} onChange={e => setExamMateriaId(e.target.value)}>
              <option value="">Seleccioná una materia…</option>
              {materias.map(m => (
                <option key={m.id} value={m.id}>{m.codigo ? `[${m.codigo}] ` : ''}{m.nombre}</option>
              ))}
            </select>
            <div className="eqa-label">Fecha</div>
            <input className="eqa-input" type="date" value={examFecha}
              onChange={e => setExamFecha(e.target.value)} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="eqa-btn ghost" onClick={() => setExamen(null)}>Cancelar</button>
              <button className="eqa-btn" disabled={saving} onClick={handleRegistrarExamen}>
                {saving ? 'Guardando…' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}