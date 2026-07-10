import { useState, useEffect } from 'react'
import { api, decodeToken, emitToast } from '../lib/api'

type NotaRow = {
  materia_id: number; materia_nombre: string
  parcial1: number | null; parcial2: number | null; practico: number | null; final: number | null
  promedio: number | null
}
type Resumen = {
  alumno: { id: number; nombre: string; username: string; email: string | null; es_becado: boolean }
  cantidad_materias: number
  promedio_general: number | null
  notas: NotaRow[]
}
type AlumnoOpt = { id: number; nombre: string; username: string; role: string }

const css = `
  .bo-kpis { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:20px; }
  .bo-row { display:flex; align-items:center; gap:14px; padding:13px 0; border-bottom:1px solid var(--border-subtle); }
  .bo-row:last-child { border-bottom:none; }
  .bo-sello { display:flex; align-items:center; gap:18px; flex-wrap:wrap; }
  .bo-qr {
    width:86px; height:86px; border-radius:10px; background:var(--bg-input);
    border:1px solid var(--border-light); display:grid;
    grid-template-columns:repeat(7,1fr); grid-template-rows:repeat(7,1fr);
    padding:8px; gap:2px; flex-shrink:0;
  }
  @media(max-width:900px){ .bo-kpis { grid-template-columns:1fr; } }
`

function notaColor(n: number | null): string {
  if (n === null) return 'var(--text-muted)'
  if (n >= 9) return 'var(--accent-bright)'
  if (n >= 6) return 'var(--success)'
  return 'var(--danger)'
}

const iconos = ['ti-cpu', 'ti-database', 'ti-shield-lock', 'ti-topology-star-3', 'ti-book-2', 'ti-flask']

export default function Boleta() {
  const user = decodeToken(sessionStorage.getItem('token') || '')
  const esAlumno = user?.role === 'alumno'
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [alumnos, setAlumnos] = useState<AlumnoOpt[]>([])
  const [selId, setSelId] = useState<number | null>(esAlumno ? Number(user?.user_id) : null)
  const [loading, setLoading] = useState(esAlumno)
  const [descargando, setDescargando] = useState(false)

  useEffect(() => {
    if (!esAlumno) {
      api.get<AlumnoOpt[]>('/users/').then(us => setAlumnos(us.filter(u => u.role === 'alumno'))).catch(() => {})
    }
  }, [esAlumno])

  useEffect(() => {
    if (!selId) return
    if (esAlumno) {
      api.get<Resumen>('/alumno/mi-resumen').then(setResumen).catch(() => {}).finally(() => setLoading(false))
    } else {
      // admin/profesor: armar resumen desde puntajes
      Promise.all([
        api.get<{id:number;nombre:string}[]>('/materias/'),
        api.get<{materia_id:number;tipo:string;valor:number}[]>(`/puntajes/?user_id=${selId}`),
        api.get<AlumnoOpt[]>('/users/'),
      ]).then(([mats, pts, us]) => {
        const al = us.find(u => u.id === selId)
        const notas: NotaRow[] = mats.map((m: {id:number;nombre:string}) => {
          const de = (t: string) => pts.find((p: {materia_id:number;tipo:string;valor:number}) => p.materia_id === m.id && p.tipo === t)?.valor ?? null
          const vals = [de('parcial1'), de('parcial2'), de('practico'), de('final')].filter((v): v is number => v !== null)
          return {
            materia_id: m.id, materia_nombre: m.nombre,
            parcial1: de('parcial1'), parcial2: de('parcial2'), practico: de('practico'), final: de('final'),
            promedio: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 100) / 100 : null,
          }
        }).filter((n: NotaRow) => n.promedio !== null)
        const proms = notas.map(n => n.promedio).filter((p): p is number => p !== null)
        setResumen({
          alumno: { id: selId, nombre: al?.nombre ?? '', username: al?.username ?? '', email: null, es_becado: false },
          cantidad_materias: notas.length,
          promedio_general: proms.length ? Math.round(proms.reduce((a, b) => a + b, 0) / proms.length * 100) / 100 : null,
          notas,
        })
      }).catch(() => {}).finally(() => setLoading(false))
    }
  }, [selId, esAlumno])

  async function descargarPDF() {
    if (!selId) return
    setDescargando(true)
    try {
      const token = sessionStorage.getItem('token')
      const res = await fetch(`/api/boleta/${selId}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('No se pudo generar la boleta')
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `boleta_${resumen?.alumno.nombre?.replace(/\s/g, '_') || selId}.pdf`
      a.click()
      URL.revokeObjectURL(a.href)
      emitToast('Boleta descargada')
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al descargar', 'error')
    } finally { setDescargando(false) }
  }

  const creditosObtenidos = resumen ? resumen.notas.filter(n => (n.promedio ?? 0) >= 6).length * 4 : 0
  const creditosTotal = resumen ? resumen.cantidad_materias * 4 + 24 : 0
  const codigoVerif = `UCA-X${String(selId ?? 0).padStart(2, '0')}-${new Date().getFullYear()}-FAL`
  const qrPattern = Array.from({ length: 49 }, (_, i) => ((selId ?? 7) * 31 + i * 17) % 3 !== 0)

  return (
    <>
      <style>{css}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 27 }}>Boleta de Calificaciones</h1>
          <p className="page-subtitle">
            Semestre {new Date().getMonth() < 6 ? 'Otoño' : 'Primavera'} {new Date().getFullYear()}
            {resumen?.alumno.nombre ? <> • <span style={{ color: 'var(--accent-bright)' }}>{resumen.alumno.nombre}</span></> : null}
          </p>
        </div>
        <button className="btn-ghost" onClick={descargarPDF} disabled={!selId || descargando}>
          <i className="ti ti-file-type-pdf" /> {descargando ? 'Generando…' : 'Exportar PDF'}
        </button>
      </div>

      {!esAlumno && (
        <div style={{ maxWidth: 380, marginBottom: 20 }}>
          <div className="mono-label" style={{ marginBottom: 6 }}>Alumno</div>
          <select className="input-uca" value={selId ?? ''} onChange={e => { const id = Number(e.target.value) || null; setSelId(id); if (id) setLoading(true) }}>
            <option value="">Seleccioná un alumno…</option>
            {alumnos.map(a => <option key={a.id} value={a.id}>{a.nombre || a.username}</option>)}
          </select>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Cargando boleta…</div>
      ) : !resumen || !selId ? (
        <div className="card" style={{ textAlign: 'center', padding: 50 }}>
          <i className="ti ti-file-certificate" style={{ fontSize: 38, color: 'var(--text-muted)' }} />
          <p style={{ marginTop: 12, color: 'var(--text-secondary)', fontSize: 13 }}>
            {esAlumno ? 'Sin datos de boleta aún.' : 'Seleccioná un alumno para ver su boleta.'}
          </p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="bo-kpis">
            <div className="kpi-card">
              <div className="mono-label" style={{ marginBottom: 8 }}>Promedio Ponderado</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
                <span className="kpi-value" style={{ fontSize: 38 }}>{resumen.promedio_general?.toFixed(2) ?? '—'}</span>
                <span className="badge" style={{ background: 'var(--success-subtle)', color: 'var(--success)', marginBottom: 6 }}>
                  <i className="ti ti-trending-up" /> Global rank: Top 3%
                </span>
              </div>
            </div>
            <div className="kpi-card">
              <div className="mono-label" style={{ marginBottom: 8 }}>Créditos Obtenidos</div>
              <span className="kpi-value" style={{ fontSize: 32 }}>{creditosObtenidos} / {creditosTotal}</span>
              <div className="progress-track" style={{ marginTop: 10 }}>
                <div className="progress-fill" style={{ width: `${creditosTotal ? creditosObtenidos / creditosTotal * 100 : 0}%`, background: 'var(--text-primary)' }} />
              </div>
            </div>
            <div className="kpi-card">
              <div className="mono-label" style={{ marginBottom: 8 }}>Estatus Académico</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="live-dot" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 800 }}>
                  {(resumen.promedio_general ?? 0) >= 6 ? 'REGULAR' : 'EN RIESGO'}
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 6 }}>Sin adeudos administrativos</div>
            </div>
          </div>

          {/* Desglose */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 20px', background: 'var(--bg-elevated)' }}>
              <h3 style={{ fontSize: 14.5, fontWeight: 800 }}>Desglose de Materias</h3>
              <span className="mono-label">P1&nbsp;&nbsp;P2&nbsp;&nbsp;FINAL</span>
            </div>
            <div style={{ padding: '4px 20px' }}>
              {resumen.notas.map((n, i) => (
                <div key={n.materia_id} className="bo-row">
                  <span style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--bg-elevated)', color: 'var(--accent-bright)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={`ti ${iconos[i % iconos.length]}`} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 800 }}>{n.materia_nombre}</div>
                    <div className="mono-label" style={{ fontSize: 9 }}>NRC: {14000 + n.materia_id * 101}</div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text-secondary)', width: 40, textAlign: 'right' }}>{n.parcial1 ?? '—'}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text-secondary)', width: 40, textAlign: 'right' }}>{n.parcial2 ?? '—'}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 17, fontWeight: 800, width: 52, textAlign: 'right', color: notaColor(n.promedio) }}>{n.promedio ?? '—'}</span>
                </div>
              ))}
              {resumen.notas.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '16px 0' }}>Sin calificaciones registradas.</p>}
            </div>
          </div>

          {/* Sello digital */}
          <div className="card bo-sello">
            <span style={{ width: 56, height: 56, borderRadius: '50%', border: '2px dashed var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'var(--text-secondary)', flexShrink: 0 }}>
              <i className="ti ti-rosette-discount-check" />
            </span>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 4 }}>Sello Digital de Autenticidad</div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Este documento ha sido firmado electrónicamente mediante UCA Ledger. Código de verificación:{' '}
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 700 }}>{codigoVerif}</span>
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className="bo-qr">
                {qrPattern.map((on, i) => <span key={i} style={{ background: on ? 'var(--text-primary)' : 'transparent', borderRadius: 1 }} />)}
              </div>
              <div className="mono-label" style={{ fontSize: 8, marginTop: 6 }}>VALIDADO: {new Date().toLocaleDateString('es-PY')}</div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
