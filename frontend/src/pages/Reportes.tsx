const reportes = [
  {
    id: 1,
    titulo: 'Reporte de asistencia general',
    descripcion: 'Asistencia de todos los alumnos por materia y fecha',
    tipo: 'asistencia',
    generado: '2026-06-20',
  },
  {
    id: 2,
    titulo: 'Reporte de puntajes por carrera',
    descripcion: 'Promedios y distribución de notas por carrera',
    tipo: 'puntajes',
    generado: '2026-06-20',
  },
  {
    id: 3,
    titulo: 'Reporte de alumnos becados',
    descripcion: 'Lista completa de alumnos con beca activa',
    tipo: 'becados',
    generado: '2026-06-19',
  },
  {
    id: 4,
    titulo: 'Reporte de materias y docentes',
    descripcion: 'Materias activas con profesor asignado y cantidad de alumnos',
    tipo: 'materias',
    generado: '2026-06-18',
  },
]

const resumen = [
  { label: 'Total alumnos', value: '245', color: 'var(--accent)', bg: 'var(--accent-subtle)' },
  { label: 'Alumnos becados', value: '87', color: 'var(--success)', bg: 'var(--success-subtle)' },
  { label: 'Materias activas', value: '18', color: 'var(--purple)', bg: 'var(--purple-subtle)' },
  { label: 'Docentes', value: '12', color: 'var(--amber)', bg: 'var(--amber-subtle)' },
]

const tipoIcono: Record<string, any> = {
  asistencia: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
    </svg>
  ),
  puntajes: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10M12 20V4M6 20v-6"/>
    </svg>
  ),
  becados: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  ),
  materias: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
    </svg>
  ),
}

const tipoColor: Record<string, { color: string; bg: string }> = {
  asistencia: { color: 'var(--success)', bg: 'var(--success-subtle)' },
  puntajes:   { color: 'var(--accent)', bg: 'var(--accent-subtle)' },
  becados:    { color: 'var(--purple)', bg: 'var(--purple-subtle)' },
  materias:   { color: 'var(--amber)', bg: 'var(--amber-subtle)' },
}

export default function Reportes() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Reportes globales
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Panel de administración</p>
        </div>
        <button style={{
          background: 'var(--accent)', border: 'none',
          borderRadius: '8px', padding: '9px 16px',
          fontSize: '13px', fontWeight: 500, color: 'white',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Exportar todo
        </button>
      </div>

      {/* Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {resumen.map(r => (
          <div key={r.label} style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '20px',
          }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: r.color, marginBottom: '4px' }}>{r.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.label}</div>
          </div>
        ))}
      </div>

      {/* Lista de reportes */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '24px',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)',
        }}>
          Reportes disponibles
        </div>

        {reportes.map((r, i) => (
          <div key={r.id} style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            padding: '16px 20px',
            borderBottom: i < reportes.length - 1 ? '1px solid var(--border-subtle)' : 'none',
          }}>
            {/* Icono */}
            <div style={{
              width: '40px', height: '40px', flexShrink: 0,
              background: tipoColor[r.tipo].bg,
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: tipoColor[r.tipo].color,
            }}>
              {tipoIcono[r.tipo]}
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '2px' }}>
                {r.titulo}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {r.descripcion} · Generado: {new Date(r.generado).toLocaleDateString('es-PY')}
              </div>
            </div>

            {/* Acciones */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{
                background: 'var(--bg-hover)', border: 'none',
                borderRadius: '8px', padding: '7px 14px',
                fontSize: '12px', color: 'var(--text-secondary)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
                Ver
              </button>
              <button style={{
                background: 'var(--accent-subtle)', border: 'none',
                borderRadius: '8px', padding: '7px 14px',
                fontSize: '12px', color: 'var(--accent)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Exportar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla resumen de asistencia */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
          Resumen de asistencia por carrera
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-base)' }}>
              {['Carrera', 'Alumnos', 'Asistencia prom.', 'Aprobados', 'En riesgo'].map(h => (
                <th key={h} style={{
                  padding: '10px 20px',
                  textAlign: h === 'Carrera' ? 'left' : 'center',
                  fontSize: '11px', fontWeight: 500,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { carrera: 'Ing. Informática', alumnos: 125, asistencia: '89%', aprobados: '92%', riesgo: 10 },
              { carrera: 'Ing. Civil', alumnos: 80, asistencia: '85%', aprobados: '88%', riesgo: 8 },
              { carrera: 'Arquitectura', alumnos: 40, asistencia: '91%', aprobados: '94%', riesgo: 3 },
            ].map(row => (
              <tr key={row.carrera} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '12px 20px', fontWeight: 500, color: 'var(--text-primary)' }}>{row.carrera}</td>
                <td style={{ padding: '12px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>{row.alumnos}</td>
                <td style={{ padding: '12px 20px', textAlign: 'center', color: 'var(--success)', fontWeight: 500 }}>{row.asistencia}</td>
                <td style={{ padding: '12px 20px', textAlign: 'center', color: 'var(--accent)', fontWeight: 500 }}>{row.aprobados}</td>
                <td style={{ padding: '12px 20px', textAlign: 'center', color: 'var(--danger)', fontWeight: 500 }}>{row.riesgo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}