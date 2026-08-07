import type { ResumenAcademico } from '../types'

type Props = { resumen: ResumenAcademico | null; loading: boolean }

function Skel() {
  return <div style={{ height: 22, width: 70, borderRadius: 6, background: 'rgba(255,255,255,0.08)' }} />
}

export default function SummaryCards({ resumen, loading }: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginBottom: 22 }}>
      <div className="kpi-card">
        <div className="kpi-top"><span className="mono-label">Promedio General</span><i className="ti ti-star" style={{ color: 'var(--accent)', fontSize: 15 }} /></div>
        {loading ? <Skel /> : (
          <span className="kpi-value" style={{ fontSize: 32, color: (resumen?.promedioGlobal ?? 0) >= 7 ? '#22c55e' : (resumen?.promedioGlobal ?? 0) >= 6 ? '#f59e0b' : '#ef4444' }}>
            {resumen?.promedioGlobal.toFixed(2) ?? '—'}<span className="kpi-unit"> / 10</span>
          </span>
        )}
      </div>
      <div className="kpi-card">
        <div className="kpi-top"><span className="mono-label">Materias Aprobadas</span><i className="ti ti-checks" style={{ color: 'var(--success)', fontSize: 15 }} /></div>
        {loading ? <Skel /> : (
          <span className="kpi-value" style={{ fontSize: 32, color: 'var(--success)' }}>
            {resumen?.materiasAprobadas ?? '—'}<span className="kpi-unit"> / {resumen?.materiasTotales ?? '—'}</span>
          </span>
        )}
      </div>
      <div className="kpi-card">
        <div className="kpi-top"><span className="mono-label">Avance de Carrera</span><i className="ti ti-road" style={{ color: 'var(--accent)', fontSize: 15 }} /></div>
        {loading ? <Skel /> : (
          <>
            <span className="kpi-value" style={{ fontSize: 32 }}>{resumen ? `${resumen.avanceCarreraPct}%` : '—'}</span>
            <div className="progress-track" style={{ marginTop: 10 }}><div className="progress-fill" style={{ width: `${resumen?.avanceCarreraPct ?? 0}%` }} /></div>
          </>
        )}
      </div>
      <div className="kpi-card">
        <div className="kpi-top"><span className="mono-label">Faltan para Graduarse</span><i className="ti ti-flag" style={{ color: 'var(--warning)', fontSize: 15 }} /></div>
        {loading ? <Skel /> : (
          <span className="kpi-value" style={{ fontSize: 32 }}>{resumen?.faltanParaGraduarse ?? '—'}<span className="kpi-unit"> materias</span></span>
        )}
      </div>
    </div>
  )
}
