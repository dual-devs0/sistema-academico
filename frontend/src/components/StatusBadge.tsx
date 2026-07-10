const statusStyles: Record<string, { bg: string; color: string }> = {
  PROMOCIONADO: { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  APROBADO:     { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  REPROBADO:    { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444' },
  REGULAR:      { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af' },
  'EN CURSO':   { bg: 'var(--accent-muted)',    color: 'var(--accent)' },
}

export default function StatusBadge({ status }: { status: string }) {
  const key = (status || '').toUpperCase()
  const s = statusStyles[key] ?? statusStyles.REGULAR
  return (
    <span className="badge" style={{ background: s.bg, color: s.color }}>
      {key || 'N/D'}
    </span>
  )
}
