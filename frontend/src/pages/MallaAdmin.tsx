import { useState, useEffect, useMemo } from 'react'
import { api, emitToast } from '../lib/api'
import {
  obtenerMallaCarrera, agregarMateriaAMalla, quitarMateriaDeMalla,
  obtenerCorrelatividades, crearCorrelatividad, eliminarCorrelatividad,
  type PensumMateriaOut, type CorrelatividadOut,
} from '../services/pensumService'

type Carrera = { id: number; nombre: string }
type Materia = { id: number; nombre: string }

const css = `
  .malla-semestre { margin-bottom: 20px; }
  .malla-materia-row { display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border-bottom:1px solid var(--border-subtle); }
  .malla-materia-row:last-child { border-bottom:none; }
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
  const [draftMateria, setDraftMateria] = useState({ materia_id: '', semestre: '1', creditos: '4', es_electiva: false })
  const [draftCorr, setDraftCorr] = useState({ materia_id: '', prerrequisito_id: '', tipo: 'aprobada' })

  useEffect(() => {
    api.get<Carrera[]>('/carreras/').then(cs => {
      setCarreras(cs)
      if (cs.length && carreraId === null) setCarreraId(cs[0].id)
    }).catch(() => {})
  }, [])

  function cargar() {
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
  }
  useEffect(cargar, [carreraId])

  const nombrePorMateria = useMemo(() => {
    const map = new Map<number, string>()
    malla.forEach(pm => map.set(pm.materia_id, pm.materia_nombre || `#${pm.materia_id}`))
    materiasCarrera.forEach(m => { if (!map.has(m.id)) map.set(m.id, m.nombre) })
    return map
  }, [malla, materiasCarrera])

  const materiasDisponibles = useMemo(() => {
    const enMalla = new Set(malla.map(pm => pm.materia_id))
    return materiasCarrera.filter(m => !enMalla.has(m.id))
  }, [malla, materiasCarrera])

  const semestres = useMemo(() => {
    const grupos = new Map<number, PensumMateriaOut[]>()
    malla.forEach(pm => {
      if (!grupos.has(pm.semestre)) grupos.set(pm.semestre, [])
      grupos.get(pm.semestre)!.push(pm)
    })
    return [...grupos.entries()].sort((a, b) => a[0] - b[0])
  }, [malla])

  function abrirModalMateria() {
    setDraftMateria({ materia_id: '', semestre: '1', creditos: '4', es_electiva: false })
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

  return (
    <>
      <style>{css}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Malla Curricular</h1>
          <p className="page-subtitle">Gestioná las materias por semestre y sus correlatividades.</p>
        </div>
        <select className="input-uca" style={{ maxWidth: 260 }} value={carreraId ?? ''} onChange={e => setCarreraId(Number(e.target.value))}>
          {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn-primary" onClick={abrirModalMateria}><i className="ti ti-plus" /> Agregar materia a la malla</button>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>Cargando…</div>
      ) : malla.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 14 }}>Esta carrera no tiene materias en la malla todavía.</p>
          <button className="btn-primary" onClick={abrirModalMateria}><i className="ti ti-plus" /> Agregar la primera materia</button>
        </div>
      ) : (
        semestres.map(([sem, materias]) => (
          <div key={sem} className="malla-semestre card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', fontWeight: 800, fontSize: 13 }}>
              Semestre {sem}
            </div>
            {materias.map(pm => (
              <div key={pm.id} className="malla-materia-row">
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{pm.materia_nombre}</div>
                  <div className="mono-label" style={{ fontSize: 9.5, marginTop: 2 }}>
                    {pm.creditos} créditos{pm.es_electiva ? ' · electiva' : ''}
                  </div>
                </div>
                <button className="btn-ghost" style={{ padding: '5px 10px', fontSize: 11, color: 'var(--danger)' }} onClick={() => setConfirmQuitar(pm.id)}>
                  <i className="ti ti-trash" />
                </button>
              </div>
            ))}
          </div>
        ))
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '24px 0 12px' }}>
        <h2 style={{ fontSize: 17, fontWeight: 800 }}>Correlatividades</h2>
        <button className="btn-primary" onClick={abrirModalCorr}><i className="ti ti-plus" /> Nueva correlatividad</button>
      </div>

      {correlatividades.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>
          Sin correlatividades definidas para esta carrera.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {correlatividades.map(c => (
            <div key={c.id} className="malla-materia-row">
              <div style={{ fontSize: 13 }}>
                <b>{nombrePorMateria.get(c.materia_id) ?? `#${c.materia_id}`}</b> exige {c.tipo === 'aprobada' ? 'aprobada' : 'cursando'}{' '}
                <b>{nombrePorMateria.get(c.prerrequisito_id) ?? `#${c.prerrequisito_id}`}</b>
              </div>
              <button className="btn-ghost" style={{ padding: '5px 10px', fontSize: 11, color: 'var(--danger)' }} onClick={() => setConfirmCorr(c.id)}>
                <i className="ti ti-trash" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal agregar materia */}
      {modalMateria && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card card-elevated" style={{ width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>Agregar materia a la malla</h3>
              <button onClick={() => setModalMateria(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><i className="ti ti-x" /></button>
            </div>
            <div className="mono-label" style={{ marginBottom: 6 }}>Materia</div>
            <select className="input-uca" value={draftMateria.materia_id} onChange={e => setDraftMateria(d => ({ ...d, materia_id: e.target.value }))} style={{ marginBottom: 12 }}>
              <option value="">Seleccionar…</option>
              {materiasDisponibles.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
            <div className="mono-label" style={{ marginBottom: 6 }}>Semestre</div>
            <input className="input-uca" type="number" min={1} value={draftMateria.semestre} onChange={e => setDraftMateria(d => ({ ...d, semestre: e.target.value }))} style={{ marginBottom: 12 }} />
            <div className="mono-label" style={{ marginBottom: 6 }}>Créditos</div>
            <input className="input-uca" type="number" min={1} value={draftMateria.creditos} onChange={e => setDraftMateria(d => ({ ...d, creditos: e.target.value }))} style={{ marginBottom: 12 }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 18, cursor: 'pointer' }}>
              <input type="checkbox" checked={draftMateria.es_electiva} onChange={e => setDraftMateria(d => ({ ...d, es_electiva: e.target.checked }))} style={{ accentColor: 'var(--accent)' }} />
              Electiva
            </label>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setModalMateria(false)}>Cancelar</button>
              <button className="btn-primary" disabled={saving} onClick={guardarMateria}>{saving ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nueva correlatividad */}
      {modalCorr && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card card-elevated" style={{ width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>Nueva correlatividad</h3>
              <button onClick={() => setModalCorr(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><i className="ti ti-x" /></button>
            </div>
            <div className="mono-label" style={{ marginBottom: 6 }}>Materia</div>
            <select className="input-uca" value={draftCorr.materia_id} onChange={e => setDraftCorr(d => ({ ...d, materia_id: e.target.value }))} style={{ marginBottom: 12 }}>
              <option value="">Seleccionar…</option>
              {malla.map(pm => <option key={pm.materia_id} value={pm.materia_id}>{pm.materia_nombre}</option>)}
            </select>
            <div className="mono-label" style={{ marginBottom: 6 }}>Exige (prerrequisito)</div>
            <select className="input-uca" value={draftCorr.prerrequisito_id} onChange={e => setDraftCorr(d => ({ ...d, prerrequisito_id: e.target.value }))} style={{ marginBottom: 12 }}>
              <option value="">Seleccionar…</option>
              {malla.filter(pm => String(pm.materia_id) !== draftCorr.materia_id).map(pm => <option key={pm.materia_id} value={pm.materia_id}>{pm.materia_nombre}</option>)}
            </select>
            <div className="mono-label" style={{ marginBottom: 6 }}>Tipo</div>
            <select className="input-uca" value={draftCorr.tipo} onChange={e => setDraftCorr(d => ({ ...d, tipo: e.target.value }))} style={{ marginBottom: 18 }}>
              <option value="aprobada">Aprobada</option>
              <option value="cursando">Cursando</option>
            </select>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setModalCorr(false)}>Cancelar</button>
              <button className="btn-primary" disabled={saving} onClick={guardarCorr}>{saving ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar quitar materia */}
      {confirmQuitar !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card card-elevated" style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 34, color: 'var(--danger)' }} />
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: '10px 0 6px' }}>¿Quitar materia de la malla?</h3>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn-ghost" onClick={() => setConfirmQuitar(null)}>Cancelar</button>
              <button className="btn-primary" style={{ background: 'var(--danger)' }} onClick={quitarMateria}>Quitar</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar quitar correlatividad */}
      {confirmCorr !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card card-elevated" style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 34, color: 'var(--danger)' }} />
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: '10px 0 6px' }}>¿Eliminar correlatividad?</h3>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn-ghost" onClick={() => setConfirmCorr(null)}>Cancelar</button>
              <button className="btn-primary" style={{ background: 'var(--danger)' }} onClick={quitarCorr}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
