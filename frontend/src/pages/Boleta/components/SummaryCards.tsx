import type { ResumenAcademico } from '../types'

type Props = { resumen: ResumenAcademico | null; loading: boolean; periodosCount?: number; selloVerificado?: boolean }

function Skel({ width = 70 }: { width?: number }) {
  return <div style={{ height: 22, width, borderRadius: 6, background: 'rgba(255,255,255,0.08)' }} />
}

export default function SummaryCards({ resumen, loading, periodosCount, selloVerificado }: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
      <div className="kpi-dominant" style={{ gridColumn: 'span 2' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="mono-label">Promedio general</span>
          <i className="ti ti-star" style={{ color: 'var(--accent)', fontSize: 15 }} />
        </div>
        {loading ? <Skel width={140} /> : (
          <div className="kpi-dominant-value" style={{ color: (resumen?.promedioGlobal ?? 0) >= 3 ? 'var(--success)' : (resumen?.promedioGlobal ?? 0) >= 2 ? 'var(--warning)' : 'var(--danger)' }}>
            {resumen?.promedioGlobal.toFixed(2) ?? '—'}<span style={{ fontSize: 18, color: 'var(--text-secondary)', fontWeight: 600 }}> / 5</span>
          </div>
        )}
        {(periodosCount !== undefined || selloVerificado !== undefined) && (
          <div className="kpi-dominant-foot">
            {periodosCount !== undefined && (
              <div>
                <div className="mono-label" style={{ marginBottom: 4 }}>Períodos cursados</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>{String(periodosCount).padStart(2, '0')}</div>
              </div>
            )}
            {selloVerificado !== undefined && (
              <div>
                <div className="mono-label" style={{ marginBottom: 4 }}>Sello digital</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: selloVerificado ? 'var(--success)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ti ti-rosette-discount-check" /> {selloVerificado ? 'Verificado' : 'No disponible'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="kpi-secondary">
        <span className="mono-label" style={{ display: 'block', marginBottom: 16 }}>Materias aprobadas</span>
        {loading ? <Skel width={90} /> : (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{resumen?.materiasAprobadas ?? '—'}</span>
              <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>/ {resumen?.materiasTotales ?? '—'}</span>
            </div>
            <div className="progress-track" style={{ marginTop: 14 }}>
              <div className="progress-fill" style={{ width: `${resumen?.materiasTotales ? Math.round((resumen.materiasAprobadas / resumen.materiasTotales) * 100) : 0}%` }} />
            </div>
          </>
        )}
      </div>

      <div className="kpi-secondary">
        <span className="mono-label" style={{ display: 'block', marginBottom: 16 }}>Avance de carrera</span>
        {loading ? <Skel width={90} /> : (
          <>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{resumen ? `${resumen.avanceCarreraPct}%` : '—'}</div>
            <div className="progress-track" style={{ marginTop: 14 }}><div className="progress-fill" style={{ width: `${resumen?.avanceCarreraPct ?? 0}%` }} /></div>
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 10 }}>Faltan {resumen?.faltanParaGraduarse ?? '—'} materias para graduarte</div>
          </>
        )}
      </div>
    </div>
  )
}
