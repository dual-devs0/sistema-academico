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
  aprobado: boolean
}

const apuntesIniciales: Apunte[] = [
  { id: 1, titulo: 'Resumen Análisis Matemático I - Unidad 1 y 2', materia: 'Análisis Matemático I', carrera: 'Ing. Informática', anio: 1, semestre: 1, autor: 'María González', fecha: '2026-03-15', tags: ['límites', 'derivadas', 'resumen'], aprobado: true },
  { id: 2, titulo: 'Ejercicios resueltos Física I - Cinemática', materia: 'Física I', carrera: 'Ing. Informática', anio: 1, semestre: 1, autor: 'Luis Paredes', fecha: '2026-03-20', tags: ['cinemática', 'ejercicios', 'parcial'], aprobado: true },
  { id: 3, titulo: 'Guía completa Programación I - Punteros', materia: 'Programación I', carrera: 'Ing. Informática', anio: 1, semestre: 1, autor: 'Ana Torres', fecha: '2026-04-01', tags: ['punteros', 'C++', 'guía'], aprobado: true },
  { id: 4, titulo: 'Apuntes Matemática Discreta - Grafos', materia: 'Matemática Discreta', carrera: 'Ing. Informática', anio: 1, semestre: 2, autor: 'Carlos Méndez', fecha: '2026-04-10', tags: ['grafos', 'teoría', 'apuntes'], aprobado: true },
  { id: 5, titulo: 'Resumen Resistencia de Materiales', materia: 'Resistencia de Materiales', carrera: 'Ing. Civil', anio: 2, semestre: 1, autor: 'Pedro Rojas', fecha: '2026-04-05', tags: ['tensión', 'deformación', 'resumen'], aprobado: true },
  { id: 6, titulo: 'Ejercicios Mecánica de Suelos', materia: 'Mecánica de Suelos', carrera: 'Ing. Civil', anio: 3, semestre: 1, autor: 'Ana Torres', fecha: '2026-04-12', tags: ['suelos', 'ejercicios'], aprobado: false },
]

const carreras = ['Todas', 'Ing. Informática', 'Ing. Civil']

export default function Biblioteca() {
  const [apuntes] = useState<Apunte[]>(apuntesIniciales)
  const [busqueda, setBusqueda] = useState('')
  const [filtroCarrera, setFiltroCarrera] = useState('Todas')
  const [filtroMateria, setFiltroMateria] = useState('Todas')

  const materias = ['Todas', ...new Set(apuntes.map(a => a.materia))]

  const filtrados = apuntes.filter(a => {
    if (!a.aprobado) return false
    const coincide = a.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.tags.some(t => t.toLowerCase().includes(busqueda.toLowerCase())) ||
      a.autor.toLowerCase().includes(busqueda.toLowerCase())
    const carrera = filtroCarrera === 'Todas' || a.carrera === filtroCarrera
    const materia = filtroMateria === 'Todas' || a.materia === filtroMateria
    return coincide && carrera && materia
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
            Biblioteca de apuntes
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{filtrados.length} apuntes disponibles</p>
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
          Subir apunte
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar por título, tag o autor..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: '200px' }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <select
          value={filtroCarrera}
          onChange={e => setFiltroCarrera(e.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          {carreras.map(c => <option key={c}>{c}</option>)}
        </select>
        <select
          value={filtroMateria}
          onChange={e => setFiltroMateria(e.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          {materias.map(m => <option key={m}>{m}</option>)}
        </select>
      </div>

      {/* Grid */}
      {filtrados.length === 0 ? (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '60px',
          textAlign: 'center',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }}>
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
          </svg>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No se encontraron apuntes</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {filtrados.map(a => (
            <div key={a.id} style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '16px',
              transition: 'border-color 150ms ease',
              cursor: 'default',
            }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'}
            >
              {/* Icono y título */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '36px', height: '36px',
                  background: 'var(--accent-subtle)',
                  borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)' }}>
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: '4px' }}>
                    {a.titulo}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--accent)' }}>{a.materia}</div>
                </div>
              </div>

              {/* Info */}
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.6 }}>
                <div>{a.carrera} · {a.anio}° año · Sem. {a.semestre}</div>
                <div>{a.autor} · {new Date(a.fecha).toLocaleDateString('es-PY')}</div>
              </div>

              {/* Tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                {a.tags.map(t => (
                  <span key={t} style={{
                    background: 'var(--bg-hover)',
                    color: 'var(--text-muted)',
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: '20px',
                  }}>#{t}</span>
                ))}
              </div>

              {/* Botón */}
              <button style={{
                width: '100%',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '7px',
                fontSize: '12px',
                color: 'var(--accent)',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-subtle)'
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
                }}
              >
                Ver / Descargar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}