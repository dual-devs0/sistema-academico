import type { ReactNode } from 'react'

interface StatCardProps {
  icon: ReactNode
  label: string
  value: string | number
  delta?: string
  deltaPositive?: boolean
  subtext?: string
  accent?: boolean
}

export default function StatCard({ icon, label, value, delta, deltaPositive = true, subtext, accent }: StatCardProps) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: 'var(--accent-muted)', color: 'var(--accent)', fontSize: 15,
        }}>{icon}</span>
        <span className="section-label">{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', color: accent ? 'var(--accent)' : 'var(--text-primary)' }}>
        {value}
      </div>
      {(delta || subtext) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          {delta && (
            <span style={{ color: deltaPositive ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
              {deltaPositive ? '▲' : '▼'} {delta}
            </span>
          )}
          {subtext && <span style={{ color: 'var(--text-secondary)' }}>{subtext}</span>}
        </div>
      )}
    </div>
  )
}
