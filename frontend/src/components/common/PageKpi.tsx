import type { ReactNode } from 'react'

/* Piezas compartidas del rediseño "jerarquía por foco":
   encabezado de una línea con acento a la izquierda, botón de refresh
   integrado y fila de KPI (un dato dominante + secundarios subordinados). */

export function PageHead({ eyebrow, title, actions }: { eyebrow?: ReactNode; title: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        {eyebrow && <div className="page-eyebrow">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
      </div>
      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  )
}

export function RefreshButton({ onClick, refreshing, lastUpdate }: { onClick: () => void; refreshing?: boolean; lastUpdate?: Date | null }) {
  return (
    <button type="button" className="btn-ghost" onClick={onClick} disabled={refreshing}
      style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }} title="Actualizar">
      <i className={`ti ti-refresh${refreshing ? ' kpi-spin' : ''}`} />
      {lastUpdate ? lastUpdate.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' }) : refreshing ? 'Actualizando…' : 'Actualizar'}
    </button>
  )
}

export type KpiTone = 'default' | 'accent' | 'success' | 'warning' | 'danger'

const toneColor: Record<KpiTone, string> = {
  default: 'var(--text-primary)',
  accent: 'var(--accent-bright)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
}

export interface KpiSecondaryItem {
  label: ReactNode
  value: ReactNode
  unit?: ReactNode
  sub?: ReactNode
  tone?: KpiTone
  /** Resalta la tarjeta como alerta (borde y etiqueta en rojo). */
  alert?: boolean
}

export interface KpiDominantProps {
  label: ReactNode
  value: ReactNode
  unit?: ReactNode
  tone?: KpiTone
  badge?: ReactNode
  /** Contenido entre el valor y el pie (barra de progreso, texto, botón). */
  children?: ReactNode
  /** Métricas chicas al pie, separadas por una línea. */
  foot?: { label: ReactNode; value: ReactNode; tone?: KpiTone }[]
  /** Valor en tamaño medio para cifras largas (montos). */
  compact?: boolean
}

export function KpiRow({ dominant, secondary = [] }: { dominant: KpiDominantProps; secondary?: KpiSecondaryItem[] }) {
  const d = dominant
  return (
    <div className="kpi-row">
      <div className="kpi-dominant">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span className="mono-label">{d.label}</span>
          {d.badge}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <span className="kpi-dominant-value" style={{ color: toneColor[d.tone ?? 'default'], fontSize: d.compact ? 48 : undefined }}>{d.value}</span>
          {d.unit && <span style={{ fontSize: 18, color: 'var(--text-secondary)', fontWeight: 600, paddingBottom: d.compact ? 4 : 8 }}>{d.unit}</span>}
        </div>
        {d.children}
        {d.foot && d.foot.length > 0 && (
          <div className="kpi-dominant-foot">
            {d.foot.map((f, i) => (
              <div key={i}>
                <div className="mono-label" style={{ marginBottom: 4 }}>{f.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 800, color: toneColor[f.tone ?? 'default'] }}>{f.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {secondary.map((s, i) => (
        <div key={i} className={`kpi-secondary${s.alert ? ' alert' : ''}`}>
          <span className="mono-label" style={{ display: 'block', marginBottom: 16, color: s.alert ? 'var(--danger)' : undefined }}>{s.label}</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 800, lineHeight: 1, color: toneColor[s.tone ?? (s.alert ? 'danger' : 'default')] }}>{s.value}</span>
            {s.unit && <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>{s.unit}</span>}
          </div>
          {s.sub && <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 12, lineHeight: 1.5 }}>{s.sub}</div>}
        </div>
      ))}
    </div>
  )
}
