import { useState, useEffect, useMemo, useCallback } from 'react'
import { api, emitToast } from '../lib/api'
import {
  cerrarMateria, obtenerExpediente, obtenerRegularidad, obtenerPPA,
  type ExpedienteAlumnoOut, type RegularidadOut, type PPAOut,
} from '../services/expedienteService'

type Alumno = { id: number; username: string; nombre: string; carrera_id: number | null; carrera_nombre?: string; foto_url?: string | null }
type Carrera = { id: number; nombre: string }
type ExpMateriaRow = { id: number; alumno_id: number; materia_id: number; materia_nombre: string; periodo: string; nota_final: number; creditos: number; condicion: 'aprobada' | 'reprobada' }
type Inscripcion = { id: number; alumno_id: number; materia_id: number; oferta_materia_id: number }
type Materia = { id: number; nombre: string; codigo?: string; creditos?: number; anio?: number; semestre?: number }

const condicionBadge: Record<string, { bg: string; color: string }> = {
  aprobada: { bg: 'var(--success-subtle)', color: 'var(--success)' },
  reprobada: { bg: 'var(--danger-subtle)', color: 'var(--danger)' },
}

const regBadge: Record<string, { bg: string; color: string; label: string }> = {
  activo: { bg: 'var(--success-subtle)', color: 'var(--success)', label: 'Activo' },
  en_riesgo: { bg: 'var(--warning-subtle)', color: 'var(--warning)', label: 'En riesgo' },
  irregular: { bg: 'var(--danger-subtle)', color: 'var(--danger)', label: 'Irregular' },
  de_baja: { bg: 'rgba(148,163,184,0.12)', color: 'var(--text-secondary)', label: 'De baja' },
}

const css = `
  @keyframes shimmer { 0%,100%{opacity:.3} 50%{opacity:.7} }
  .ea-skeleton { background:rgba(255,255,255,0.06); border-radius:var(--radius-md); animation:shimmer 1.5s ease-in-out infinite; }
  .ea-student-row { display:flex; align-items:center; gap:12px; padding:12px 16px; border-bottom:1px solid var(--border-subtle); cursor:pointer; transition:background .12s; }
  .ea-student-row:hover { background:var(--bg-hover); }
  .ea-student-row:last-child { border-bottom:none; }
`

const PAGE_SIZE = 15

export default function ExpedienteAdmin() {
  const [selectedAlumnoId, setSelectedAlumnoId] = useState<number | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [busquedaDb, setBusquedaDb] = useState('')
  const [carreras, setCarreras] = useState<Carrera[]>([])
  const [filtroCarrera, setFiltroCarrera] = useState<number | null>(null)
  const [alumnos, setAlumnos] = useState<Alumno[]>([])
  const [totalAlumnos, setTotalAlumnos] = useState(0)
  const [page, setPage] = useState(1)
  const [loadingLista, setLoadingLista] = useState(true)

  // detail state
  const [alumno, setAlumno] = useState<Alumno | null>(null)
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([])
  const [materiasMap, setMateriasMap] = useState<Map<number, Materia>>(new Map())
  const [ofertaSeleccionada, setOfertaSeleccionada] = useState('')
  const [cerrando, setCerrando] = useState(false)
  const [expediente, setExpediente] = useState<ExpedienteAlumnoOut | null>(null)
  const [regularidad, setRegularidad] = useState<RegularidadOut | null>(null)
  const [ppa, setPpa] = useState<PPAOut | null>(null)
  const [loadingDetalle, setLoadingDetalle] = useState(false)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setBusquedaDb(busqueda), 300)
    return () => clearTimeout(t)
  }, [busqueda])

  useEffect(() => {
    api.get<Carrera[]>('/carreras/').then(setCarreras).catch(() => {})
  }, [])

  const cargarLista = useCallback(() => {
    setLoadingLista(true)
    const qs = new URLSearchParams({ role: 'alumno', limit: String(PAGE_SIZE), skip: String((page - 1) * PAGE_SIZE) })
    if (busquedaDb) qs.set('q', busquedaDb)
    if (filtroCarrera) qs.set('carrera_id', String(filtroCarrera))
    api.get<{ items: Alumno[]; total: number }>(`/users/?${qs}`)
      .then(res => { setAlumnos(res.items); setTotalAlumnos(res.total) })
      .catch(() => setAlumnos([]))
      .finally(() => setLoadingLista(false))
  }, [page, busquedaDb, filtroCarrera])

  useEffect(() => { cargarLista() }, [cargarLista])

  const totalPages = Math.max(1, Math.ceil(totalAlumnos / PAGE_SIZE))

  function seleccionarAlumno(a: Alumno) {
    setAlumno(a)
    setSelectedAlumnoId(a.id)
    setOfertaSeleccionada('')
  }

  function cargarDetalle() {
    if (!alumno) return
    setLoadingDetalle(true)
    Promise.all([
      api.get<Inscripcion[]>(`/inscripciones/?alumno_id=${alumno.id}`),
      alumno.carrera_id ? api.get<Materia[]>(`/materias/?carrera_id=${alumno.carrera_id}`) : Promise.resolve([] as Materia[]),
      obtenerExpediente(alumno.id),
      obtenerRegularidad(alumno.id),
      obtenerPPA(alumno.id),
    ])
      .then(([inscs, materias, exp, reg, p]) => {
        setInscripciones(inscs)
        setMateriasMap(new Map(materias.map(m => [m.id, m])))
        setExpediente(exp)
        setRegularidad(reg)
        setPpa(p)
      })
      .catch(() => {})
      .finally(() => setLoadingDetalle(false))
  }
  useEffect(cargarDetalle, [alumno])

  async function handleCerrarMateria() {
    if (!alumno || !ofertaSeleccionada) { emitToast('Seleccioná una materia', 'warning'); return }
    setCerrando(true)
    try {
      await cerrarMateria(alumno.id, Number(ofertaSeleccionada))
      emitToast('Materia cerrada en el expediente')
      setOfertaSeleccionada('')
      cargarDetalle()
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al cerrar materia', 'error')
    } finally { setCerrando(false) }
  }

  const rBadge = regularidad ? (regBadge[regularidad.estado] ?? regBadge.activo) : null

  const materiasPorPeriodo = useMemo(() => {
    if (!expediente) return new Map<string, ExpMateriaRow[]>()
    const map = new Map<string, ExpMateriaRow[]>()
    expediente.materias.forEach(m => {
      if (!map.has(m.periodo)) map.set(m.periodo, [])
      map.get(m.periodo)!.push(m)
    })
    return map
  }, [expediente])

  const stats = useMemo(() => {
    if (!expediente) return null
    const aprobadas = expediente.materias.filter(m => m.condicion === 'aprobada').length
    const reprobadas = expediente.materias.filter(m => m.condicion === 'reprobada').length
    const creditos = expediente.materias.filter(m => m.condicion === 'aprobada').reduce((s, m) => s + m.creditos, 0)
    return { total: expediente.materias.length, aprobadas, reprobadas, creditos }
  }, [expediente])

  const ofertaDetalle = useMemo(() => {
    if (!ofertaSeleccionada) return null
    const ins = inscripciones.find(i => i.oferta_materia_id === Number(ofertaSeleccionada))
    if (!ins) return null
    return materiasMap.get(ins.materia_id) ?? null
  }, [ofertaSeleccionada, inscripciones, materiasMap])

  return (
    <>
      <style>{css}</style>
      <div className="w-full">
        <header style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title" style={{ fontSize: 28 }}>Expediente Académico</h1>
            <p className="page-subtitle">
              {selectedAlumnoId
                ? `Expediente de ${alumno?.nombre || alumno?.username || '...'}`
                : 'Seleccioná un alumno para ver o cerrar su expediente.'}
            </p>
          </div>
        </header>

        {selectedAlumnoId === null ? (
          /* =================== LIST VIEW =================== */
          <>
            <div className="card" style={{ marginBottom: 16, padding: 18 }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="ga-search" style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                  <input value={busqueda}
                    onChange={e => { setBusqueda(e.target.value); setPage(1) }}
                    placeholder="Buscar alumno por nombre o cédula…"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: 'var(--bg-input)', border: '1px solid var(--border-subtle)',
                      borderRadius: 12, padding: '12px 16px 12px 44px',
                      color: 'var(--text-primary)', outline: 'none', fontSize: 14,
                      fontFamily: 'var(--font-sans)',
                    }} />
                  <i className="ti ti-search" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 20 }} />
                </div>
                <select className="input-uca" value={filtroCarrera ?? ''}
                  onChange={e => { setFiltroCarrera(e.target.value ? Number(e.target.value) : null); setPage(1) }}
                  style={{ minWidth: 180, fontSize: 13 }}>
                  <option value="">Todas las carreras</option>
                  {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            </div>

            {loadingLista ? (
              <div style={{ padding: 4 }}>
                {[1, 2, 3, 4, 5].map(i => <div key={i} className="ea-skeleton" style={{ height: 52, marginBottom: 6 }} />)}
              </div>
            ) : alumnos.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                <i className="ti ti-users" style={{ fontSize: 36, color: 'var(--text-muted)', marginBottom: 10, display: 'block' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
                  {busqueda ? 'No se encontraron alumnos con ese criterio.' : 'No hay alumnos registrados.'}
                </p>
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="mono-label" style={{ fontSize: 10 }}>{totalAlumnos} alumnos</span>
                  <span className="mono-label" style={{ fontSize: 10 }}>
                    Pág. {page} de {totalPages}
                  </span>
                </div>
                {alumnos.map(a => (
                  <div key={a.id} className="ea-student-row" onClick={() => seleccionarAlumno(a)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background .12s' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: 'linear-gradient(135deg, var(--accent), #1a2a4a)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 14,
                    }}>
                      <i className="ti ti-user" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)' }}>{a.nombre || 'Sin nombre'}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>
                        @{a.username}{a.carrera_nombre ? ` · ${a.carrera_nombre}` : ''}
                      </div>
                    </div>
                    <i className="ti ti-chevron-right" style={{ color: 'var(--text-muted)', fontSize: 18, flexShrink: 0 }} />
                  </div>
                ))}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      Mostrando {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, totalAlumnos)} de {totalAlumnos}
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-ghost" style={{ padding: '5px 12px', fontSize: 11 }}
                        disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
                      <button className="btn-ghost" style={{ padding: '5px 12px', fontSize: 11 }}
                        disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          /* =================== DETAIL VIEW =================== */
          <>
            <button onClick={() => { setSelectedAlumnoId(null); setAlumno(null); setExpediente(null) }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16,
                padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)',
              }}>
              <i className="ti ti-arrow-left" /> Volver a la lista
            </button>

            {loadingDetalle ? (
              <div style={{ padding: 4 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
                  {[1, 2, 3, 4].map(i => <div key={i} className="ea-skeleton" style={{ height: 72 }} />)}
                </div>
                <div className="ea-skeleton" style={{ height: 48, marginBottom: 16 }} />
                <div className="ea-skeleton" style={{ height: 200 }} />
              </div>
            ) : alumno && (
              <>
                {/* Student info + Cerrar */}
                <div className="card" style={{ marginBottom: 20, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                        background: 'linear-gradient(135deg, var(--accent), var(--bg-base))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 20,
                      }}>
                        <i className="ti ti-user" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 17 }}>{alumno.nombre || alumno.username}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          @{alumno.username} {alumno.carrera_nombre ? `· ${alumno.carrera_nombre}` : ''}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <select className="input-uca" value={ofertaSeleccionada}
                        onChange={e => setOfertaSeleccionada(e.target.value)} style={{ minWidth: 240 }}>
                        <option value="">Cerrar materia…</option>
                        {inscripciones.map(i => (
                          <option key={i.id} value={i.oferta_materia_id}>
                            {materiasMap.get(i.materia_id)?.codigo ? `${materiasMap.get(i.materia_id)!.codigo} — ` : ''}
                            {materiasMap.get(i.materia_id)?.nombre ?? `#${i.materia_id}`}
                          </option>
                        ))}
                      </select>
                      <button className="btn-primary" disabled={cerrando || !ofertaSeleccionada}
                        onClick={handleCerrarMateria} style={{ whiteSpace: 'nowrap' }}>
                        {cerrando ? 'Cerrando…' : 'Cerrar materia'}
                      </button>
                    </div>
                  </div>
                  {ofertaDetalle && (
                    <div style={{
                      marginTop: 12, padding: '10px 14px', background: 'var(--bg-elevated)',
                      borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12, fontSize: 12,
                      color: 'var(--text-secondary)',
                    }}>
                      <i className="ti ti-info-circle" style={{ color: 'var(--accent)' }} />
                      {ofertaDetalle.codigo && <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{ofertaDetalle.codigo}</span>}
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ofertaDetalle.nombre}</span>
                      {ofertaDetalle.creditos && <span>{ofertaDetalle.creditos} créd.</span>}
                      {ofertaDetalle.anio && <span style={{ fontFamily: 'var(--font-mono)' }}>{ofertaDetalle.anio}° · {ofertaDetalle.semestre}° Sem.</span>}
                    </div>
                  )}
                </div>

                {/* KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
                  <div className="kpi-card">
                    <div className="kpi-top"><span className="mono-label">PPA Acumulado</span></div>
                    <span className="kpi-value">{ppa?.ppa?.toFixed(2) ?? '—'}</span>
                    {ppa && <span className="kpi-unit">{ppa.creditos_computados} créd. computados</span>}
                  </div>
                  {rBadge && (
                    <div className="kpi-card">
                      <div className="kpi-top"><span className="mono-label">Regularidad</span></div>
                      <span className="badge" style={{ background: rBadge.bg, color: rBadge.color, fontSize: 13, fontWeight: 700 }}>{rBadge.label}</span>
                      {regularidad?.motivo && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>{regularidad.motivo}</div>}
                    </div>
                  )}
                  {stats && (
                    <>
                      <div className="kpi-card">
                        <div className="kpi-top"><span className="mono-label">Materias cursadas</span></div>
                        <span className="kpi-value">{stats.total}</span>
                        <span className="kpi-unit">{stats.aprobadas} aprob. · {stats.reprobadas} reprob.</span>
                      </div>
                      <div className="kpi-card">
                        <div className="kpi-top"><span className="mono-label">Créditos acumulados</span></div>
                        <span className="kpi-value">{stats.creditos}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Expediente */}
                {!expediente || expediente.materias.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>
                    <i className="ti ti-file-certificate" style={{ fontSize: 32, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }} />
                    Este alumno todavía no tiene materias cerradas en su expediente.
                  </div>
                ) : (
                  [...materiasPorPeriodo.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([periodo, materias]) => {
                    const sem = expediente.semestres.find(s => s.periodo === periodo)
                    return (
                      <div key={periodo} className="card" style={{ marginBottom: 14, padding: 0, overflow: 'hidden' }}>
                        <div style={{
                          padding: '12px 18px', borderBottom: '1px solid var(--border-subtle)',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          background: 'var(--bg-elevated)',
                        }}>
                          <span style={{ fontWeight: 800, fontSize: 13 }}>Período {periodo}</span>
                          {sem && (
                            <span className="mono-label" style={{ fontSize: 10 }}>
                              PPA <span style={{ fontWeight: 700, color: 'var(--accent-bright)' }}>{sem.ppa_periodo ?? '—'}</span>
                              {' · '}{sem.creditos_periodo} créd. · {sem.materias_aprobadas} aprob. / {sem.materias_reprobadas} reprob.
                            </span>
                          )}
                        </div>
                        {materias.sort((a, b) => a.materia_nombre.localeCompare(b.materia_nombre)).map(m => {
                          const b = condicionBadge[m.condicion] ?? condicionBadge.reprobada
                          return (
                            <div key={m.id} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '10px 18px', borderBottom: '1px solid var(--border-subtle)',
                            }}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>{m.materia_nombre}</div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <span className="mono-label" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{m.creditos} créd.</span>
                                <span style={{
                                  fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 15,
                                  color: m.condicion === 'aprobada' ? 'var(--success)' : 'var(--danger)',
                                }}>{m.nota_final}</span>
                                <span className="badge" style={{ background: b.bg, color: b.color }}>
                                  {m.condicion === 'aprobada' ? 'Aprobada' : 'Reprobada'}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })
                )}
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}
