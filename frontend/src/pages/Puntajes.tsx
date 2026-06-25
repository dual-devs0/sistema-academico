const materias = [
  { nombre: 'Análisis Matemático I', parcial1: 7.5, parcial2: 8.0, tp: 9.0, final: null },
  { nombre: 'Física I', parcial1: 6.0, parcial2: 7.5, tp: 8.5, final: null },
  { nombre: 'Matemática Discreta', parcial1: 9.0, parcial2: null, tp: 8.0, final: null },
  { nombre: 'Programación I', parcial1: 10.0, parcial2: 9.5, tp: 10.0, final: null },
]

function promedio(m: typeof materias[0]) {
  const notas = [m.parcial1, m.parcial2, m.tp].filter(n => n !== null) as number[]
  if (!notas.length) return null
  return (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1)
}

function colorNota(n: number | null) {
  if (n === null) return 'var(--text-muted)'
  if (n >= 8) return 'var(--success)'
  if (n >= 6) return 'var(--warning)'
  return 'var(--danger)'
}

function bgNota(n: number | null) {
  if (n === null) return 'transparent'
  if (n >= 8) return 'var(--success-subtle)'
  if (n >= 6) return 'var(--warning-subtle)'
  return 'var(--danger-subtle)'
}

export default function Puntajes() {
  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Mis puntajes
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Semestre 1 — 2026</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {materias.map(m => {
          const prom = promedio(m)
          return (
            <div key={m.nombre} style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-subtle)',
              }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {m.nombre}
                </span>
                {prom && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    fontSize: '12px', color: colorNota(parseFloat(prom)),
                  }}>
                    <span>Promedio parcial:</span>
                    <span style={{
                      fontWeight: 600, fontSize: '14px',
                      background: bgNota(parseFloat(prom)),
                      padding: '2px 8px', borderRadius: '6px',
                    }}>{prom}</span>
                  </div>
                )}
              </div>

              {/* Notas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {[
                  { label: 'Parcial 1', valor: m.parcial1 },
                  { label: 'Parcial 2', valor: m.parcial2 },
                  { label: 'Trab. Práctico', valor: m.tp },
                  { label: 'Final', valor: m.final },
                ].map((item, i) => (
                  <div key={item.label} style={{
                    padding: '20px',
                    textAlign: 'center',
                    borderLeft: i > 0 ? '1px solid var(--border-subtle)' : 'none',
                  }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {item.label}
                    </div>
                    <div style={{
                      fontSize: '28px',
                      fontWeight: 600,
                      color: colorNota(item.valor),
                    }}>
                      {item.valor ?? '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}