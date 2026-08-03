import { useEffect, useRef, useState } from 'react'
import type { PdfScope } from '../types'

type Props = {
  downloading: boolean
  defaultScope: PdfScope
  anioParaExport?: number
  onExport: (scope: PdfScope, opts?: { anio?: number; semestre?: number }) => void
}

const OPTS: { scope: PdfScope; label: string }[] = [
  { scope: 'global', label: 'Global' },
  { scope: 'anio', label: 'Por año' },
  { scope: 'semestre_actual', label: 'Semestre actual' },
]

export default function PdfExportMenu({ downloading, defaultScope, anioParaExport, onExport }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickAway)
    return () => document.removeEventListener('mousedown', onClickAway)
  }, [])

  function pick(scope: PdfScope) {
    setOpen(false)
    if (scope === 'anio') onExport('anio', { anio: anioParaExport })
    else onExport(scope)
  }

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="btn-primary" disabled={downloading} onClick={() => setOpen(v => !v)}>
        <i className="ti ti-download" /> {downloading ? 'Generando…' : 'Descargar PDF'}
        <i className="ti ti-chevron-down" style={{ marginLeft: 6, fontSize: 12, transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: 180,
          background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 12,
          overflow: 'hidden', boxShadow: '0 12px 32px rgba(0,0,0,.45)', zIndex: 30,
        }}>
          {OPTS.map(o => (
            <button key={o.scope} type="button" onClick={() => pick(o.scope)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                padding: '10px 14px', fontSize: 12.5, fontWeight: 600,
                color: o.scope === defaultScope ? 'var(--accent)' : 'var(--text-secondary)',
                background: o.scope === defaultScope ? 'var(--accent-muted)' : 'none',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              }}>
              {o.label}
              {o.scope === defaultScope && <i className="ti ti-check" style={{ fontSize: 13 }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
