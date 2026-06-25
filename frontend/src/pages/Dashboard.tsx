const stats = [
  { label: 'Materias cursando', value: '5', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
    </svg>
  ), color: 'var(--accent)', subtle: 'var(--accent-subtle)' },
  { label: 'Promedio general', value: '8.2', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10M12 20V4M6 20v-6"/>
    </svg>
  ), color: 'var(--success)', subtle: 'var(--success-subtle)' },
  { label: 'Asistencia', value: '92%', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
    </svg>
  ), color: 'var(--warning)', subtle: 'var(--warning-subtle)' },
  { label: 'TPs pendientes', value: '2', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ), color: 'var(--danger)', subtle: 'var(--danger-subtle)' },
]

const materias = [
  { nombre: 'Análisis Matemático I', parcial1: 7.5, parcial2: 8.0, tp: 9.0, final: null },
  { nombre: 'Física I', parcial1: 6.0, parcial2: 7.5, tp: 8.5, final: null },
  { nombre: 'Matemática Discreta', parcial1: 9.0, parcial2: null, tp: 8.0, final: null },
  { nombre: 'Programación I', parcial1: 10.0, parcial2: 9.5, tp: 10.0, final: null },
]

function colorNota(n: number | null) {
  if (n === null) return 'var(--text-muted)'
  if (n >= 8) return 'var(--success)'
  if (n >= 6) return 'var(--warning)'
  return 'var(--danger)'
}

export default function Dashboard() {
  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Bienvenido, Alumno
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Semestre 1 — 2026</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {stats.map(s => (
          <div key={s.label} style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '20px',
          }}>
            <div style={{
              width: '36px', height: '36px',
              background: s.subtle,
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: s.color,
              marginBottom: '16px',
            }}>
              {s.icon}
            </div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {s.value}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabla de notas */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>Mis puntajes</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Semestre 1 · 2026</span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-base)' }}>
              {['Materia', 'Parcial 1', 'Parcial 2', 'TP', 'Final'].map(h => (
                <th key={h} style={{
                  padding: '10px 20px',
                  textAlign: h === 'Materia' ? 'left' : 'center',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {materias.map((m, i) => (
              <tr key={m.nombre} style={{
                borderTop: '1px solid var(--border-subtle)',
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
              }}>
                <td style={{ padding: '12px 20px', color: 'var(--text-primary)', fontWeight: 500 }}>{m.nombre}</td>
                {[m.parcial1, m.parcial2, m.tp, m.final].map((nota, j) => (
                  <td key={j} style={{ padding: '12px 20px', textAlign: 'center', color: colorNota(nota), fontWeight: nota ? 500 : 400 }}>
                    {nota ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}