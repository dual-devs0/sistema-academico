import { useState } from "react"

const professors = [
  { id: "#99281", name: "Dr. Carlos Valencia", specialty: "Sistemas Distribuidos", load: 2, initials: "CV" },
  { id: "#99285", name: "Mg. Elena Garzón", specialty: "Seguridad Inf.", load: 4, initials: "EG" },
  { id: "#99312", name: "Ing. Roberto Sánchez", specialty: "Base de Datos", load: 1, initials: "RS" },
  { id: "#99403", name: "Lic. Mónica Ruiz", specialty: "Gestión Empresarial", load: 0, initials: "MR" },
]

const careers = [
  {
    name: "Ingeniería en Sistemas",
    count: 12,
    open: true,
    subjects: [
      { name: "Arquitectura de Software", professor: "Dr. Alejandro Mendoza", assigned: true },
      { name: "Base de Datos II", professor: null, assigned: false },
      { name: "Ciberseguridad Avanzada", professor: "Mg. Laura Rivas", assigned: true },
    ],
  },
  { name: "Lic. en Administración", count: 8, open: false, subjects: [] },
  { name: "Diseño Industrial", count: 15, open: false, subjects: [] },
]

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
  .ga-subject-item.assigned {
    background:var(--accent-muted);
    border-left-color:var(--accent);
  }
  .ga-subject-item.unassigned:hover { background:var(--bg-hover); }
  .ga-stat-card {
    background:var(--bg-surface); border:1px solid var(--border-subtle);
    border-radius:var(--radius); padding:16px;
    border-left:4px solid var(--accent);
  }
  .ga-prof-row {
    cursor:pointer; border-bottom:1px solid var(--border-subtle);
    border-left:4px solid transparent; transition:all 0.2s;
  }
  .ga-prof-row:hover { background:var(--bg-hover); }
  .ga-prof-row.selected { background:var(--accent-muted); border-left-color:var(--accent); }
  .ga-pagination { display:flex; align-items:center; gap:8px; }
  .ga-pagination button {
    width:32px; height:32px; border-radius:8px; border:1px solid var(--border-light);
    background:transparent; color:var(--text-secondary); cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    font-weight:700; font-size:12; transition:all 0.2s;
  }
  .ga-pagination button:hover { border-color:var(--accent); color:var(--accent); }
  .ga-pagination button.active { background:var(--accent); color:#fff; border-color:var(--accent); }
  .ga-pagination button:disabled { opacity:0.35; cursor:not-allowed; }
  @media(max-width:900px){
    .ga-grid { grid-template-columns:1fr !important; }
  }
`

export default function GestionAsignaciones() {
  const [openCareers, setOpenCareers] = useState<Record<string, boolean>>({ "Ingeniería en Sistemas": true })
  const [selectedRow, setSelectedRow] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState("Todos")
  const [subjectSearch, setSubjectSearch] = useState("")
  const [profSearch, setProfSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  const toggleCareer = (name: string) => {
    setOpenCareers((prev) => ({ ...prev, [name]: !prev[name] }))
  }

  return (
    <>
      <style>{css}</style>
      <div className="w-full">
        <header style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 className="page-title" style={{ fontSize: 32 }}>Gestión de Asignaciones</h1>
            <p className="page-subtitle">Configure la distribución de carga académica por materia y profesor.</p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn-ghost">
              <i className="ti ti-file-download" style={{ fontSize: 16 }} />
              Exportar Reporte
            </button>
            <button className="btn-primary">
              <i className="ti ti-plus" />
              Nueva Carrera
            </button>
          </div>
        </header>

        <div className="ga-grid" style={{ display: "grid", gridTemplateColumns: "5fr 7fr", gap: 32, alignItems: "start" }}>

          {/* LEFT PANEL */}
          <div className="ga-section">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
                <i className="ti ti-hierarchy-2" style={{ color: "var(--accent)" }} />
                Estructura Académica
              </h3>
              <span className="badge" style={{ background: "var(--accent-muted)", color: "var(--accent-bright)" }}>FILTRAR</span>
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
                        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{career.count} Materias Disponibles</p>
                      </div>
                      <i className="ti ti-chevron-down" style={{
                        color: "var(--text-muted)", fontSize: 20,
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s"
                      }} />
                    </button>

                    {isOpen && career.subjects.length > 0 && (
                      <div style={{ padding: "0 8px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
                        {filtered.map((subject) => (
                          <div key={subject.name} className={`ga-subject-item ${subject.assigned ? 'assigned' : 'unassigned'}`}>
                            <div>
                              <p style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>{subject.name}</p>
                              {subject.assigned ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                                  <div className="avatar-initials" style={{
                                    width: 22, height: 22, fontSize: 10,
                                    background: "var(--bg-elevated)", color: "var(--text-secondary)"
                                  }}>
                                    <i className="ti ti-user" style={{ fontSize: 13 }} />
                                  </div>
                                  <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>Prof: {subject.professor}</p>
                                </div>
                              ) : (
                                <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                                  <i className="ti ti-alert-triangle" style={{ fontSize: 12 }} />
                                  Sin profesor asignado
                                </p>
                              )}
                            </div>
                            <i className={`ti ${subject.assigned ? 'ti-circle-check' : 'ti-chevron-right'}`} style={{
                              color: subject.assigned ? "var(--accent)" : "var(--text-muted)", fontSize: 18
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
                { label: "Materias Pendientes", value: "14", accent: "var(--accent)", bar: true },
                { label: "Carga Promedio", value: "3.2", sub: "mat/prof", accent: "var(--text-secondary)", bar: false },
                { label: "Total Profesores", value: "124", accent: "var(--text-primary)", bar: false },
              ].map((stat) => (
                <div key={stat.label} className="ga-stat-card" style={{ borderLeftColor: stat.accent }}>
                  <p className="mono-label" style={{ marginBottom: 4 }}>{stat.label}</p>
                  <p style={{
                    fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 600, color: "var(--text-primary)"
                  }}>
                    {stat.value}
                    {stat.sub && <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-secondary)" }}> {stat.sub}</span>}
                  </p>
                  {stat.bar && (
                    <div className="progress-track" style={{ marginTop: 8 }}>
                      <div className="progress-fill" style={{ width: "66%" }} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="ga-section">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
                  <i className="ti ti-users-plus" style={{ color: "var(--accent)" }} />
                  Buscador de Profesores
                </h3>
                <div style={{
                  display: "flex", alignItems: "center", gap: 4,
                  background: "var(--bg-input)", padding: 4, borderRadius: 8, border: "1px solid var(--border-light)"
                }}>
                  {["Todos", "Titulares", "Adjuntos"].map((f) => (
                    <button key={f} onClick={() => setActiveFilter(f)} style={{
                      padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer",
                      fontWeight: 700, fontSize: 12, fontFamily: "var(--font-sans)",
                      background: activeFilter === f ? "var(--accent)" : "transparent",
                      color: activeFilter === f ? "#fff" : "var(--text-secondary)",
                      transition: "all 0.2s"
                    }}>{f}</button>
                  ))}
                </div>
              </div>

              <div className="ga-search" style={{ marginBottom: 24 }}>
                <input
                  value={profSearch}
                  onChange={e => setProfSearch(e.target.value)}
                  placeholder="Buscar por nombre, especialidad o ID..."
                />
                <i className="ti ti-search ga-icon" style={{ color: "var(--accent)" }} />
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className="table-uca">
                  <thead>
                    <tr>
                      <th>Profesor</th>
                      <th>Especialidad</th>
                      <th>Carga</th>
                      <th style={{ textAlign: "right" }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {professors
                      .filter(p => p.name.toLowerCase().includes(profSearch.toLowerCase()) ||
                        p.specialty.toLowerCase().includes(profSearch.toLowerCase()) ||
                        p.id.includes(profSearch))
                      .map((prof) => (
                        <tr
                          key={prof.id}
                          onClick={() => setSelectedRow(prof.id)}
                          className={`ga-prof-row${selectedRow === prof.id ? ' selected' : ''}`}
                        >
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <div className="avatar-initials" style={{
                                width: 38, height: 38, fontSize: 13,
                                background: "linear-gradient(135deg, var(--accent), var(--bg-base))"
                              }}>{prof.initials}</div>
                              <div>
                                <p style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>{prof.name}</p>
                                <p style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>ID: {prof.id}</p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="badge" style={{
                              background: "var(--bg-elevated)", color: "var(--text-secondary)",
                              border: "1px solid var(--border-light)"
                            }}>{prof.specialty}</span>
                          </td>
                          <td style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                            {prof.load} {prof.load === 1 ? "Materia" : "Materias"}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button className="btn-primary" style={{ padding: "6px 14px", fontSize: 11 }}
                              onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.05)")}
                              onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                            >Asignar a Materia</button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div style={{
                marginTop: 24, paddingTop: 20,
                borderTop: "1px solid var(--border-subtle)",
                display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12
              }}>
                <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>Mostrando 1-4 de 124 profesores registrados</p>
                <div className="ga-pagination">
                  <button disabled>
                    <i className="ti ti-chevron-left" />
                  </button>
                  {[1, 2, 3].map(p => (
                    <button key={p} onClick={() => setCurrentPage(p)} className={currentPage === p ? 'active' : ''}>
                      {p}
                    </button>
                  ))}
                  <button onClick={() => setCurrentPage(Math.min(3, currentPage + 1))}>
                    <i className="ti ti-chevron-right" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
