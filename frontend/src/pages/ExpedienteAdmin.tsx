import { useState, useEffect } from 'react'
import { api, emitToast } from '../lib/api'
import {
  cerrarMateria, obtenerExpediente, obtenerRegularidad,
  type ExpedienteAlumnoOut, type RegularidadOut,
} from '../services/expedienteService'

type Alumno = { id: number; username: string; nombre: string; carrera_id: number | null }
type Inscripcion = { id: number; alumno_id: number; materia_id: number; oferta_materia_id: number }
type Materia = { id: number; nombre: string }

const condicionBadge: Record<string, { bg: string; color: string; label: string }> = {
  aprobada: { bg: 'var(--success-subtle)', color: 'var(--success)', label: 'Aprobada' },
  reprobada: { bg: 'var(--danger-subtle)', color: 'var(--danger)', label: 'Reprobada' },
}

const regularidadBadge: Record<string, { bg: string; color: string; label: string }> = {
  activo: { bg: 'var(--success-subtle)', color: 'var(--success)', label: 'Activo' },
  en_riesgo: { bg: 'var(--warning-subtle)', color: 'var(--warning)', label: 'En riesgo' },
  irregular: { bg: 'var(--danger-subtle)', color: 'var(--danger)', label: 'Irregular' },
  de_baja: { bg: 'rgba(148,163,184,0.12)', color: 'var(--text-secondary)', label: 'De baja' },
}

export default function ExpedienteAdmin() {
  const [busqueda, setBusqueda] = useState('')
  const [busquedaDebounced, setBusquedaDebounced] = useState('')
  const [resultados, setResultados] = useState<Alumno[]>([])
  const [alumno, setAlumno] = useState<Alumno | null>(null)

  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([])
  const [materiasMap, setMateriasMap] = useState<Map<number, string>>(new Map())
  const [ofertaSeleccionada, setOfertaSeleccionada] = useState('')
  const [cerrando, setCerrando] = useState(false)

  const [expediente, setExpediente] = useState<ExpedienteAlumnoOut | null>(null)
  const [regularidad, setRegularidad] = useState<RegularidadOut | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setBusquedaDebounced(busqueda), 300)
    return () => clearTimeout(t)
  }, [busqueda])

  useEffect(() => {
    if (!busquedaDebounced) return
    api.get<{ items: Alumno[] }>(`/users/?role=alumno&q=${encodeURIComponent(busquedaDebounced)}&limit=8`)
      .then(res => setResultados(res.items))
      .catch(() => setResultados([]))
  }, [busquedaDebounced])

  function seleccionarAlumno(a: Alumno) {
    setAlumno(a)
    setResultados([])
    setBusqueda('')
    setOfertaSeleccionada('')
  }

  function cargarDatosAlumno() {
    if (!alumno) return
    setLoading(true)
    // Usamos el filtro alumno_id del backend para traer solo las inscripciones de este alumno
    Promise.all([
      api.get<Inscripcion[]>(`/inscripciones/?alumno_id=${alumno.id}`),
      alumno.carrera_id ? api.get<Materia[]>(`/materias/?carrera_id=${alumno.carrera_id}`) : Promise.resolve([] as Materia[]),
      obtenerExpediente(alumno.id),
      obtenerRegularidad(alumno.id),
    ])
      .then(([inscs, materias, exp, reg]) => {
        // Ya vienen filtradas por alumno_id desde el backend
        setInscripciones(inscs)
        setMateriasMap(new Map(materias.map(m => [m.id, m.nombre])))
        setExpediente(exp)
        setRegularidad(reg)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(cargarDatosAlumno, [alumno])

  async function handleCerrarMateria() {
    if (!alumno || !ofertaSeleccionada) { emitToast('Seleccioná una materia', 'warning'); return }
    setCerrando(true)
    try {
      await cerrarMateria(alumno.id, Number(ofertaSeleccionada))
      emitToast('Materia cerrada en el expediente')
      setOfertaSeleccionada('')
      cargarDatosAlumno()
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al cerrar materia', 'error')
    } finally { setCerrando(false) }
  }

  const rBadge = regularidad ? (regularidadBadge[regularidad.estado] ?? regularidadBadge.activo) : null

  return (
    <>
      <h1 className="page-title">Expediente Académico</h1>
      <p className="page-subtitle" style={{ marginBottom: 18 }}>Cerrá materias cursadas y consultá PPA/regularidad de cualquier alumno.</p>

      <div className="card" style={{ marginBottom: 20, position: 'relative' }}>
        <div className="mono-label" style={{ marginBottom: 6 }}>Buscar alumno</div>
        <input
          className="input-uca" placeholder="Nombre o documento…"
          value={alumno ? (alumno.nombre || alumno.username) : busqueda}
          onChange={e => { setAlumno(null); setBusqueda(e.target.value) }}
        />
        {resultados.length > 0 && (
          <div className="card card-elevated" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, padding: 6, marginTop: 4 }}>
            {resultados.map(a => (
              <button
                key={a.id} onClick={() => seleccionarAlumno(a)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 13 }}
              >
                {a.nombre || a.username} <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>({a.username})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!alumno ? (
        <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>
          Buscá un alumno para ver o cerrar su expediente.
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{alumno.nombre || alumno.username}</div>
                {rBadge && (
                  <span className="badge" style={{ background: rBadge.bg, color: rBadge.color, marginTop: 6, display: 'inline-block' }}>{rBadge.label}</span>
                )}
                {regularidad?.motivo && <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 6 }}>{regularidad.motivo}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select className="input-uca" value={ofertaSeleccionada} onChange={e => setOfertaSeleccionada(e.target.value)} style={{ minWidth: 220 }}>
                  <option value="">Seleccionar materia a cerrar…</option>
                  {inscripciones.map(i => (
                    <option key={i.id} value={i.oferta_materia_id}>{materiasMap.get(i.materia_id) ?? `Materia #${i.materia_id}`}</option>
                  ))}
                </select>
                <button className="btn-primary" disabled={cerrando} onClick={handleCerrarMateria}>
                  {cerrando ? 'Cerrando…' : 'Cerrar materia'}
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>Cargando…</div>
          ) : !expediente || expediente.materias.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>
              Este alumno todavía no tiene materias cerradas en su expediente.
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {expediente.materias.map(m => {
                const b = condicionBadge[m.condicion]
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{m.materia_nombre}</div>
                      <div className="mono-label" style={{ fontSize: 9.5, marginTop: 2 }}>{m.periodo}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className="mono-label" style={{ fontSize: 9.5 }}>{m.creditos} créd.</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 14 }}>{m.nota_final}</span>
                      <span className="badge" style={{ background: b.bg, color: b.color }}>{b.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </>
  )
}
