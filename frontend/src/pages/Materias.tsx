import { useState } from 'react'

interface Materia {
  id: number
  nombre: string
  carrera: string
  anio: number
  semestre: number
  profesor: string
  alumnos: number
}

const materiasIniciales: Materia[] = [
  { id: 1, nombre: 'Análisis Matemático I', carrera: 'Ing. Informática', anio: 1, semestre: 1, profesor: 'Carlos Méndez', alumnos: 32 },
  { id: 2, nombre: 'Física I', carrera: 'Ing. Informática', anio: 1, semestre: 1, profesor: 'Ana Torres', alumnos: 30 },
  { id: 3, nombre: 'Programación I', carrera: 'Ing. Informática', anio: 1, semestre: 1, profesor: 'Luis Paredes', alumnos: 35 },
  { id: 4, nombre: 'Matemática Discreta', carrera: 'Ing. Informática', anio: 1, semestre: 2, profesor: 'Carlos Méndez', alumnos: 28 },
  { id: 5, nombre: 'Resistencia de Materiales', carrera: 'Ing. Civil', anio: 2, semestre: 1, profesor: 'Pedro Rojas', alumnos: 22 },
  { id: 6, nombre: 'Mecánica de Suelos', carrera: 'Ing. Civil', anio: 3, semestre: 1, profesor: 'Pedro Rojas', alumnos: 18 },
]

const carreras = [
  { nombre: 'Ing. Informática', materias: 4, alumnos: 125, activa: true },
  { nombre: 'Ing. Civil', materias: 2, alumnos: 40, activa: false },
]

const css = `
  .materias-root { display:flex; flex-direction:column; flex:1; font-family:'Inter',system-ui,sans-serif; }
  .topbar { display:flex; align-items:center; justify-content:space-between; padding:16px 28px; border-bottom:1px solid #1e2d3d; background:#0b0f14; position:sticky; top:0; z-index:10; }
  .topbar h1 { font-size:18px; font-weight:700; color:#f0f4f8; letter-spacing:-.01em; }
  .topbar p { font-size:11px; color:#506070; margin-top:1px; }
  .topbar-right { display:flex; align-items:center; gap:10px; }
  .topbar-btn { display:flex; align-items:center; justify-content:center; width:34px; height:34px; background:#131920; border:1px solid #243447; border-radius:8px; color:#8fa3b8; cursor:pointer; position:relative; }
  .topbar-btn svg { width:15px; height:15px; }
  .topbar-btn:hover { border-color:#00b4d8; color:#f0f4f8; }
  .topbar-btn .dot { position:absolute; top:6px; right:6px; width:7px; height:7px; background:#ef4444; border-radius:50%; border:2px solid #0b0f14; }
  .avatar { width:34px; height:34px; background:linear-gradient(135deg,#00b4d8,#0ea5e9); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; color:#000; cursor:pointer; }
  .content { padding:24px 28px; flex:1; }
  .toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; }
  .toolbar-left { font-size:13px; color:#8fa3b8; }
  .btn-primary { display:inline-flex; align-items:center; gap:7px; padding:9px 16px; background:#00b4d8; border:none; border-radius:9px; color:#000; font-size:13px; font-weight:700; font-family:inherit; cursor:pointer; transition:opacity .18s; }
  .btn-primary:hover { opacity:.88; }
  .btn-primary svg { width:13px; height:13px; }
  .carreras-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:18px; }
  .carrera-card { background:#131920; border-radius:12px; padding:14px 18px; display:flex; align-items:center; justify-content:space-between; transition:border-color .15s; }
  .carrera-nombre { font-size:14px; font-weight:700; color:#f0f4f8; }
  .carrera-meta { display:flex; gap:16px; }
  .card { background:#131920; border:1px solid #1e2d3d; border-radius:14px; overflow:hidden; }
  .filters { display:flex; gap:12px; padding:14px 20px; border-bottom:1px solid #1e2d3d; }
  .search-input { flex:1; background:#0b0f14; border:1px solid #243447; border-radius:9px; color:#f0f4f8; font-size:13px; font-family:inherit; outline:none; padding:8px 14px; transition:border-color .18s; }
  .search-input:focus { border-color:#00b4d8; }
  .search-input::placeholder { color:#506070; }
  select { background:#0b0f14; border:1px solid #243447; border-radius:9px; color:#f0f4f8; font-size:12px; font-family:inherit; outline:none; padding:8px 32px 8px 12px; cursor:pointer; appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23506070' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 10px center; }
  select option { background:#1a2230; }
  table { width:100%; border-collapse:collapse; }
  thead th { padding:10px 20px; font-size:10px; font-weight:600; color:#506070; text-transform:uppercase; letter-spacing:.07em; text-align:left; border-bottom:1px solid #1e2d3d; white-space:nowrap; }
  tbody td { padding:12px 20px; border-bottom:1px solid #1e2d3d44; vertical-align:middle; }
  tbody tr:last-child td { border-bottom:none; }
  tbody tr:hover { background:#1a2230; }
  .m-nombre { font-size:13px; font-weight:600; color:#f0f4f8; }
  .m-carrera { font-size:12px; color:#8fa3b8; }
  .sem-badge { display:inline-flex; align-items:center; padding:2px 10px; border-radius:20px; font-size:11px; font-weight:600; background:#00b4d818; color:#00b4d8; }
  .accion-btn { background:none; border:none; font-size:12px; font-weight:500; cursor:pointer; font-family:inherit; padding:0; }
  .accion-btn.edit { color:#00b4d8; }
  .accion-btn.del { color:#ef4444; }
  .accion-btn:hover { opacity:.7; }
`

export default function Materias() {
  const [materias] = useState<Materia[]>(materiasIniciales)
  const [busqueda, setBusqueda] = useState('')
  const [filtroCarrera, setFiltroCarrera] = useState('todas')

  const filtradas = materias.filter(m => {
    const coincide = m.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      m.profesor.toLowerCase().includes(busqueda.toLowerCase())
    const carrera = filtroCarrera === 'todas' || m.carrera === filtroCarrera
    return coincide && carrera
  })

  return (
    <>
      <style>{css}</style>
      <div className="materias-root">

        {/* Topbar */}
        <header className="topbar">
          <div>
            <h1>Materias y carreras</h1>
            <p>Panel de administración</p>
          </div>
          <div className="topbar-right">
            <button className="topbar-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
            <button className="topbar-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              <span className="dot" />
            </button>
            <div className="avatar">MG</div>
          </div>
        </header>

        <div className="content">
          <div className="toolbar">
            <div className="toolbar-left">{materias.length} materias registradas</div>
            <button className="btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nueva materia
            </button>
          </div>

          {/* Carreras */}
          <div className="carreras-grid">
            {carreras.map(c => (
              <div key={c.nombre} className="carrera-card" style={{
                border: `1px solid ${c.activa ? '#00b4d8' : '#1e2d3d'}`,
              }}>
                <div className="carrera-nombre">{c.nombre}</div>
                <div className="carrera-meta">
                  <span style={{ fontSize: '12px', fontWeight: 600, color: c.activa ? '#00b4d8' : '#8fa3b8' }}>
                    {c.materias} materias
                  </span>
                  <span style={{ fontSize: '12px', color: '#506070' }}>{c.alumnos} alumnos</span>
                </div>
              </div>
            ))}
          </div>

          {/* Tabla */}
          <div className="card">
            <div className="filters">
              <input
                className="search-input"
                type="text"
                placeholder="Buscar por materia o profesor..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
              <select value={filtroCarrera} onChange={e => setFiltroCarrera(e.target.value)}>
                <option value="todas">Todas las carreras</option>
                <option value="Ing. Informática">Ing. Informática</option>
                <option value="Ing. Civil">Ing. Civil</option>
              </select>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Materia</th>
                  <th>Carrera</th>
                  <th style={{ textAlign: 'center' }}>Año</th>
                  <th style={{ textAlign: 'center' }}>Semestre</th>
                  <th>Profesor</th>
                  <th style={{ textAlign: 'center' }}>Alumnos</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map(m => (
                  <tr key={m.id}>
                    <td><div className="m-nombre">{m.nombre}</div></td>
                    <td><div className="m-carrera">{m.carrera}</div></td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#8fa3b8' }}>{m.anio}°</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="sem-badge">{m.semestre}</span>
                    </td>
                    <td><span style={{ fontSize: '13px', color: '#00b4d8' }}>{m.profesor}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#f0f4f8' }}>{m.alumnos}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="accion-btn edit">Editar</button>
                        <button className="accion-btn del">Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtradas.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#506070', fontSize: '13px' }}>
                      No se encontraron materias
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}