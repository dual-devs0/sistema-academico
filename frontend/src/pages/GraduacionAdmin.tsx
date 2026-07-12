import { useState } from 'react'
import { emitToast } from '../lib/api'
import { crearProcesoGraduacion, getCondicionEgreso, getEtapasProceso,
  asignarTutor, actualizarEtapa,
  type CondicionEgreso, type ProcesoGraduacion, type EtapaTesis } from '../services/graduacionService'

const css = `
  .gr-title { font-size:22px; font-weight:800; margin-bottom:20px; color:var(--text-primary); }
  .gr-card {
    background:var(--bg-elevated); border:1px solid var(--border-subtle);
    border-radius:16px; padding:18px 22px; margin-bottom:12px;
  }
  .gr-input, .gr-select, .gr-textarea {
    padding:8px 12px; border-radius:10px; font-size:13px;
    background:var(--bg-base); border:1px solid var(--border-subtle);
    color:var(--text-primary); width:100%; margin-bottom:12px;
  }
  .gr-select { appearance:auto; }
  .gr-textarea { resize:vertical; min-height:50px; font-family:inherit; }
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
  .gr-badge.warn { background:rgba(234,179,8,.15); color:#eab308; }
  .gr-badge.info { background:rgba(59,130,246,.15); color:#3b82f6; }
  .gr-section-title { font-weight:700; margin-bottom:12px; font-size:15px; }
  .gr-placeholder { font-size:13px; color:var(--text-secondary); font-style:italic; }
  .gr-timeline { position:relative; padding-left:24px; }
  .gr-timeline::before {
    content:''; position:absolute; left:8px; top:4px; bottom:4px;
    width:2px; background:var(--border-subtle);
  }
  .gr-timeline-item { position:relative; padding-bottom:18px; }
  .gr-timeline-item::before {
    content:''; position:absolute; left:-20px; top:4px;
    width:12px; height:12px; border-radius:50%;
    background:var(--accent-bright); border:2px solid var(--bg-elevated);
  }
  .gr-timeline-item.complete::before { background:#10b981; }
  .gr-timeline-item.fail::before { background:#ef4444; }
`

const ESTADOS_ETAPA = ['pendiente', 'en_curso', 'aprobada', 'rechazada'] as const

export default function GraduacionAdmin() {
  const [alumnoId, setAlumnoId] = useState('')
  const [condicion, setCondicion] = useState<CondicionEgreso | null>(null)
  const [proceso, setProceso] = useState<ProcesoGraduacion | null>(null)
  const [loading, setLoading] = useState(false)

  const [tutorId, setTutorId] = useState('')
  const [loadingTutor, setLoadingTutor] = useState(false)

  const [etapas, setEtapas] = useState<EtapaTesis[]>([])
  const [etapaId, setEtapaId] = useState<number | ''>('')
  const [etapaEstado, setEtapaEstado] = useState('pendiente')
  const [etapaObservaciones, setEtapaObservaciones] = useState('')
  const [loadingEtapa, setLoadingEtapa] = useState(false)

  const verificar = async () => {
    if (!alumnoId) { emitToast('Ingresá un ID de alumno', 'error'); return }
    setLoading(true)
    try {
      const c = await getCondicionEgreso(Number(alumnoId))
      setCondicion(c)
      setProceso(null)
      setEtapas([])
    } catch { emitToast('Error verificando condición', 'error') }
    finally { setLoading(false) }
  }

  const iniciarProceso = async () => {
    if (!condicion?.puede_graduarse) { emitToast('No cumple condiciones', 'error'); return }
    try {
      const p = await crearProcesoGraduacion(Number(alumnoId))
      setProceso(p)
      emitToast(`Proceso creado ID: ${p.id}`, 'success')
      fetchEtapas(p.id)
    } catch (e: unknown) {
      emitToast(e instanceof Error ? e.message : 'Error creando proceso', 'error')
    }
  }

  const fetchEtapas = async (pid?: number) => {
    const id = pid ?? proceso?.id
    if (!id) return
    try {
      setEtapas(await getEtapasProceso(id))
    } catch { setEtapas([]) }
  }

  const handleAsignarTutor = async () => {
    if (!proceso) return
    if (!tutorId) { emitToast('Ingresá un ID de tutor', 'error'); return }
    setLoadingTutor(true)
    try {
      const updated = await asignarTutor(proceso.id, Number(tutorId))
      setProceso(updated)
      emitToast('Tutor asignado', 'success')
      setTutorId('')
    } catch (e: unknown) {
      emitToast(e instanceof Error ? e.message : 'Error asignando tutor', 'error')
    } finally { setLoadingTutor(false) }
  }

  const handleActualizarEtapa = async () => {
    if (!proceso) return
    if (etapaId === '') { emitToast('Seleccioná una etapa', 'error'); return }
    setLoadingEtapa(true)
    try {
      const updated = await actualizarEtapa(proceso.id, Number(etapaId), etapaEstado, etapaObservaciones || undefined)
      setEtapas(prev => prev.map(e => e.id === updated.id ? updated : e))
      emitToast('Etapa actualizada', 'success')
      setEtapaId('')
      setEtapaEstado('pendiente')
      setEtapaObservaciones('')
    } catch (e: unknown) {
      emitToast(e instanceof Error ? e.message : 'Error actualizando etapa', 'error')
    } finally { setLoadingEtapa(false) }
  }

  const badgeClass = (estado: string) => {
    if (estado === 'aprobada') return 'ok'
    if (estado === 'rechazada') return 'fail'
    if (estado === 'en_curso') return 'warn'
    return 'info'
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
          <h3 className="gr-section-title">Condición de egreso</h3>
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
            {condicion.puede_graduarse && !proceso && (
              <button className="gr-btn" style={{marginTop:12}} onClick={iniciarProceso}>
                Iniciar proceso de graduación
              </button>
            )}
          </div>
        </div>
      )}

      {proceso && (
        <>
          <div className="gr-card">
            <div style={{display:'flex', alignItems:'center', gap:12, fontSize:13}}>
              <strong>Proceso #{proceso.id}</strong>
              <span className={`gr-badge ${['graduado', 'tesis_aprobada'].includes(proceso.estado) ? 'ok' : 'info'}`}>
                {proceso.estado}
              </span>
              {proceso.tutor_id && <span>Tutor ID: {proceso.tutor_id}</span>}
            </div>
          </div>

          <div className="gr-card">
            <h3 className="gr-section-title">Asignar tutor</h3>
            <div className="gr-label">ID del tutor (profesor)</div>
            <div style={{display:'flex', gap:8}}>
              <input className="gr-input" type="number" value={tutorId}
                onChange={e => setTutorId(e.target.value)} placeholder="Ej: 15" />
              <button className="gr-btn" onClick={handleAsignarTutor}
                disabled={loadingTutor || !tutorId}>Asignar Tutor</button>
            </div>
          </div>

          <div className="gr-card">
            <h3 className="gr-section-title">Actualizar etapa</h3>
            {etapas.length > 0 ? (
              <>
                <div className="gr-label">Etapa</div>
                <select className="gr-select" value={etapaId}
                  onChange={e => setEtapaId(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">Seleccionar etapa</option>
                  {etapas.map(e => (
                    <option key={e.id} value={e.id}>{e.nombre_etapa} ({e.estado})</option>
                  ))}
                </select>
                <div className="gr-label">Nuevo estado</div>
                <select className="gr-select" value={etapaEstado}
                  onChange={e => setEtapaEstado(e.target.value)}>
                  {ESTADOS_ETAPA.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <div className="gr-label">Observaciones</div>
                <textarea className="gr-textarea" rows={2} value={etapaObservaciones}
                  onChange={e => setEtapaObservaciones(e.target.value)}
                  placeholder="Observaciones opcionales" />
                <button className="gr-btn" onClick={handleActualizarEtapa}
                  disabled={loadingEtapa || etapaId === ''}>
                  Actualizar etapa
                </button>
              </>
            ) : (
              <p className="gr-placeholder">No hay etapas registradas para este proceso.</p>
            )}
          </div>

          <div className="gr-card">
            <h3 className="gr-section-title">Documentos CONES</h3>
            <p className="gr-placeholder">
              En desarrollo — Próximamente podrás consultar los documentos de CONES desde aquí.
            </p>
          </div>

          {etapas.length > 0 && (
            <div className="gr-card">
              <h3 className="gr-section-title">Historial del proceso</h3>
              <div className="gr-timeline">
                {etapas.map(e => (
                  <div key={e.id}
                    className={`gr-timeline-item ${e.estado === 'aprobada' ? 'complete' : ''} ${e.estado === 'rechazada' ? 'fail' : ''}`}>
                    <div style={{fontWeight:600, fontSize:13}}>{e.nombre_etapa}</div>
                    <div style={{fontSize:12, color:'var(--text-secondary)'}}>
                      <span className={`gr-badge ${badgeClass(e.estado)}`}>{e.estado}</span>
                      {e.fecha_limite && <span style={{marginLeft:8}}>Límite: {e.fecha_limite}</span>}
                    </div>
                    {e.observaciones && (
                      <div style={{fontSize:11, color:'var(--text-secondary)', marginTop:4}}>
                        {e.observaciones}
                      </div>
                    )}
                    <div style={{fontSize:11, color:'var(--text-secondary)', marginTop:2}}>
                      Responsable: Admin
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
