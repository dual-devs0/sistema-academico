import { useState, useEffect, type CSSProperties } from 'react'
import {
  getFuentes, getCatalogoBecas, getPostulaciones, revisarPostulacion,
  getConceptos, crearConcepto, generarCuotas, getCuotasAlumno,
  registrarPago,
  downloadRendicion, formatGs,
  getComprobantesPendientes, reintentarComprobante,
  type FuenteBeca, type BecaCatalogo, type Postulacion, type ConceptoArancel,
  type ComprobantePendiente, type Cuota,
} from '../services/finanzasService'
import { api, emitToast } from '../lib/api'

// ── Tipos locales ──────────────────────────────────────────────────────

type Tab = 'conceptos' | 'cuotas' | 'pagos' | 'becas' | 'rendicion' | 'comprobantes'
type AlumnoSearch = { id: number; username: string; nombre: string }

const searchResultBtnStyle: CSSProperties = {
  display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px',
  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 13,
}

const modalOverlayStyle: CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
  zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
}

function badgeEstilo(estado: string) {
  const colores: Record<string, { bg: string; color: string }> = {
    pagada: { bg: 'var(--success-subtle)', color: 'var(--success)' },
    vencida: { bg: 'var(--danger-subtle)', color: 'var(--danger)' },
    pendiente: { bg: 'var(--warning-subtle)', color: 'var(--warning)' },
    anulada: { bg: 'rgba(148,163,184,0.12)', color: 'var(--text-muted)' },
  }
  return colores[estado] ?? colores.pendiente
}

// ── Sub-componente: Catálogo de Becas (admin) ─────────────────────────
function TabBecas() {
  const [fuentes, setFuentes] = useState<FuenteBeca[]>([])
  const [catalogo, setCatalogo] = useState<BecaCatalogo[]>([])
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>([])
  const [fuenteSeleccionada, setFuenteSeleccionada] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getFuentes().then(setFuentes).catch(() => {})
    getCatalogoBecas().then(setCatalogo).catch(() => {})
  }, [])

  const cargarPostulaciones = (fuenteId: number) => {
    setFuenteSeleccionada(fuenteId)
    setLoading(true)
    getPostulaciones(fuenteId)
      .then(setPostulaciones)
      .catch(() => setPostulaciones([]))
      .finally(() => setLoading(false))
  }

  const revisar = async (id: number, estado: 'aprobada' | 'rechazada') => {
    try {
      await revisarPostulacion(id, estado)
      emitToast(`Postulación ${estado} correctamente`, 'success')
      if (fuenteSeleccionada) cargarPostulaciones(fuenteSeleccionada)
    } catch {
      emitToast('Error al revisar postulación', 'error')
    }
  }

  return (
    <div>
      {/* Catálogo */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
          Becas en Catálogo
        </h3>
        {catalogo.length === 0 ? (
          <div className="card" style={{ borderLeft: '3px solid var(--warning)', color: 'var(--warning)', fontSize: 13 }}>No hay becas en el catálogo.</div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table-uca">
              <thead>
                <tr>
                  <th>Nombre</th><th>Fuente</th><th>% Descuento</th><th>Cupos Disp.</th>
                </tr>
              </thead>
              <tbody>
                {catalogo.map(b => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 600 }}>{b.nombre}</td>
                    <td>
                      <span className={`badge ${b.fuente.es_externa ? '' : ''}`} style={{
                        background: b.fuente.es_externa ? 'rgba(167,139,250,0.15)' : 'rgba(34,211,238,0.12)',
                        color: b.fuente.es_externa ? '#a78bfa' : '#22d3ee',
                      }}>
                        {b.fuente.nombre}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700 }}>
                        {parseFloat(b.porcentaje_descuento)}%
                        {!b.fuente.editable_porcentaje && <span style={{ fontSize: 10, opacity: .7, color: 'var(--text-secondary)' }}> (fijo por convenio)</span>}
                      </span>
                    </td>
                    <td>{b.cupos_disponibles ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Postulaciones */}
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
          Postulaciones Pendientes
        </h3>
        <div className="card" style={{ borderLeft: '3px solid var(--warning)', color: 'var(--warning)', fontSize: 12.5, marginBottom: 12 }}>
          ⚠️ Seleccioná una fuente antes de ver postulaciones. Los flujos internos (Institucional) y externos (ITAIPU, BECAL) se revisan por separado.
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          {fuentes.map(f => (
            <button
              key={f.id}
              className={fuenteSeleccionada === f.id ? 'btn-primary' : 'btn-ghost'}
              onClick={() => cargarPostulaciones(f.id)}
            >
              {f.es_externa ? '🏦' : '🎓'} {f.nombre}
            </button>
          ))}
        </div>
        {fuenteSeleccionada && (
          loading ? (
            <div style={{ color: 'var(--text-secondary)', padding: 16 }}>Cargando…</div>
          ) : postulaciones.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', padding: 16 }}>No hay postulaciones para esta fuente.</div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="table-uca">
                <thead>
                  <tr>
                    <th>Alumno ID</th><th>Beca</th><th>Estado</th><th>Fecha</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {postulaciones.map(p => (
                    <tr key={p.id}>
                      <td>#{p.alumno_id}</td>
                      <td style={{ fontWeight: 600 }}>{p.beca.nombre}</td>
                      <td>
                        <span className="badge" style={{
                          background: p.estado === 'aprobada' ? 'var(--success-subtle)' : p.estado === 'rechazada' ? 'var(--danger-subtle)' : 'var(--warning-subtle)',
                          color: p.estado === 'aprobada' ? 'var(--success)' : p.estado === 'rechazada' ? 'var(--danger)' : 'var(--warning)',
                        }}>{p.estado}</span>
                      </td>
                      <td>{new Date(p.fecha_postulacion).toLocaleDateString('es-PY')}</td>
                      <td>
                        {p.estado === 'pendiente' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button type="button" className="btn-primary" style={{ background: 'var(--success)' }} onClick={() => revisar(p.id, 'aprobada')}>
                              ✓ Aprobar
                            </button>
                            <button type="button" className="btn-ghost" style={{ color: 'var(--danger)', borderColor: 'var(--danger-subtle)' }} onClick={() => revisar(p.id, 'rechazada')}>
                              ✗ Rechazar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  )
}

// ── Sub-componente: Rendición ─────────────────────────────────────────
function TabRendicion() {
  const [fuentes, setFuentes] = useState<FuenteBeca[]>([])
  const [fuente, setFuente] = useState('')
  const [periodo, setPeriodo] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getFuentes().then(fs => {
      setFuentes(fs)
      if (fs.length) setFuente(fs[0].nombre)
    }).catch(() => {})
  }, [])

  const descargar = async () => {
    if (!fuente) return
    setLoading(true)
    try {
      await downloadRendicion(fuente, periodo || undefined)
      emitToast('Excel descargado', 'success')
    } catch {
      emitToast('Error descargando rendición', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ maxWidth: 500 }}>
      <h3 style={{ fontWeight: 700, marginBottom: 18, fontSize: 15 }}>Exportar Rendición de Becas</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        <span className="mono-label">Fuente (obligatorio)</span>
        <select className="input-uca" value={fuente} onChange={e => setFuente(e.target.value)}>
          {fuentes.map(f => (
            <option key={f.id} value={f.nombre}>{f.nombre} {f.es_externa ? '(externa)' : '(inst.)'}</option>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        <span className="mono-label">Período (opcional, ej: 2026-06)</span>
        <input className="input-uca" type="text" placeholder="2026-06" value={periodo} onChange={e => setPeriodo(e.target.value)} />
      </div>
      <button type="button" className="btn-primary" onClick={descargar} disabled={!fuente || loading}>
        {loading ? 'Generando…' : '⬇ Descargar Excel'}
      </button>
    </div>
  )
}

// ── Sub-componente: Conceptos ──────────────────────────────────────────
function TabConceptos() {
  const [conceptos, setConceptos] = useState<ConceptoArancel[]>([])
  const [nombre, setNombre] = useState('')
  const [monto, setMonto] = useState('')
  const [periodicidad, setPeriodicidad] = useState('mensual')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getConceptos().then(setConceptos).catch(() => {})
  }, [])

  const guardar = async () => {
    if (!nombre || !monto) return
    setSaving(true)
    try {
      await crearConcepto({ nombre, monto_base: monto, periodicidad, carrera_id: null })
      emitToast('Concepto creado', 'success')
      setNombre(''); setMonto('')
      getConceptos().then(setConceptos).catch(() => {})
    } catch {
      emitToast('Error creando concepto', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="card" style={{ maxWidth: 480, marginBottom: 20 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Nuevo Concepto de Arancel</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          <span className="mono-label">Nombre</span>
          <input className="input-uca" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Cuota Mensual Ingeniería" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="mono-label">Monto Base (Gs.)</span>
            <input className="input-uca" type="number" value={monto} onChange={e => setMonto(e.target.value)} placeholder="500000" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="mono-label">Periodicidad</span>
            <select className="input-uca" value={periodicidad} onChange={e => setPeriodicidad(e.target.value)}>
              <option value="mensual">Mensual</option>
              <option value="semestral">Semestral</option>
              <option value="anual">Anual</option>
              <option value="unica">Única vez</option>
            </select>
          </div>
        </div>
        <button type="button" className="btn-primary" style={{ marginTop: 14 }} onClick={guardar} disabled={saving}>
          {saving ? 'Guardando…' : '+ Crear Concepto'}
        </button>
      </div>
      {conceptos.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table-uca">
            <thead>
              <tr><th>Nombre</th><th>Monto Base</th><th>Periodicidad</th></tr>
            </thead>
            <tbody>
              {conceptos.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.nombre}</td>
                  <td>{formatGs(c.monto_base)}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{c.periodicidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Sub-componente: Cuotas (FULL UI) ──────────────────────────────────
function TabCuotas() {
  const [busqueda, setBusqueda] = useState('')
  const [busquedaDebounced, setBusquedaDebounced] = useState('')
  const [resultados, setResultados] = useState<AlumnoSearch[]>([])
  const [alumno, setAlumno] = useState<AlumnoSearch | null>(null)

  const [conceptos, setConceptos] = useState<ConceptoArancel[]>([])
  const [conceptoId, setConceptoId] = useState('')
  const [periodos, setPeriodos] = useState('')
  const [fechaVenc, setFechaVenc] = useState('')
  const [generando, setGenerando] = useState(false)

  const [cuotas, setCuotas] = useState<Cuota[]>([])
  const [loadingCuotas, setLoadingCuotas] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setBusquedaDebounced(busqueda), 300)
    return () => clearTimeout(t)
  }, [busqueda])

  useEffect(() => {
    if (!busquedaDebounced) return
    api.get<{ items: AlumnoSearch[] }>(`/users/?role=alumno&q=${encodeURIComponent(busquedaDebounced)}&limit=8`)
      .then(res => setResultados(res.items))
      .catch(() => setResultados([]))
  }, [busquedaDebounced])

  useEffect(() => { getConceptos().then(setConceptos).catch(() => {}) }, [])

  function seleccionarAlumno(a: AlumnoSearch) {
    setAlumno(a)
    setResultados([])
    setBusqueda('')
    cargarCuotas(a.id)
  }

  function cargarCuotas(alumnoId: number) {
    setLoadingCuotas(true)
    getCuotasAlumno(alumnoId)
      .then(setCuotas)
      .catch(() => setCuotas([]))
      .finally(() => setLoadingCuotas(false))
  }

  async function handleGenerar() {
    if (!alumno || !conceptoId || !periodos || !fechaVenc) {
      emitToast('Completá todos los campos', 'warning')
      return
    }
    setGenerando(true)
    try {
      const periodosArr = periodos.split(',').map(s => s.trim()).filter(Boolean)
      await generarCuotas({
        alumno_id: alumno.id,
        concepto_id: Number(conceptoId),
        periodos: periodosArr,
        fecha_vencimiento_base: fechaVenc,
      })
      emitToast(`${periodosArr.length} cuota(s) generada(s) correctamente`, 'success')
      cargarCuotas(alumno.id)
      setConceptoId(''); setPeriodos(''); setFechaVenc('')
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al generar cuotas', 'error')
    } finally {
      setGenerando(false)
    }
  }

  return (
    <div>
      {/* Selector de alumno */}
      <div className="card" style={{ marginBottom: 20, position: 'relative' }}>
        <span className="mono-label" style={{ marginBottom: 6, display: 'block' }}>Alumno</span>
        <input
          className="input-uca" placeholder="Buscar alumno por nombre o documento…"
          value={alumno ? (alumno.nombre || alumno.username) : busqueda}
          onChange={e => { setAlumno(null); setBusqueda(e.target.value); setCuotas([]) }}
        />
        {resultados.length > 0 && (
          <div className="card card-elevated" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, padding: 6, marginTop: 4 }}>
            {resultados.map(a => (
              <button type="button" key={a.id} onClick={() => seleccionarAlumno(a)}
                style={searchResultBtnStyle}>
                {a.nombre || a.username} <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>({a.username})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {alumno && (
        <>
          {/* Formulario de generación */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 14, fontSize: 14 }}>Generar Cuotas</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="mono-label">Concepto</span>
                <select aria-label="Concepto" className="input-uca" value={conceptoId} onChange={e => setConceptoId(e.target.value)}>
                  <option value="">Seleccionar…</option>
                  {conceptos.map(c => <option key={c.id} value={c.id}>{c.nombre} ({formatGs(c.monto_base)})</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="mono-label">Períodos (separados por coma)</span>
                <input aria-label="Períodos (separados por coma)" className="input-uca" placeholder="Ej: 2026-1, 2026-2" value={periodos} onChange={e => setPeriodos(e.target.value)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="mono-label">Fecha Vencimiento Base</span>
                <input aria-label="Fecha Vencimiento Base" className="input-uca" type="date" value={fechaVenc} onChange={e => setFechaVenc(e.target.value)} />
              </div>
            </div>
            <button type="button" className="btn-primary" onClick={handleGenerar} disabled={generando}>
              {generando ? 'Generando…' : '+ Generar Cuotas'}
            </button>
          </div>

          {/* Listado de cuotas */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', fontWeight: 700, fontSize: 14 }}>
              Cuotas de {alumno.nombre || alumno.username}
            </div>
            {loadingCuotas ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando cuotas…</div>
            ) : cuotas.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>Este alumno no tiene cuotas generadas.</div>
            ) : (
              <table className="table-uca">
                <thead>
                  <tr>
                    <th>Período</th><th>Monto</th><th>Desc.</th><th>A Pagar</th><th>Vencimiento</th><th>Estado</th><th>Beca</th>
                  </tr>
                </thead>
                <tbody>
                  {cuotas.map(c => (
                    <tr key={c.id}>
                      <td>{c.periodo}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatGs(c.monto)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>{formatGs(c.monto_descuento)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{formatGs(c.monto_a_pagar)}</td>
                      <td style={{ color: c.estado === 'vencida' ? 'var(--danger)' : undefined }}>{new Date(c.fecha_vencimiento).toLocaleDateString('es-PY')}</td>
                      <td>
                        <span className="badge" style={badgeEstilo(c.estado)}>{c.estado}</span>
                      </td>
                      <td>{c.beca_nombre ? <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.beca_nombre}</span> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Sub-componente: Pagos (FULL UI) ───────────────────────────────────
function TabPagos() {
  const [busqueda, setBusqueda] = useState('')
  const [busquedaDebounced, setBusquedaDebounced] = useState('')
  const [resultados, setResultados] = useState<AlumnoSearch[]>([])
  const [alumno, setAlumno] = useState<AlumnoSearch | null>(null)

  const [cuotas, setCuotas] = useState<Cuota[]>([])
  const [loadingCuotas, setLoadingCuotas] = useState(false)

  // Formulario de pago
  const [pagoCuotaId, setPagoCuotaId] = useState<number | null>(null)
  const [pagoMonto, setPagoMonto] = useState('')
  const [pagoMetodo, setPagoMetodo] = useState('transferencia')
  const [pagoReferencia, setPagoReferencia] = useState('')
  const [pagando, setPagando] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setBusquedaDebounced(busqueda), 300)
    return () => clearTimeout(t)
  }, [busqueda])

  useEffect(() => {
    if (!busquedaDebounced) return
    api.get<{ items: AlumnoSearch[] }>(`/users/?role=alumno&q=${encodeURIComponent(busquedaDebounced)}&limit=8`)
      .then(res => setResultados(res.items))
      .catch(() => setResultados([]))
  }, [busquedaDebounced])

  function seleccionarAlumno(a: AlumnoSearch) {
    setAlumno(a)
    setResultados([])
    setBusqueda('')
    setPagoCuotaId(null)
    cargarCuotas(a.id)
  }

  function cargarCuotas(alumnoId: number) {
    setLoadingCuotas(true)
    getCuotasAlumno(alumnoId)
      .then(setCuotas)
      .catch(() => setCuotas([]))
      .finally(() => setLoadingCuotas(false))
  }

  function iniciarPago(cuota: Cuota) {
    setPagoCuotaId(cuota.id)
    setPagoMonto(cuota.monto_a_pagar)
    setPagoMetodo('transferencia')
    setPagoReferencia('')
  }

  async function handlePagar() {
    if (!pagoCuotaId || !pagoMonto) {
      emitToast('Completá los datos del pago', 'warning')
      return
    }
    setPagando(true)
    try {
      await registrarPago({
        cuota_id: pagoCuotaId,
        monto_pagado: pagoMonto,
        metodo: pagoMetodo,
        referencia: pagoReferencia || undefined,
      })
      emitToast('Pago registrado correctamente', 'success')
      setPagoCuotaId(null)
      if (alumno) cargarCuotas(alumno.id)
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al registrar pago', 'error')
    } finally {
      setPagando(false)
    }
  }

  return (
    <div>
      {/* Selector de alumno */}
      <div className="card" style={{ marginBottom: 20, position: 'relative' }}>
        <span className="mono-label" style={{ marginBottom: 6, display: 'block' }}>Alumno</span>
        <input
          className="input-uca" placeholder="Buscar alumno por nombre o documento…"
          value={alumno ? (alumno.nombre || alumno.username) : busqueda}
          onChange={e => { setAlumno(null); setBusqueda(e.target.value); setCuotas([]); setPagoCuotaId(null) }}
        />
        {resultados.length > 0 && (
          <div className="card card-elevated" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, padding: 6, marginTop: 4 }}>
            {resultados.map(a => (
              <button type="button" key={a.id} onClick={() => seleccionarAlumno(a)}
                style={searchResultBtnStyle}>
                {a.nombre || a.username} <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>({a.username})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {alumno && (
        <>
          {/* Modal de pago */}
          {pagoCuotaId && (
            <div style={modalOverlayStyle}
              onClick={() => setPagoCuotaId(null)}>
              <div className="card card-elevated" style={{ width: '100%', maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800 }}>Registrar Pago</h3>
                  <button type="button" onClick={() => setPagoCuotaId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>✕</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  <span className="mono-label">Monto a Pagar (Gs.)</span>
                  <input aria-label="Monto a Pagar (Gs.)" className="input-uca" type="number" value={pagoMonto} onChange={e => setPagoMonto(e.target.value)} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  <span className="mono-label">Método de Pago</span>
                  <select aria-label="Método de Pago" className="input-uca" value={pagoMetodo} onChange={e => setPagoMetodo(e.target.value)}>
                    <option value="transferencia">Transferencia</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="deposito">Depósito</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                  <span className="mono-label">Referencia (opcional)</span>
                  <input className="input-uca" placeholder="Nº de recibo, transferencia, etc." value={pagoReferencia} onChange={e => setPagoReferencia(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={() => setPagoCuotaId(null)}>Cancelar</button>
                  <button type="button" className="btn-primary" style={{ flex: 1 }} disabled={pagando} onClick={handlePagar}>
                    {pagando ? 'Registrando…' : '💰 Confirmar Pago'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Listado de cuotas */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', fontWeight: 700, fontSize: 14 }}>
              Cuotas de {alumno.nombre || alumno.username}
            </div>
            {loadingCuotas ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando cuotas…</div>
            ) : cuotas.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>Este alumno no tiene cuotas.</div>
            ) : (
              <table className="table-uca">
                <thead>
                  <tr>
                    <th>Período</th><th>A Pagar</th><th>Vencimiento</th><th>Estado</th><th>Comprobante</th><th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {cuotas.map(c => (
                    <tr key={c.id}>
                      <td>{c.periodo}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{formatGs(c.monto_a_pagar)}</td>
                      <td style={{ color: c.estado === 'vencida' ? 'var(--danger)' : undefined }}>
                        {new Date(c.fecha_vencimiento).toLocaleDateString('es-PY')}
                      </td>
                      <td><span className="badge" style={badgeEstilo(c.estado)}>{c.estado}</span></td>
                      <td>
                        {c.pago_id ? (
                          <a href={`/api/finanzas/pagos/${c.pago_id}/comprobante`} target="_blank" rel="noopener noreferrer"
                            className="badge" style={{ background: 'var(--accent-muted)', color: 'var(--accent-bright)', textDecoration: 'none', cursor: 'pointer' }}>
                            {c.comprobante_estado === 'emitido' ? '🧾 Ver Factura' : c.comprobante_estado || 'Ver'}
                          </a>
                        ) : '—'}
                      </td>
                      <td>
                        {c.estado !== 'pagada' && c.estado !== 'anulada' && (
                          <button type="button" className="btn-primary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => iniciarPago(c)}>
                            💰 Pagar
                          </button>
                        )}
                        {c.estado === 'pagada' && (
                          <span className="badge" style={{ background: 'var(--success-subtle)', color: 'var(--success)' }}>Pagada</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {!alumno && (
        <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>
          Buscá un alumno para registrar o consultar sus pagos.
        </div>
      )}
    </div>
  )
}

// ── Sub-componente: Comprobantes pendientes/error (Fase 4B) ───────────
function TabComprobantes() {
  const [items, setItems] = useState<ComprobantePendiente[]>([])
  const [loading, setLoading] = useState(true)
  const [reintentando, setReintentando] = useState<number | null>(null)

  const cargar = () => {
    getComprobantesPendientes()
      .then(setItems)
      .catch(() => emitToast('Error cargando comprobantes pendientes', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [])

  const reintentar = async (pagoId: number) => {
    setReintentando(pagoId)
    try {
      await reintentarComprobante(pagoId)
      emitToast('Reintento ejecutado', 'success')
      cargar()
    } catch {
      emitToast('Error al reintentar emisión', 'error')
    } finally {
      setReintentando(null)
    }
  }

  return (
    <div>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
        Comprobantes pendientes o con error
      </h3>
      {loading ? (
        <div style={{ color: 'var(--text-secondary)', padding: 16 }}>Cargando…</div>
      ) : items.length === 0 ? (
        <div className="card" style={{ borderLeft: '3px solid var(--success)', color: 'var(--success)', fontSize: 13 }}>
          No hay comprobantes pendientes de emisión.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table-uca">
            <thead>
              <tr>
                <th>Pago</th><th>Alumno</th><th>Monto</th><th>Estado</th><th>Intentos</th><th>Último error</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map(c => (
                <tr key={c.id}>
                  <td>#{c.pago_id}</td>
                  <td style={{ fontWeight: 600 }}>{c.alumno_nombre}</td>
                  <td>{formatGs(c.monto_pagado)}</td>
                  <td>
                    <span className="badge" style={{
                      background: c.estado_emision === 'error' ? 'var(--danger-subtle)' : 'var(--warning-subtle)',
                      color: c.estado_emision === 'error' ? 'var(--danger)' : 'var(--warning)',
                    }}>{c.estado_emision}</span>
                  </td>
                  <td>{c.intentos} / 5</td>
                  <td style={{ maxWidth: 220, fontSize: 12, color: 'var(--text-secondary)' }}>{c.ultimo_error || '—'}</td>
                  <td>
                    <button type="button" className="btn-ghost" style={{ padding: '5px 12px', fontSize: 12 }}
                      disabled={c.intentos >= 5 || reintentando === c.pago_id}
                      onClick={() => reintentar(c.pago_id)}>
                      {reintentando === c.pago_id ? 'Reintentando…' : '↻ Reintentar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────
export default function Finanzas() {
  const [tab, setTab] = useState<Tab>('conceptos')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'conceptos', label: '📋 Conceptos' },
    { key: 'cuotas', label: '💳 Cuotas' },
    { key: 'pagos', label: '💰 Pagos' },
    { key: 'becas', label: '🎓 Becas' },
    { key: 'rendicion', label: '📊 Rendición' },
    { key: 'comprobantes', label: '🧾 Comprobantes' },
  ]

  return (
    <div style={{ maxWidth: 1060, margin: '0 auto', padding: '28px 16px' }}>
      <h1 className="page-title" style={{ marginBottom: 20 }}>
        💼 Panel Financiero
      </h1>

      <div className="line-tabs" style={{ marginBottom: 24, overflowX: 'auto', flexWrap: 'nowrap', gap: 0 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            className={`line-tab${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === 'conceptos' && <TabConceptos />}
        {tab === 'cuotas' && <TabCuotas />}
        {tab === 'pagos' && <TabPagos />}
        {tab === 'becas' && <TabBecas />}
        {tab === 'rendicion' && <TabRendicion />}
        {tab === 'comprobantes' && <TabComprobantes />}
      </div>
    </div>
  )
}
