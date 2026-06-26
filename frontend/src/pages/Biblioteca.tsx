import { useState } from 'react'

interface Apunte {
  id: number
  titulo: string
  materia: string
  carrera: string
  anio: number
  semestre: number
  autor: string
  fecha: string
  tags: string[]
}

const apuntesIniciales: Apunte[] = [
  { id: 1, titulo: 'Resumen Análisis Matemático I — Unidad 1 y 2', materia: 'Análisis Matemático I', carrera: 'Ing. Informática', anio: 1, semestre: 1, autor: 'María González', fecha: '14/3/2026', tags: ['limites', 'derivadas', 'resumen'] },
  { id: 2, titulo: 'Ejercicios resueltos Física I — Cinemática', materia: 'Física I', carrera: 'Ing. Informática', anio: 1, semestre: 1, autor: 'Luis Paredes', fecha: '19/3/2026', tags: ['cinemática', 'ejercicios', 'parcial'] },
  { id: 3, titulo: 'Guía completa Programación I — Punteros', materia: 'Programación I', carrera: 'Ing. Informática', anio: 1, semestre: 1, autor: 'Ana Torres', fecha: '31/3/2026', tags: ['punteros', 'C++', 'guía'] },
  { id: 4, titulo: 'Apuntes Matemática Discreta — Grafos', materia: 'Matemática Discreta', carrera: 'Ing. Informática', anio: 1, semestre: 2, autor: 'Carlos Méndez', fecha: '9/4/2026', tags: ['grafos', 'teoría', 'apuntes'] },
  { id: 5, titulo: 'Resumen Resistencia de Materiales', materia: 'Resistencia de Materiales', carrera: 'Ing. Civil', anio: 2, semestre: 1, autor: 'Pedro Rojas', fecha: '4/4/2026', tags: ['tensión', 'deformación', 'resumen'] },
]

const css = `
  .bib-root { display:flex; flex-direction:column; flex:1; font-family:'Inter',system-ui,sans-serif; }
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
  .toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
  .toolbar-left { font-size:13px; color:#8fa3b8; }
  .btn-primary { display:inline-flex; align-items:center; gap:7px; padding:9px 16px; background:#00b4d8; border:none; border-radius:9px; color:#000; font-size:13px; font-weight:700; font-family:inherit; cursor:pointer; transition:opacity .18s; }
  .btn-primary:hover { opacity:.88; }
  .btn-primary svg { width:13px; height:13px; }
  .filters { display:flex; gap:12px; margin-bottom:20px; }
  .search-input { flex:1; background:#131920; border:1px solid #243447; border-radius:9px; color:#f0f4f8; font-size:13px; font-family:inherit; outline:none; padding:9px 14px; transition:border-color .18s; }
  .search-input:focus { border-color:#00b4d8; }
  .search-input::placeholder { color:#506070; }
  select { background:#131920; border:1px solid #243447; border-radius:9px; color:#f0f4f8; font-size:12px; font-family:inherit; outline:none; padding:8px 32px 8px 12px; cursor:pointer; appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23506070' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 10px center; width:160px; }
  select option { background:#1a2230; }
  .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
  .apunte-card { background:#131920; border:1px solid #1e2d3d; border-radius:14px; padding:18px; display:flex; flex-direction:column; gap:10px; transition:border-color .15s; cursor:default; }
  .apunte-card:hover { border-color:#243447; }
  .apunte-top { display:flex; gap:10px; align-items:flex-start; }
  .apunte-icon { width:32px; height:32px; background:#3b82f618; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; color:#3b82f6; }
  .apunte-icon svg { width:15px; height:15px; }
  .apunte-titulo { font-size:13px; font-weight:600; color:#f0f4f8; line-height:1.35; }
  .apunte-materia { font-size:11px; color:#00b4d8; margin-top:2px; }
  .apunte-meta { font-size:11px; color:#506070; line-height:1.6; }
  .tags { display:flex; flex-wrap:wrap; gap:4px; }
  .tag { background:#131920; border:1px solid #243447; border-radius:4px; padding:2px 7px; font-size:10px; color:#506070; }
  .btn-download { width:100%; padding:8px; background:#1a2230; border:1px solid #243447; border-radius:8px; color:#00b4d8; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; transition:border-color .15s; }
  .btn-download:hover { border-color:#00b4d8; }
  .empty { text-align:center; padding:60px; color:#506070; font-size:13px; }
`

export default function Biblioteca() {
  const [apuntes] = useState<Apunte[]>(apuntesIniciales)
  const [busqueda, setBusqueda] = useState('')
  const [filtroCarrera, setFiltroCarrera] = useState('Todas')
  const [filtroMateria, setFiltroMateria] = useState('Todas')

  const materias = ['Todas', ...new Set(apuntes.map(a => a.materia))]

  const filtrados = apuntes.filter(a => {
    const coincide = a.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.tags.some(t => t.toLowerCase().includes(busqueda.toLowerCase())) ||
      a.autor.toLowerCase().includes(busqueda.toLowerCase())
    const carrera = filtroCarrera === 'Todas' || a.carrera === filtroCarrera
    const materia = filtroMateria === 'Todas' || a.materia === filtroMateria
    return coincide && carrera && materia
  })

  return (
    <>
      <style>{css}</style>
      <div className="bib-root">

        {/* Topbar */}
        <header className="topbar">
          <div>
            <h1>Biblioteca de apuntes</h1>
            <p>Semestre 1 — 2026</p>
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
            <div className="toolbar-left">{filtrados.length} apuntes disponibles</div>
            <button className="btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Subir apunte
            </button>
          </div>

          <div className="filters">
            <input
              className="search-input"
              type="text"
              placeholder="Buscar por título, tag o autor..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            <select value={filtroCarrera} onChange={e => setFiltroCarrera(e.target.value)}>
              <option>Todas</option>
              <option>Ing. Informática</option>
              <option>Ing. Civil</option>
            </select>
            <select value={filtroMateria} onChange={e => setFiltroMateria(e.target.value)}>
              {materias.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>

          {filtrados.length === 0 ? (
            <div className="empty">No se encontraron apuntes con esos filtros.</div>
          ) : (
            <div className="grid">
              {filtrados.map(a => (
                <div key={a.id} className="apunte-card">
                  <div className="apunte-top">
                    <div className="apunte-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                    </div>
                    <div>
                      <div className="apunte-titulo">{a.titulo}</div>
                      <div className="apunte-materia">{a.materia}</div>
                    </div>
                  </div>
                  <div className="apunte-meta">
                    {a.carrera} · {a.anio}° año · Sem. {a.semestre}<br />
                    {a.autor} · {a.fecha}
                  </div>
                  <div className="tags">
                    {a.tags.map(t => <span key={t} className="tag">#{t}</span>)}
                  </div>
                  <button className="btn-download">Ver / Descargar</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}