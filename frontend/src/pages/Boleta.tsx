import { useState, useEffect } from 'react'
import { api, getCurrentUser, emitToast } from '../lib/api'
import { obtenerCreditosAlumno, type CreditosAlumnoOut } from '../services/pensumService'

type NotaRow = {
  materia_id: number; materia_nombre: string
  parcial1: number | null; parcial2: number | null; practico: number | null; final: number | null
  promedio: number | null
  pesos?: { parcial1: number; parcial2: number; practico: number; final: number }
}
type NotaMateriaApi = {
  materia_id: number; materia_nombre: string
  parcial1: number | null; parcial2: number | null; practico: number | null
  final1: number | null; final2: number | null; final3: number | null
  promedio: number | null
  pesos: { parcial1: number; parcial2: number; practico: number; final: number }
}
type MateriaPeriodoApi = { id: number; nombre: string; profesor: string | null; anio?: number | null; semestre?: number | null; oferta_periodo?: string | null }
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
  @media(max-width:900px){ .bo-kpis { grid-template-columns:1fr; } }

  .bo-desglose-cards { display:none; }
  .bo-mat-card { background:var(--bg-surface); border-bottom:1px solid var(--border-subtle); padding:14px 20px; }
  .bo-mat-card:last-child { border-bottom:none; }
  .bo-mat-card-head { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
  .bo-mat-notas-row { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:10px; }
  .bo-mat-nota-chip { background:var(--bg-elevated); border-radius:8px; padding:6px 4px; text-align:center; }
  .bo-mat-nota-chip .lbl { font-size:8.5px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; display:block; margin-bottom:3px; }
  .bo-mat-nota-chip .val { font-family:var(--font-mono); font-size:13px; font-weight:800; }
  .bo-mat-foot { display:flex; align-items:center; justify-content:space-between; }
  @media(max-width:640px){
    .bo-desglose-table { display:none; }
    .bo-desglose-cards { display:block; }
  }
`

function notaColor(n: number | null): string {
  if (n === null) return 'var(--text-muted)'
  if (n >= 9) return 'var(--accent-bright)'
  if (n >= 6) return 'var(--success)'
  return 'var(--danger)'
}

const iconos = ['ti-cpu', 'ti-database', 'ti-shield-lock', 'ti-topology-star-3', 'ti-book-2', 'ti-flask']

export default function Boleta() {
  const user = getCurrentUser()
  const esAlumno = user?.role === 'alumno'
  const uid = Number(user?.user_id)
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [creditos, setCreditos] = useState<CreditosAlumnoOut | null>(null)
  const [cuentaPendiente, setCuentaPendiente] = useState(0)
  const [cuentaVencida, setCuentaVencida] = useState(0)
  const [alumnos, setAlumnos] = useState<AlumnoOpt[]>([])
  const [selId, setSelId] = useState<number | null>(esAlumno ? uid : null)
  const [loading, setLoading] = useState(esAlumno)
  const [descargando, setDescargando] = useState(false)
  const [periodos, setPeriodos] = useState<{ anio: number; semestre: number }[]>([])
  const [periodoSel, setPeriodoSel] = useState<string>('actual')
  const [nombreReal, setNombreReal] = useState('')
  const [periodoActualInfo, setPeriodoActualInfo] = useState<{ anio: number; semestre: number } | null>(null)
  const [sello, setSello] = useState<{ codigo: string; qr_base64: string; validado_en: string } | null>(null)

  useEffect(() => {
    if (!selId) { setSello(null); return }
    api.get<{ codigo: string; qr_base64: string; validado_en: string }>(`/boleta/${selId}/sello`).then(setSello).catch(() => setSello(null))
  }, [selId])

  useEffect(() => {
    if (!esAlumno) {
      api.get<{items: AlumnoOpt[]}>('/profesor/lista-alumnos').then(r => setAlumnos(r.items)).catch(e => {
        console.error('Error al cargar alumnos:', e)
        emitToast('Error al cargar lista de alumnos', 'error')
      })
    } else {
      api.get<{ anio: number; semestre: number }[]>('/alumno/mis-periodos').then(setPeriodos).catch(() => {})
      obtenerCreditosAlumno(uid).then(setCreditos).catch(() => {})
      api.get<{ user?: { nombre: string | null }; cuentaSaldoPendiente?: number; cuentaSaldoVencido?: number }>('/alumno/dashboard').then(d => {
        setNombreReal(d.user?.nombre ?? '')
        setCuentaPendiente(d.cuentaSaldoPendiente ?? 0)
        setCuentaVencida(d.cuentaSaldoVencido ?? 0)
      }).catch(() => {})
    }
  }, [esAlumno, uid])

  useEffect(() => {
    if (!selId) return
    if (esAlumno) {
      const qs = periodoSel === 'actual' ? '' : (() => {
        const [a, s] = periodoSel.split('-')
        return `?anio=${a}&semestre=${s}`
      })()
      Promise.all([
        api.get<MateriaPeriodoApi[]>(`/alumno/mis-materias${qs}`),
        api.get<NotaMateriaApi[]>('/alumno/mis-notas'),
      ]).then(([mats, notasApi]) => {
        const idsPeriodo = new Set(mats.map(m => m.id))
        const notasMap = new Map(notasApi.map(n => [n.materia_id, n]))
        if (periodoSel === 'actual') {
          const conPeriodo = mats.find(m => !!m.oferta_periodo)
          const [pAnio, pSem] = conPeriodo?.oferta_periodo?.split('-') ?? []
          setPeriodoActualInfo(pAnio && pSem ? { anio: Number(pAnio), semestre: Number(pSem) } : null)
        }
        const notas: NotaRow[] = mats.map(m => {
          const n = notasMap.get(m.id)
          const finales = n ? [n.final1, n.final2, n.final3].filter((v): v is number => v !== null) : []
          return {
            materia_id: m.id, materia_nombre: m.nombre,
            parcial1: n?.parcial1 ?? null, parcial2: n?.parcial2 ?? null, practico: n?.practico ?? null,
            final: finales.length ? Math.max(...finales) : null,
            promedio: n?.promedio ?? null,
            pesos: n?.pesos,
          }
        }).filter(n => idsPeriodo.has(n.materia_id))
        const proms = notas.map(n => n.promedio).filter((p): p is number => p !== null)
        setResumen({
          alumno: { id: uid, nombre: nombreReal || user?.username || '', username: user?.username ?? '', email: null, es_becado: false },
          cantidad_materias: notas.length,
          promedio_general: proms.length ? Math.round(proms.reduce((a, b) => a + b, 0) / proms.length * 100) / 100 : null,
          notas,
        })
      }).catch(e => {
        console.error('Error al cargar boleta:', e)
        emitToast('Error al cargar tu boleta', 'error')
      }).finally(() => setLoading(false))
    } else {
      Promise.all([
        api.get<{id:number;nombre:string}[]>('/materias/'),
        api.get<{materia_id:number;tipo:string;valor:number}[]>(`/puntajes/?user_id=${selId}`),
        api.get<{items: AlumnoOpt[]}>('/profesor/lista-alumnos'),
      ]).then(([mats, pts, res]) => {
        const us = res.items
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
      }).catch(e => {
        console.error('Error al cargar datos de boleta:', e)
        emitToast('Error al cargar datos de la boleta', 'error')
      }).finally(() => setLoading(false))
    }
  }, [selId, esAlumno, periodoSel, uid, nombreReal])

  async function descargarPDF() {
    if (!selId) return
    setDescargando(true)
    try {
      const filename = `boleta_${resumen?.alumno.nombre?.replace(/\s/g, '_') || selId}.pdf`
      await api.download(`/boleta/${selId}`, filename)
      emitToast('Boleta descargada')
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al descargar', 'error')
    } finally { setDescargando(false) }
  }

  const creditosObtenidos = creditos?.creditos_acumulados ?? 0
  const creditosTotal = creditos?.creditos_totales ?? 0
  const periodoLabel = periodoSel === 'actual'
    ? (periodoActualInfo ? `${periodoActualInfo.semestre}° Semestre ${periodoActualInfo.anio} (actual)` : `Período actual ${new Date().getFullYear()}`)
    : (() => { const [a, s] = periodoSel.split('-'); return `${a}° Año — ${s}° Semestre` })()

  return (
    <>
      <style>{css}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 27 }}>{esAlumno ? 'Mi Boleta' : 'Boleta de Calificaciones'}</h1>
          <p className="page-subtitle">
            {esAlumno ? periodoLabel : `Semestre ${new Date().getMonth() < 6 ? 1 : 2}° ${new Date().getFullYear()}`}
            {resumen?.alumno.nombre ? <> • <span style={{ color: 'var(--accent-bright)' }}>{resumen.alumno.nombre}</span></> : null}
          </p>
        </div>
        <button className="btn-ghost" onClick={descargarPDF} disabled={!selId || descargando}>
          <i className="ti ti-file-type-pdf" /> {descargando ? 'Generando…' : 'Exportar PDF'}
        </button>
      </div>

      {esAlumno && (
        <div style={{ maxWidth: 260, marginBottom: 20 }}>
          <div className="mono-label" style={{ marginBottom: 6 }}>Período (Año — Semestre de carrera)</div>
          <select className="input-uca" value={periodoSel} onChange={e => setPeriodoSel(e.target.value)}>
            <option value="actual">Período actual</option>
            {periodos.map(p => (
              <option key={`${p.anio}-${p.semestre}`} value={`${p.anio}-${p.semestre}`}>{p.anio}° Año — {p.semestre}° Semestre</option>
            ))}
          </select>
        </div>
      )}

      {!esAlumno && (
        <div style={{ maxWidth: 380, marginBottom: 20 }}>
          <div className="mono-label" style={{ marginBottom: 6 }}>Alumno</div>
          <select aria-label="Alumno" className="input-uca" value={selId ?? ''} onChange={e => { const id = Number(e.target.value) || null; setSelId(id); if (id) setLoading(true) }}>
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
              <span className="kpi-value" style={{ fontSize: 38 }}>{resumen.promedio_general?.toFixed(2) ?? '—'}<span className="kpi-unit"> / 10</span></span>
            </div>
            <div className="kpi-card">
              <div className="mono-label" style={{ marginBottom: 8 }}>Créditos Obtenidos</div>
              <span className="kpi-value" style={{ fontSize: 32 }}>{creditos ? creditosObtenidos : '—'} / {creditos?.creditos_totales ?? '—'}</span>
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
              <div style={{ fontSize: 11.5, color: cuentaVencida > 0 ? 'var(--danger)' : 'var(--text-secondary)', marginTop: 6 }}>
                {!esAlumno ? 'Sin datos de adeudos' : cuentaVencida > 0 ? `Cuota vencida: Gs. ${cuentaVencida.toLocaleString('es-PY')}` : cuentaPendiente > 0 ? `Cuota pendiente: Gs. ${cuentaPendiente.toLocaleString('es-PY')}` : 'Sin adeudos administrativos'}
              </div>
            </div>
          </div>

          {/* Desglose */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
            <div className="bo-desglose-table">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', background: 'var(--bg-elevated)' }}>
                <h3 style={{ fontSize: 14.5, fontWeight: 800, flex: 1 }}>Desglose de Materias</h3>
                <span className="mono-label" style={{ width: 34, textAlign: 'right' }}>P1</span>
                <span className="mono-label" style={{ width: 34, textAlign: 'right' }}>P2</span>
                <span className="mono-label" style={{ width: 34, textAlign: 'right' }}>TP</span>
                <span className="mono-label" style={{ width: 40, textAlign: 'right' }}>FINAL</span>
                <span className="mono-label" style={{ width: 52, textAlign: 'right' }}>PROM</span>
              </div>
              <div style={{ padding: '4px 20px' }}>
                {resumen.notas.map((n, i) => (
                  <div key={n.materia_id} className="bo-row">
                    <span style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--bg-elevated)', color: 'var(--accent-bright)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={`ti ${iconos[i % iconos.length]}`} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 800 }}>{n.materia_nombre}</div>
                      {n.pesos && <div className="mono-label" style={{ fontSize: 9 }}>P1 {n.pesos.parcial1}pts · P2 {n.pesos.parcial2}pts · TP {n.pesos.practico}pts · Final {n.pesos.final}pts</div>}
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text-secondary)', width: 34, textAlign: 'right' }}>{n.parcial1 ?? '—'}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text-secondary)', width: 34, textAlign: 'right' }}>{n.parcial2 ?? '—'}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text-secondary)', width: 34, textAlign: 'right' }}>{n.practico ?? '—'}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text-secondary)', width: 40, textAlign: 'right' }}>{n.final ?? '—'}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 17, fontWeight: 800, width: 52, textAlign: 'right', color: notaColor(n.promedio) }}>{n.promedio ?? '—'}</span>
                  </div>
                ))}
                {resumen.notas.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '16px 0' }}>Sin calificaciones registradas.</p>}
              </div>
            </div>

            {/* Vista mobile: cards en vez de tabla horizontal */}
            <div className="bo-desglose-cards">
              <div style={{ padding: '14px 20px', background: 'var(--bg-elevated)' }}>
                <h3 style={{ fontSize: 14.5, fontWeight: 800 }}>Desglose de Materias</h3>
              </div>
              {resumen.notas.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '16px 20px' }}>Sin calificaciones registradas.</p>
              ) : resumen.notas.map((n, i) => {
                const pesos = n.pesos
                return (
                  <div key={n.materia_id} className="bo-mat-card">
                    <div className="bo-mat-card-head">
                      <span style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-elevated)', color: 'var(--accent-bright)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className={`ti ${iconos[i % iconos.length]}`} />
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{n.materia_nombre}</div>
                      </div>
                    </div>
                    <div className="bo-mat-notas-row">
                      <div className="bo-mat-nota-chip"><span className="lbl">P1{pesos ? ` ${pesos.parcial1}p` : ''}</span><span className="val">{n.parcial1 ?? '—'}</span></div>
                      <div className="bo-mat-nota-chip"><span className="lbl">P2{pesos ? ` ${pesos.parcial2}p` : ''}</span><span className="val">{n.parcial2 ?? '—'}</span></div>
                      <div className="bo-mat-nota-chip"><span className="lbl">TP{pesos ? ` ${pesos.practico}p` : ''}</span><span className="val">{n.practico ?? '—'}</span></div>
                      <div className="bo-mat-nota-chip"><span className="lbl">Final{pesos ? ` ${pesos.final}p` : ''}</span><span className="val">{n.final ?? '—'}</span></div>
                    </div>
                    <div className="bo-mat-foot">
                      <span className="mono-label">Promedio</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 16, color: notaColor(n.promedio) }}>{n.promedio ?? '—'}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sello digital real: código firmado con SECRET_KEY, verificable en /boleta/verificar/{codigo} */}
          {sello && (
            <div className="card bo-sello">
              <span style={{ width: 56, height: 56, borderRadius: '50%', border: '2px dashed var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'var(--text-secondary)', flexShrink: 0 }}>
                <i className="ti ti-rosette-discount-check" />
              </span>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 4 }}>Sello Digital de Autenticidad</div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Código firmado por el Sistema Académico UCA, verificable en cualquier momento. Código de verificación:{' '}
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 700 }}>{sello.codigo}</span>
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <img src={`data:image/png;base64,${sello.qr_base64}`} alt="QR verificación boleta" style={{ width: 86, height: 86, borderRadius: 10, background: '#fff', padding: 6 }} />
                <div className="mono-label" style={{ fontSize: 8, marginTop: 6 }}>VALIDADO: {new Date(sello.validado_en).toLocaleDateString('es-PY')}</div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
