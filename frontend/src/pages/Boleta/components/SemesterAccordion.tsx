import { useEffect, useRef, useState } from 'react'
import type { SemestrePeriodo } from '../types'
import SubjectTable from './SubjectTable'

type Props = { periodos: SemestrePeriodo[]; loading: boolean }

function periodoKey(p: SemestrePeriodo): string {
  return `${p.anio}-${p.semestre}`
}

function Skeleton() {
  return (
    <div className="card" style={{ padding: '14px 18px', marginBottom: 10 }}>
      <div style={{ height: 16, width: 180, borderRadius: 6, background: 'rgba(255,255,255,0.08)' }} />
    </div>
  )
}

export default function SemesterAccordion({ periodos, loading }: Props) {
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set())
  const inicializado = useRef(false)

  // Expandido por defecto: solo el semestre actual (el primero, más reciente).
  // Se hace en un effect (no en el useState lazy init) porque `periodos` llega
  // vacío en el primer render, mientras useBoletaData todavía está cargando.
  useEffect(() => {
    if (inicializado.current || periodos.length === 0) return
    inicializado.current = true
    setAbiertos(new Set([periodoKey(periodos[0])]))
  }, [periodos])

  function toggle(key: string) {
    setAbiertos(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (loading) {
    return <>{[1, 2].map(i => <Skeleton key={i} />)}</>
  }

  if (periodos.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 46 }}>
        <i className="ti ti-file-off" style={{ fontSize: 36, color: 'var(--text-muted)' }} />
        <p style={{ marginTop: 10, color: 'var(--text-secondary)', fontSize: 13 }}>Aún no tenés materias cursadas.</p>
      </div>
    )
  }

  const porAnio = new Map<number, SemestrePeriodo[]>()
  for (const p of periodos) {
    if (!porAnio.has(p.anio)) porAnio.set(p.anio, [])
    porAnio.get(p.anio)!.push(p)
  }
  const anios = [...porAnio.keys()].sort((a, b) => b - a)

  return (
    <>
      {anios.map(anio => (
        <div key={anio} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent-bright)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-calendar-stats" /> Año {anio}
          </div>
          {porAnio.get(anio)!.sort((a, b) => b.semestre - a.semestre).map(p => {
            const key = periodoKey(p)
            const abierta = abiertos.has(key)
            return (
              <div key={key} className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 10 }}>
                <button type="button" onClick={() => toggle(key)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                  <span style={{ fontSize: 13.5, fontWeight: 800 }}>{p.etiqueta}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 14, color: p.promedioSemestre >= 2 ? 'var(--success)' : 'var(--danger)' }}>
                      {p.promedioSemestre.toFixed(2)}
                    </span>
                    <i className={`ti ti-chevron-${abierta ? 'up' : 'down'}`} style={{ color: 'var(--text-muted)' }} />
                  </div>
                </button>
                {abierta && (
                  <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '4px 18px 8px' }}>
                    <SubjectTable materias={p.materias} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </>
  )
}
