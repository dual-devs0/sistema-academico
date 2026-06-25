import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts'

const promediosPorMateria = [
  { materia: 'Análisis Mat.', promedio: 8.2, aprobados: 28, desaprobados: 4 },
  { materia: 'Física I', promedio: 7.1, aprobados: 22, desaprobados: 8 },
  { materia: 'Programación I', promedio: 9.1, aprobados: 33, desaprobados: 2 },
  { materia: 'Mat. Discreta', promedio: 7.8, aprobados: 25, desaprobados: 3 },
]

const evolucionNotas = [
  { semana: 'S1', analisis: 6.5, fisica: 5.8, programacion: 8.0 },
  { semana: 'S2', analisis: 7.0, fisica: 6.5, programacion: 8.5 },
  { semana: 'S3', analisis: 7.5, fisica: 6.8, programacion: 9.0 },
  { semana: 'S4', analisis: 8.0, fisica: 7.0, programacion: 9.2 },
  { semana: 'S5', analisis: 8.2, fisica: 7.1, programacion: 9.1 },
]

const distribucionNotas = [
  { rango: '9-10', cantidad: 12, color: '#34D399' },
  { rango: '7-8', cantidad: 18, color: '#4F8EF7' },
  { rango: '5-6', cantidad: 10, color: '#FBBF24' },
  { rango: '0-4', cantidad: 5, color: '#F87171' },
]

const asistenciaGeneral = [
  { mes: 'Mar', porcentaje: 95 },
  { mes: 'Abr', porcentaje: 88 },
  { mes: 'May', porcentaje: 92 },
  { mes: 'Jun', porcentaje: 85 },
]

const tooltipStyle = {
  backgroundColor: '#1A1D27',
  border: '1px solid #2A2D3A',
  borderRadius: '8px',
  color: '#F0F2F8',
  fontSize: '12px',
}

export default function Estadisticas() {
  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Estadísticas
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Semestre 1 — 2026</p>
      </div>

      {/* Stats rápidas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Promedio general', value: '8.1', color: 'var(--success)', bg: 'var(--success-subtle)' },
          { label: 'Tasa de aprobación', value: '87%', color: 'var(--accent)', bg: 'var(--accent-subtle)' },
          { label: 'Asistencia promedio', value: '90%', color: 'var(--warning)', bg: 'var(--warning-subtle)' },
          { label: 'Alumnos activos', value: '45', color: 'var(--purple)', bg: 'var(--purple-subtle)' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '20px',
          }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: s.color, marginBottom: '4px' }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

        {/* Promedio por materia */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '20px' }}>
            Promedio por materia
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={promediosPorMateria} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" vertical={false} />
              <XAxis dataKey="materia" tick={{ fill: '#8B91A7', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 10]} tick={{ fill: '#8B91A7', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(79,142,247,0.05)' }} />
              <Bar dataKey="promedio" fill="#4F8EF7" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Distribución de notas */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '20px' }}>
            Distribución de notas
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={distribucionNotas}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                dataKey="cantidad"
                paddingAngle={3}
              >
                {distribucionNotas.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v, _, p) => [v + ' alumnos', p.payload.rango]} />
              <Legend
                formatter={(_, entry: any) => (
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                    {entry.payload.rango}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Evolución de notas */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '20px' }}>
            Evolución de notas
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={evolucionNotas} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" vertical={false} />
              <XAxis dataKey="semana" tick={{ fill: '#8B91A7', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[4, 10]} tick={{ fill: '#8B91A7', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="analisis" stroke="#4F8EF7" strokeWidth={2} dot={false} name="Análisis" />
              <Line type="monotone" dataKey="fisica" stroke="#F87171" strokeWidth={2} dot={false} name="Física" />
              <Line type="monotone" dataKey="programacion" stroke="#34D399" strokeWidth={2} dot={false} name="Programación" />
              <Legend formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{v}</span>} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Asistencia mensual */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '20px' }}>
            Asistencia mensual
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={asistenciaGeneral} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3A" vertical={false} />
              <XAxis dataKey="mes" tick={{ fill: '#8B91A7', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#8B91A7', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v + '%', 'Asistencia']} cursor={{ fill: 'rgba(52,211,153,0.05)' }} />
              <Bar dataKey="porcentaje" fill="#34D399" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}