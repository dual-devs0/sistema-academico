import { Fragment, useState } from 'react'
import type { Materia } from '../types'

type Props = { materias: Materia[] }

const ESTADO_CFG: Record<Materia['estado'], { label: string; bg: string; color: string }> = {
  aprobado: { label: 'APROBADO', bg: 'var(--success-subtle)', color: 'var(--success)' },
  reprobado: { label: 'REPROBADO', bg: 'var(--danger-subtle)', color: 'var(--danger)' },
  cursando: { label: 'CURSANDO', bg: 'rgba(148,163,184,0.12)', color: 'var(--text-secondary)' },
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
      <thead><tr><th>Materia</th><th style={{ textAlign: 'center' }}>Nota</th><th style={{ textAlign: 'center' }}>Estado</th></tr></thead>
      <tbody>
        {materias.map(m => {
          const est = ESTADO_CFG[m.estado]
          const abierta = expandidoId === m.id
          const tieneDesglose = m.p1 != null || m.p2 != null || m.tp != null
          return (
            <Fragment key={m.id}>
              <tr style={{ cursor: tieneDesglose ? 'pointer' : 'default' }}
                onClick={() => tieneDesglose && setExpandidoId(abierta ? null : m.id)}>
                <td style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {tieneDesglose && (
                    <i className={`ti ti-chevron-${abierta ? 'up' : 'down'}`} style={{ fontSize: 12, color: 'var(--text-muted)' }} />
                  )}
                  {m.nombre}
                </td>
                <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 800, color: est.color }}>{fmtNota(m.promedio)}</td>
                <td style={{ textAlign: 'center' }}>
                  <span className="badge" style={{ background: est.bg, color: est.color }}>{est.label}</span>
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
