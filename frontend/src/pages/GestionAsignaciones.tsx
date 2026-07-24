import { useState, useEffect, useCallback } from 'react'
import { emitToast } from '../lib/api'
import {
  obtenerStatsMaterias, listarMaterias, listarProfesores,
  asignarProfesor, crearOferta,
  type MateriaStats, type MateriaApi, type UserApi,
} from '../services/asignacionesService'
import ProfessorDetailModal from '../components/ProfessorDetailModal'

type Subject = {
  id: number; name: string; professor: string | null; professorId: number | null;
  carrera: string; anio: number | null; semestre: number | null; carreraNombre: string | null;
}
type CareerGroup = { name: string; count: number; subjects: Subject[] }
type Prof = {
  id: number; name: string; email: string; initials: string;
  load: number; materias: string[]; carreras: string[];
}

const css = `
  .ga-search { position:relative; }
  .ga-search input {
    width:100%; box-sizing:border-box;
    background:var(--bg-input); border:1px solid var(--border-subtle);
    border-radius:12px; padding:12px 16px 12px 44px;
    color:var(--text-primary); outline:none; font-size:14px;
    transition:border-color 0.2s; font-family:var(--font-sans);
  }
  .ga-search input:focus { border-color:var(--accent); }
  .ga-search input::placeholder { color:var(--text-muted); }
  .ga-search .ga-icon {
    position:absolute; left:14px; top:50%; transform:translateY(-50%);
    color:var(--text-muted); font-size:20px;
  }
  .ga-section {
    background:var(--bg-surface); border:1px solid var(--border-subtle);
    border-radius:var(--radius); padding:24px;
  }
  .ga-subject-item {
    display:flex; justify-content:space-between; align-items:center;
    padding:14px 16px; border-radius:8px; cursor:pointer;
    border-left:4px solid transparent;
    transition:all 0.2s;
  }
  .ga-subject-item.selected {
    background:var(--accent-muted);
    border-left-color:var(--accent);
  }
  .ga-subject-item:hover { background:var(--bg-hover); }
  .ga-subject-item.sin-prof { border-left-color:var(--warning); }
  .ga-stat-card {
    background:var(--bg-surface); border:1px solid var(--border-subtle);
    border-radius:var(--radius); padding:16px;
    border-left:4px solid var(--accent);
  }
  .ga-prof-row { cursor:pointer; border-left:4px solid transparent; transition:all 0.2s; }
  .ga-prof-row:hover { background:var(--bg-hover); }
  .ga-prof-row.selected { background:var(--accent-muted); border-left-color:var(--accent); }
  .ga-skeleton { background:rgba(255,255,255,0.06); border-radius:var(--radius-md); animation:shimmer 1.5s ease-in-out infinite; }
  @keyframes shimmer { 0%,100%{opacity:.3} 50%{opacity:.7} }
  .spinning { animation:spin 1s linear infinite; display:inline-block; }
  @keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
  @media(max-width:900px){
    .ga-grid { grid-template-columns:1fr !important; }
  }
`

const PERIODO_ACTUAL = `${new Date().getFullYear()}-${new Date().getMonth() < 6 ? '1' : '2'}`

export default function GestionAsignaciones() {
  const [materias, setMaterias] = useState<MateriaApi[]>([])
  const [profesores, setProfesores] = useState<UserApi[]>([])
  const [stats, setStats] = useState<MateriaStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [openCareers, setOpenCareers] = useState<Record<string, boolean>>({})
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null)
  const [subjectSearch, setSubjectSearch] = useState('')
  const [profSearch, setProfSearch] = useState('')
  const [asignando, setAsignando] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [refreshing, setRefreshing] = useState(false)
  const [showSinProf, setShowSinProf] = useState(false)
  const [profPage, setProfPage] = useState(1)
  const [detailUserId, setDetailUserId] = useState<number | null>(null)
  const PROF_PAGE_SIZE = 10

  const cargarTodo = useCallback(async () => {
    try {
      const [mats, users, s] = await Promise.all([
        listarMaterias(),
        listarProfesores(),
        obtenerStatsMaterias(),
      ])
      setMaterias(mats)
      setProfesores(users)
      setStats(s)
      if (mats.length > 0 && Object.keys(openCareers).length === 0) {
        const firstKey = mats[0]?.carrera_nombre || 'General'
        setOpenCareers({ [firstKey]: true })
      }
    } catch { /* ignore */ }
  }, [openCareers])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        await cargarTodo()
      } finally {
        setLoading(false)
        setLastUpdate(new Date())
      }
    }
    load()
  }, [cargarTodo])

  useEffect(() => {
    const interval = setInterval(() => {
      cargarTodo()
      setLastUpdate(new Date())
    }, 30_000)
    return () => clearInterval(interval)
  }, [cargarTodo])

  async function refreshNow() {
    setRefreshing(true)
    await cargarTodo()
    setLastUpdate(new Date())
    setRefreshing(false)
  }

  const careers: CareerGroup[] = (() => {
    const grouped = new Map<string, Subject[]>()
    for (const m of materias) {
      const key = m.carrera_nombre || 'General'
      const list = grouped.get(key) || []
      list.push({
        id: m.id, name: m.nombre,
        professor: m.profesor_nombre,
        professorId: m.profesor_id,
        carrera: key,
        anio: m.anio,
        semestre: m.semestre,
        carreraNombre: m.carrera_nombre,
      })
      grouped.set(key, list)
    }
    return [...grouped.entries()].map(([name, subjects]) => ({ name, count: subjects.length, subjects }))
  })()

  const profs: Prof[] = profesores.map(p => {
    const misMaterias = materias.filter(m => m.profesor_id === p.id)
    return {
      id: p.id,
      name: p.nombre || p.username,
      email: p.username,
      initials: (p.nombre || p.username).split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase(),
      load: misMaterias.length,
      materias: misMaterias.map(m => m.nombre),
      carreras: [...new Set(misMaterias.map(m => m.carrera_nombre).filter(Boolean))] as string[],
    }
  })

  const toggleCareer = (name: string) => setOpenCareers(prev => ({ ...prev, [name]: !prev[name] }))

  const selectedMateria = materias.find(m => m.id === selectedSubject)

  async function handleAsignar(profId: number) {
    if (!selectedSubject) { emitToast('Seleccioná primero una materia', 'warning'); return }
    setAsignando(true)
    try {
      const materia = materias.find(m => m.id === selectedSubject)
      if (!materia) throw new Error('Materia no encontrada')

      if (!materia.profesor_id) {
        await crearOferta({
          materia_id: selectedSubject,
          profesor_id: profId,
          periodo: PERIODO_ACTUAL,
          activa: true,
        })
        emitToast('Oferta creada y profesor asignado')
      } else {
        await asignarProfesor(selectedSubject, profId)
        emitToast('Profesor reasignado correctamente')
      }
      setSelectedSubject(null)
      refreshNow()
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al asignar', 'error')
    } finally { setAsignando(false) }
  }

  const filteredCareers = showSinProf
    ? careers.map(c => ({
        ...c,
        subjects: c.subjects.filter(s => !s.professor),
      })).filter(c => c.subjects.length > 0)
    : careers

  if (loading) {
    return (
      <>
        <style>{css}</style>
        <div style={{ padding: 4 }}>
          <div className="ga-skeleton" style={{ height: 32, width: 300, marginBottom: 8 }} />
          <div className="ga-skeleton" style={{ height: 16, width: 450, marginBottom: 24 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
            {[1, 2, 3].map(i => <div key={i} className="ga-skeleton" style={{ height: 80 }} />)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 32 }}>
            <div className="ga-skeleton" style={{ height: 400 }} />
            <div className="ga-skeleton" style={{ height: 400 }} />
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{css}</style>
      <div className="w-full">
        <header style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title" style={{ fontSize: 28 }}>Gestión de Asignaciones</h1>
            <p className="page-subtitle">Distribución de carga académica por materia y profesor — Período {PERIODO_ACTUAL}</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className="mono-label" style={{ fontSize: 10 }}>{lastUpdate.toLocaleTimeString('es-PY')}</span>
            <button className="btn-ghost" onClick={refreshNow} disabled={refreshing} title="Actualizar">
              <i className={`ti ti-refresh ${refreshing ? 'spinning' : ''}`} />
            </button>
            {selectedMateria && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--accent-muted)', border: '1px solid var(--accent-hover)', borderRadius: 10, padding: '7px 14px 7px 12px' }}>
                <i className="ti ti-book" style={{ fontSize: 16, color: 'var(--accent)' }} />
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{selectedMateria.nombre}</span>
                  <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                    {selectedMateria.carrera_nombre && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{selectedMateria.carrera_nombre}</span>
                    )}
                    {selectedMateria.anio && (
                      <span style={{ fontSize: 10, color: 'var(--accent-bright)', fontFamily: 'var(--font-mono)' }}>
                        {selectedMateria.anio}° · {selectedMateria.semestre}° Sem.
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => setSelectedSubject(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, marginLeft: 4 }}>
                  <i className="ti ti-x" />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* KPIs */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
            <div className="ga-stat-card" style={{ borderLeftColor: 'var(--accent)' }}>
              <p className="mono-label" style={{ marginBottom: 4 }}>Materias</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700 }}>{stats.total_materias}</p>
              <div className="mono-label" style={{ fontSize: 10, color: stats.materias_sin_profesor > 0 ? 'var(--warning)' : 'var(--success)' }}>
                {stats.materias_sin_profesor} sin profesor
              </div>
            </div>
            <div className="ga-stat-card" style={{ borderLeftColor: '#fdba74' }}>
              <p className="mono-label" style={{ marginBottom: 4 }}>Profesores</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700 }}>{stats.total_profesores}</p>
              <div className="mono-label" style={{ fontSize: 10, color: stats.profesores_sin_asignacion > 0 ? 'var(--warning)' : 'var(--success)' }}>
                {stats.profesores_sin_asignacion} sin carga
              </div>
            </div>
            <div className="ga-stat-card" style={{ borderLeftColor: 'var(--success)' }}>
              <p className="mono-label" style={{ marginBottom: 4 }}>Con Profesor</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700 }}>{stats.materias_con_profesor}</p>
              <div className="progress-track" style={{ marginTop: 6, height: 4 }}>
                <div className="progress-fill" style={{ width: `${stats.total_materias > 0 ? Math.round(stats.materias_con_profesor / stats.total_materias * 100) : 0}%`, background: 'var(--success)' }} />
              </div>
            </div>
            <div className="ga-stat-card" style={{ borderLeftColor: 'var(--info)' }}>
              <p className="mono-label" style={{ marginBottom: 4 }}>Carga Promedio</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700 }}>{stats.carga_promedio}</p>
              <div className="mono-label" style={{ fontSize: 10 }}>mat/prof</div>
            </div>
          </div>
        )}

        {/* Main grid */}
        <div className="ga-grid" style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 32, alignItems: 'start' }}>

          {/* LEFT PANEL — Estructura Académica */}
          <div className="ga-section" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 17, fontWeight: 800 }}>
                <i className="ti ti-hierarchy-2" style={{ color: 'var(--accent)', fontSize: 20 }} />
                Estructura Académica
              </h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className={`btn-ghost ${!showSinProf ? 'active' : ''}`}
                  style={{ padding: '6px 14px', fontSize: 11, borderRadius: 20, background: !showSinProf ? 'var(--accent-muted)' : undefined, border: '1px solid var(--border-subtle)' }}
                  onClick={() => setShowSinProf(false)}>
                  Todas
                </button>
                <button className={`btn-ghost ${showSinProf ? 'active' : ''}`}
                  style={{ padding: '6px 14px', fontSize: 11, borderRadius: 20, background: showSinProf ? 'var(--accent-muted)' : undefined, border: '1px solid var(--border-subtle)' }}
                  onClick={() => setShowSinProf(true)}>
                  <i className="ti ti-alert-triangle" style={{ color: 'var(--warning)', marginRight: 4 }} />
                  Sin prof.
                </button>
              </div>
            </div>

            <div className="ga-search" style={{ marginBottom: 18 }}>
              <input value={subjectSearch} onChange={e => setSubjectSearch(e.target.value)}
                placeholder="Buscar materia..." />
              <i className="ti ti-search ga-icon" />
            </div>

            {stats && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18, paddingBottom: 16, borderBottom: '1px solid var(--border-subtle)' }}>
                {stats.por_carrera.filter(c => c.materias > 0).map(c => (
                  <button key={c.carrera}
                    onClick={() => { if (!openCareers[c.carrera]) toggleCareer(c.carrera) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 14px', borderRadius: 20, cursor: 'pointer',
                      border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)',
                      fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)',
                      color: c.sin_profesor > 0 ? 'var(--warning)' : 'var(--text-secondary)',
                      transition: 'all .15s',
                    }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: c.sin_profesor > 0 ? 'var(--warning)' : 'var(--success)',
                      flexShrink: 0,
                    }} />
                    <span style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.carrera}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 800, opacity: .7 }}>
                      {c.con_profesor}/{c.materias}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {filteredCareers.map(career => {
                const isOpen = !!openCareers[career.name]
                const filtered = career.subjects.filter(s =>
                  s.name.toLowerCase().includes(subjectSearch.toLowerCase())
                )
                if (filtered.length === 0) return null
                const sinProfCount = filtered.filter(s => !s.professor).length
                // Group subjects by (anio, semestre)
                const yearMap = new Map<string, Subject[]>()
                for (const s of filtered) {
                  const yk = s.anio && s.semestre ? `${s.anio}-${s.semestre}` : '0-0'
                  const arr = yearMap.get(yk) || []
                  arr.push(s)
                  yearMap.set(yk, arr)
                }
                const yearGroups = [...yearMap.entries()].sort(([a], [b]) => a.localeCompare(b))
                return (
                  <div key={career.name} style={{
                    background: 'var(--bg-surface)', borderRadius: 14,
                    border: '1px solid var(--border-subtle)', overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,.08)',
                  }}>
                    <button onClick={() => toggleCareer(career.name)}
                      style={{
                        width: '100%', padding: '16px 20px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: isOpen ? 'var(--bg-elevated)' : 'transparent',
                        border: 'none', cursor: 'pointer',
                        textAlign: 'left', fontFamily: 'var(--font-sans)',
                        transition: 'background .15s',
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: sinProfCount > 0 ? 'var(--warning-subtle)' : 'var(--accent-muted)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: sinProfCount > 0 ? 'var(--warning)' : 'var(--accent-bright)',
                          fontSize: 16, flexShrink: 0,
                        }}>
                          <i className="ti ti-building-arch" />
                        </div>
                        <div>
                          <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>{career.name}</p>
                          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>
                            {filtered.length} materias
                            {sinProfCount > 0 && (
                              <span style={{ color: 'var(--warning)', marginLeft: 8 }}>
                                · {sinProfCount} sin prof.
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <i className="ti ti-chevron-down" style={{
                        color: 'var(--text-muted)', fontSize: 20,
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.25s',
                      }} />
                    </button>
                    {isOpen && (
                      <div style={{ padding: '6px 12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {yearGroups.map(([_key, subjects]) => {
                          const anio = subjects[0].anio
                          const semestre = subjects[0].semestre
                          const label = anio ? `${anio}° Año · ${semestre}° Semestre` : 'Sin año'
                          const sinProfGrp = subjects.filter(s => !s.professor).length
                          return (
                            <div key={_key}>
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '6px 10px 8px', fontSize: 11,
                                fontWeight: 700, color: 'var(--text-muted)',
                                textTransform: 'uppercase', letterSpacing: .5,
                              }}>
                                <i className="ti ti-calendar-stats" style={{ fontSize: 13 }} />
                                {label}
                                {sinProfGrp > 0 && (
                                  <span style={{
                                    marginLeft: 'auto', fontFamily: 'var(--font-mono)',
                                    color: 'var(--warning)', fontSize: 10,
                                  }}>
                                    {sinProfGrp} sin prof.
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {subjects.map(subject => {
                                  const isSelected = selectedSubject === subject.id
                                  return (
                                    <div key={subject.id}
                                      onClick={() => setSelectedSubject(subject.id)}
                                      style={{
                                        display: 'flex', alignItems: 'center', gap: 12,
                                        padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                                        border: isSelected ? '1px solid var(--accent-hover)' : '1px solid transparent',
                                        background: isSelected ? 'var(--accent-muted)' : 'var(--bg-elevated)',
                                        borderLeft: `4px solid ${isSelected ? 'var(--accent)' : subject.professor ? 'transparent' : 'var(--warning)'}`,
                                        transition: 'all .15s',
                                      }}>
                                      <div style={{
                                        width: 32, height: 32, borderRadius: 8,
                                        background: subject.professor ? 'var(--accent-muted)' : 'var(--bg-surface)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0, fontSize: 14,
                                        color: subject.professor ? 'var(--accent-bright)' : 'var(--text-muted)',
                                      }}>
                                        <i className="ti ti-book-2" />
                                      </div>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)', marginBottom: 4 }}>
                                          {subject.name}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                            <i className="ti ti-user" style={{ fontSize: 12, color: subject.professor ? 'var(--accent)' : 'var(--warning)' }} />
                                            <span style={{ fontSize: 12, color: subject.professor ? 'var(--text-secondary)' : 'var(--warning)', fontWeight: subject.professor ? 400 : 600 }}>
                                              {subject.professor || 'Sin asignar'}
                                            </span>
                                          </div>
                                          {subject.anio && (
                                            <span style={{
                                              display: 'inline-flex', alignItems: 'center', gap: 3,
                                              fontSize: 10, fontFamily: 'var(--font-mono)',
                                              color: 'var(--accent-bright)', background: 'var(--accent-muted)',
                                              padding: '1px 7px', borderRadius: 6,
                                              fontWeight: 700,
                                            }}>
                                              <i className="ti ti-calendar" style={{ fontSize: 10 }} />
                                              {subject.anio}° · {subject.semestre}° Sem.
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      {isSelected ? (
                                        <span style={{
                                          width: 24, height: 24, borderRadius: '50%',
                                          background: 'var(--accent)', color: '#fff',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          fontSize: 14, flexShrink: 0,
                                        }}>
                                          <i className="ti ti-check" />
                                        </span>
                                      ) : (
                                        <i className="ti ti-chevron-right" style={{ color: 'var(--text-muted)', fontSize: 18, flexShrink: 0 }} />
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* RIGHT PANEL — Profesores */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="ga-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 700 }}>
                  <i className="ti ti-users-plus" style={{ color: 'var(--accent)' }} />
                  Profesores
                </h3>
                <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontSize: 10 }}>
                  {profs.length} registrados · {stats?.profesores_sin_asignacion ?? 0} sin carga
                </span>
              </div>

              <div className="ga-search" style={{ marginBottom: 16 }}>
                <input value={profSearch} onChange={e => { setProfSearch(e.target.value); setProfPage(1) }}
                  placeholder="Buscar profesor..." />
                <i className="ti ti-search ga-icon" style={{ color: 'var(--accent)' }} />
              </div>

              {!selectedMateria && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ti ti-info-circle" />
                  Seleccioná una materia a la izquierda para asignar o reasignar.
                </div>
              )}

              {selectedMateria && !selectedMateria.profesor_id && (
                <div style={{
                  background: 'var(--warning-subtle)', border: '1px solid var(--warning)',
                  borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: 'var(--warning)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <i className="ti ti-alert-triangle" />
                  Esta materia no tiene oferta activa. Se creará una automáticamente al asignar (período {PERIODO_ACTUAL}).
                </div>
              )}

              {(() => {
                const filtered = profs
                  .filter(p => p.name.toLowerCase().includes(profSearch.toLowerCase()))
                  .sort((a, b) => b.load - a.load)
                const totalPages = Math.max(1, Math.ceil(filtered.length / PROF_PAGE_SIZE))
                const p = Math.min(profPage, totalPages)
                const pageItems = filtered.slice((p - 1) * PROF_PAGE_SIZE, p * PROF_PAGE_SIZE)
                const desde = filtered.length === 0 ? 0 : (p - 1) * PROF_PAGE_SIZE + 1
                const hasta = Math.min(p * PROF_PAGE_SIZE, filtered.length)
                return (
                  <>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="table-uca">
                        <thead>
                          <tr>
                            <th>Profesor</th>
                            <th>Carrera(s)</th>
                            <th>Carga</th>
                            <th>Materias</th>
                            <th style={{ textAlign: 'right' }}>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pageItems.map(prof => {
                            const isSelected = selectedSubject !== null && materias.find(m => m.id === selectedSubject)?.profesor_id === prof.id
                            return (
                              <tr key={prof.id} className={`ga-prof-row${isSelected ? ' selected' : ''}`}>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div className="avatar-initials" style={{
                                      width: 34, height: 34, fontSize: 12,
                                      background: prof.load > 0
                                        ? 'linear-gradient(135deg, var(--accent), var(--bg-base))'
                                        : 'var(--bg-elevated)',
                                      color: prof.load > 0 ? '#fff' : 'var(--text-muted)',
                                    }}>{prof.initials}</div>
                                    <div>
                                      <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{prof.name}</p>
                                      <p className="mono-label" style={{ fontSize: 9.5 }}>{prof.email}</p>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  {prof.carreras.length > 0 ? (
                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                      {prof.carreras.map(c => (
                                        <span key={c} style={{
                                          fontSize: 10, padding: '2px 8px', borderRadius: 6,
                                          background: 'var(--accent-muted)', color: 'var(--accent-bright)',
                                          fontWeight: 600, whiteSpace: 'nowrap',
                                        }}>
                                          {c}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
                                  )}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700 }}>{prof.load}</span>
                                    <span className="mono-label" style={{ fontSize: 10 }}>{prof.load === 1 ? 'mat' : 'mats'}</span>
                                  </div>
                                  {prof.load > 0 && (
                                    <div className="progress-track" style={{ marginTop: 4, height: 3, width: 60 }}>
                                      <div className="progress-fill" style={{
                                        width: `${stats && prof.load > 0 ? Math.min(100, (prof.load / Math.max(1, stats.carga_promedio * 2)) * 100) : 0}%`,
                                        background: prof.load > (stats?.carga_promedio ?? 3) ? 'var(--warning)' : 'var(--success)',
                                      }} />
                                    </div>
                                  )}
                                </td>
                                <td style={{ fontSize: 11, color: 'var(--text-secondary)', maxWidth: 200 }}>
                                  {prof.materias.length > 0
                                    ? prof.materias.slice(0, 2).join(', ') + (prof.materias.length > 2 ? ` +${prof.materias.length - 2}` : '')
                                    : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                </td>
                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                    <button className="btn-primary" style={{ padding: '6px 14px', fontSize: 11 }}
                                      disabled={!selectedMateria || asignando}
                                      onClick={() => handleAsignar(prof.id)}>
                                      {selectedMateria?.profesor_id === prof.id ? 'Asignado' : 'Asignar'}
                                    </button>
                                    <button onClick={() => setDetailUserId(prof.id)}
                                      style={{
                                        padding: '6px 10px', fontSize: 11, borderRadius: 8,
                                        background: 'transparent', border: '1px solid var(--border-subtle)',
                                        cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)',
                                      }}>
                                      <i className="ti ti-eye" style={{ marginRight: 4 }} />
                                      Detalle
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0 0', flexWrap: 'wrap', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {filtered.length > 0 ? `Mostrando ${desde}-${hasta} de ${filtered.length}` : 'Sin resultados'}
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-ghost" style={{ padding: '5px 12px', fontSize: 11 }}
                          disabled={p === 1} onClick={() => setProfPage(p - 1)}>Anterior</button>
                        <button className="btn-ghost" style={{ padding: '5px 12px', fontSize: 11 }}
                          disabled={p === totalPages} onClick={() => setProfPage(p + 1)}>Siguiente</button>
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      </div>

      {detailUserId && (
        <ProfessorDetailModal
          userId={detailUserId}
          onClose={() => setDetailUserId(null)}
          onUpdated={() => refreshNow()}
        />
      )}
    </>
  )
}
