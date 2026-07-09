import { useState, useEffect } from 'react'
import { getCurrentUser, emitToast } from '../lib/api'
import { crearSolicitudEquivalencia, getEquivalenciasAlumno,
  type SolicitudEquivalencia } from '../services/equivalenciasService'

const css = `
  .eq-title { font-size:22px; font-weight:800; margin-bottom:20px; color:var(--text-primary); }
  .eq-card {
    background:var(--bg-elevated); border:1px solid var(--border-subtle);
    border-radius:16px; padding:18px 22px; margin-bottom:12px;
  }
  .eq-select, .eq-input {
    padding:8px 12px; border-radius:10px; font-size:13px;
    background:var(--bg-base); border:1px solid var(--border-subtle);
    color:var(--text-primary); width:100%; margin-bottom:12px;
  }
  .eq-btn {
    padding:8px 18px; border-radius:10px; font-size:13px; font-weight:700;
    border:none; cursor:pointer; background:var(--accent-bright); color:#fff;
  }
  .eq-btn:disabled { opacity:.5; cursor:not-allowed; }
  .eq-label { font-size:12px; font-weight:600; color:var(--text-primary); margin-bottom:4px; }
  .eq-badge {
    padding:4px 12px; border-radius:999px; font-size:11px; font-weight:700;
    text-transform:uppercase; letter-spacing:.05em;
  }
  .eq-badge.pendiente { background:rgba(245,158,11,.15); color:#f59e0b; }
  .eq-badge.resuelta { background:rgba(16,185,129,.15); color:#10b981; }
  .eq-badge.rechazada { background:rgba(239,68,68,.15); color:#ef4444; }
`

export default function EquivalenciasAlumno() {
  const [solicitudes, setSolicitudes] = useState<SolicitudEquivalencia[]>([])
  const [tipo, setTipo] = useState('equivalencia')
  const [universidad, setUniversidad] = useState('')
  const [loading, setLoading] = useState(true)
  const user = getCurrentUser()

  const cargar = () => {
    if (!user?.user_id) return
    getEquivalenciasAlumno(user.user_id)
      .then(setSolicitudes)
      .catch(() => emitToast('Error cargando equivalencias', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [user?.user_id])

  const solicitar = async () => {
    setLoading(true)
    try {
      await crearSolicitudEquivalencia(tipo, universidad || undefined)
      emitToast('Solicitud creada', 'success')
      setTipo('equivalencia'); setUniversidad('')
      cargar()
    } catch (e: any) {
      emitToast(e?.message || 'Error creando solicitud', 'error')
    } finally { setLoading(false) }
  }

  return (
    <div>
      <style>{css}</style>
      <h2 className="eq-title">Equivalencias</h2>

      <div className="eq-card">
        <h3 style={{fontWeight:700, marginBottom:12}}>Nueva solicitud</h3>
        <div className="eq-label">Tipo</div>
        <select className="eq-select" value={tipo} onChange={e => setTipo(e.target.value)}>
          <option value="equivalencia">Equivalencia</option>
          <option value="convalidacion">Convalidación</option>
        </select>
        <div className="eq-label">Universidad de origen</div>
        <input className="eq-input" value={universidad}
          onChange={e => setUniversidad(e.target.value)} placeholder="Ej: UNIOESTE" />
        <button className="eq-btn" onClick={solicitar} disabled={loading}>
          {loading ? 'Enviando...' : 'Solicitar'}
        </button>
      </div>

      <h3 style={{fontWeight:700, margin:'20px 0 12px', fontSize:16}}>Mis solicitudes</h3>
      {solicitudes.length === 0 && (
        <div className="eq-card" style={{textAlign:'center', color:'var(--text-secondary)'}}>
          No tenés solicitudes de equivalencia.
        </div>
      )}
      {solicitudes.map(s => (
        <div key={s.id} className="eq-card">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div>
              <strong>{s.tipo}</strong>
              {s.universidad_origen && <span style={{fontSize:12, color:'var(--text-secondary)', marginLeft:8}}>{s.universidad_origen}</span>}
            </div>
            <span className={`eq-badge ${s.estado}`}>{s.estado}</span>
          </div>
        </div>
      ))}
    </div>
  )
}