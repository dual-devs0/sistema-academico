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
    <div className="page-head" style={{ marginBottom: 24 }}>
      <div>
        <div className="page-eyebrow">{subtitulo}{nombre ? ` · ${nombre}` : ''}</div>
        <h1 className="page-title">Mi Boleta</h1>
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
