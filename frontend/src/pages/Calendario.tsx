import { useState } from 'react'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

type TipoEvento = 'parcial' | 'final' | 'feriado' | 'asueto' | 'entrega' | 'actividad'

interface Evento {
  date: string
  tipo: TipoEvento
  nombre: string
  materia: string
}

const eventos: Evento[] = [
  { date: '2026-03-10', tipo: 'actividad', nombre: 'Inicio del semestre', materia: 'General' },
  { date: '2026-03-20', tipo: 'entrega', nombre: 'TP Nº1 - Cálculo', materia: 'Análisis Matemático I' },
  { date: '2026-04-02', tipo: 'feriado', nombre: 'Semana Santa', materia: 'General' },
  { date: '2026-04-15', tipo: 'parcial', nombre: 'Parcial 1 - Física I', materia: 'Física I' },
  { date: '2026-04-17', tipo: 'parcial', nombre: 'Parcial 1 - Mat. Discreta', materia: 'Matemática Discreta' },
  { date: '2026-04-22', tipo: 'parcial', nombre: 'Parcial 1 - Análisis', materia: 'Análisis Matemático I' },
  { date: '2026-05-01', tipo: 'asueto', nombre: 'Día del Trabajador', materia: 'General' },
  { date: '2026-05-14', tipo: 'asueto', nombre: 'Independencia PY', materia: 'General' },
  { date: '2026-05-15', tipo: 'asueto', nombre: 'Independencia PY', materia: 'General' },
  { date: '2026-06-10', tipo: 'parcial', nombre: 'Parcial 2 - Física I', materia: 'Física I' },
  { date: '2026-06-18', tipo: 'entrega', nombre: 'TP Nº2 - Cálculo', materia: 'Análisis Matemático I' },
  { date: '2026-06-25', tipo: 'parcial', nombre: 'Parcial 2 - Análisis', materia: 'Análisis Matemático I' },
  { date: '2026-08-05', tipo: 'final', nombre: 'Final - Física I', materia: 'Física I' },
  { date: '2026-08-07', tipo: 'final', nombre: 'Final - Mat. Discreta', materia: 'Matemática Discreta' },
  { date: '2026-08-12', tipo: 'final', nombre: 'Final - Análisis', materia: 'Análisis Matemático I' },
]

const tipoEstilo: Record<TipoEvento, { color: string; bg: string; dot: string }> = {
  parcial:   { color: 'var(--purple)',  bg: 'var(--purple-subtle)',  dot: '#A78BFA' },
  final:     { color: 'var(--danger)',  bg: 'var(--danger-subtle)',  dot: '#F87171' },
  feriado:   { color: 'var(--text-muted)', bg: 'var(--bg-hover)',   dot: '#555B73' },
  asueto:    { color: 'var(--success)', bg: 'var(--success-subtle)', dot: '#34D399' },
  entrega:   { color: 'var(--amber)',   bg: 'var(--amber-subtle)',   dot: '#FCD34D' },
  actividad: { color: 'var(--accent)',  bg: 'var(--accent-subtle)',  dot: '#4F8EF7' },
}

function eventosDelDia(y: number, m: number, d: number) {
  const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  return eventos.filter(e => e.date === key)
}

export default function Calendario() {
  const hoy = new Date()
  const [actual, setActual] = useState(new Date(2026, 3, 1))
  const [seleccionados, setSeleccionados] = useState<Evento[]>([])
  const [diaSeleccionado, setDiaSeleccionado] = useState('')

  const y = actual.getFullYear()
  const m = actual.getMonth()
  const primerDia = new Date(y, m, 1).getDay()
  const diasEnMes = new Date(y, m + 1, 0).getDate()

  const proximosEventos = eventos
    .filter(e => new Date(e.date) >= hoy)
    .slice(0, 5)

  function seleccionarDia(d: number) {
    const evs = eventosDelDia(y, m, d)
    setSeleccionados(evs)
    setDiaSeleccionado(`${d} de ${MESES[m]} ${y}`)
  }

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Calendario académico
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Semestre 1 — 2026</p>
      </div>

      {/* Leyenda */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        {(Object.entries(tipoEstilo) as [TipoEvento, typeof tipoEstilo[TipoEvento]][]).map(([tipo, estilo]) => (
          <div key={tipo} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: estilo.dot }} />
            <span style={{ textTransform: 'capitalize' }}>{tipo}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '16px' }}>

        {/* Calendario */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '20px',
        }}>
          {/* Navegación */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <button
              onClick={() => setActual(new Date(y, m - 1, 1))}
              style={{
                background: 'var(--bg-hover)', border: 'none',
                borderRadius: '8px', padding: '6px 12px',
                fontSize: '13px', color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >← Anterior</button>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {MESES[m]} {y}
            </span>
            <button
              onClick={() => setActual(new Date(y, m + 1, 1))}
              style={{
                background: 'var(--bg-hover)', border: 'none',
                borderRadius: '8px', padding: '6px 12px',
                fontSize: '13px', color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >Siguiente →</button>
          </div>

          {/* Días semana */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '8px' }}>
            {DIAS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', padding: '4px 0' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Grilla */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {Array.from({ length: primerDia }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: diasEnMes }).map((_, i) => {
              const d = i + 1
              const evs = eventosDelDia(y, m, d)
              const esHoy = hoy.getFullYear() === y && hoy.getMonth() === m && hoy.getDate() === d
              return (
                <button
                  key={d}
                  onClick={() => seleccionarDia(d)}
                  style={{
                    minHeight: '64px',
                    background: esHoy ? 'var(--accent-subtle)' : 'var(--bg-base)',
                    border: `1px solid ${esHoy ? 'var(--accent)' : 'var(--border-subtle)'}`,
                    borderRadius: '8px',
                    padding: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 150ms ease',
                  }}
                  onMouseEnter={e => {
                    if (!esHoy) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
                  }}
                  onMouseLeave={e => {
                    if (!esHoy) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)'
                  }}
                >
                  <div style={{
                    fontSize: '12px', fontWeight: 500, marginBottom: '4px',
                    color: esHoy ? 'var(--accent)' : 'var(--text-secondary)',
                  }}>{d}</div>
                  {evs.slice(0, 2).map((e, idx) => (
                    <div key={idx} style={{
                      fontSize: '10px', fontWeight: 500,
                      padding: '1px 4px', borderRadius: '4px', marginBottom: '2px',
                      color: tipoEstilo[e.tipo].color,
                      background: tipoEstilo[e.tipo].bg,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {e.nombre}
                    </div>
                  ))}
                  {evs.length > 2 && (
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>+{evs.length - 2} más</div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Panel lateral */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Día seleccionado */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '16px',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '12px' }}>
              {diaSeleccionado || 'Seleccioná un día'}
            </div>
            {seleccionados.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {diaSeleccionado ? 'Sin eventos este día.' : 'Hacé clic en un día para ver sus eventos.'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {seleccionados.map((e, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: tipoEstilo[e.tipo].dot, marginTop: '5px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{e.nombre}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{e.materia}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Próximos eventos */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '16px',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '12px' }}>
              Próximos eventos
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {proximosEventos.map((e, i) => {
                const fecha = new Date(e.date + 'T00:00:00')
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: tipoEstilo[e.tipo].dot, marginTop: '5px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>{e.nombre}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {fecha.getDate()} {MESES[fecha.getMonth()].slice(0, 3)} · {e.materia}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}