import type { FiltroVista, SemestrePeriodo } from '../types'

type Props = {
  filtro: FiltroVista
  periodos: SemestrePeriodo[]
  selectedAnio: number | null
  selectedPeriodoKey: string | null
  onChangeAnio: (anio: number) => void
  onChangePeriodo: (key: string) => void
}

export default function PeriodSelect({ filtro, periodos, selectedAnio, selectedPeriodoKey, onChangeAnio, onChangePeriodo }: Props) {
  if (filtro === 'todos') return null

  if (filtro === 'por_anio') {
    const anios = Array.from(new Set(periodos.map(p => p.anio))).sort((a, b) => b - a)
    return (
      <select className="input-uca" style={{ width: 'auto', minWidth: 160 }}
        value={selectedAnio ?? ''} onChange={e => onChangeAnio(Number(e.target.value))}>
        {anios.map(a => <option key={a} value={a}>Año {a}</option>)}
      </select>
    )
  }

  return (
    <select className="input-uca" style={{ width: 'auto', minWidth: 200 }}
      value={selectedPeriodoKey ?? ''} onChange={e => onChangePeriodo(e.target.value)}>
      {periodos.map(p => (
        <option key={`${p.anio}-${p.semestre}`} value={`${p.anio}-${p.semestre}`}>{p.etiqueta}</option>
      ))}
    </select>
  )
}
