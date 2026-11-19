import type { FiltroVista } from '../types'

type Props = { filtro: FiltroVista; onChange: (f: FiltroVista) => void }

const OPTS: { value: FiltroVista; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'por_anio', label: 'Por año' },
  { value: 'por_semestre', label: 'Por semestre' },
]

export default function FilterBar({ filtro, onChange }: Props) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {OPTS.map(o => (
        <button key={o.value} type="button" className={`pill-tab${filtro === o.value ? ' active' : ''}`} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
