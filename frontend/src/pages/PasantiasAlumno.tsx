import { useState, useEffect, useCallback, useRef } from 'react'
import { emitToast } from '../lib/api'
import { solicitarPasantia, getEmpresas, getMisPasantias,
  type EmpresaReceptora, type Pasantia } from '../services/pasantiasService'

const POLL_MS = 30000

const css = `
  .ps-header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; margin-bottom:20px; }
  .ps-title { font-size:22px; font-weight:800; color:var(--text-primary); margin:0; }
  .ps-last-upd { display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); }
  .ps-last-upd svg { width:13px; height:13px; }
  .ps-last-upd svg.spin { animation:ps-spin 1s linear infinite; }
  @keyframes ps-spin { to{transform:rotate(360deg)} }
  .ps-btn-refresh {
    display:inline-flex; align-items:center; gap:6px; padding:6px 12px; border-radius:9px;
    background:transparent; border:1px solid var(--border-subtle); color:var(--text-secondary);
    font-size:11.5px; font-weight:700; font-family:inherit; cursor:pointer; transition:border-color .15s,color .15s;
  }
  .ps-btn-refresh:hover { border-color:var(--accent-bright); color:var(--text-primary); }
  .ps-btn-refresh:disabled { opacity:.5; cursor:not-allowed; }
  .ps-btn-refresh svg { width:12px; height:12px; }
  .ps-err-banner { display:flex; align-items:center; gap:8px; background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.25); color:#ef4444; border-radius:10px; padding:10px 14px; font-size:12px; font-weight:600; margin-bottom:16px; }
  .ps-card {
    background:var(--bg-elevated); border:1px solid var(--border-subtle);
    border-radius:16px; padding:18px 22px; margin-bottom:12px;
  }
  .ps-select, .ps-input {
    padding:8px 12px; border-radius:10px; font-size:13px;
    background:var(--bg-base); border:1px solid var(--border-subtle);
    color:var(--text-primary); width:100%; margin-bottom:12px;
  }
  .ps-btn {
    padding:8px 18px; border-radius:10px; font-size:13px; font-weight:700;
    border:none; cursor:pointer; background:var(--accent-bright); color:#fff;
  }
  .ps-btn:disabled { opacity:.5; cursor:not-allowed; }
  .ps-label { font-size:12px; font-weight:600; color:var(--text-primary); margin-bottom:4px; }
  .ps-info-badge { display:inline-flex; align-items:center; gap:6px; padding:4px 12px; border-radius:999px; font-size:11.5px; font-weight:700; background:var(--accent-muted); color:var(--accent-bright); }
  .ps-estado-badge { padding:4px 12px; border-radius:999px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; }
  .ps-estado-badge.pendiente { background:rgba(245,158,11,.15); color:#f59e0b; }
  .ps-estado-badge.en_curso { background:var(--accent-muted); color:var(--accent-bright); }
  .ps-estado-badge.completada { background:rgba(16,185,129,.15); color:#10b981; }
  .ps-estado-badge.rechazada { background:rgba(239,68,68,.15); color:#ef4444; }
  .ps-card-head { display:flex; align-items:center; gap:10px; margin-bottom:12px; }
  .ps-card-icon { width:32px; height:32px; border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:15px; flex-shrink:0; background:var(--accent-muted); color:var(--accent-bright); }
  .ps-hist-row { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 0; border-bottom:1px solid var(--border-subtle); }
  .ps-hist-row:last-child { border-bottom:none; }
`

const estadoLabel: Record<string, string> = {
  pendiente: 'En revisión', en_curso: 'En curso', completada: 'Completada', rechazada: 'Rechazada',
}

export default function PasantiasAlumno() {
  const [empresas, setEmpresas] = useState<EmpresaReceptora[]>([])
  const [pasantias, setPasantias] = useState<Pasantia[]>([])
  const [empresaId, setEmpresaId] = useState<number>(0)
  const [fechaInicio, setFechaInicio] = useState('')
  const [horas, setHoras] = useState(200)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState('')
  const firstLoad = useRef(true)

  const cargar = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    const [empRes, pasRes] = await Promise.allSettled([getEmpresas(), getMisPasantias()])
    const fails: string[] = []
    if (empRes.status === 'fulfilled') setEmpresas(empRes.value)
    else fails.push('empresas')
    if (pasRes.status === 'fulfilled') setPasantias(pasRes.value)
    else fails.push('pasantías')
    if (fails.length) {
      setError(`No se pudieron cargar: ${fails.join(', ')}. Mostrando último dato disponible.`)
      if (firstLoad.current) emitToast('Error cargando datos de pasantías', 'error')
    } else {
      setError('')
    }
    setLastUpdate(new Date())
    setRefreshing(false)
    firstLoad.current = false
  }, [])

  useEffect(() => {
    cargar()
    const id = setInterval(() => cargar(), POLL_MS)
    return () => clearInterval(id)
  }, [cargar])

  const activa = pasantias.find(p => p.estado !== 'rechazada')

  const solicitar = async () => {
    if (!empresaId || !fechaInicio) {
      emitToast('Completá todos los campos', 'error')
      return
    }
    setLoading(true)
    try {
      await solicitarPasantia(empresaId, fechaInicio, horas)
      emitToast('Solicitud enviada', 'success')
      setEmpresaId(0); setFechaInicio(''); setHoras(200)
      cargar()
    } catch (e: unknown) {
      emitToast(e instanceof Error ? e.message : 'Error al solicitar', 'error')
    } finally { setLoading(false) }
  }

  return (
    <div>
      <style>{css}</style>
      <div className="ps-header">
        <h2 className="ps-title">Mis Pasantías</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastUpdate && (
            <span className="ps-last-upd">
              <svg className={refreshing ? 'spin' : ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
              {lastUpdate.toLocaleTimeString('es-PY')}
            </span>
          )}
          <button className="ps-btn-refresh" onClick={() => cargar(true)} disabled={refreshing}>
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

      <div className="ps-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="ps-card-icon"><i className="ti ti-school" /></span>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>Requisito de graduación</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>Tu carrera requiere completar 200 horas de pasantía profesional para graduarte.</div>
            </div>
          </div>
          <span className="ps-info-badge"><i className="ti ti-clock-hour-4" /> {activa?.horas_completadas ?? 0} / {activa?.horas_requeridas ?? 200} horas completadas</span>
        </div>
      </div>

      {activa && (
        <div className="ps-card">
          <div className="ps-card-head" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="ps-card-icon"><i className="ti ti-briefcase" /></span>
              <h3 style={{ fontWeight: 700 }}>Mi Pasantía Activa</h3>
            </div>
            <span className={`ps-estado-badge ${activa.estado}`}>{estadoLabel[activa.estado] ?? activa.estado}</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{activa.empresa_nombre ?? `Empresa #${activa.empresa_id}`}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
            <i className="ti ti-calendar" style={{ fontSize: 12 }} />
            Inicio: {new Date(activa.fecha_inicio).toLocaleDateString('es-PY')}
            {activa.fecha_fin ? ` — Fin: ${new Date(activa.fecha_fin).toLocaleDateString('es-PY')}` : ' — Fin estimado: a definir'}
          </div>
          <div className="progress-track" style={{ marginBottom: 4 }}>
            <div className="progress-fill" style={{ width: `${activa.horas_requeridas > 0 ? Math.min(100, Math.round((activa.horas_completadas / activa.horas_requeridas) * 100)) : 0}%` }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{activa.horas_completadas} / {activa.horas_requeridas} horas</div>
          {activa.tutor_nombre && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
              <i className="ti ti-user-check" style={{ fontSize: 12 }} /> Supervisor: {activa.tutor_nombre}
            </div>
          )}
        </div>
      )}

      {!activa && (
        <div className="ps-card">
          <div className="ps-card-head">
            <span className="ps-card-icon"><i className="ti ti-send" /></span>
            <h3 style={{ fontWeight: 700 }}>Solicitar nueva pasantía</h3>
          </div>
          <div className="ps-label">Empresa receptora</div>
          <select className="ps-input" value={empresaId} onChange={e => setEmpresaId(Number(e.target.value))}>
            <option value={0}>Seleccionar empresa...</option>
            {empresas.map(e => (
              <option key={e.id} value={e.id}>{e.nombre} {e.convenio_activo ? '(convenio activo)' : ''}</option>
            ))}
          </select>
          <div className="ps-label">Fecha de inicio</div>
          <input type="date" className="ps-input" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
          <div className="ps-label">Horas requeridas</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: -8, marginBottom: 6 }}>Total de horas de práctica profesional que deberás acumular en esta pasantía.</div>
          <input type="number" className="ps-input" value={horas} onChange={e => setHoras(Number(e.target.value))} min={1} />
          <button className="ps-btn" onClick={solicitar} disabled={loading}>
            {loading ? 'Enviando...' : 'Solicitar aprobación de pasantía'}
          </button>
        </div>
      )}

      {empresas.length === 0 && (
        <div className="ps-card" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          El equipo académico irá agregando empresas receptoras disponibles. También podés proponer tu propia empresa.
        </div>
      )}

      {pasantias.length > 0 && (
        <div className="ps-card">
          <div className="ps-card-head">
            <span className="ps-card-icon" style={{ background: 'rgba(148,163,184,.12)', color: 'var(--text-secondary)' }}><i className="ti ti-history" /></span>
            <h3 style={{ fontWeight: 700 }}>Historial de solicitudes</h3>
          </div>
          {[...pasantias].sort((a, b) => (b.created_at ?? b.fecha_inicio).localeCompare(a.created_at ?? a.fecha_inicio)).map(p => (
            <div key={p.id} className="ps-hist-row">
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{p.empresa_nombre ?? `Empresa #${p.empresa_id}`}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                  Inicio: {new Date(p.fecha_inicio).toLocaleDateString('es-PY')}
                  {p.estado === 'rechazada' && p.motivo_rechazo && <span style={{ color: '#ef4444' }}> · {p.motivo_rechazo}</span>}
                </div>
              </div>
              <span className={`ps-estado-badge ${p.estado}`}>{estadoLabel[p.estado] ?? p.estado}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}