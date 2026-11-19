import { Fragment, useState } from 'react'
import type { Materia } from '../types'

type Props = { materias: Materia[] }

const ESTADO_CFG: Record<Materia['estado'], { label: string; bg: string; color: string; dot: string }> = {
  aprobado: { label: 'APROBADO', bg: 'var(--success-subtle)', color: 'var(--success)', dot: 'var(--success)' },
  reprobado: { label: 'REPROBADO', bg: 'var(--danger-subtle)', color: 'var(--danger)', dot: 'var(--danger)' },
  cursando: { label: 'CURSANDO', bg: 'rgba(148,163,184,0.12)', color: 'var(--text-secondary)', dot: 'var(--accent-bright)' },
}

function fmtNota(n: number | null | undefined): string {
  if (n == null) return '—'
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

export default function SubjectTable({ materias }: Props) {
  const [expandidoId, setExpandidoId] = useState<string | null>(null)

  if (materias.length === 0) {
    return <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', padding: '14px 4px' }}>Sin materias en este semestre.</p>
  }

  return (
    <table className="table-uca">
      <thead><tr><th>Materia</th><th style={{ textAlign: 'center' }}>Estado</th><th style={{ textAlign: 'right' }}>Promedio</th></tr></thead>
      <tbody>
        {materias.map(m => {
          const est = ESTADO_CFG[m.estado]
          const abierta = expandidoId === m.id
          const tieneDesglose = m.p1 != null || m.p2 != null || m.tp != null
          const pct = Math.max(0, Math.min(100, Math.round((m.promedio / 5) * 100)))
          return (
            <Fragment key={m.id}>
              <tr style={{ cursor: tieneDesglose ? 'pointer' : 'default' }}
                onClick={() => tieneDesglose && setExpandidoId(abierta ? null : m.id)}>
                <td style={{ fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: est.dot, flexShrink: 0 }} />
                    {tieneDesglose && (
                      <i className={`ti ti-chevron-${abierta ? 'up' : 'down'}`} style={{ fontSize: 12, color: 'var(--text-muted)' }} />
                    )}
                    {m.nombre}
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span className="badge" style={{ background: est.bg, color: est.color }}>{est.label}</span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
                    <div style={{ width: 52, height: 4, borderRadius: 999, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: est.dot, borderRadius: 999 }} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 15, color: est.color, width: 32, textAlign: 'right' }}>{fmtNota(m.promedio)}</span>
                  </div>
                </td>
              </tr>
              {abierta && tieneDesglose && (
                <tr>
                  <td colSpan={3} style={{ background: 'var(--bg-elevated)', padding: '10px 16px' }}>
                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12 }}>
                      <span>Parcial 1: <b style={{ fontFamily: 'var(--font-mono)' }}>{fmtNota(m.p1)}</b></span>
                      <span>Parcial 2: <b style={{ fontFamily: 'var(--font-mono)' }}>{fmtNota(m.p2)}</b></span>
                      <span>Trabajo Práctico: <b style={{ fontFamily: 'var(--font-mono)' }}>{fmtNota(m.tp)}</b></span>
                      <span>Final: <b style={{ fontFamily: 'var(--font-mono)' }}>{fmtNota(m.final)}</b></span>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          )
        })}
      </tbody>
    </table>
  )
}
