// Alumno (+ admin/profesor viendo un alumno puntual). Boleta de calificaciones
// con sello digital verificable (QR+código) y descarga de PDF por scope.
// Depende de: /boleta/resumen, /boleta/pdf, /boleta/{id}/sello, /boleta/verificar/{codigo}.
import { useEffect, useMemo, useState } from 'react'
import { api, getCurrentUser } from '../../lib/api'
import { useBoletaData } from './hooks/useBoletaData'
import { usePdfExport } from './hooks/usePdfExport'
import BoletaHeader from './components/BoletaHeader'
import SummaryCards from './components/SummaryCards'
import FilterBar from './components/FilterBar'
import PeriodSelect from './components/PeriodSelect'
import SemesterAccordion from './components/SemesterAccordion'
import type { FiltroVista } from './types'

type AlumnoOpt = { id: number; nombre: string; username: string }
type Sello = { codigo: string; qr_base64: string; validado_en: string }

export default function BoletaPage() {
  const user = getCurrentUser()
  const esAlumno = user?.role === 'alumno'
  const uid = Number(user?.user_id)

  const [alumnos, setAlumnos] = useState<AlumnoOpt[]>([])
  const [selId, setSelId] = useState<number | null>(esAlumno ? uid : null)
  const [nombreReal, setNombreReal] = useState('')
  const [sello, setSello] = useState<Sello | null>(null)

  const [filtro, setFiltro] = useState<FiltroVista>('todos')
  const [selectedAnio, setSelectedAnio] = useState<number | null>(null)
  const [selectedPeriodoKey, setSelectedPeriodoKey] = useState<string | null>(null)

  const { data, loading, error } = useBoletaData(selId)
  const { exportPdf, downloading } = usePdfExport(selId)

  useEffect(() => {
    if (esAlumno) return
    api.get<{ items: AlumnoOpt[] }>('/profesor/lista-alumnos').then(r => setAlumnos(r.items)).catch(() => {})
  }, [esAlumno])

  useEffect(() => {
    if (esAlumno) {
      api.get<{ user?: { nombre: string | null } }>('/alumno/dashboard').then(d => setNombreReal(d.user?.nombre ?? '')).catch(() => {})
    }
  }, [esAlumno])

  useEffect(() => {
    if (!selId) return
    api.get<Sello>(`/boleta/${selId}/sello`).then(setSello).catch(() => setSello(null))
  }, [selId])
  const selloVisible = selId ? sello : null

  // Defaults del período: si el usuario no eligió uno, se usa el primero disponible.
  const defaultAnio = data?.periodos[0]?.anio ?? null
  const defaultPeriodoKey = data?.periodos[0] ? `${data.periodos[0].anio}-${data.periodos[0].semestre}` : null
  const effectiveAnio = selectedAnio ?? defaultAnio
  const effectivePeriodoKey = selectedPeriodoKey ?? defaultPeriodoKey

  const periodosFiltrados = useMemo(() => {
    if (!data) return []
    if (filtro === 'todos') return data.periodos
    if (filtro === 'por_anio') return data.periodos.filter(p => p.anio === effectiveAnio)
    return data.periodos.filter(p => `${p.anio}-${p.semestre}` === effectivePeriodoKey)
  }, [data, filtro, effectiveAnio, effectivePeriodoKey])

  const anioParaExport = filtro === 'por_anio' ? (effectiveAnio ?? undefined) : (data?.periodos[0]?.anio ?? undefined)

  return (
    <>
      <BoletaHeader
        nombre={esAlumno ? (nombreReal || user?.username || '') : (alumnos.find(a => a.id === selId)?.nombre ?? '')}
        subtitulo="Consultá tu historial académico y descargá tu boleta"
        downloading={downloading}
        filtro={filtro}
        anioParaExport={anioParaExport}
        onExport={exportPdf}
      />

      {!esAlumno && (
        <div style={{ maxWidth: 380, marginBottom: 20 }}>
          <div className="mono-label" style={{ marginBottom: 6 }}>Alumno</div>
          <select aria-label="Alumno" className="input-uca" value={selId ?? ''}
            onChange={e => setSelId(Number(e.target.value) || null)}>
            <option value="">Seleccioná un alumno…</option>
            {alumnos.map(a => <option key={a.id} value={a.id}>{a.nombre || a.username}</option>)}
          </select>
        </div>
      )}

      {!selId ? (
        <div className="card" style={{ textAlign: 'center', padding: 50 }}>
          <i className="ti ti-file-certificate" style={{ fontSize: 38, color: 'var(--text-muted)' }} />
          <p style={{ marginTop: 12, color: 'var(--text-secondary)', fontSize: 13 }}>Seleccioná un alumno para ver su boleta.</p>
        </div>
      ) : error ? (
        <div className="card" style={{ textAlign: 'center', padding: 50 }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 38, color: 'var(--danger)' }} />
          <p style={{ marginTop: 12, color: 'var(--text-secondary)', fontSize: 13 }}>{error}</p>
        </div>
      ) : (
        <>
          <SummaryCards resumen={data?.resumen ?? null} loading={loading} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
            <FilterBar filtro={filtro} onChange={setFiltro} />
            {data && (
              <PeriodSelect
                filtro={filtro}
                periodos={data.periodos}
                selectedAnio={effectiveAnio}
                selectedPeriodoKey={effectivePeriodoKey}
                onChangeAnio={setSelectedAnio}
                onChangePeriodo={setSelectedPeriodoKey}
              />
            )}
          </div>

          <SemesterAccordion periodos={periodosFiltrados} loading={loading} />

          {/* Sello digital real: código firmado con SECRET_KEY, verificable en /boleta/verificar/{codigo} */}
          {selloVisible && (
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', marginTop: 20 }}>
              <span style={{ width: 56, height: 56, borderRadius: '50%', border: '2px dashed var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'var(--text-secondary)', flexShrink: 0 }}>
                <i className="ti ti-rosette-discount-check" />
              </span>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 4 }}>Sello Digital de Autenticidad</div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Código firmado por el Sistema Académico UCA, verificable en cualquier momento. Código de verificación:{' '}
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 700 }}>{selloVisible.codigo}</span>
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <img src={`data:image/png;base64,${selloVisible.qr_base64}`} alt="QR verificación boleta" style={{ width: 86, height: 86, borderRadius: 10, background: '#fff', padding: 6 }} />
                <div className="mono-label" style={{ fontSize: 8, marginTop: 6 }}>VALIDADO: {new Date(selloVisible.validado_en).toLocaleDateString('es-PY')}</div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
