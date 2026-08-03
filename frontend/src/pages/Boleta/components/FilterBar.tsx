import type { FiltroVista } from '../types'

type Props = { filtro: FiltroVista; onChange: (f: FiltroVista) => void }

const OPTS: { value: FiltroVista; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'por_anio', label: 'Por año' },
  { value: 'por_semestre', label: 'Por semestre' },
]

export default function FilterBar({ filtro, onChange }: Props) {
  return (
    <div style={{ display: 'inline-flex', gap: 4, padding: 4, background: 'var(--bg-input)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
      {OPTS.map(o => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          style={{
            padding: '7px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 700,
            border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
            background: filtro === o.value ? 'var(--accent)' : 'transparent',
            color: filtro === o.value ? '#fff' : 'var(--text-secondary)',
          }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
