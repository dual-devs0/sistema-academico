import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, decodeToken } from '../lib/api'

interface Materia {
  id: number
  nombre: string
  profesor_id: number
  carrera_id: number | null
  anio: number | null
  semestre: number | null
}

interface Evento {
  id: number
  titulo: string
  tipo: string
  fecha: string
  materia_id: number | null
  carrera_id: number | null
  descripcion: string | null
  creado_por: number | null
}

interface Puntaje {
  id: number
  user_id: number
  materia_id: number
  tipo: string
  valor: number
}

type Tab = 'cursos' | 'historico' | 'agenda'

const TIPO_COLOR: Record<string, string> = {
  parcial:   '#a855f7',
  final:     '#ef4444',
  entrega:   '#f59e0b',
  actividad: '#00b4d8',
  asueto:    '#506070',
  feriado:   '#506070',
}

function periodo(anio: number | null, semestre: number | null) {
  return `${anio ?? '—'} — Sem. ${semestre ?? '—'}`
}

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {[1, 2, 3].map(i => (
        <tr key={i}>
          <td colSpan={cols}>
            <div style={{
              height: 38,
              borderRadius: 6,
              background: 'linear-gradient(90deg,#131920 25%,#1a2230 50%,#131920 75%)',
              backgroundSize: '200% 100%',
              animation: 'mc-shimmer 1.4s infinite',
            }} />
          </td>
        </tr>
      ))}
    </>
  )
}

const css = `
  *, *::before, *::after { box-sizing:border-box; }
  @keyframes mc-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

  .mc-root { display:flex; flex-direction:column; flex:1; font-family:Inter,system-ui,sans-serif; color:#f0f4f8; min-height:0; }

  .mc-topbar {
    display:flex; align-items:center; gap:12px; padding:0 24px;
    height:56px; border-bottom:1px solid #1e2d3d; background:#0b0f14;
    position:sticky; top:0; z-index:20; flex-shrink:0;
  }
  .mc-topbar h1 { font-size:17px; font-weight:700; color:#f0f4f8; letter-spacing:-.01em; margin:0; }
  .mc-tabs { display:flex; gap:4px; margin-left:auto; }
  .mc-tab {
    padding:6px 14px; border-radius:8px; border:1px solid #1e2d3d;
    background:transparent; color:#506070; font-size:12px; font-weight:600;
    font-family:inherit; cursor:pointer; transition:all .15s;
  }
  .mc-tab.active { background:#00b4d818; border-color:#00b4d850; color:#00b4d8; }
  .mc-tab:hover:not(.active) { border-color:#243447; color:#8fa3b8; }

  .mc-content { padding:20px 24px; flex:1; overflow-y:auto; }

  .mc-card { background:#131920; border:1px solid #1e2d3d; border-radius:14px; overflow:hidden; }
  .mc-card-hdr { display:flex; align-items:center; justify-content:space-between; padding:14px 18px; border-bottom:1px solid #1e2d3d; }
  .mc-card-hdr h3 { font-size:13px; font-weight:700; color:#f0f4f8; margin:0; }

  .mc-filter { display:flex; align-items:center; gap:8px; padding:12px 18px; border-bottom:1px solid #1e2d3d; flex-wrap:wrap; }
  .mc-input {
    background:#0d1117; border:1px solid #1e2d3d; border-radius:8px;
    color:#f0f4f8; font-size:12px; font-family:inherit; padding:6px 10px; outline:none;
  }
  .mc-input:focus { border-color:#00b4d850; }
  .mc-select {
    background:#0d1117; border:1px solid #1e2d3d; border-radius:8px;
    color:#f0f4f8; font-size:12px; font-family:inherit; padding:6px 10px;
    outline:none; cursor:pointer;
  }

  .mc-table { width:100%; border-collapse:collapse; }
  .mc-table thead th {
    padding:9px 14px; font-size:9px; font-weight:700; color:#506070;
    text-transform:uppercase; letter-spacing:.07em; text-align:left;
    border-bottom:1px solid #1e2d3d; background:#0d1117; white-space:nowrap;
  }
  .mc-table thead th.c { text-align:center; }
  .mc-table tbody td { padding:11px 14px; border-bottom:1px solid #1e2d3d22; font-size:13px; vertical-align:middle; }
  .mc-table tbody tr:last-child td { border-bottom:none; }
  .mc-table tbody tr:hover td { background:#1a2230; }
  .mc-table td.c { text-align:center; }

  .mc-footer { padding:11px 18px; border-top:1px solid #1e2d3d; font-size:12px; color:#506070; }
  .mc-empty  { text-align:center; padding:40px; color:#506070; font-size:13px; }

  .mc-btn {
    display:inline-flex; align-items:center; gap:5px;
    padding:5px 10px; border-radius:7px; border:1px solid #243447;
    background:transparent; color:#8fa3b8; font-size:11px; font-weight:600;
    font-family:inherit; cursor:pointer; white-space:nowrap; transition:all .15s;
  }
  .mc-btn:hover { border-color:#00b4d850; color:#00b4d8; }
  .mc-btn.accent { background:#00b4d8; border-color:#00b4d8; color:#000; font-weight:700; }
  .mc-btn.accent:hover { opacity:.85; }
  .mc-btn:disabled { opacity:.4; cursor:not-allowed; }

  .mc-badge { display:inline-block; padding:2px 8px; border-radius:20px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; }

  .mc-pagination { display:flex; align-items:center; gap:8px; padding:11px 18px; border-top:1px solid #1e2d3d; }
  .mc-pagination span { flex:1; text-align:center; font-size:12px; color:#506070; }

  @media(max-width:768px){
    .mc-topbar { height:auto; padding:10px 14px; flex-wrap:wrap; gap:8px; }
    .mc-tabs { margin-left:0; }
    .mc-content { padding:14px; }
    .mc-filter { gap:6px; }
  }
`

const PAGE_SIZE = 10

export default function MisCursos() {
  const navigate  = useNavigate()
  const token     = localStorage.getItem('token')
  const userData  = token ? decodeToken(token) : null
  const userId    = userData?.user_id

  const [tab,      setTab]      = useState<Tab>('cursos')
  const [loading,  setLoading]  = useState(true)
  const [materias, setMaterias] = useState<Materia[]>([])
  const [puntajes, setPuntajes] = useState<Puntaje[]>([])
  const [eventos,  setEventos]  = useState<Evento[]>([])

  // Histórico filter state
  const [hNombre,   setHNombre]   = useState('')
  const [hAnio,     setHAnio]     = useState('')
  const [hSemestre, setHSemestre] = useState('')
  const [hApplied,  setHApplied]  = useState({ nombre:'', anio:'', semestre:'' })
  const [hPage,     setHPage]     = useState(1)

  // Agenda filter state
  const [aMateria,   setAMateria]   = useState('')
  const [aTipo,      setATipo]      = useState('')
  const [aApplied,   setAApplied]   = useState({ materia:'', tipo:'' })

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    Promise.allSettled([
      api.get<Materia[]>(`/materias/?profesor_id=${userId}`),
      api.get<Puntaje[]>('/puntajes/'),
      api.get<Evento[]>('/eventos/'),
    ]).then(([mR, pR, eR]) => {
      if (mR.status === 'fulfilled') setMaterias(mR.value ?? [])
      if (pR.status === 'fulfilled') setPuntajes(pR.value ?? [])
      if (eR.status === 'fulfilled') setEventos(eR.value ?? [])
    }).finally(() => setLoading(false))
  }, [userId])

  // Distinct alumno count per materia from puntajes
  const alumnosMap = useMemo(() => {
    const sets: Record<number, Set<number>> = {}
    for (const p of puntajes) {
      if (!sets[p.materia_id]) sets[p.materia_id] = new Set()
      sets[p.materia_id].add(p.user_id)
    }
    const out: Record<number, number> = {}
    for (const [mid, s] of Object.entries(sets)) out[Number(mid)] = s.size
    return out
  }, [puntajes])

  const materiaIds  = useMemo(() => new Set(materias.map(m => m.id)), [materias])
  const materiaName = useMemo(() => {
    const m: Record<number, string> = {}
    for (const mat of materias) m[mat.id] = mat.nombre
    return m
  }, [materias])

  // Histórico filtered + paged
  const hFiltered = useMemo(() => materias.filter(m => {
    if (hApplied.nombre   && !m.nombre.toLowerCase().includes(hApplied.nombre.toLowerCase())) return false
    if (hApplied.anio     && m.anio     !== Number(hApplied.anio))     return false
    if (hApplied.semestre && m.semestre !== Number(hApplied.semestre)) return false
    return true
  }), [materias, hApplied])

  const hTotalPages = Math.max(1, Math.ceil(hFiltered.length / PAGE_SIZE))
  const hPaged      = hFiltered.slice((hPage - 1) * PAGE_SIZE, hPage * PAGE_SIZE)

  // Agenda filtered
  const aFiltered = useMemo(() => {
    return eventos
      .filter(e => {
        if (e.materia_id === null || !materiaIds.has(e.materia_id)) return false
        if (aApplied.materia && e.materia_id !== Number(aApplied.materia)) return false
        if (aApplied.tipo   && e.tipo        !== aApplied.tipo)           return false
        return true
      })
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
  }, [eventos, materiaIds, aApplied])

  // Oportunidad per evento: sequential count of same tipo within same materia
  const oportunidad = useMemo(() => {
    const counter: Record<string, number> = {}
    const out: Record<number, number> = {}
    for (const e of aFiltered) {
      const key = `${e.materia_id}-${e.tipo}`
      counter[key] = (counter[key] ?? 0) + 1
      out[e.id] = counter[key]
    }
    return out
  }, [aFiltered])

  return (
    <>
      <style>{css}</style>
      <div className="mc-root">

        <header className="mc-topbar">
          <h1>Mis Cursos</h1>
          <div className="mc-tabs">
            {([['cursos','Mis Cursos'],['historico','Histórico'],['agenda','Agenda']] as [Tab,string][]).map(([t,l]) => (
              <button key={t} className={`mc-tab${tab===t?' active':''}`} onClick={() => setTab(t)}>{l}</button>
            ))}
          </div>
        </header>

        <div className="mc-content">

          {/* ── TAB 1: MIS CURSOS ── */}
          {tab === 'cursos' && (
            <div className="mc-card">
              <div className="mc-card-hdr">
                <h3>Materias asignadas</h3>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table className="mc-table">
                  <thead>
                    <tr>
                      <th>Asignatura</th>
                      <th className="c">Año</th>
                      <th className="c">Semestre</th>
                      <th className="c">Alumnos</th>
                      <th>Periodo Lectivo</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? <SkeletonRows cols={6} />
                      : materias.length === 0
                      ? <tr><td colSpan={6} className="mc-empty">No tenés materias asignadas este semestre.</td></tr>
                      : materias.map(m => (
                          <tr key={m.id}>
                            <td style={{ fontWeight:600, color:'#f0f4f8' }}>{m.nombre}</td>
                            <td className="c" style={{ color:'#8fa3b8' }}>{m.anio ?? '—'}</td>
                            <td className="c" style={{ color:'#8fa3b8' }}>{m.semestre ?? '—'}</td>
                            <td className="c" style={{ color:'#00b4d8', fontWeight:700 }}>{alumnosMap[m.id] ?? 0}</td>
                            <td style={{ color:'#8fa3b8' }}>{periodo(m.anio, m.semestre)}</td>
                            <td>
                              <div style={{ display:'flex', gap:5 }}>
                                <button className="mc-btn" onClick={() => navigate(`/puntajes?materia_id=${m.id}`)}>Ver Puntajes</button>
                                <button className="mc-btn" onClick={() => navigate(`/asistencia?materia_id=${m.id}`)}>Ver Asistencia</button>
                              </div>
                            </td>
                          </tr>
                        ))
                    }
                  </tbody>
                </table>
              </div>
              <div className="mc-footer">Total Cursos Actuales: {loading ? '…' : materias.length}</div>
            </div>
          )}

          {/* ── TAB 2: HISTÓRICO ── */}
          {tab === 'historico' && (
            <div className="mc-card">
              <div className="mc-filter">
                <input
                  className="mc-input"
                  placeholder="Asignatura…"
                  value={hNombre}
                  onChange={e => setHNombre(e.target.value)}
                  style={{ width:160 }}
                />
                <input
                  className="mc-input"
                  type="number"
                  placeholder="Año"
                  value={hAnio}
                  onChange={e => setHAnio(e.target.value)}
                  style={{ width:80 }}
                />
                <select className="mc-select" value={hSemestre} onChange={e => setHSemestre(e.target.value)}>
                  <option value="">Semestre</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                </select>
                <button className="mc-btn accent" onClick={() => { setHApplied({ nombre:hNombre, anio:hAnio, semestre:hSemestre }); setHPage(1) }}>Buscar</button>
                <button className="mc-btn" onClick={() => { setHNombre(''); setHAnio(''); setHSemestre(''); setHApplied({ nombre:'', anio:'', semestre:'' }); setHPage(1) }}>Limpiar</button>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table className="mc-table">
                  <thead>
                    <tr>
                      <th>Asignatura</th>
                      <th className="c">Año</th>
                      <th className="c">Semestre</th>
                      <th className="c">Alumnos</th>
                      <th>Periodo Lectivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? <SkeletonRows cols={5} />
                      : hPaged.length === 0
                      ? <tr><td colSpan={5} className="mc-empty">Sin resultados.</td></tr>
                      : hPaged.map(m => (
                          <tr key={m.id}>
                            <td style={{ fontWeight:600, color:'#f0f4f8' }}>{m.nombre}</td>
                            <td className="c" style={{ color:'#8fa3b8' }}>{m.anio ?? '—'}</td>
                            <td className="c" style={{ color:'#8fa3b8' }}>{m.semestre ?? '—'}</td>
                            <td className="c" style={{ color:'#00b4d8', fontWeight:700 }}>{alumnosMap[m.id] ?? 0}</td>
                            <td style={{ color:'#8fa3b8' }}>{periodo(m.anio, m.semestre)}</td>
                          </tr>
                        ))
                    }
                  </tbody>
                </table>
              </div>
              <div className="mc-pagination">
                <button className="mc-btn" disabled={hPage <= 1} onClick={() => setHPage(p => p - 1)}>Anterior</button>
                <span>Pág. {hPage} de {hTotalPages}</span>
                <button className="mc-btn" disabled={hPage >= hTotalPages} onClick={() => setHPage(p => p + 1)}>Siguiente</button>
              </div>
              <div className="mc-footer">Total Cursos Históricos: {loading ? '…' : hFiltered.length}</div>
            </div>
          )}

          {/* ── TAB 3: AGENDA ── */}
          {tab === 'agenda' && (
            <div className="mc-card">
              <div className="mc-filter">
                <select className="mc-select" value={aMateria} onChange={e => setAMateria(e.target.value)} style={{ minWidth:160 }}>
                  <option value="">Todas las materias</option>
                  {materias.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
                <select className="mc-select" value={aTipo} onChange={e => setATipo(e.target.value)}>
                  <option value="">Tipo</option>
                  <option value="parcial">Parcial</option>
                  <option value="final">Final</option>
                  <option value="entrega">Entrega</option>
                  <option value="actividad">Actividad</option>
                  <option value="asueto">Asueto</option>
                  <option value="feriado">Feriado</option>
                </select>
                <button className="mc-btn accent" onClick={() => setAApplied({ materia:aMateria, tipo:aTipo })}>Buscar</button>
                <button className="mc-btn" onClick={() => { setAMateria(''); setATipo(''); setAApplied({ materia:'', tipo:'' }) }}>Limpiar</button>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table className="mc-table">
                  <thead>
                    <tr>
                      <th>Asignatura</th>
                      <th>Tipo</th>
                      <th>Descripción</th>
                      <th>Fecha</th>
                      <th className="c">Oportunidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? <SkeletonRows cols={5} />
                      : aFiltered.length === 0
                      ? <tr><td colSpan={5} className="mc-empty">No hay eventos registrados para tus materias.</td></tr>
                      : aFiltered.map(e => {
                          const col = TIPO_COLOR[e.tipo] ?? '#506070'
                          return (
                            <tr key={e.id}>
                              <td style={{ fontWeight:600, color:'#f0f4f8' }}>
                                {e.materia_id ? (materiaName[e.materia_id] ?? '—') : '—'}
                              </td>
                              <td>
                                <span className="mc-badge" style={{ background:`${col}22`, color:col }}>{e.tipo}</span>
                              </td>
                              <td style={{ color:'#8fa3b8', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                {e.descripcion || e.titulo}
                              </td>
                              <td style={{ color:'#8fa3b8', whiteSpace:'nowrap' }}>
                                {new Date(e.fecha + 'T00:00:00').toLocaleDateString('es-PY')}
                              </td>
                              <td className="c" style={{ color:'#f0f4f8', fontWeight:700 }}>{oportunidad[e.id] ?? 1}</td>
                            </tr>
                          )
                        })
                    }
                  </tbody>
                </table>
              </div>
              <div className="mc-footer">Total eventos: {loading ? '…' : aFiltered.length}</div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
