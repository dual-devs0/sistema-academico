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

export default function Materias() {
  const [materias] = useState<Materia[]>(materiasIniciales)
  const [busqueda, setBusqueda] = useState('')
  const [filtroCarrera, setFiltroCarrera] = useState('todas')

  const carreras = [...new Set(materias.map(m => m.carrera))]

  const filtradas = materias.filter(m => {
    const coincide = m.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      m.profesor.toLowerCase().includes(busqueda.toLowerCase())
    const carrera = filtroCarrera === 'todas' || m.carrera === filtroCarrera
    return coincide && carrera
  })

  const inputStyle = {
    background: 'var(--bg-base)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '9px 14px',
    fontSize: '13px',
    color: 'var(--text-primary)',
    outline: 'none',
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Materias y carreras
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{materias.length} materias registradas</p>
        </div>
        <button style={{
          background: 'var(--accent)', border: 'none',
          borderRadius: '8px', padding: '9px 16px',
          fontSize: '13px', fontWeight: 500, color: 'white',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nueva materia
        </button>
      </div>

      {/* Stats por carrera */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {carreras.map(c => {
          const count = materias.filter(m => m.carrera === c).length
          const totalAlumnos = materias.filter(m => m.carrera === c).reduce((a, m) => a + m.alumnos, 0)
          return (
            <div key={c} style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{c}</div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--accent)' }}>{count} materias</span>
                <span>{totalAlumnos} alumnos</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Buscar por materia o profesor..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ ...inputStyle, flex: 1 }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <select
          value={filtroCarrera}
          onChange={e => setFiltroCarrera(e.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          <option value="todas">Todas las carreras</option>
          {carreras.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-base)' }}>
              {['Materia', 'Carrera', 'Año', 'Semestre', 'Profesor', 'Alumnos', 'Acciones'].map(h => (
                <th key={h} style={{
                  padding: '10px 20px',
                  textAlign: ['Año', 'Semestre', 'Alumnos', 'Acciones'].includes(h) ? 'center' : 'left',
                  fontSize: '11px', fontWeight: 500,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtradas.map(m => (
              <tr key={m.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '12px 20px', fontWeight: 500, color: 'var(--text-primary)' }}>{m.nombre}</td>
                <td style={{ padding: '12px 20px', color: 'var(--text-muted)' }}>{m.carrera}</td>
                <td style={{ padding: '12px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>{m.anio}°</td>
                <td style={{ padding: '12px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>{m.semestre}</td>
                <td style={{ padding: '12px 20px', color: 'var(--text-muted)' }}>{m.profesor}</td>
                <td style={{ padding: '12px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>{m.alumnos}</td>
                <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                  <button style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '12px', cursor: 'pointer', marginRight: '12px' }}>Editar</button>
                  <button style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '12px', cursor: 'pointer' }}>Eliminar</button>
                </td>
              </tr>
            ))}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No se encontraron materias
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}