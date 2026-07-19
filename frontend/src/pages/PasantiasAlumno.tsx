import { useState, useEffect } from 'react'
import { emitToast } from '../lib/api'
import { solicitarPasantia, getEmpresas, getMisPasantias,
  type EmpresaReceptora, type Pasantia } from '../services/pasantiasService'

const css = `
  .ps-title { font-size:22px; font-weight:800; margin-bottom:20px; color:var(--text-primary); }
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

  const cargar = () => {
    getEmpresas().then(setEmpresas).catch(() => emitToast('Error cargando empresas', 'error'))
    getMisPasantias().then(setPasantias).catch(() => {})
  }

  useEffect(() => { cargar() }, [])

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
      <h2 className="ps-title">Mis Pasantías</h2>

      <div className="ps-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Requisito de graduación</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>Tu carrera requiere completar 200 horas de pasantía profesional para graduarte.</div>
          </div>
          <span className="ps-info-badge">{activa?.horas_completadas ?? 0} / {activa?.horas_requeridas ?? 200} horas completadas</span>
        </div>
      </div>

      {activa && (
        <div className="ps-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontWeight: 700 }}>Mi Pasantía Activa</h3>
            <span className={`ps-estado-badge ${activa.estado}`}>{estadoLabel[activa.estado] ?? activa.estado}</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{activa.empresa_nombre ?? `Empresa #${activa.empresa_id}`}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
            Inicio: {new Date(activa.fecha_inicio).toLocaleDateString('es-PY')}
            {activa.fecha_fin ? ` — Fin: ${new Date(activa.fecha_fin).toLocaleDateString('es-PY')}` : ' — Fin estimado: a definir'}
          </div>
          <div className="progress-track" style={{ marginBottom: 4 }}>
            <div className="progress-fill" style={{ width: `${Math.min(100, Math.round((activa.horas_completadas / activa.horas_requeridas) * 100))}%` }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{activa.horas_completadas} / {activa.horas_requeridas} horas</div>
          {activa.tutor_nombre && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 10 }}>Supervisor: {activa.tutor_nombre}</div>
          )}
        </div>
      )}

      <div className="ps-card">
        <h3 style={{ fontWeight:700, marginBottom:12 }}>Solicitar nueva pasantía</h3>
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

      {empresas.length === 0 && (
        <div className="ps-card" style={{textAlign:'center', color:'var(--text-secondary)'}}>
          El equipo académico irá agregando empresas receptoras disponibles. También podés proponer tu propia empresa.
        </div>
      )}
    </div>
  )
}