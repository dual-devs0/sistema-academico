import { useState, useEffect } from "react"
import { api, emitToast } from "../lib/api"

type MateriaApi = { id: number; nombre: string; carrera_id: number | null; carrera_nombre: string | null; profesor_id: number; profesor_nombre: string | null }
type UserApi = { id: number; username: string; nombre: string; role: string }

type Subject = { id: number; name: string; professor: string | null; professorId: number }
type CareerGroup = { name: string; count: number; subjects: Subject[] }
type Prof = { id: number; name: string; initials: string; load: number }

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
  .ga-stat-card {
    background:var(--bg-surface); border:1px solid var(--border-subtle);
    border-radius:var(--radius); padding:16px;
    border-left:4px solid var(--accent);
  }
  .ga-prof-row {
    cursor:default; border-bottom:1px solid var(--border-subtle);
    border-left:4px solid transparent; transition:all 0.2s;
  }
  .ga-prof-row:hover { background:var(--bg-hover); }
  @media(max-width:900px){
    .ga-grid { grid-template-columns:1fr !important; }
  }
`

export default function GestionAsignaciones() {
  const [materias, setMaterias] = useState<MateriaApi[]>([])
  const [profesores, setProfesores] = useState<UserApi[]>([])
  const [loading, setLoading] = useState(true)
  const [openCareers, setOpenCareers] = useState<Record<string, boolean>>({})
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null)
  const [subjectSearch, setSubjectSearch] = useState("")
  const [profSearch, setProfSearch] = useState("")
  const [asignando, setAsignando] = useState(false)

  function cargar() {
    setLoading(true)
    Promise.all([
      api.get<MateriaApi[]>('/materias/').catch(() => [] as MateriaApi[]),
      api.get<UserApi[]>('/users/').catch(() => [] as UserApi[]),
    ]).then(([mats, users]) => {
      setMaterias(mats)
      setProfesores(users.filter(u => u.role === 'profesor'))
      const firstKey = mats[0]?.carrera_nombre || 'General'
      if (mats[0]) setOpenCareers({ [firstKey]: true })
    }).finally(() => setLoading(false))
  }
  useEffect(cargar, [])

  const careers: CareerGroup[] = (() => {
    const grouped = new Map<string, Subject[]>()
    for (const m of materias) {
      const key = m.carrera_nombre || 'General'
      const list = grouped.get(key) || []
      list.push({ id: m.id, name: m.nombre, professor: m.profesor_nombre, professorId: m.profesor_id })
      grouped.set(key, list)
    }
    return [...grouped.entries()].map(([name, subjects]) => ({ name, count: subjects.length, subjects }))
  })()

  const profs: Prof[] = profesores.map(p => ({
    id: p.id,
    name: p.nombre || p.username,
    initials: (p.nombre || p.username).split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase(),
    load: materias.filter(m => m.profesor_id === p.id).length,
  }))

  const toggleCareer = (name: string) => setOpenCareers(prev => ({ ...prev, [name]: !prev[name] }))

  const selectedMateria = materias.find(m => m.id === selectedSubject)

  async function asignar(profId: number) {
    if (!selectedSubject) { emitToast('Seleccioná primero una materia', 'warning'); return }
    setAsignando(true)
    try {
      await api.patch(`/materias/${selectedSubject}`, { profesor_id: profId })
      emitToast('Profesor asignado correctamente')
      setSelectedSubject(null)
      cargar()
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al asignar', 'error')
    } finally { setAsignando(false) }
  }

  const materiasPendientes = materias.filter(m => !m.profesor_nombre).length
  const cargaPromedio = profs.length ? Math.round(materias.length / profs.length * 10) / 10 : 0

  return (
    <>
      <style>{css}</style>
      <div className="w-full">
        <header style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 className="page-title" style={{ fontSize: 32 }}>Gestión de Asignaciones</h1>
            <p className="page-subtitle">Configure la distribución de carga académica por materia y profesor.</p>
          </div>
          {selectedMateria && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--accent-muted)', border: '1px solid var(--accent-hover)', borderRadius: 10, padding: '8px 14px' }}>
              <span style={{ fontSize: 12.5 }}>Reasignando: <b>{selectedMateria.nombre}</b></span>
              <button onClick={() => setSelectedSubject(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><i className="ti ti-x" /></button>
            </div>
          )}
        </header>

        {loading ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Cargando…</div>
        ) : (
          <div className="ga-grid" style={{ display: "grid", gridTemplateColumns: "5fr 7fr", gap: 32, alignItems: "start" }}>

            {/* LEFT PANEL */}
            <div className="ga-section">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
                  <i className="ti ti-hierarchy-2" style={{ color: "var(--accent)" }} />
                  Estructura Académica
                </h3>
                <span className="badge" style={{ background: "var(--accent-muted)", color: "var(--accent-bright)" }}>{materias.length} MATERIAS</span>
              </div>

              <div className="ga-search" style={{ marginBottom: 20 }}>
                <input
                  value={subjectSearch}
                  onChange={e => setSubjectSearch(e.target.value)}
                  placeholder="Filtrar por nombre de materia..."
                />
                <i className="ti ti-filter ga-icon" />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 600, overflowY: "auto" }}>
                {careers.map((career) => {
                  const isOpen = !!openCareers[career.name]
                  const filtered = career.subjects.filter(s =>
                    s.name.toLowerCase().includes(subjectSearch.toLowerCase())
                  )
                  return (
                    <div key={career.name} style={{
                      background: "var(--bg-elevated)", borderRadius: 12,
                      border: "1px solid var(--border-subtle)", overflow: "hidden"
                    }}>
                      <button
                        onClick={() => toggleCareer(career.name)}
                        style={{
                          width: "100%", padding: "16px 20px",
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          background: "transparent", border: "none", cursor: "pointer",
                          textAlign: "left", transition: "background 0.2s",
                          fontFamily: "var(--font-sans)"
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <div>
                          <p style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 15 }}>{career.name}</p>
                          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{career.count} Materias</p>
                        </div>
                        <i className="ti ti-chevron-down" style={{
                          color: "var(--text-muted)", fontSize: 20,
                          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 0.2s"
                        }} />
                      </button>

                      {isOpen && filtered.length > 0 && (
                        <div style={{ padding: "0 8px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
                          {filtered.map((subject) => (
                            <div key={subject.id}
                              className={`ga-subject-item${selectedSubject === subject.id ? ' selected' : ''}`}
                              onClick={() => setSelectedSubject(subject.id)}>
                              <div>
                                <p style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>{subject.name}</p>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                                  <div className="avatar-initials" style={{
                                    width: 22, height: 22, fontSize: 10,
                                    background: "var(--bg-elevated)", color: "var(--text-secondary)"
                                  }}>
                                    <i className="ti ti-user" style={{ fontSize: 13 }} />
                                  </div>
                                  <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>Prof: {subject.professor || '—'}</p>
                                </div>
                              </div>
                              <i className={`ti ${selectedSubject === subject.id ? 'ti-circle-check' : 'ti-chevron-right'}`} style={{
                                color: selectedSubject === subject.id ? "var(--accent)" : "var(--text-muted)", fontSize: 18
                              }} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* RIGHT PANEL */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
                {[
                  { label: "Materias sin Profesor", value: String(materiasPendientes), accent: "var(--accent)" },
                  { label: "Carga Promedio", value: String(cargaPromedio), sub: "mat/prof", accent: "var(--text-secondary)" },
                  { label: "Total Profesores", value: String(profs.length), accent: "var(--text-primary)" },
                ].map((stat) => (
                  <div key={stat.label} className="ga-stat-card" style={{ borderLeftColor: stat.accent }}>
                    <p className="mono-label" style={{ marginBottom: 4 }}>{stat.label}</p>
                    <p style={{
                      fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 600, color: "var(--text-primary)"
                    }}>
                      {stat.value}
                      {stat.sub && <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-secondary)" }}> {stat.sub}</span>}
                    </p>
                  </div>
                ))}
              </div>

              <div className="ga-section">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                  <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
                    <i className="ti ti-users-plus" style={{ color: "var(--accent)" }} />
                    Profesores
                  </h3>
                </div>

                <div className="ga-search" style={{ marginBottom: 24 }}>
                  <input
                    value={profSearch}
                    onChange={e => setProfSearch(e.target.value)}
                    placeholder="Buscar por nombre..."
                  />
                  <i className="ti ti-search ga-icon" style={{ color: "var(--accent)" }} />
                </div>

                {!selectedMateria && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                    Seleccioná una materia a la izquierda para reasignarla.
                  </p>
                )}

                <div style={{ overflowX: "auto" }}>
                  <table className="table-uca">
                    <thead>
                      <tr>
                        <th>Profesor</th>
                        <th>Carga</th>
                        <th style={{ textAlign: "right" }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profs
                        .filter(p => p.name.toLowerCase().includes(profSearch.toLowerCase()))
                        .map((prof) => (
                          <tr key={prof.id} className="ga-prof-row">
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <div className="avatar-initials" style={{
                                  width: 38, height: 38, fontSize: 13,
                                  background: "linear-gradient(135deg, var(--accent), var(--bg-base))"
                                }}>{prof.initials}</div>
                                <p style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>{prof.name}</p>
                              </div>
                            </td>
                            <td style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                              {prof.load} {prof.load === 1 ? "Materia" : "Materias"}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <button className="btn-primary" style={{ padding: "6px 14px", fontSize: 11 }}
                                disabled={!selectedMateria || asignando || selectedMateria?.profesor_id === prof.id}
                                onClick={() => asignar(prof.id)}>
                                {selectedMateria?.profesor_id === prof.id ? 'Asignado' : 'Asignar'}
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
