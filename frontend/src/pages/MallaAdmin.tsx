import { useState, useEffect, useMemo, useCallback } from 'react'
import { api, emitToast } from '../lib/api'
import {
  obtenerMallaCarrera, agregarMateriaAMalla, quitarMateriaDeMalla,
  obtenerCorrelatividades, crearCorrelatividad, eliminarCorrelatividad,
  actualizarPensumMateria,
  type PensumMateriaOut, type CorrelatividadOut,
} from '../services/pensumService'

type Carrera = { id: number; nombre: string; creditos_totales?: number; duracion_semestres?: number }
type Materia = { id: number; nombre: string; codigo?: string; anio?: number; semestre?: number; creditos?: number }

const css = `
  .ma-search { position:relative; }
  .ma-search input {
    width:100%; box-sizing:border-box;
    background:var(--bg-input); border:1px solid var(--border-subtle);
    border-radius:12px; padding:12px 16px 12px 44px;
    color:var(--text-primary); outline:none; font-size:14px;
    transition:border-color 0.2s; font-family:var(--font-sans);
  }
  .ma-search input:focus { border-color:var(--accent); }
  .ma-search input::placeholder { color:var(--text-muted); }
  .ma-search .ma-icon {
    position:absolute; left:14px; top:50%; transform:translateY(-50%);
    color:var(--text-muted); font-size:20px;
  }
  .ma-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:10px; }
  .ma-card {
    background:var(--bg-surface); border:1px solid var(--border-subtle);
    border-radius:12px; padding:14px; transition:all .15s;
    border-left:4px solid var(--accent);
  }
  .ma-card.electiva { border-left-color:var(--info); }
  .ma-card { position:relative; }
  .ma-card:hover { border-color:var(--accent-hover); background:var(--bg-elevated); }
  .ma-card:hover .ma-card-btn { opacity:1 !important; }
  .ma-stat-card {
    background:var(--bg-surface); border:1px solid var(--border-subtle);
    border-radius:var(--radius); padding:16px;
    border-left:4px solid var(--accent);
  }
  .ma-skeleton { background:rgba(255,255,255,0.06); border-radius:var(--radius-md); animation:shimmer 1.5s ease-in-out infinite; }
  @keyframes shimmer { 0%,100%{opacity:.3} 50%{opacity:.7} }
  .spinning { animation:spin 1s linear infinite; display:inline-block; }
  @keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
  @media(max-width:700px){
    .ma-grid { grid-template-columns:1fr 1fr; }
  }
`

export default function MallaAdmin() {
  const [carreras, setCarreras] = useState<Carrera[]>([])
  const [carreraId, setCarreraId] = useState<number | null>(null)
  const [malla, setMalla] = useState<PensumMateriaOut[]>([])
  const [correlatividades, setCorrelatividades] = useState<CorrelatividadOut[]>([])
  const [materiasCarrera, setMateriasCarrera] = useState<Materia[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmQuitar, setConfirmQuitar] = useState<number | null>(null)
  const [confirmCorr, setConfirmCorr] = useState<number | null>(null)
  const [modalMateria, setModalMateria] = useState(false)
  const [modalCorr, setModalCorr] = useState(false)
  const [saving, setSaving] = useState(false)
  const [subjectFilter, setSubjectFilter] = useState('')
  const [draftMateria, setDraftMateria] = useState({ materia_id: '', semestre: '1', creditos: '4', es_electiva: false })
  const [draftCorr, setDraftCorr] = useState({ materia_id: '', prerrequisito_id: '', tipo: 'aprobada' })
  const [editPensumId, setEditPensumId] = useState<number | null>(null)
  const [draftEdit, setDraftEdit] = useState({ semestre: 1, creditos: 4, es_electiva: false })

  useEffect(() => {
    api.get<Carrera[]>('/carreras/').then(cs => {
      setCarreras(cs)
      if (cs.length && carreraId === null) setCarreraId(cs[0].id)
    }).catch(() => {})
  }, [])

  const cargar = useCallback(() => {
    if (carreraId === null) return
    setLoading(true)
    Promise.all([
      obtenerMallaCarrera(carreraId),
      obtenerCorrelatividades(carreraId),
      api.get<Materia[]>(`/materias/?carrera_id=${carreraId}`),
    ])
      .then(([m, c, mats]) => { setMalla(m); setCorrelatividades(c); setMateriasCarrera(mats) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [carreraId])
  useEffect(cargar, [cargar])

  const nombrePorMateria = useMemo(() => {
    const map = new Map<number, string>()
    malla.forEach(pm => map.set(pm.materia_id, pm.materia_nombre || `#${pm.materia_id}`))
    materiasCarrera.forEach(m => { if (!map.has(m.id)) map.set(m.id, m.nombre) })
    return map
  }, [malla, materiasCarrera])

  const codigoPorMateria = useMemo(() => {
    const map = new Map<number, string>()
    malla.forEach(pm => { if (pm.materia_codigo) map.set(pm.materia_id, pm.materia_codigo) })
    materiasCarrera.forEach(m => { if (m.codigo && !map.has(m.id)) map.set(m.id, m.codigo) })
    return map
  }, [malla, materiasCarrera])

  const materiasDisponibles = useMemo(() => {
    const enMalla = new Set(malla.map(pm => pm.materia_id))
    return materiasCarrera.filter(m => !enMalla.has(m.id))
  }, [malla, materiasCarrera])

  const carreraActual = carreras.find(c => c.id === carreraId)

  const stats = useMemo(() => {
    const total = malla.length
    const creditos = malla.reduce((s, pm) => s + pm.creditos, 0)
    const electivas = malla.filter(pm => pm.es_electiva).length
    const semestres = new Set(malla.map(pm => pm.semestre)).size
    return { total, creditos, electivas, semestres, obligatorias: total - electivas }
  }, [malla])

  const semestres = useMemo(() => {
    const grupos = new Map<number, PensumMateriaOut[]>()
    malla.forEach(pm => {
      if (!grupos.has(pm.semestre)) grupos.set(pm.semestre, [])
      grupos.get(pm.semestre)!.push(pm)
    })
    return [...grupos.entries()].sort((a, b) => a[0] - b[0])
  }, [malla])

  function abrirModalMateria() {
    setDraftMateria({ materia_id: '', semestre: String(Math.max(1, semestres.length + 1)), creditos: '4', es_electiva: false })
    setModalMateria(true)
  }

  async function guardarMateria() {
    if (carreraId === null || !draftMateria.materia_id) { emitToast('Seleccioná una materia', 'warning'); return }
    setSaving(true)
    try {
      await agregarMateriaAMalla(carreraId, {
        materia_id: Number(draftMateria.materia_id),
        semestre: Number(draftMateria.semestre),
        creditos: Number(draftMateria.creditos),
        es_electiva: draftMateria.es_electiva,
      })
      emitToast('Materia agregada a la malla')
      setModalMateria(false)
      cargar()
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al agregar materia', 'error')
    } finally { setSaving(false) }
  }

  async function quitarMateria() {
    if (carreraId === null || confirmQuitar === null) return
    try {
      await quitarMateriaDeMalla(carreraId, confirmQuitar)
      emitToast('Materia quitada de la malla')
      setConfirmQuitar(null)
      cargar()
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al quitar materia', 'error')
    }
  }

  function abrirModalCorr() {
    setDraftCorr({ materia_id: '', prerrequisito_id: '', tipo: 'aprobada' })
    setModalCorr(true)
  }

  async function guardarCorr() {
    if (!draftCorr.materia_id || !draftCorr.prerrequisito_id) { emitToast('Completá ambas materias', 'warning'); return }
    if (draftCorr.materia_id === draftCorr.prerrequisito_id) { emitToast('Una materia no puede ser prerrequisito de sí misma', 'warning'); return }
    setSaving(true)
    try {
      await crearCorrelatividad({
        materia_id: Number(draftCorr.materia_id),
        prerrequisito_id: Number(draftCorr.prerrequisito_id),
        tipo: draftCorr.tipo,
      })
      emitToast('Correlatividad creada')
      setModalCorr(false)
      cargar()
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al crear correlatividad', 'error')
    } finally { setSaving(false) }
  }

  async function quitarCorr() {
    if (confirmCorr === null) return
    try {
      await eliminarCorrelatividad(confirmCorr)
      emitToast('Correlatividad eliminada')
      setConfirmCorr(null)
      cargar()
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al eliminar correlatividad', 'error')
    }
  }

  function openEdit(pm: PensumMateriaOut) {
    setDraftEdit({ semestre: pm.semestre, creditos: pm.creditos, es_electiva: pm.es_electiva })
    setEditPensumId(pm.id)
  }

  async function saveEdit() {
    if (editPensumId === null) return
    setSaving(true)
    try {
      await actualizarPensumMateria(editPensumId, {
        semestre: draftEdit.semestre,
        creditos: draftEdit.creditos,
        es_electiva: draftEdit.es_electiva,
      })
      emitToast('Materia actualizada en la malla')
      setEditPensumId(null)
      cargar()
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al editar', 'error')
    } finally { setSaving(false) }
  }

  const filteredMalla = useMemo(() => {
    if (!subjectFilter) return malla
    const q = subjectFilter.toLowerCase()
    return malla.filter(pm =>
      (pm.materia_nombre?.toLowerCase() || '').includes(q) ||
      (pm.materia_codigo?.toLowerCase() || '').includes(q)
    )
  }, [malla, subjectFilter])

  const filteredSemestres = useMemo(() => {
    const grupos = new Map<number, PensumMateriaOut[]>()
    filteredMalla.forEach(pm => {
      if (!grupos.has(pm.semestre)) grupos.set(pm.semestre, [])
      grupos.get(pm.semestre)!.push(pm)
    })
    return [...grupos.entries()].sort((a, b) => a[0] - b[0])
  }, [filteredMalla])

  return (
    <>
      <style>{css}</style>
      <div className="w-full">
        <header style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title" style={{ fontSize: 28 }}>Malla Curricular</h1>
            <p className="page-subtitle">Materias por semestre, créditos y correlatividades de cada carrera.</p>
          </div>
          <select className="input-uca" style={{ maxWidth: 280, fontSize: 14, fontWeight: 600 }}
            value={carreraId ?? ''} onChange={e => { setCarreraId(Number(e.target.value)); setSubjectFilter('') }}>
            {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </header>

        {/* Stats */}
        {!loading && stats.total > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 20 }}>
            <div className="ma-stat-card" style={{ borderLeftColor: 'var(--accent)' }}>
              <p className="mono-label" style={{ marginBottom: 4 }}>Materias</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700 }}>{stats.total}</p>
              <div className="mono-label" style={{ fontSize: 10 }}>{stats.semestres} semestres</div>
            </div>
            <div className="ma-stat-card" style={{ borderLeftColor: 'var(--info)' }}>
              <p className="mono-label" style={{ marginBottom: 4 }}>Créditos totales</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700 }}>{stats.creditos}</p>
              <div className="mono-label" style={{ fontSize: 10 }}>
                {carreraActual?.creditos_totales ? `meta: ${carreraActual.creditos_totales}` : ''}
              </div>
            </div>
            <div className="ma-stat-card" style={{ borderLeftColor: 'var(--success)' }}>
              <p className="mono-label" style={{ marginBottom: 4 }}>Obligatorias</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700 }}>{stats.obligatorias}</p>
            </div>
            <div className="ma-stat-card" style={{ borderLeftColor: '#fbbf24' }}>
              <p className="mono-label" style={{ marginBottom: 4 }}>Electivas</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700 }}>{stats.electivas}</p>
              <div className="mono-label" style={{ fontSize: 10 }}>
                {stats.total > 0 ? `${Math.round(stats.electivas / stats.total * 100)}%` : ''}
              </div>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div className="ma-search" style={{ flex: 1, minWidth: 180, maxWidth: 320 }}>
            <input value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}
              placeholder="Buscar materia o código..." />
            <i className="ti ti-search ma-icon" />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-primary" onClick={abrirModalMateria}>
              <i className="ti ti-plus" /> Materia
            </button>
            <button className="btn-ghost" onClick={abrirModalCorr} style={{ border: '1px solid var(--border-subtle)' }}>
              <i className="ti ti-link" /> Correlatividad
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div style={{ padding: 4 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
              {[1, 2, 3, 4].map(i => <div key={i} className="ma-skeleton" style={{ height: 72 }} />)}
            </div>
            {[1, 2, 3].map(s => (
              <div key={s} style={{ marginBottom: 20 }}>
                <div className="ma-skeleton" style={{ height: 22, width: 200, marginBottom: 10 }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                  {[1, 2, 3].map(i => <div key={i} className="ma-skeleton" style={{ height: 80 }} />)}
                </div>
              </div>
            ))}
          </div>
        ) : malla.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <i className="ti ti-books" style={{ fontSize: 36, color: 'var(--text-muted)', marginBottom: 12, display: 'block' }} />
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: 15 }}>
              Esta carrera no tiene materias en la malla todavía.
            </p>
            <button className="btn-primary" onClick={abrirModalMateria}>
              <i className="ti ti-plus" /> Agregar primera materia
            </button>
          </div>
        ) : filteredSemestres.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
            Ninguna materia coincide con el filtro.
          </div>
        ) : (
          filteredSemestres.map(([sem, materias]) => {
            const credSem = materias.reduce((s, pm) => s + pm.creditos, 0)
            const electSem = materias.filter(pm => pm.es_electiva).length
            return (
              <div key={sem} style={{ marginBottom: 22 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  marginBottom: 10, padding: '0 4px',
                }}>
                  <h2 style={{ fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 26, height: 26, borderRadius: 8,
                      background: 'var(--accent-muted)', color: 'var(--accent-bright)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 800,
                    }}>{sem}</span>
                    Semestre {sem}
                  </h2>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {materias.length} materias · {credSem} créditos
                    {electSem > 0 && ` · ${electSem} electiva(s)`}
                  </div>
                </div>
                <div className="ma-grid">
                  {materias.map(pm => {
                    const codigo = pm.materia_codigo || codigoPorMateria.get(pm.materia_id)
                    const prereqs = correlatividades.filter(c => c.materia_id === pm.materia_id)
                    return (
                      <div key={pm.id} className={`ma-card${pm.es_electiva ? ' electiva' : ''}`}>
                        {codigo && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: .5, display: 'block', marginBottom: 3 }}>
                            {codigo}
                          </span>
                        )}
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.3 }}>
                          {pm.materia_nombre}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          <span className="badge" style={{
                            background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
                            fontSize: 9, fontWeight: 700,
                          }}>
                            <i className="ti ti-star" style={{ fontSize: 9, marginRight: 3 }} />
                            {pm.creditos} créd.
                          </span>
                          {pm.es_electiva && (
                            <span className="badge" style={{
                              background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
                              fontSize: 9, fontWeight: 700,
                            }}>
                              Electiva
                            </span>
                          )}
                        </div>
                        {prereqs.length > 0 && (
                          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                            <i className="ti ti-corner-down-right" style={{ fontSize: 10, marginRight: 3 }} />
                            Requiere: {prereqs.map(c => nombrePorMateria.get(c.prerrequisito_id) || `#${c.prerrequisito_id}`).join(', ')}
                          </div>
                        )}
                        <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 2 }}>
                          <button onClick={() => openEdit(pm)}
                            className="ma-card-btn"
                            title="Editar semestre/créditos"
                            style={{
                              width: 24, height: 24, borderRadius: 5,
                              background: 'transparent', border: 'none',
                              cursor: 'pointer', color: 'var(--text-muted)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 12, opacity: 0, transition: 'opacity .15s',
                            }}>
                            <i className="ti ti-pencil" />
                          </button>
                          <button onClick={() => setConfirmQuitar(pm.id)}
                            className="ma-card-btn"
                            title="Quitar de la malla"
                            style={{
                              width: 24, height: 24, borderRadius: 5,
                              background: 'transparent', border: 'none',
                              cursor: 'pointer', color: 'var(--text-muted)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 14, opacity: 0, transition: 'opacity .15s',
                            }}>
                            <i className="ti ti-x" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}

        {/* Correlatividades */}
        <div style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="ti ti-link" style={{ color: 'var(--accent)' }} />
              Correlatividades
              <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontSize: 10 }}>
                {correlatividades.length}
              </span>
            </h2>
            <button className="btn-ghost" onClick={abrirModalCorr} style={{ border: '1px solid var(--border-subtle)' }}>
              <i className="ti ti-plus" /> Nueva
            </button>
          </div>

          {correlatividades.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 24 }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                Sin correlatividades definidas para esta carrera.
              </p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 'var(--radius)' }}>
              <table className="table-uca" style={{ border: 'none' }}>
                <thead>
                  <tr>
                    <th>Materia</th>
                    <th>Exige</th>
                    <th>Prerrequisito</th>
                    <th style={{ textAlign: 'right' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {correlatividades.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600, fontSize: 13 }}>
                        <span style={{
                          display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                          background: 'var(--accent)', marginRight: 8, verticalAlign: 'middle',
                        }} />
                        {nombrePorMateria.get(c.materia_id) ?? `#${c.materia_id}`}
                      </td>
                      <td>
                        <span className="badge" style={{
                          background: c.tipo === 'aprobada' ? 'var(--success-subtle)' : 'var(--accent-muted)',
                          color: c.tipo === 'aprobada' ? 'var(--success)' : 'var(--accent-bright)',
                          fontSize: 10, fontWeight: 600,
                        }}>
                          {c.tipo === 'aprobada' ? 'Aprobada' : 'Cursando'}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {nombrePorMateria.get(c.prerrequisito_id) ?? `#${c.prerrequisito_id}`}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn-ghost" style={{ padding: '5px 10px', fontSize: 11, color: 'var(--danger)' }}
                          onClick={() => setConfirmCorr(c.id)}>
                          <i className="ti ti-trash" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal agregar materia */}
      {modalMateria && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)',
          zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div className="card card-elevated" style={{ width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-plus" style={{ color: 'var(--accent)' }} />
                Agregar materia a la malla
              </h3>
              <button onClick={() => setModalMateria(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>
                <i className="ti ti-x" />
              </button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <p className="mono-label" style={{ marginBottom: 6 }}>Materia</p>
              <select className="input-uca" value={draftMateria.materia_id}
                onChange={e => {
                  const m = materiasDisponibles.find(x => x.id === Number(e.target.value))
                  setDraftMateria(d => ({
                    ...d, materia_id: e.target.value,
                    creditos: m?.creditos ? String(m.creditos) : d.creditos,
                    semestre: m?.semestre ? String(m.semestre) : d.semestre,
                  }))
                }} style={{ marginBottom: 12 }}>
                <option value="">Seleccionar materia…</option>
                {materiasDisponibles.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.codigo ? `${m.codigo} — ` : ''}{m.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <p className="mono-label" style={{ marginBottom: 6 }}>Semestre</p>
                <input className="input-uca" type="number" min={1} max={12} value={draftMateria.semestre}
                  onChange={e => setDraftMateria(d => ({ ...d, semestre: e.target.value }))} />
              </div>
              <div>
                <p className="mono-label" style={{ marginBottom: 6 }}>Créditos</p>
                <input className="input-uca" type="number" min={1} max={20} value={draftMateria.creditos}
                  onChange={e => setDraftMateria(d => ({ ...d, creditos: e.target.value }))} />
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 20, cursor: 'pointer' }}>
              <input type="checkbox" checked={draftMateria.es_electiva}
                onChange={e => setDraftMateria(d => ({ ...d, es_electiva: e.target.checked }))}
                style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
              Materia electiva
            </label>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
              <button className="btn-ghost" onClick={() => setModalMateria(false)}>Cancelar</button>
              <button className="btn-primary" disabled={saving || !draftMateria.materia_id} onClick={guardarMateria}>
                {saving ? 'Guardando…' : 'Agregar a la malla'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nueva correlatividad */}
      {modalCorr && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)',
          zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div className="card card-elevated" style={{ width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-link" style={{ color: 'var(--accent)' }} />
                Nueva correlatividad
              </h3>
              <button onClick={() => setModalCorr(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>
                <i className="ti ti-x" />
              </button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <p className="mono-label" style={{ marginBottom: 6 }}>Materia (la que tiene el requisito)</p>
              <select className="input-uca" value={draftCorr.materia_id}
                onChange={e => setDraftCorr(d => ({ ...d, materia_id: e.target.value }))} style={{ marginBottom: 12 }}>
                <option value="">Seleccionar materia…</option>
                {malla.map(pm => (
                  <option key={pm.materia_id} value={pm.materia_id}>
                    {pm.materia_codigo ? `${pm.materia_codigo} — ` : ''}{pm.materia_nombre}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <p className="mono-label" style={{ marginBottom: 6 }}>Prerrequisito (materia exigida)</p>
              <select className="input-uca" value={draftCorr.prerrequisito_id}
                onChange={e => setDraftCorr(d => ({ ...d, prerrequisito_id: e.target.value }))} style={{ marginBottom: 12 }}>
                <option value="">Seleccionar materia…</option>
                {malla.filter(pm => String(pm.materia_id) !== draftCorr.materia_id).map(pm => (
                  <option key={pm.materia_id} value={pm.materia_id}>
                    {pm.materia_codigo ? `${pm.materia_codigo} — ` : ''}{pm.materia_nombre}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 18 }}>
              <p className="mono-label" style={{ marginBottom: 6 }}>Tipo de requisito</p>
              <select className="input-uca" value={draftCorr.tipo}
                onChange={e => setDraftCorr(d => ({ ...d, tipo: e.target.value }))}>
                <option value="aprobada">Debe estar aprobada</option>
                <option value="cursando">Debe estar cursando</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
              <button className="btn-ghost" onClick={() => setModalCorr(false)}>Cancelar</button>
              <button className="btn-primary" disabled={saving || !draftCorr.materia_id || !draftCorr.prerrequisito_id} onClick={guardarCorr}>
                {saving ? 'Guardando…' : 'Crear correlatividad'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar quitar materia */}
      {confirmQuitar !== null && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)',
          zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div className="card card-elevated" style={{ width: '100%', maxWidth: 380, textAlign: 'center', padding: 28 }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 34, color: 'var(--danger)', marginBottom: 10 }} />
            <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 4px' }}>¿Quitar materia de la malla?</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 18 }}>
              Se eliminará la materia del pensum de esta carrera.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn-ghost" onClick={() => setConfirmQuitar(null)}>Cancelar</button>
              <button className="btn-primary" style={{ background: 'var(--danger)' }} onClick={quitarMateria}>Quitar</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar quitar correlatividad */}
      {confirmCorr !== null && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)',
          zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div className="card card-elevated" style={{ width: '100%', maxWidth: 380, textAlign: 'center', padding: 28 }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 34, color: 'var(--danger)', marginBottom: 10 }} />
            <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 4px' }}>¿Eliminar correlatividad?</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 18 }}>
              Se eliminará la regla de correlatividad entre ambas materias.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn-ghost" onClick={() => setConfirmCorr(null)}>Cancelar</button>
              <button className="btn-primary" style={{ background: 'var(--danger)' }} onClick={quitarCorr}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar pensum_materia */}
      {editPensumId !== null && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)',
          zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div className="card card-elevated" style={{ width: '100%', maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-pencil" style={{ color: 'var(--accent)' }} />
                Editar en la malla
              </h3>
              <button onClick={() => setEditPensumId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>
                <i className="ti ti-x" />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <p className="mono-label" style={{ marginBottom: 6 }}>Semestre</p>
                <input className="input-uca" type="number" min={1} max={12} value={draftEdit.semestre}
                  onChange={e => setDraftEdit(d => ({ ...d, semestre: Number(e.target.value) }))} />
              </div>
              <div>
                <p className="mono-label" style={{ marginBottom: 6 }}>Créditos</p>
                <input className="input-uca" type="number" min={1} max={20} value={draftEdit.creditos}
                  onChange={e => setDraftEdit(d => ({ ...d, creditos: Number(e.target.value) }))} />
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 20, cursor: 'pointer' }}>
              <input type="checkbox" checked={draftEdit.es_electiva}
                onChange={e => setDraftEdit(d => ({ ...d, es_electiva: e.target.checked }))}
                style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
              Materia electiva
            </label>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
              <button className="btn-ghost" onClick={() => setEditPensumId(null)}>Cancelar</button>
              <button className="btn-primary" disabled={saving} onClick={saveEdit}>
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
