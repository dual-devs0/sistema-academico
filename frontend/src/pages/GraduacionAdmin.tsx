import { useState } from 'react'
import { emitToast } from '../lib/api'
import { crearProcesoGraduacion, getCondicionEgreso,
  type CondicionEgreso } from '../services/graduacionService'

const css = `
  .gr-title { font-size:22px; font-weight:800; margin-bottom:20px; color:var(--text-primary); }
  .gr-card {
    background:var(--bg-elevated); border:1px solid var(--border-subtle);
    border-radius:16px; padding:18px 22px; margin-bottom:12px;
  }
  .gr-input {
    padding:8px 12px; border-radius:10px; font-size:13px;
    background:var(--bg-base); border:1px solid var(--border-subtle);
    color:var(--text-primary); width:100%; margin-bottom:12px;
  }
  .gr-btn {
    padding:8px 18px; border-radius:10px; font-size:13px; font-weight:700;
    border:none; cursor:pointer; background:var(--accent-bright); color:#fff;
  }
  .gr-btn:disabled { opacity:.5; cursor:not-allowed; }
  .gr-label { font-size:12px; font-weight:600; color:var(--text-primary); margin-bottom:4px; }
  .gr-badge {
    padding:4px 12px; border-radius:999px; font-size:11px; font-weight:700;
    text-transform:uppercase; letter-spacing:.05em;
  }
  .gr-badge.ok { background:rgba(16,185,129,.15); color:#10b981; }
  .gr-badge.fail { background:rgba(239,68,68,.15); color:#ef4444; }
`

export default function GraduacionAdmin() {
  const [alumnoId, setAlumnoId] = useState('')
  const [condicion, setCondicion] = useState<CondicionEgreso | null>(null)
  const [loading, setLoading] = useState(false)

  const verificar = async () => {
    if (!alumnoId) { emitToast('Ingresá un ID de alumno', 'error'); return }
    setLoading(true)
    try {
      const c = await getCondicionEgreso(Number(alumnoId))
      setCondicion(c)
    } catch { emitToast('Error verificando condición', 'error') }
    finally { setLoading(false) }
  }

  const iniciarProceso = async () => {
    if (!condicion?.puede_graduarse) { emitToast('No cumple condiciones', 'error'); return }
    try {
      const p = await crearProcesoGraduacion(Number(alumnoId))
      emitToast(`Proceso creado ID: ${p.id}`, 'success')
    } catch (e: any) {
      emitToast(e?.message || 'Error creando proceso', 'error')
    }
  }

  return (
    <div>
      <style>{css}</style>
      <h2 className="gr-title">Graduación — Admin</h2>

      <div className="gr-card">
        <div className="gr-label">ID del alumno</div>
        <div style={{display:'flex', gap:8}}>
          <input className="gr-input" type="number" value={alumnoId}
            onChange={e => setAlumnoId(e.target.value)} placeholder="Ej: 42" />
          <button className="gr-btn" onClick={verificar} disabled={loading}>Verificar</button>
        </div>
      </div>

      {condicion && (
        <div className="gr-card">
          <h3 style={{fontWeight:700, marginBottom:12}}>Condición de egreso</h3>
          <div style={{display:'grid', gap:10, fontSize:13}}>
            <div>Créditos: {condicion.creditos_aprobados}/{condicion.creditos_totales}
              <span className={`gr-badge ${condicion.cumple_creditos ? 'ok' : 'fail'}`} style={{marginLeft:8}}>
                {condicion.cumple_creditos ? 'OK' : 'Falta'}
              </span>
            </div>
            <div>PPA: {condicion.ppa_actual ?? '—'} / mínimo {condicion.ppa_minimo}
              <span className={`gr-badge ${condicion.cumple_ppa ? 'ok' : 'fail'}`} style={{marginLeft:8}}>
                {condicion.cumple_ppa ? 'OK' : 'Falta'}
              </span>
            </div>
            {condicion.motivo && <div style={{color:'#ef4444', fontSize:12}}>Motivo: {condicion.motivo}</div>}
            <div style={{marginTop:8}}>
              <span className={`gr-badge ${condicion.puede_graduarse ? 'ok' : 'fail'}`}>
                {condicion.puede_graduarse ? 'PUEDE GRADUARSE' : 'NO PUEDE GRADUARSE'}
              </span>
            </div>
            {condicion.puede_graduarse && (
              <button className="gr-btn" style={{marginTop:12}} onClick={iniciarProceso}>
                Iniciar proceso de graduación
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}