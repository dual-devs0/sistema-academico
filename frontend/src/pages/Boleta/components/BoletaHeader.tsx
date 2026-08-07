import PdfExportMenu from './PdfExportMenu'
import type { FiltroVista, PdfScope } from '../types'

type Props = {
  nombre: string
  subtitulo: string
  downloading: boolean
  filtro: FiltroVista
  anioParaExport?: number
  onExport: (scope: PdfScope, opts?: { anio?: number; semestre?: number }) => void
}

function defaultScopeDe(filtro: FiltroVista): PdfScope {
  if (filtro === 'por_anio') return 'anio'
  if (filtro === 'por_semestre') return 'semestre_actual'
  return 'global'
}

export default function BoletaHeader({ nombre, subtitulo, downloading, filtro, anioParaExport, onExport }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
      <div>
        <h1 className="page-title" style={{ fontSize: 27 }}>Mi Boleta</h1>
        <p className="page-subtitle">{subtitulo}{nombre ? <> • <span style={{ color: 'var(--accent-bright)' }}>{nombre}</span></> : null}</p>
      </div>
      <PdfExportMenu
        downloading={downloading}
        defaultScope={defaultScopeDe(filtro)}
        anioParaExport={anioParaExport}
        onExport={onExport}
      />
    </div>
  )
}
