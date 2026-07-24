import { useState, useEffect, useCallback, type CSSProperties } from 'react'
import {
  getFuentes, getCatalogoBecas, getPostulaciones, revisarPostulacion,
  getConceptos, crearConcepto, actualizarConcepto, generarCuotas, getCuotasAlumno,
  registrarPago, getEstadoDeuda, crearBecaCatalogo, getBecasActivas,
  downloadRendicion, formatGs,
  getComprobantesPendientes, reintentarComprobante,
  getResumenFinanzas,
  type FuenteBeca, type BecaCatalogo, type Postulacion, type ConceptoArancel,
  type ComprobantePendiente, type Cuota, type FinanzasResumen,
  type BecaActiva, type EstadoDeuda,
} from '../services/finanzasService'
import { api, emitToast } from '../lib/api'

const POLL_MS = 30000

const statCardStyle = (borderColor: string): CSSProperties => ({
  background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)',
  padding: '14px 20px', minWidth: 140, borderLeft: `4px solid ${borderColor}`, flex: '1 1 160px',
})
const statValueStyle = (color: string): CSSProperties => ({
  display: 'block', fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 800, color,
})
const statLabelStyle: CSSProperties = {
  display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 2,
  textTransform: 'uppercase', letterSpacing: '.04em',
}

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

  // Nueva beca en catálogo
  const [nbNombre, setNbNombre] = useState('')
  const [nbFuenteId, setNbFuenteId] = useState('')
  const [nbPorcentaje, setNbPorcentaje] = useState('')
  const [nbCupos, setNbCupos] = useState('')
  const [nbGuardando, setNbGuardando] = useState(false)

  // Búsqueda de becas activas por alumno
  const [baBusqueda, setBaBusqueda] = useState('')
  const [baBusquedaDebounced, setBaBusquedaDebounced] = useState('')
  const [baResultados, setBaResultados] = useState<AlumnoSearch[]>([])
  const [baAlumno, setBaAlumno] = useState<AlumnoSearch | null>(null)
  const [baActivas, setBaActivas] = useState<BecaActiva[]>([])
  const [baLoading, setBaLoading] = useState(false)

  const cargarCatalogo = () => getCatalogoBecas().then(setCatalogo).catch(() => {})

  useEffect(() => {
    getFuentes().then(setFuentes).catch(() => {})
    cargarCatalogo()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setBaBusquedaDebounced(baBusqueda), 300)
    return () => clearTimeout(t)
  }, [baBusqueda])

  useEffect(() => {
    if (!baBusquedaDebounced) return
    api.get<{ items: AlumnoSearch[] }>(`/users/?role=alumno&q=${encodeURIComponent(baBusquedaDebounced)}&limit=8`)
      .then(res => setBaResultados(res.items))
      .catch(() => setBaResultados([]))
  }, [baBusquedaDebounced])

  function seleccionarAlumnoBecas(a: AlumnoSearch) {
    setBaAlumno(a)
    setBaResultados([])
    setBaBusqueda('')
    setBaLoading(true)
    getBecasActivas(a.id).then(setBaActivas).catch(() => setBaActivas([])).finally(() => setBaLoading(false))
  }

  async function crearBeca() {
    if (!nbNombre || !nbFuenteId || !nbPorcentaje) {
      emitToast('Completá nombre, fuente y porcentaje', 'warning')
      return
    }
    setNbGuardando(true)
    try {
      await crearBecaCatalogo({
        nombre: nbNombre,
        fuente_id: Number(nbFuenteId),
        porcentaje_descuento: nbPorcentaje,
        cupos_totales: nbCupos ? Number(nbCupos) : null,
        cupos_disponibles: nbCupos ? Number(nbCupos) : null,
      })
      emitToast('Beca creada en catálogo', 'success')
      setNbNombre(''); setNbFuenteId(''); setNbPorcentaje(''); setNbCupos('')
      cargarCatalogo()
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al crear beca', 'error')
    } finally {
      setNbGuardando(false)
    }
  }

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
      {/* Nueva beca */}
      <div className="card" style={{ maxWidth: 520, marginBottom: 24 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-circle-plus" /> Nueva Beca en Catálogo
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          <span className="mono-label">Nombre</span>
          <input className="input-uca" value={nbNombre} onChange={e => setNbNombre(e.target.value)} placeholder="Ej: Beca Mérito Académico" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="mono-label">Fuente</span>
            <select className="input-uca" value={nbFuenteId} onChange={e => setNbFuenteId(e.target.value)}>
              <option value="">Seleccionar…</option>
              {fuentes.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="mono-label">% Descuento</span>
            <input className="input-uca" type="number" value={nbPorcentaje} onChange={e => setNbPorcentaje(e.target.value)} placeholder="50" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="mono-label">Cupos (opcional)</span>
            <input className="input-uca" type="number" value={nbCupos} onChange={e => setNbCupos(e.target.value)} placeholder="20" />
          </div>
        </div>
        <button type="button" className="btn-primary" style={{ marginTop: 14 }} onClick={crearBeca} disabled={nbGuardando}>
          <i className="ti ti-plus" /> {nbGuardando ? 'Guardando…' : 'Crear Beca'}
        </button>
      </div>

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
          <i className="ti ti-alert-triangle" style={{ marginRight: 4 }} /> Seleccioná una fuente antes de ver postulaciones. Los flujos internos (Institucional) y externos (ITAIPU, BECAL) se revisan por separado.
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          {fuentes.map(f => (
            <button
              key={f.id}
              className={fuenteSeleccionada === f.id ? 'btn-primary' : 'btn-ghost'}
              onClick={() => cargarPostulaciones(f.id)}
            >
              <i className={`ti ${f.es_externa ? "ti-building-bank" : "ti-school"}`} style={{ marginRight: 4 }} /> {f.nombre}
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
                              <i className="ti ti-check" /> Aprobar
                            </button>
                            <button type="button" className="btn-ghost" style={{ color: 'var(--danger)', borderColor: 'var(--danger-subtle)' }} onClick={() => revisar(p.id, 'rechazada')}>
                              <i className="ti ti-x" /> Rechazar
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

      {/* Becas activas por alumno */}
      <div style={{ marginTop: 28 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-search" /> Consultar Becas Activas de un Alumno
        </h3>
        <div className="card" style={{ marginBottom: 16, position: 'relative', maxWidth: 480 }}>
          <input className="input-uca" placeholder="Buscar alumno por nombre o documento…"
            value={baAlumno ? (baAlumno.nombre || baAlumno.username) : baBusqueda}
            onChange={e => { setBaAlumno(null); setBaBusqueda(e.target.value); setBaActivas([]) }} />
          {baResultados.length > 0 && (
            <div className="card card-elevated" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, padding: 6, marginTop: 4 }}>
              {baResultados.map(a => (
                <button type="button" key={a.id} onClick={() => seleccionarAlumnoBecas(a)} style={searchResultBtnStyle}>
                  {a.nombre || a.username} <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>({a.username})</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {baAlumno && (
          baLoading ? (
            <div style={{ color: 'var(--text-secondary)', padding: 16 }}>Cargando…</div>
          ) : baActivas.length === 0 ? (
            <div className="card" style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              {baAlumno.nombre || baAlumno.username} no tiene becas activas.
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="table-uca">
                <thead>
                  <tr><th>Beca</th><th>Fuente</th><th>%</th><th>Período</th><th>Promedio</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  {baActivas.map(b => (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 600 }}>{b.beca_nombre}</td>
                      <td>{b.fuente}</td>
                      <td>{parseFloat(b.porcentaje_descuento)}%</td>
                      <td>{b.periodo_inicio}{b.periodo_fin ? ` – ${b.periodo_fin}` : ' (activo)'}</td>
                      <td>{b.promedio_actual ?? '—'}{b.promedio_minimo_requerido ? ` / mín. ${b.promedio_minimo_requerido}` : ''}</td>
                      <td>
                        <span className="badge" style={{
                          background: b.estado_renovacion === 'vigente' ? 'var(--success-subtle)' : b.estado_renovacion === 'en_riesgo' ? 'var(--warning-subtle)' : 'var(--danger-subtle)',
                          color: b.estado_renovacion === 'vigente' ? 'var(--success)' : b.estado_renovacion === 'en_riesgo' ? 'var(--warning)' : 'var(--danger)',
                        }}>{b.estado_renovacion}</span>
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
        {loading ? "Generando…" : (<><i className="ti ti-download" /> Descargar Excel</>)}
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
  const [mostrarInactivos, setMostrarInactivos] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [editMonto, setEditMonto] = useState('')

  const cargar = useCallback(() => getConceptos(mostrarInactivos).then(setConceptos).catch(() => {}), [mostrarInactivos])

  useEffect(() => { const load = () => cargar(); load() }, [mostrarInactivos, cargar])

  const guardar = async () => {
    if (!nombre || !monto) return
    setSaving(true)
    try {
      await crearConcepto({ nombre, monto_base: monto, periodicidad, carrera_id: null })
      emitToast('Concepto creado', 'success')
      setNombre(''); setMonto('')
      cargar()
    } catch {
      emitToast('Error creando concepto', 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleActivo = async (c: ConceptoArancel) => {
    setTogglingId(c.id)
    try {
      await actualizarConcepto(c.id, { activo: !c.activo })
      emitToast(c.activo ? 'Concepto desactivado' : 'Concepto reactivado', 'success')
      cargar()
    } catch {
      emitToast('Error al cambiar estado del concepto', 'error')
    } finally {
      setTogglingId(null)
    }
  }

  const iniciarEdicion = (c: ConceptoArancel) => {
    setEditandoId(c.id)
    setEditMonto(c.monto_base)
  }

  const guardarEdicion = async (id: number) => {
    if (!editMonto) return
    try {
      await actualizarConcepto(id, { monto_base: editMonto })
      emitToast('Monto actualizado', 'success')
      setEditandoId(null)
      cargar()
    } catch {
      emitToast('Error al actualizar monto', 'error')
    }
  }

  return (
    <div>
      <div className="card" style={{ maxWidth: 480, marginBottom: 20 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-circle-plus" /> Nuevo Concepto de Arancel
        </h3>
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
          <i className="ti ti-plus" /> {saving ? 'Guardando…' : 'Crear Concepto'}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <h3 style={{ fontWeight: 700, fontSize: 15, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-list" /> Conceptos existentes
        </h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <input type="checkbox" checked={mostrarInactivos} onChange={e => setMostrarInactivos(e.target.checked)} />
          Mostrar inactivos
        </label>
      </div>

      {conceptos.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>
          No hay conceptos {mostrarInactivos ? '' : 'activos'} registrados.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table-uca">
            <thead>
              <tr><th>Nombre</th><th>Monto Base</th><th>Periodicidad</th><th>Estado</th><th style={{ textAlign: 'right' }}>Acciones</th></tr>
            </thead>
            <tbody>
              {conceptos.map(c => (
                <tr key={c.id} style={{ opacity: c.activo ? 1 : 0.55 }}>
                  <td style={{ fontWeight: 600 }}>{c.nombre}</td>
                  <td>
                    {editandoId === c.id ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input className="input-uca" type="number" value={editMonto} onChange={e => setEditMonto(e.target.value)}
                          style={{ width: 130, padding: '4px 8px' }} />
                        <button type="button" className="btn-ghost" style={{ padding: '4px 8px' }} onClick={() => guardarEdicion(c.id)}>
                          <i className="ti ti-check" style={{ color: 'var(--success)' }} />
                        </button>
                        <button type="button" className="btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setEditandoId(null)}>
                          <i className="ti ti-x" />
                        </button>
                      </div>
                    ) : formatGs(c.monto_base)}
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{c.periodicidad}</td>
                  <td>
                    <span className="badge" style={{
                      background: c.activo ? 'var(--success-subtle)' : 'rgba(148,163,184,0.12)',
                      color: c.activo ? 'var(--success)' : 'var(--text-muted)',
                    }}>{c.activo ? 'Activo' : 'Inactivo'}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {editandoId !== c.id && (
                        <button type="button" className="btn-ghost" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => iniciarEdicion(c)}>
                          <i className="ti ti-pencil" />
                        </button>
                      )}
                      <button type="button" className="btn-ghost" style={{ padding: '5px 10px', fontSize: 12, color: c.activo ? 'var(--danger)' : 'var(--success)' }}
                        disabled={togglingId === c.id} onClick={() => toggleActivo(c)}>
                        <i className={`ti ${c.activo ? 'ti-toggle-right' : 'ti-toggle-left'}`} /> {c.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
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
  const [filtroEstado, setFiltroEstado] = useState('')

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

  function cargarCuotas(alumnoId: number, estado?: string) {
    setLoadingCuotas(true)
    getCuotasAlumno(alumnoId, estado || undefined)
      .then(setCuotas)
      .catch(() => setCuotas([]))
      .finally(() => setLoadingCuotas(false))
  }

  function cambiarFiltroEstado(estado: string) {
    setFiltroEstado(estado)
    if (alumno) cargarCuotas(alumno.id, estado)
  }

  const totalAdeudado = cuotas
    .filter(c => c.estado === 'pendiente' || c.estado === 'vencida')
    .reduce((sum, c) => sum + parseFloat(c.monto_a_pagar), 0)
  const totalPagado = cuotas
    .filter(c => c.estado === 'pagada')
    .reduce((sum, c) => sum + parseFloat(c.monto_a_pagar), 0)

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

          {/* Resumen del alumno */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={statCardStyle('var(--danger)')}>
              <span style={statValueStyle('var(--danger)')}>{formatGs(totalAdeudado)}</span>
              <span style={statLabelStyle}>Total Adeudado</span>
            </div>
            <div style={statCardStyle('var(--success)')}>
              <span style={statValueStyle('var(--success)')}>{formatGs(totalPagado)}</span>
              <span style={statLabelStyle}>Total Pagado</span>
            </div>
            <div style={statCardStyle('var(--accent-bright)')}>
              <span style={statValueStyle('var(--accent-bright)')}>{cuotas.length}</span>
              <span style={statLabelStyle}>Cuotas Totales</span>
            </div>
          </div>

          {/* Listado de cuotas */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Cuotas de {alumno.nombre || alumno.username}</span>
              <select className="input-uca" style={{ width: 160, padding: '5px 10px', fontSize: 12 }}
                value={filtroEstado} onChange={e => cambiarFiltroEstado(e.target.value)}>
                <option value="">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="pagada">Pagada</option>
                <option value="vencida">Vencida</option>
                <option value="anulada">Anulada</option>
              </select>
            </div>
            {loadingCuotas ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando cuotas…</div>
            ) : cuotas.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
                {filtroEstado ? `Sin cuotas en estado "${filtroEstado}".` : 'Este alumno no tiene cuotas generadas.'}
              </div>
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
  const [deuda, setDeuda] = useState<EstadoDeuda | null>(null)

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
    getEstadoDeuda(a.id).then(setDeuda).catch(() => setDeuda(null))
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
      if (alumno) {
        cargarCuotas(alumno.id)
        getEstadoDeuda(alumno.id).then(setDeuda).catch(() => setDeuda(null))
      }
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
          {/* Estado de deuda */}
          {deuda && (
            <div className="card" style={{
              marginBottom: 16,
              borderLeft: `4px solid ${deuda.bloqueado ? 'var(--danger)' : 'var(--success)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: deuda.cuotas_vencidas > 0 ? 10 : 0 }}>
                <i className={`ti ${deuda.bloqueado ? 'ti-lock' : 'ti-lock-open'}`}
                  style={{ fontSize: 20, color: deuda.bloqueado ? 'var(--danger)' : 'var(--success)' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: deuda.bloqueado ? 'var(--danger)' : 'var(--success)' }}>
                    {deuda.bloqueado ? 'Inscripción bloqueada por mora' : 'Sin bloqueo por mora'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {deuda.cuotas_vencidas} cuota{deuda.cuotas_vencidas !== 1 ? 's' : ''} vencida{deuda.cuotas_vencidas !== 1 ? 's' : ''} de {deuda.max_permitidas} permitida{deuda.max_permitidas !== 1 ? 's' : ''} máx.
                    {deuda.tiene_beca_100 && <span style={{ color: 'var(--accent-bright)' }}> · Beca 100% (exento de bloqueo)</span>}
                  </div>
                </div>
              </div>
              {deuda.detalle.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
                  {deuda.detalle.map(d => (
                    <div key={d.cuota_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span>{d.periodo} — {formatGs(d.monto_a_pagar)}</span>
                      <span style={{ color: 'var(--danger)' }}>{d.dias_vencida} días vencida</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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
                    {pagando ? "Registrando…" : (<><i className="ti ti-checkbox" /> Confirmar Pago</>)}
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
                            {c.comprobante_estado === "emitido" ? (<><i className="ti ti-file-certificate" /> Ver Factura</>) : (c.comprobante_estado || "Ver")}
                          </a>
                        ) : '—'}
                      </td>
                      <td>
                        {c.estado !== 'pagada' && c.estado !== 'anulada' && (
                          <button type="button" className="btn-primary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => iniciarPago(c)}>
                            <i className="ti ti-cash" /> Pagar
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
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')

  const cargar = () => {
    getComprobantesPendientes()
      .then(setItems)
      .catch(() => emitToast('Error cargando comprobantes pendientes', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [])

  const filtrados = items.filter(c =>
    (filtroEstado === 'todos' || c.estado_emision === filtroEstado) &&
    (!busqueda || c.alumno_nombre.toLowerCase().includes(busqueda.toLowerCase()))
  )
  const estados = ['todos', ...new Set(items.map(c => c.estado_emision))]

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
      {items.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="input-uca" placeholder="Buscar por alumno…" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ maxWidth: 240 }} />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {estados.map(e => (
              <button key={e} type="button"
                className={filtroEstado === e ? 'btn-primary' : 'btn-ghost'}
                style={{ padding: '6px 12px', fontSize: 12 }}
                onClick={() => setFiltroEstado(e)}>
                {e === 'todos' ? 'Todos' : e}
              </button>
            ))}
          </div>
        </div>
      )}
      {loading ? (
        <div style={{ color: 'var(--text-secondary)', padding: 16 }}>Cargando…</div>
      ) : items.length === 0 ? (
        <div className="card" style={{ borderLeft: '3px solid var(--success)', color: 'var(--success)', fontSize: 13 }}>
          <i className="ti ti-circle-check" style={{ marginRight: 6 }} /> No hay comprobantes pendientes de emisión.
        </div>
      ) : filtrados.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>
          Sin resultados para el filtro actual.
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
              {filtrados.map(c => (
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
                      {reintentando === c.pago_id ? "Reintentando…" : (<><i className="ti ti-refresh" /> Reintentar</>)}
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
  const [resumen, setResumen] = useState<FinanzasResumen | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  function cargarResumen() {
    return getResumenFinanzas()
      .then(r => { setResumen(r); setLastUpdate(new Date()) })
      .catch(() => {})
  }

  useEffect(() => {
    cargarResumen()
    const timer = setInterval(cargarResumen, POLL_MS)
    return () => clearInterval(timer)
  }, [])

  async function handleRefresh() {
    setRefreshing(true)
    await cargarResumen()
    setRefreshing(false)
  }

  const tabs: { key: Tab; icon: string; label: string }[] = [
    { key: 'conceptos', icon: 'ti-file-invoice', label: 'Conceptos' },
    { key: 'cuotas', icon: 'ti-receipt-2', label: 'Cuotas' },
    { key: 'pagos', icon: 'ti-cash', label: 'Pagos' },
    { key: 'becas', icon: 'ti-school', label: 'Becas' },
    { key: 'rendicion', icon: 'ti-report-money', label: 'Rendición' },
    { key: 'comprobantes', icon: 'ti-file-certificate', label: 'Comprobantes' },
  ]

  return (
    <div style={{ maxWidth: 1060, margin: '0 auto', padding: '28px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 className="page-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="ti ti-building-bank" style={{ color: 'var(--accent-bright)' }} /> Panel Financiero
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastUpdate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-muted)' }}>
              <i className="ti ti-refresh" style={{ fontSize: 14 }} />
              <span>{lastUpdate.toLocaleTimeString()}</span>
            </div>
          )}
          <button className="btn-ghost" onClick={handleRefresh} disabled={refreshing} style={{ padding: '9px 14px', fontSize: 12 }}>
            <i className={`ti ti-refresh${refreshing ? ' ti-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Stats siempre visibles ── */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={statCardStyle('var(--success)')}>
          <span style={statValueStyle('var(--success)')}>{resumen ? formatGs(resumen.total_recaudado) : '—'}</span>
          <span style={statLabelStyle}>Total Recaudado</span>
        </div>
        <div style={statCardStyle('var(--warning)')}>
          <span style={statValueStyle('var(--warning)')}>{resumen?.cuotas_pendientes ?? '—'}</span>
          <span style={statLabelStyle}>Cuotas Pendientes</span>
        </div>
        <div style={statCardStyle('var(--danger)')}>
          <span style={statValueStyle('var(--danger)')}>{resumen?.cuotas_vencidas ?? '—'}</span>
          <span style={statLabelStyle}>Cuotas Vencidas</span>
        </div>
        <div style={statCardStyle('var(--accent-bright)')}>
          <span style={statValueStyle('var(--accent-bright)')}>{resumen?.becas_activas ?? '—'}</span>
          <span style={statLabelStyle}>Becas Activas</span>
        </div>
        <div style={statCardStyle('var(--info)')}>
          <span style={statValueStyle('var(--info)')}>{resumen?.comprobantes_pendientes ?? '—'}</span>
          <span style={statLabelStyle}>Comprobantes Pend.</span>
        </div>
      </div>

      <div className="line-tabs" style={{ marginBottom: 24, overflowX: 'auto', flexWrap: 'nowrap', gap: 0 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            className={`line-tab${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            <i className={`ti ${t.icon}`} style={{ marginRight: 6, fontSize: 14 }} /> {t.label}
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
