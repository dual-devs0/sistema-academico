import { useState } from 'react'
import { emitToast } from '../lib/api'
import { api } from '../lib/api'
import type { SolicitudEquivalencia } from '../services/equivalenciasService'

type Tab = 'pendientes' | 'resueltas' | 'todas'

const css = `
  .eqa-title { font-size:22px; font-weight:800; margin-bottom:20px; color:var(--text-primary); }
  .eqa-card {
    background:var(--bg-elevated); border:1px solid var(--border-subtle);
    border-radius:16px; padding:18px 22px; margin-bottom:12px;
  }
  .eqa-input {
    padding:8px 12px; border-radius:10px; font-size:13px;
    background:var(--bg-base); border:1px solid var(--border-subtle);
    color:var(--text-primary); width:100%; margin-bottom:12px;
  }
  .eqa-btn {
    padding:8px 18px; border-radius:10px; font-size:13px; font-weight:700;
    border:none; cursor:pointer; background:var(--accent-bright); color:#fff; transition:opacity .18s;
  }
  .eqa-btn:hover { opacity:.88; }
  .eqa-btn:disabled { opacity:.5; cursor:not-allowed; }
  .eqa-btn.ghost { background:transparent; color:var(--text-primary); border:1px solid var(--border-subtle); }
  .eqa-btn.ghost:hover { background:var(--bg-base); opacity:1; }
  .eqa-btn.danger { background:rgba(239,68,68,.15); color:#ef4444; border:1px solid rgba(239,68,68,.3); }
  .eqa-label { font-size:12px; font-weight:600; color:var(--text-primary); margin-bottom:4px; }
  .eqa-badge {
    padding:4px 12px; border-radius:999px; font-size:11px; font-weight:700;
    text-transform:uppercase; letter-spacing:.05em;
  }
  .eqa-badge.pendiente { background:rgba(245,158,11,.15); color:#f59e0b; }
  .eqa-badge.aprobada { background:rgba(16,185,129,.15); color:#10b981; }
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
  .eqa-table td { padding:10px 14px; border-bottom:1px solid var(--border-subtle); color:var(--text-primary); }
  .eqa-table tr:last-child td { border-bottom:none; }
  .eqa-empty { text-align:center; padding:32px; color:var(--text-secondary); font-size:14px; }
`

export default function EquivalenciasAdmin() {
  const [alumnoId, setAlumnoId] = useState('')
  const [solicitudes, setSolicitudes] = useState<SolicitudEquivalencia[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<Tab>('todas')

  const [detalle, setDetalle] = useState<SolicitudEquivalencia | null>(null)

  const [resolver, setResolver] = useState<SolicitudEquivalencia | null>(null)
  const [resolucion, setResolucion] = useState('aprobada')
  const [materiaDestinoId, setMateriaDestinoId] = useState('')
  const [motivo, setMotivo] = useState('')

  const [examen, setExamen] = useState<SolicitudEquivalencia | null>(null)
  const [examAlumnoId, setExamAlumnoId] = useState('')
  const [examMateriaId, setExamMateriaId] = useState('')
  const [examFecha, setExamFecha] = useState('')

  const [saving, setSaving] = useState(false)

  const buscar = () => {
    if (!alumnoId) { emitToast('Ingresá un ID de alumno', 'error'); return }
    setLoading(true)
    api.get<SolicitudEquivalencia[]>(`/equivalencias/alumno/${Number(alumnoId)}`)
      .then(setSolicitudes)
      .catch(() => emitToast('Error cargando equivalencias', 'error'))
      .finally(() => setLoading(false))
  }

  const filtradas = solicitudes.filter(s => {
    if (tab === 'pendientes') return s.estado === 'pendiente'
    if (tab === 'resueltas') return s.estado === 'aprobada' || s.estado === 'rechazada'
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
      buscar()
    } catch (e: unknown) {
      emitToast(e instanceof Error ? e.message : 'Error al resolver', 'error')
    } finally { setSaving(false) }
  }

  const abrirExamen = (s: SolicitudEquivalencia) => {
    setExamen(s)
    setExamAlumnoId(String(s.alumno_id))
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
        alumno_id: Number(examAlumnoId),
        materia_id: Number(examMateriaId),
        fecha: examFecha,
        solicitud_id: examen.id,
      })
      emitToast('Examen registrado', 'success')
      setExamen(null)
      buscar()
    } catch (e: unknown) {
      emitToast(e instanceof Error ? e.message : 'Error al registrar examen', 'error')
    } finally { setSaving(false) }
  }

  return (
    <div>
      <style>{css}</style>
      <h2 className="eqa-title">Equivalencias — Admin</h2>

      <div className="eqa-card">
        <div className="eqa-label">ID del alumno</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="eqa-input" type="number" value={alumnoId}
            onChange={e => setAlumnoId(e.target.value)}
            placeholder="Ej: 42" />
          <button className="eqa-btn" onClick={buscar} disabled={loading} style={{ marginBottom: 12 }}>
            {loading ? 'Buscando…' : 'Buscar'}
          </button>
        </div>
      </div>

      <div className="eqa-tabs">
        {(['pendientes', 'resueltas', 'todas'] as Tab[]).map(t => (
          <button key={t} className={`eqa-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {filtradas.length === 0 ? (
        <div className="eqa-card eqa-empty">
          {alumnoId ? 'No hay solicitudes para este alumno.' : 'Buscá un alumno para ver sus solicitudes.'}
        </div>
      ) : (
        <div className="eqa-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="eqa-table">
            <thead>
              <tr>
                <th>Alumno ID</th>
                <th>Tipo</th>
                <th>Universidad Origen</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(s => (
                <tr key={s.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{s.alumno_id}</td>
                  <td style={{ textTransform: 'capitalize' }}>{s.tipo}</td>
                  <td>{s.universidad_origen || '—'}</td>
                  <td><span className={`eqa-badge ${s.estado}`}>{s.estado}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="eqa-btn ghost" onClick={() => setDetalle(s)}
                        style={{ padding: '4px 10px', fontSize: 11 }}>Ver</button>
                      {s.estado === 'pendiente' && (
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
              <div><strong>Alumno ID:</strong> {detalle.alumno_id}</div>
              <div><strong>Tipo:</strong> {detalle.tipo}</div>
              <div><strong>Universidad origen:</strong> {detalle.universidad_origen || '—'}</div>
              <div><strong>Estado:</strong> <span className={`eqa-badge ${detalle.estado}`}>{detalle.estado}</span></div>
              <hr style={{ borderColor: 'var(--border-subtle)', margin: '8px 0' }} />
              <div style={{ color: 'var(--text-secondary)', fontSize: 12, fontStyle: 'italic' }}>
                Documentos adjuntos no disponibles (placeholder).
              </div>
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
            <select className="eqa-input" value={resolucion} onChange={e => setResolucion(e.target.value)}>
              <option value="aprobada">Aprobada</option>
              <option value="rechazada">Rechazada</option>
            </select>
            <div className="eqa-label">Materia destino ID</div>
            <input className="eqa-input" type="number" value={materiaDestinoId}
              onChange={e => setMateriaDestinoId(e.target.value)} placeholder="Ej: 15" />
            <div className="eqa-label">Motivo</div>
            <textarea className="eqa-input" value={motivo}
              onChange={e => setMotivo(e.target.value)} placeholder="Motivo (opcional)"
              rows={3} style={{ resize: 'vertical' }} />
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
            <div className="eqa-label">Alumno ID</div>
            <input className="eqa-input" type="number" value={examAlumnoId}
              onChange={e => setExamAlumnoId(e.target.value)} />
            <div className="eqa-label">Materia ID</div>
            <input className="eqa-input" type="number" value={examMateriaId}
              onChange={e => setExamMateriaId(e.target.value)} placeholder="Ej: 15" />
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
