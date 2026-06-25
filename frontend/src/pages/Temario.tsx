import { useState } from 'react'

interface Clase {
  semana: number
  titulo: string
  descripcion: string
  completada: boolean
}

interface MateriaTemario {
  materia: string
  profesor: string
  clases: Clase[]
}

const temarios: MateriaTemario[] = [
  {
    materia: 'Análisis Matemático I',
    profesor: 'Carlos Méndez',
    clases: [
      { semana: 1, titulo: 'Introducción a límites', descripcion: 'Concepto de límite, límites laterales, propiedades. Bibliografía: Stewart Cap. 2', completada: true },
      { semana: 2, titulo: 'Continuidad de funciones', descripcion: 'Funciones continuas, discontinuidades, teorema del valor intermedio.', completada: true },
      { semana: 3, titulo: 'Derivadas - definición', descripcion: 'Definición formal de derivada, reglas de derivación básicas.', completada: true },
      { semana: 4, titulo: 'Regla de la cadena', descripcion: 'Derivadas de funciones compuestas, derivadas implícitas.', completada: false },
      { semana: 5, titulo: 'Aplicaciones de derivadas', descripcion: 'Máximos y mínimos, optimización, regla de L\'Hôpital.', completada: false },
      { semana: 6, titulo: 'Integrales indefinidas', descripcion: 'Antiderivadas, técnicas de integración básicas.', completada: false },
    ],
  },
  {
    materia: 'Física I',
    profesor: 'Ana Torres',
    clases: [
      { semana: 1, titulo: 'Cinemática en 1D', descripcion: 'Posición, velocidad, aceleración. MRU y MRUA.', completada: true },
      { semana: 2, titulo: 'Cinemática en 2D', descripcion: 'Vectores, movimiento parabólico, movimiento circular.', completada: true },
      { semana: 3, titulo: 'Leyes de Newton', descripcion: 'Primera, segunda y tercera ley. Aplicaciones.', completada: true },
      { semana: 4, titulo: 'Trabajo y energía', descripcion: 'Trabajo de una fuerza, energía cinética, teorema trabajo-energía.', completada: false },
      { semana: 5, titulo: 'Energía potencial', descripcion: 'Fuerzas conservativas, energía potencial gravitatoria y elástica.', completada: false },
    ],
  },
  {
    materia: 'Programación I',
    profesor: 'Luis Paredes',
    clases: [
      { semana: 1, titulo: 'Introducción a C++', descripcion: 'Historia, compilación, primer programa. Variables y tipos de datos.', completada: true },
      { semana: 2, titulo: 'Estructuras de control', descripcion: 'If-else, switch, bucles for y while.', completada: true },
      { semana: 3, titulo: 'Funciones', descripcion: 'Declaración, definición, parámetros, valor de retorno, recursividad.', completada: true },
      { semana: 4, titulo: 'Arrays y strings', descripcion: 'Arrays unidimensionales y multidimensionales, manejo de strings.', completada: false },
      { semana: 5, titulo: 'Punteros', descripcion: 'Concepto de puntero, aritmética de punteros, punteros y arrays.', completada: false },
    ],
  },
]

export default function Temario() {
  const [materiaActiva, setMateriaActiva] = useState(temarios[0].materia)
  const [claseAbierta, setClaseAbierta] = useState<number | null>(null)

  const temario = temarios.find(t => t.materia === materiaActiva)!
  const completadas = temario.clases.filter(c => c.completada).length
  const progreso = Math.round((completadas / temario.clases.length) * 100)

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Temario de clases
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Cronograma semanal por materia</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '16px' }}>

        {/* Lista materias */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '12px',
          height: 'fit-content',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', padding: '0 4px' }}>
            Materias
          </div>
          {temarios.map(t => {
            const comp = t.clases.filter(c => c.completada).length
            const pct = Math.round((comp / t.clases.length) * 100)
            const active = materiaActiva === t.materia
            return (
              <button
                key={t.materia}
                onClick={() => { setMateriaActiva(t.materia); setClaseAbierta(null) }}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '10px 12px', borderRadius: '8px',
                  border: 'none', cursor: 'pointer',
                  background: active ? 'var(--accent-subtle)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text-secondary)',
                  marginBottom: '2px',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={e => {
                  if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'
                }}
                onMouseLeave={e => {
                  if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: active ? 500 : 400, marginBottom: '4px' }}>
                  {t.materia}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{pct}% completado</div>
              </button>
            )
          })}
        </div>

        {/* Contenido */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Header materia */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                  {temario.materia}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Prof. {temario.profesor}</div>
              </div>
              <span style={{ fontSize: '20px', fontWeight: 600, color: 'var(--accent)' }}>{progreso}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'var(--bg-hover)', borderRadius: '3px', marginBottom: '8px' }}>
              <div style={{
                width: `${progreso}%`, height: '6px',
                background: 'var(--accent)', borderRadius: '3px',
                transition: 'width 300ms ease',
              }} />
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {completadas} de {temario.clases.length} clases completadas
            </div>
          </div>

          {/* Clases */}
          {temario.clases.map(c => (
            <div key={c.semana} style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              overflow: 'hidden',
            }}>
              <button
                onClick={() => setClaseAbierta(claseAbierta === c.semana ? null : c.semana)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '16px',
                  padding: '16px 20px', border: 'none', cursor: 'pointer',
                  background: 'transparent', textAlign: 'left',
                  transition: 'background 150ms ease',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
              >
                {/* Indicador */}
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontSize: '12px', fontWeight: 600,
                  background: c.completada ? 'var(--success-subtle)' : 'var(--bg-hover)',
                  color: c.completada ? 'var(--success)' : 'var(--text-muted)',
                }}>
                  {c.completada ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  ) : c.semana}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Semana {c.semana}</span>
                    {c.completada && (
                      <span style={{
                        fontSize: '10px', fontWeight: 500,
                        background: 'var(--success-subtle)',
                        color: 'var(--success)',
                        padding: '1px 8px', borderRadius: '20px',
                      }}>Completada</span>
                    )}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {c.titulo}
                  </div>
                </div>

                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ color: 'var(--text-muted)', transition: 'transform 150ms ease', transform: claseAbierta === c.semana ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>

              {claseAbierta === c.semana && (
                <div style={{
                  padding: '0 20px 16px 68px',
                  borderTop: '1px solid var(--border-subtle)',
                }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: '12px' }}>
                    {c.descripcion}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}