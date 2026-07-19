import { useState, useEffect, useCallback } from 'react'
import { api, emitToast } from '../lib/api'
import TablaPaginada, { type ColumnaTabla } from '../components/common/TablaPaginada'
import { crearProcesoGraduacion, getCondicionEgreso, getEtapasProceso, getCandidatos,
  asignarTutor, actualizarEtapa,
  type CondicionEgreso, type ProcesoGraduacion, type EtapaTesis, type CandidatoGraduacion } from '../services/graduacionService'

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
  .gr-kpis { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:18px; }
  .gr-filtros { display:flex; gap:10px; margin-bottom:14px; flex-wrap:wrap; }
  .gr-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.6); display:flex; align-items:center; justify-content:center; z-index:999; }
  .gr-modal { background:var(--bg-elevated); border:1px solid var(--border-subtle); border-radius:16px; padding:24px; min-width:380px; max-width:480px; width:100%; }
`

const ESTADOS_ETAPA = ['pendiente', 'en_curso', 'aprobada', 'rechazada'] as const

const estadoCandidatoCfg: Record<string, { label: string; cls: string }> = {
  elegible: { label: 'Elegible', cls: 'ok' },
  pendiente: { label: 'Pendiente', cls: 'warn' },
  verificado: { label: 'Verificado', cls: 'info' },
}

const PAGE_SIZE = 10

export default function GraduacionAdmin() {
  // ── tabla de candidatos ──
  const [candidatos, setCandidatos] = useState<CandidatoGraduacion[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loadingTabla, setLoadingTabla] = useState(true)
  const [carreras, setCarreras] = useState<{ id: number; nombre: string }[]>([])
  const [carreraFiltro, setCarreraFiltro] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [busquedaDebounced, setBusquedaDebounced] = useState('')
  const [modalCandidato, setModalCandidato] = useState<CandidatoGraduacion | null>(null)
  const [confirmando, setConfirmando] = useState(false)

  // ── verificación por ID (flujo existente) ──
  const [mostrarVerificarId, setMostrarVerificarId] = useState(false)
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

  useEffect(() => {
    api.get<{ id: number; nombre: string }[]>('/carreras/').then(setCarreras).catch(() => {})
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setBusquedaDebounced(busqueda), 300)
    return () => clearTimeout(t)
  }, [busqueda])

  const cargarCandidatos = useCallback(() => {
    setLoadingTabla(true)
    getCandidatos({
      carrera_id: carreraFiltro ? Number(carreraFiltro) : undefined,
      q: busquedaDebounced || undefined,
      skip: (page - 1) * PAGE_SIZE,
      limit: PAGE_SIZE,
    })
      .then(res => { setCandidatos(res.items); setTotal(res.total) })
      .catch(() => {})
      .finally(() => setLoadingTabla(false))
  }, [page, carreraFiltro, busquedaDebounced])

  useEffect(() => { cargarCandidatos() }, [cargarCandidatos])

  const kpiElegibles = candidatos.filter(c => c.estado_candidato === 'elegible').length
  const kpiEnProceso = candidatos.filter(c => c.proceso_id && c.proceso_estado !== 'graduado').length
  const kpiVerificados = candidatos.filter(c => c.proceso_estado === 'graduado').length

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

  const iniciarProceso = async (alumno_id?: number) => {
    const id = alumno_id ?? Number(alumnoId)
    if (alumno_id === undefined && !condicion?.puede_graduarse) { emitToast('No cumple condiciones', 'error'); return }
    try {
      const p = await crearProcesoGraduacion(id)
      setProceso(p)
      emitToast(`Proceso creado ID: ${p.id}`, 'success')
      fetchEtapas(p.id)
      return p
    } catch (e: unknown) {
      emitToast(e instanceof Error ? e.message : 'Error creando proceso', 'error')
      throw e
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

  const confirmarGraduacion = async () => {
    if (!modalCandidato) return
    setConfirmando(true)
    try {
      await iniciarProceso(modalCandidato.alumno_id)
      emitToast('Proceso de graduación iniciado', 'success')
      setModalCandidato(null)
      cargarCandidatos()
    } catch {
      // toast ya emitido en iniciarProceso
    } finally {
      setConfirmando(false)
    }
  }

  const columnas: ColumnaTabla<CandidatoGraduacion>[] = [
    {
      header: 'Alumno',
      render: c => (
        <div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{c.nombre || c.username}</div>
          <div className="mono-label" style={{ fontSize: 9.5, textTransform: 'none' }}>#{String(c.alumno_id).padStart(3, '0')}</div>
        </div>
      ),
    },
    { header: 'Carrera', render: c => <span style={{ fontSize: 12.5 }}>{c.carrera_nombre ?? '—'}</span> },
    {
      header: 'Créditos',
      render: c => {
        const pct = c.creditos_totales > 0 ? Math.min(100, Math.round((c.creditos_aprobados / c.creditos_totales) * 100)) : 0
        return (
          <div style={{ minWidth: 110 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, marginBottom: 3 }}>{c.creditos_aprobados}/{c.creditos_totales}</div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
          </div>
        )
      },
    },
    { header: 'PPA', render: c => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{c.ppa_actual?.toFixed(2) ?? '—'}</span> },
    {
      header: 'Pasantía',
      render: c => (
        <span className={`gr-badge ${c.pasantia_completada ? 'ok' : 'warn'}`}>{c.pasantia_completada ? 'Completada' : 'Pendiente'}</span>
      ),
    },
    {
      header: 'Tesina/TFG',
      render: c => (
        <span className={`gr-badge ${c.tesina_estado === 'aprobada' ? 'ok' : c.tesina_estado ? 'warn' : 'info'}`}>
          {c.tesina_estado === 'aprobada' ? 'Aprobada' : c.tesina_estado ? c.tesina_estado : 'No iniciada'}
        </span>
      ),
    },
    {
      header: 'Estado',
      render: c => {
        const cfg = estadoCandidatoCfg[c.estado_candidato] ?? estadoCandidatoCfg.pendiente
        return <span className={`gr-badge ${cfg.cls}`}>{cfg.label}</span>
      },
    },
    {
      header: 'Acciones', align: 'right',
      render: c => (
        <button type="button" className="btn-ghost" style={{ padding: '5px 12px', fontSize: 11 }} onClick={() => setModalCandidato(c)}>
          Verificar
        </button>
      ),
    },
  ]

  return (
    <div>
      <style>{css}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 className="gr-title" style={{ marginBottom: 4 }}>Graduación — Admin</h2>
          <p className="page-subtitle">Candidatos a graduación de todas las carreras.</p>
        </div>
        <button type="button" className="btn-ghost" onClick={() => setMostrarVerificarId(v => !v)}>
          <i className="ti ti-search" /> Verificar por ID
        </button>
      </div>

      <div className="gr-kpis">
        <div className="kpi-card">
          <div className="mono-label" style={{ marginBottom: 8 }}>Candidatos elegibles</div>
          <span className="kpi-value" style={{ fontSize: 26, color: 'var(--success)' }}>{kpiElegibles}</span>
        </div>
        <div className="kpi-card">
          <div className="mono-label" style={{ marginBottom: 8 }}>En proceso de verificación</div>
          <span className="kpi-value" style={{ fontSize: 26, color: '#eab308' }}>{kpiEnProceso}</span>
        </div>
        <div className="kpi-card">
          <div className="mono-label" style={{ marginBottom: 8 }}>Verificados este período</div>
          <span className="kpi-value" style={{ fontSize: 26, color: '#3b82f6' }}>{kpiVerificados}</span>
        </div>
      </div>

      {mostrarVerificarId && (
        <div className="gr-card">
          <div className="gr-label">ID del alumno</div>
          <div style={{display:'flex', gap:8}}>
            <input className="gr-input" type="number" value={alumnoId}
              onChange={e => setAlumnoId(e.target.value)} placeholder="Ej: 42" style={{ marginBottom: 0 }} />
            <button className="gr-btn" onClick={verificar} disabled={loading}>Verificar</button>
          </div>

          {condicion && (
            <div style={{ marginTop: 16, display:'grid', gap:10, fontSize:13 }}>
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
              <div>
                <span className={`gr-badge ${condicion.puede_graduarse ? 'ok' : 'fail'}`}>
                  {condicion.puede_graduarse ? 'PUEDE GRADUARSE' : 'NO PUEDE GRADUARSE'}
                </span>
              </div>
              {condicion.puede_graduarse && !proceso && (
                <button type="button" className="gr-btn" onClick={() => iniciarProceso()}>Iniciar proceso de graduación</button>
              )}
            </div>
          )}

          {proceso && (
            <>
              <div style={{ marginTop: 16, display:'flex', alignItems:'center', gap:12, fontSize:13 }}>
                <strong>Proceso #{proceso.id}</strong>
                <span className={`gr-badge ${['graduado', 'tesis_aprobada'].includes(proceso.estado) ? 'ok' : 'info'}`}>
                  {proceso.estado}
                </span>
                {proceso.tutor_id && <span>Tutor ID: {proceso.tutor_id}</span>}
              </div>

              <div style={{ marginTop: 16 }}>
                <h3 className="gr-section-title">Asignar tutor</h3>
                <div className="gr-label">ID del tutor (profesor)</div>
                <div style={{display:'flex', gap:8}}>
                  <input className="gr-input" type="number" value={tutorId}
                    onChange={e => setTutorId(e.target.value)} placeholder="Ej: 15" style={{ marginBottom: 0 }} />
                  <button className="gr-btn" onClick={handleAsignarTutor}
                    disabled={loadingTutor || !tutorId}>Asignar Tutor</button>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
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

              <div style={{ marginTop: 16 }}>
                <h3 className="gr-section-title">Documentos CONES</h3>
                <p className="gr-placeholder">
                  En desarrollo — Próximamente podrás consultar los documentos de CONES desde aquí.
                </p>
              </div>

              {etapas.length > 0 && (
                <div style={{ marginTop: 16 }}>
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
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="gr-filtros">
        <select aria-label="Filtrar por carrera" className="input-uca" style={{ maxWidth: 220 }} value={carreraFiltro} onChange={e => { setCarreraFiltro(e.target.value); setPage(1) }}>
          <option value="">Todas las carreras</option>
          {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <input className="input-uca" style={{ maxWidth: 280 }} placeholder="Buscar por nombre o usuario…"
          value={busqueda} onChange={e => { setBusqueda(e.target.value); setPage(1) }} />
      </div>

      <TablaPaginada
        columnas={columnas}
        items={candidatos}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        loading={loadingTabla}
        onPageChange={setPage}
        getRowKey={c => c.alumno_id}
        emptyMessage="Sin alumnos que coincidan con el filtro."
      />

      {modalCandidato && (
        <div className="gr-modal-overlay" onClick={() => setModalCandidato(null)}>
          <div className="gr-modal" onClick={e => e.stopPropagation()}>
            <h3 className="gr-section-title">Verificar graduación — {modalCandidato.nombre}</h3>
            <div style={{ display: 'grid', gap: 8, fontSize: 13, marginBottom: 16 }}>
              <div>Créditos: {modalCandidato.creditos_aprobados}/{modalCandidato.creditos_totales}
                <span className={`gr-badge ${modalCandidato.creditos_aprobados >= modalCandidato.creditos_totales ? 'ok' : 'fail'}`} style={{ marginLeft: 8 }}>
                  {modalCandidato.creditos_aprobados >= modalCandidato.creditos_totales ? 'OK' : 'Falta'}
                </span>
              </div>
              <div>PPA: {modalCandidato.ppa_actual?.toFixed(2) ?? '—'} / mínimo {modalCandidato.ppa_minimo}
                <span className={`gr-badge ${(modalCandidato.ppa_actual ?? 0) >= modalCandidato.ppa_minimo ? 'ok' : 'fail'}`} style={{ marginLeft: 8 }}>
                  {(modalCandidato.ppa_actual ?? 0) >= modalCandidato.ppa_minimo ? 'OK' : 'Falta'}
                </span>
              </div>
              <div>Pasantía
                <span className={`gr-badge ${modalCandidato.pasantia_completada ? 'ok' : 'warn'}`} style={{ marginLeft: 8 }}>
                  {modalCandidato.pasantia_completada ? 'Completada' : 'Pendiente'}
                </span>
              </div>
              <div>
                <span className={`gr-badge ${modalCandidato.estado_candidato === 'elegible' ? 'ok' : 'warn'}`}>
                  {modalCandidato.estado_candidato === 'elegible' ? 'PUEDE GRADUARSE' : 'REQUIERE REVISIÓN'}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn-ghost" onClick={() => setModalCandidato(null)} disabled={confirmando}>Cancelar</button>
              <button type="button" className="gr-btn" onClick={confirmarGraduacion}
                disabled={confirmando || modalCandidato.estado_candidato !== 'elegible'}>
                {confirmando ? 'Confirmando…' : 'Confirmar graduación'}
              </button>
            </div>
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
