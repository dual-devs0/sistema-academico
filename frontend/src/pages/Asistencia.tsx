const asistencias = [
  {
    materia: 'Análisis Matemático I',
    clases: [
      { fecha: '2026-03-10', presente: true },
      { fecha: '2026-03-17', presente: true },
      { fecha: '2026-03-24', presente: false },
      { fecha: '2026-03-31', presente: true },
      { fecha: '2026-04-07', presente: true },
      { fecha: '2026-04-14', presente: false },
      { fecha: '2026-04-21', presente: true },
      { fecha: '2026-04-28', presente: true },
    ],
  },
  {
    materia: 'Física I',
    clases: [
      { fecha: '2026-03-11', presente: true },
      { fecha: '2026-03-18', presente: true },
      { fecha: '2026-03-25', presente: true },
      { fecha: '2026-04-01', presente: true },
      { fecha: '2026-04-08', presente: false },
      { fecha: '2026-04-15', presente: true },
    ],
  },
  {
    materia: 'Programación I',
    clases: [
      { fecha: '2026-03-12', presente: true },
      { fecha: '2026-03-19', presente: true },
      { fecha: '2026-03-26', presente: true },
      { fecha: '2026-04-02', presente: true },
      { fecha: '2026-04-09', presente: true },
      { fecha: '2026-04-16', presente: true },
    ],
  },
]

function porcentaje(clases: { presente: boolean }[]) {
  const presentes = clases.filter(c => c.presente).length
  return Math.round((presentes / clases.length) * 100)
}

function colorPct(p: number) {
  if (p >= 80) return 'var(--success)'
  if (p >= 60) return 'var(--warning)'
  return 'var(--danger)'
}

function bgPct(p: number) {
  if (p >= 80) return 'var(--success-subtle)'
  if (p >= 60) return 'var(--warning-subtle)'
  return 'var(--danger-subtle)'
}

export default function Asistencia() {
  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Mi asistencia
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Semestre 1 — 2026</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {asistencias.map(a => {
          const pct = porcentaje(a.clases)
          const presentes = a.clases.filter(c => c.presente).length

          return (
            <div key={a.materia} style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '20px',
            }}>
              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', marginBottom: '16px',
              }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {a.materia}
                </span>
                <span style={{
                  fontSize: '20px', fontWeight: 600,
                  color: colorPct(pct),
                  background: bgPct(pct),
                  padding: '2px 12px', borderRadius: '8px',
                }}>
                  {pct}%
                </span>
              </div>

              {/* Barra */}
              <div style={{
                width: '100%', height: '6px',
                background: 'var(--bg-hover)',
                borderRadius: '3px', marginBottom: '16px',
              }}>
                <div style={{
                  width: `${pct}%`, height: '6px',
                  background: colorPct(pct),
                  borderRadius: '3px',
                  transition: 'width 300ms ease',
                }} />
              </div>

              {/* Resumen */}
              <div style={{
                display: 'flex', gap: '20px',
                marginBottom: '16px', fontSize: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  <span>{presentes} presentes</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  <span>{a.clases.length - presentes} ausentes</span>
                </div>
                <div style={{ color: 'var(--text-muted)' }}>
                  {a.clases.length} clases totales
                </div>
              </div>

              {/* Grilla de clases */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {a.clases.map(c => (
                  <div
                    key={c.fecha}
                    title={c.fecha}
                    style={{
                      width: '32px', height: '32px',
                      borderRadius: '8px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: 500,
                      background: c.presente ? 'var(--success-subtle)' : 'var(--danger-subtle)',
                      color: c.presente ? 'var(--success)' : 'var(--danger)',
                      border: `1px solid ${c.presente ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`,
                    }}
                  >
                    {c.presente ? '✓' : '✗'}
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