import { useState, useEffect } from 'react'
import {
  getFuentes, getCatalogoBecas, getPostulaciones, revisarPostulacion,
  getCuotasAlumno, generarCuotas, registrarPago, getConceptos, crearConcepto,
  downloadRendicion, formatGs,
  type FuenteBeca, type BecaCatalogo, type Postulacion, type Cuota, type ConceptoArancel,
} from '../services/finanzasService'
import { emitToast } from '../lib/api'

const css = `
  .fin-tabs { display:flex; gap:4px; border-bottom:1px solid var(--border-subtle); margin-bottom:24px; flex-wrap:wrap; }
  .fin-tab {
    padding:10px 20px; font-size:13px; font-weight:600; border:none; background:none;
    color:var(--text-secondary); cursor:pointer; border-bottom:2.5px solid transparent;
    transition:all .18s; white-space:nowrap;
  }
  .fin-tab.active { color:var(--accent-bright); border-bottom-color:var(--accent-bright); }
  .fin-tab:hover { color:var(--text-primary); }
  .fin-section { max-width:1000px; }
  .fin-card {
    background:var(--bg-elevated); border:1px solid var(--border-subtle);
    border-radius:16px; padding:20px 24px; margin-bottom:12px;
  }
  .fin-badge {
    display:inline-block; padding:3px 10px; border-radius:999px; font-size:11px; font-weight:700;
  }
  .fin-badge.externa { background:rgba(167,139,250,0.15); color:#a78bfa; border:1px solid rgba(167,139,250,0.3); }
  .fin-badge.institucional { background:rgba(34,211,238,0.12); color:#22d3ee; border:1px solid rgba(34,211,238,0.3); }
  .fin-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .fin-form-group { display:flex; flex-direction:column; gap:6px; margin-bottom:14px; }
  .fin-label { font-size:12px; font-weight:600; color:var(--text-secondary); text-transform:uppercase; letter-spacing:.05em; }
  .fin-input {
    background:var(--bg-base); border:1px solid var(--border-subtle); border-radius:10px;
    padding:9px 14px; color:var(--text-primary); font-size:14px; outline:none;
    transition:border-color .18s;
  }
  .fin-input:focus { border-color:var(--accent-bright); }
  .fin-btn {
    padding:9px 22px; border-radius:10px; font-size:13px; font-weight:700;
    border:none; cursor:pointer; transition:all .18s;
  }
  .fin-btn.primary { background:var(--accent-bright); color:#fff; }
  .fin-btn.primary:hover { opacity:.88; }
  .fin-btn.secondary { background:var(--bg-elevated); color:var(--text-primary); border:1px solid var(--border-subtle); }
  .fin-btn.danger { background:rgba(239,68,68,.15); color:#ef4444; border:1px solid rgba(239,68,68,.3); }
  .fin-btn.success { background:rgba(16,185,129,.15); color:#10b981; border:1px solid rgba(16,185,129,.3); }
  .fin-select {
    background:var(--bg-elevated); border:1px solid var(--border-subtle); border-radius:10px;
    padding:9px 14px; color:var(--text-primary); font-size:14px;
    outline:none; cursor:pointer; min-width:200px;
  }
  .fin-table { width:100%; border-collapse:collapse; font-size:13px; }
  .fin-table th { background:var(--bg-base); padding:10px 14px; text-align:left; font-size:11px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:.06em; }
  .fin-table td { padding:12px 14px; border-bottom:1px solid var(--border-subtle); color:var(--text-primary); }
  .fin-table tr:last-child td { border-bottom:none; }
  .fin-table tr:hover td { background:var(--bg-elevated); }
  .fin-estado { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:999px; font-size:11px; font-weight:700; }
  .fin-estado.pendiente { background:rgba(245,158,11,.15); color:#f59e0b; }
  .fin-estado.en_revision { background:rgba(99,102,241,.15); color:#818cf8; }
  .fin-estado.aprobada { background:rgba(16,185,129,.15); color:#10b981; }
  .fin-estado.rechazada { background:rgba(239,68,68,.15); color:#ef4444; }
  .fin-alert {
    padding:14px 18px; border-radius:12px; margin-bottom:16px; font-size:13px; font-weight:500;
    background:rgba(245,158,11,.1); border:1px solid rgba(245,158,11,.3); color:#f59e0b;
  }
  @media(max-width:700px){ .fin-grid2 { grid-template-columns:1fr; } }
`

type Tab = 'conceptos' | 'cuotas' | 'pagos' | 'becas' | 'rendicion'

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
          <div className="fin-alert">No hay becas en el catálogo.</div>
        ) : (
          <div className="fin-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="fin-table">
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
                      <span className={`fin-badge ${b.fuente.es_externa ? 'externa' : 'institucional'}`}>
                        {b.fuente.nombre}
                      </span>
                    </td>
                    <td>
                      {/* Si fuente no editable → solo lectura informativa */}
                      {b.fuente.editable_porcentaje ? (
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {parseFloat(b.porcentaje_descuento)}%
                        </span>
                      ) : (
                        <span style={{ fontWeight: 700, color: '#a78bfa' }}>
                          {parseFloat(b.porcentaje_descuento)}% <span style={{ fontSize: 10, opacity: .7 }}>(fijo por convenio)</span>
                        </span>
                      )}
                    </td>
                    <td>{b.cupos_disponibles ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Postulaciones — requiere filtro por fuente */}
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
          Postulaciones Pendientes
        </h3>
        <div className="fin-alert" style={{ marginBottom: 12 }}>
          ⚠️ Seleccioná una fuente antes de ver postulaciones. Los flujos internos (Institucional) y externos (ITAIPU, BECAL) se revisan por separado.
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          {fuentes.map(f => (
            <button
              key={f.id}
              className={`fin-btn ${fuenteSeleccionada === f.id ? 'primary' : 'secondary'}`}
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
            <div className="fin-card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="fin-table">
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
                      <td><span className={`fin-estado ${p.estado}`}>{p.estado}</span></td>
                      <td>{new Date(p.fecha_postulacion).toLocaleDateString('es-PY')}</td>
                      <td>
                        {p.estado === 'pendiente' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="fin-btn success" onClick={() => revisar(p.id, 'aprobada')}>
                              ✓ Aprobar
                            </button>
                            <button className="fin-btn danger" onClick={() => revisar(p.id, 'rechazada')}>
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
    <div className="fin-card" style={{ maxWidth: 500 }}>
      <h3 style={{ fontWeight: 700, marginBottom: 18, fontSize: 15 }}>Exportar Rendición de Becas</h3>
      <div className="fin-form-group">
        <label className="fin-label">Fuente (obligatorio)</label>
        <select className="fin-select" value={fuente} onChange={e => setFuente(e.target.value)}>
          {fuentes.map(f => (
            <option key={f.id} value={f.nombre}>{f.nombre} {f.es_externa ? '(externa)' : '(inst.)'}</option>
          ))}
        </select>
      </div>
      <div className="fin-form-group">
        <label className="fin-label">Período (opcional, ej: 2026-06)</label>
        <input
          className="fin-input" type="text" placeholder="2026-06"
          value={periodo} onChange={e => setPeriodo(e.target.value)}
        />
      </div>
      <button className="fin-btn primary" onClick={descargar} disabled={!fuente || loading}>
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
      <div className="fin-card" style={{ maxWidth: 480, marginBottom: 20 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Nuevo Concepto de Arancel</h3>
        <div className="fin-form-group">
          <label className="fin-label">Nombre</label>
          <input className="fin-input" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Cuota Mensual Ingeniería" />
        </div>
        <div className="fin-grid2">
          <div className="fin-form-group">
            <label className="fin-label">Monto Base (Gs.)</label>
            <input className="fin-input" type="number" value={monto} onChange={e => setMonto(e.target.value)} placeholder="500000" />
          </div>
          <div className="fin-form-group">
            <label className="fin-label">Periodicidad</label>
            <select className="fin-select" value={periodicidad} onChange={e => setPeriodicidad(e.target.value)}>
              <option value="mensual">Mensual</option>
              <option value="semestral">Semestral</option>
              <option value="anual">Anual</option>
              <option value="unica">Única vez</option>
            </select>
          </div>
        </div>
        <button className="fin-btn primary" onClick={guardar} disabled={saving}>
          {saving ? 'Guardando…' : '+ Crear Concepto'}
        </button>
      </div>
      {conceptos.length > 0 && (
        <div className="fin-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="fin-table">
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

// ── Componente principal ──────────────────────────────────────────────
export default function Finanzas() {
  const [tab, setTab] = useState<Tab>('conceptos')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'conceptos', label: '📋 Conceptos' },
    { key: 'cuotas', label: '💳 Cuotas' },
    { key: 'pagos', label: '💰 Pagos' },
    { key: 'becas', label: '🎓 Becas' },
    { key: 'rendicion', label: '📊 Rendición' },
  ]

  return (
    <>
      <style>{css}</style>
      <div style={{ maxWidth: 1060, margin: '0 auto', padding: '28px 16px' }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 20, color: 'var(--text-primary)' }}>
          💼 Panel Financiero
        </div>
        <div className="fin-tabs">
          {tabs.map(t => (
            <button
              key={t.key}
              className={`fin-tab${tab === t.key ? ' active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="fin-section">
          {tab === 'conceptos' && <TabConceptos />}
          {tab === 'cuotas' && <div style={{ color: 'var(--text-secondary)' }}>Generación de cuotas por alumno disponible vía API. UI completa en Fase 4B.</div>}
          {tab === 'pagos' && <div style={{ color: 'var(--text-secondary)' }}>Registro de pagos disponible vía API. UI completa en Fase 4B.</div>}
          {tab === 'becas' && <TabBecas />}
          {tab === 'rendicion' && <TabRendicion />}
        </div>
      </div>
    </>
  )
}
