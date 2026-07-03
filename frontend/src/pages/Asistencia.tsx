import { useState, useEffect, useRef, useCallback } from 'react'
import { api, decodeToken } from '../lib/api'
import { setDocTitle } from '../lib/docTitle'
import QRModal from '../components/QRModal'

type View = 'carreras' | 'materias' | 'alumnos'

interface Carrera { id: number; nombre: string }
interface Materia { id: number; nombre: string; codigo: string }
interface AlumnoAsist {
  id: number; nombre: string; documento: string
  asistencia_id: number | null; presente: boolean | null; es_becado: boolean
  motivo?: string | null
}

const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .as-root { padding: 28px 36px 60px; min-height: 100%; background: var(--bg-base); font-family: 'Inter', system-ui, sans-serif; color: var(--text-primary); }
  .as-header { margin-bottom: 28px; }
  .as-title { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
  .as-sub { font-size: 13px; color: var(--text-secondary); margin-top: 3px; }

  /* Alumno: layout de 2 columnas en desktop */
  .alumno-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
  .alumno-layout-single { display: flex; flex-direction: column; gap: 20px; max-width: 560px; }

  .as-scan-btn {
    width: 220px; height: 220px; border-radius: 50%; border: 2px dashed #2a3040;
    background: var(--bg-input); display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 14px; cursor: pointer; transition: all 0.2s; margin: 0 auto;
  }
  .as-scan-btn:hover { border-color: var(--accent); background: var(--accent-muted); }
  .as-scan-btn:active { transform: scale(0.97); }
  .as-scan-icon { width: 48px; height: 48px; color: var(--accent); }
  .as-scan-label { font-size: 15px; font-weight: 600; color: var(--text-primary); }
  .as-scan-sub { font-size: 12px; color: var(--text-muted); text-align: center; max-width: 200px; }

  .as-hist { margin-top: 40px; }
  .as-hist-title { font-size: 14px; font-weight: 600; color: var(--text-secondary); margin-bottom: 14px; }
  .as-hist-grid { display: flex; flex-direction: column; gap: 8px; }
  .as-hist-item {
    display: flex; align-items: center; gap: 12px; padding: 12px 16px;
    background: var(--bg-input); border: 1px solid #2a3040; border-radius: 10px;
  }
  .as-hist-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .as-hist-info { flex: 1; min-width: 0; }
  .as-hist-mat { font-size: 13px; font-weight: 600; color: var(--text-primary); }
  .as-hist-fec { font-size: 11px; color: var(--text-muted); }

  .bread { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; font-size: 13px; }
  .bread-btn { background: none; border: none; color: var(--text-secondary); cursor: pointer; font-family: inherit; font-size: 13px; padding: 0; }
  .bread-btn:hover { color: var(--text-primary); }
  .bread-sep { color: #2a3040; }
  .bread-cur { color: var(--text-primary); font-weight: 600; }

  .grid-2 { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
  .sel-card {
    background: var(--bg-input); border: 1px solid #2a3040; border-radius: 12px;
    padding: 18px; cursor: pointer; transition: all 0.15s;
  }
  .sel-card:hover { border-color: var(--accent); background: var(--accent-muted); }
  .sel-card:active { transform: scale(0.98); }
  .sel-card-nom { font-size: 14px; font-weight: 600; color: var(--text-primary); }
  .sel-card-sub { font-size: 11px; color: var(--text-muted); margin-top: 3px; }

  .as-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
  .as-toolbar-left { display: flex; align-items: center; gap: 12px; }
  .as-toolbar-right { display: flex; align-items: center; gap: 8px; }
  .as-btn {
    height: 34px; padding: 0 16px; border-radius: 8px; border: 1px solid #2a3040;
    background: var(--bg-input); color: var(--text-primary); font-size: 12px; font-weight: 500;
    cursor: pointer; font-family: inherit; display: flex; align-items: center; gap: 6px;
    transition: all 0.15s;
  }
  .as-btn:hover { border-color: var(--accent); }
  .as-btn-primary { background: var(--accent); border-color: var(--accent); color: #000; font-weight: 600; }
  .as-btn-primary:hover { opacity: 0.88; }

  .as-table-wrap { overflow-x: auto; border: 1px solid #2a3040; border-radius: 12px; }
  .as-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .as-table th { text-align: left; padding: 12px 16px; background: var(--bg-input); color: var(--text-muted); font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid #2a3040; }
  .as-table td { padding: 10px 16px; border-bottom: 1px solid var(--bg-hover); color: #cbd5e1; }
  .as-table tr:last-child td { border-bottom: none; }
  .as-table tr:hover td { background: var(--bg-input); }

  .as-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 600;
  }
  .as-badge-presente { background: #34d39915; color: #34d399; }
  .as-badge-ausente  { background: #2a3040; color: var(--text-muted); }
  .as-badge-becado   { background: #fbbf2415; color: #fbbf24; }

  .as-toggle {
    width: 36px; height: 24px; border-radius: 12px; border: none; cursor: pointer;
    position: relative; transition: all 0.2s;
  }
  .as-toggle::after {
    content: ''; position: absolute; top: 3px; left: 3px;
    width: 18px; height: 18px; border-radius: 50%; background: #fff;
    transition: all 0.2s;
  }
  .as-toggle.on  { background: #34d399; }
  .as-toggle.on::after  { left: 15px; }
  .as-toggle.off { background: #2a3040; }
  .as-toggle.off::after { left: 3px; }

  .as-empty {
    text-align: center; padding: 40px 20px; color: var(--text-muted);
  }
  .as-empty-icon { width: 40px; height: 40px; margin: 0 auto 12px; opacity: 0.3; }

  /* Alumno — instrucciones QR */
  .qr-instruc-card {
    background: var(--bg-input); border: 1px solid #2a3040; border-radius: 16px;
    padding: 28px 24px; max-width: 480px; margin: 0 auto;
  }
  .qr-instruc-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
  .qr-instruc-icon { width: 44px; height: 44px; border-radius: 12px; background: var(--accent-muted); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .qr-instruc-title { font-size: 16px; font-weight: 700; color: var(--text-primary); }
  .qr-instruc-sub { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
  .qr-steps { display: flex; flex-direction: column; gap: 12px; }
  .qr-step { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; background: var(--bg-surface); border: 1px solid var(--bg-hover); border-radius: 10px; }
  .qr-step-num { width: 24px; height: 24px; border-radius: 50%; background: var(--accent-muted); border: 1px solid var(--accent-hover); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; color: var(--accent); flex-shrink: 0; margin-top: 1px; }
  .qr-step-title { font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
  .qr-step-desc { font-size: 12px; color: var(--text-muted); line-height: 1.5; }
  .qr-tip { display: flex; align-items: flex-start; gap: 8px; margin-top: 20px; padding: 12px 14px; background: #f59e0b08; border: 1px solid #f59e0b20; border-radius: 8px; font-size: 12px; color: #f59e0b; line-height: 1.5; }
  .qr-tip svg { flex-shrink: 0; margin-top: 1px; }

  /* Historial mejorado */
  .as-hist-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; flex-shrink: 0; }
  .as-hist-badge.presente { background: #34d39915; color: #34d399; }
  .as-hist-badge.ausente { background: #ef444415; color: #ef4444; }
  .as-hist-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--bg-input); border: 1px solid #2a3040; border-radius: 10px; }
  .as-hist-left { flex: 1; min-width: 0; }
  .as-hist-mat { font-size: 13px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .as-hist-fec { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

  @media(max-width:900px){
    .alumno-layout { grid-template-columns: 1fr; }
  }
  @media(max-width:768px){
    .as-root { padding: 16px 16px 80px; }
    .grid-2 { grid-template-columns: 1fr; }
    .qr-instruc-card { padding: 20px 16px; }
    .as-toolbar { flex-direction: column; align-items: flex-start; }
    .as-toolbar-right { width: 100%; justify-content: flex-end; }
    .as-table { font-size: 12px; }
    .as-table th, .as-table td { padding: 10px 12px; }
    .alumno-layout { grid-template-columns: 1fr; gap: 16px; }
  }
`

export default function Asistencia() {
  const token = sessionStorage.getItem('token')
  const user = token ? decodeToken(token) : null
  const rol = user?.role || ''

  useEffect(() => {
    setDocTitle(rol, user?.username || '')
  }, [])

  if (rol === 'alumno') return <AlumnoView />
  if (rol === 'profesor') return <ProfesorView />
  return <AdminView />
}

/* ─── ALUMNO: solo escanear QR ─── */
function AlumnoView() {
  const [historial, setHistorial] = useState<{ materia: string; fecha: string; presente: boolean }[]>([])

  useEffect(() => {
    api.get<any[]>('/asistencias/?user_id=' + (decodeToken(sessionStorage.getItem('token') || '')?.user_id || ''))
      .then(data => {
        if (data && data.length > 0) {
          setHistorial(data.slice(-10).reverse().map((a: any) => ({
            materia: a.materia_nombre || `Materia #${a.materia_id}`,
            fecha: a.fecha,
            presente: a.presente,
          })))
        }
      }).catch(() => {})
  }, [])

  return (
    <>
      <style>{css}</style>
      <div className="as-root">
        <div className="as-header">
          <div className="as-title">Asistencia</div>
          <div className="as-sub">Registrá tu presencia escaneando el código QR de tu profesor</div>
        </div>

        <div className="alumno-layout">

          {/* Col 1 — Instrucciones QR */}
          <div className="qr-instruc-card">
            <div className="qr-instruc-header">
              <div className="qr-instruc-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8">
                  <path d="M3 7V5a2 2 0 012-2h2M3 17v2a2 2 0 002 2h2M17 3h2a2 2 0 012 2v2M17 21h2a2 2 0 002-2v-2"/>
                  <rect x="7" y="7" width="4" height="4" rx="1"/><rect x="13" y="7" width="4" height="4" rx="1"/>
                  <rect x="7" y="13" width="4" height="4" rx="1"/><rect x="13" y="13" width="4" height="4" rx="1"/>
                </svg>
              </div>
              <div>
                <div className="qr-instruc-title">Cómo registrar tu asistencia</div>
                <div className="qr-instruc-sub">Tu profesor generará un código QR en clase</div>
              </div>
            </div>
            <div className="qr-steps">
              {[
                { n:1, title:'Abrí la cámara de tu teléfono', desc:'Usá la app de cámara nativa o un lector QR. No necesitás ninguna app extra.' },
                { n:2, title:'Enfocá el QR del profesor', desc:'El código aparece en la pantalla del profesor o proyector al inicio de la clase.' },
                { n:3, title:'¡Listo! Tu asistencia se registra', desc:'El sistema confirma tu presencia automáticamente cuando escaneás el código.' },
              ].map(s => (
                <div key={s.n} className="qr-step">
                  <div className="qr-step-num">{s.n}</div>
                  <div>
                    <div className="qr-step-title">{s.title}</div>
                    <div className="qr-step-desc">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="qr-tip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <div>
                El QR es válido por <strong>15 minutos</strong>.<br />
                Si ya lo escaneaste hoy, tu asistencia ya está registrada.
              </div>
            </div>
          </div>

          {/* Col 2 — Historial */}
          <div>
            <div className="as-hist-title" style={{ marginBottom: 14, fontWeight: 700, color: 'var(--text-secondary)', fontSize: 14 }}>
              Últimos registros
            </div>
            {historial.length > 0 ? (
              <div className="as-hist-grid">
                {historial.map((h, i) => (
                  <div key={i} className="as-hist-item">
                    <div className="as-hist-left">
                      <div className="as-hist-mat">{h.materia}</div>
                      <div className="as-hist-fec">
                        {new Date(h.fecha + 'T12:00:00').toLocaleDateString('es-PY', { weekday:'short', day:'numeric', month:'short', year:'numeric' })}
                      </div>
                    </div>
                    <span className={`as-hist-badge ${h.presente ? 'presente' : 'ausente'}`}>
                      {h.presente ? '✓ Presente' : '✗ Ausente'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--text-muted)', fontSize:13, background:'var(--bg-input)', border:'1px solid #2a3040', borderRadius:12 }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin:'0 auto 12px', opacity:0.25, display:'block' }}>
                  <path d="M9 12l2 2 4-4M7.86 2h8.28M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z"/>
                </svg>
                Todavía no tenés registros de asistencia
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  )
}

/* ─── PROFESOR: carreras → materias → alumnos ─── */
function ProfesorView() {
  const [view, setView]         = useState<View>('carreras')
  const [carreras, setCarr]     = useState<Carrera[]>([])
  const [materias, setMat]      = useState<Materia[]>([])
  const [alumnos, setAlumn]     = useState<AlumnoAsist[]>([])
  const [selCarr, setSelCarr]   = useState<Carrera | null>(null)
  const [selMat, setSelMat]     = useState<Materia | null>(null)
  const [loading, setLoading]   = useState(false)
  const [qrMatId, setQrMatId]   = useState<number | null>(null)
  const [fecha, setFecha]       = useState(() => new Date().toISOString().slice(0, 10))
  const [fechaLabel, setFechaL] = useState(() => {
    const d = new Date()
    return d.toLocaleDateString('es-PY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  })
  // QR session timer (visible in toolbar without keeping modal open)
  const [qrSeg, setQrSeg]       = useState(0)
  const [qrActive, setQrActive] = useState(false)
  const qrTimerRef              = useRef<ReturnType<typeof setInterval> | null>(null)
  // Motivo modal for absent
  const [motivoModal, setMotivoModal] = useState<AlumnoAsist | null>(null)
  const [motivoText, setMotivoText]   = useState('')
  // Polling ref
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setLoading(true)
    api.get<Carrera[]>('/asistencias/profesor/carreras')
      .then(d => { setCarr(d || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function selectCarrera(c: Carrera) {
    setSelCarr(c); setLoading(true)
    api.get<Materia[]>(`/asistencias/profesor/materias?carrera_id=${c.id}`)
      .then(d => { setMat(d || []); setLoading(false); setView('materias') })
      .catch(() => setLoading(false))
  }

  const refreshAlumnos = useCallback((matId: number, f: string) => {
    api.get<{ fecha: string; materia: string; alumnos: AlumnoAsist[] }>(`/asistencias/profesor/alumnos?materia_id=${matId}&fecha=${f}`)
      .then(d => setAlumn(d.alumnos || []))
      .catch(() => {})
  }, [])

  function selectMateria(m: Materia) {
    setSelMat(m); setLoading(true)
    // stop old poll
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    api.get<{ fecha: string; materia: string; alumnos: AlumnoAsist[] }>(`/asistencias/profesor/alumnos?materia_id=${m.id}&fecha=${fecha}`)
      .then(d => {
        setAlumn(d.alumnos || [])
        setLoading(false)
        setView('alumnos')
        // start polling every 5s
        pollRef.current = setInterval(() => refreshAlumnos(m.id, fecha), 5000)
      })
      .catch(() => setLoading(false))
  }

  // cleanup poll on unmount or view change
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])
  useEffect(() => {
    if (view !== 'alumnos' && pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }, [view])

  // QR inline (panel REGISTRO EN TIEMPO REAL)
  const [qrImg, setQrImg] = useState<string | null>(null)
  const [qrCargando, setQrCargando] = useState(false)
  async function generarQrInline() {
    if (!selMat) return
    setQrCargando(true)
    try {
      const data = await api.get<{ qr_base64: string; expira_en: number }>(`/asistencias/qr/${selMat.id}`)
      setQrImg(data.qr_base64)
      startQrTimer(data.expira_en)
    } catch { setQrImg(null) }
    finally { setQrCargando(false) }
  }

  // QR timer countdown
  function startQrTimer(expiraEn: number) {
    setQrSeg(expiraEn); setQrActive(true)
    if (qrTimerRef.current) clearInterval(qrTimerRef.current)
    qrTimerRef.current = setInterval(() => {
      setQrSeg(s => {
        if (s <= 1) {
          clearInterval(qrTimerRef.current!)
          setQrActive(false)
          return 0
        }
        return s - 1
      })
    }, 1000)
  }
  useEffect(() => { return () => { if (qrTimerRef.current) clearInterval(qrTimerRef.current) } }, [])

  function cambiarFecha(nf: string) {
    setFecha(nf)
    const d = new Date(nf + 'T12:00:00')
    setFechaL(d.toLocaleDateString('es-PY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
    if (selMat) {
      setLoading(true)
      api.get<{ fecha: string; materia: string; alumnos: AlumnoAsist[] }>(`/asistencias/profesor/alumnos?materia_id=${selMat.id}&fecha=${nf}`)
        .then(d => { setAlumn(d.alumnos || []); setLoading(false) })
        .catch(() => setLoading(false))
      // restart poll with new date
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      pollRef.current = setInterval(() => refreshAlumnos(selMat.id, nf), 5000)
    }
  }

  async function marcarPresente(alumno: AlumnoAsist) {
    if (alumno.asistencia_id) {
      await api.put(`/asistencias/profesor/toggle/${alumno.asistencia_id}?presente=true`, {})
      setAlumn(prev => prev.map(a => a.id === alumno.id ? { ...a, presente: true, motivo: null } : a))
    } else {
      await api.post(`/asistencias/profesor/marcar?materia_id=${selMat!.id}&alumno_id=${alumno.id}&fecha=${fecha}&presente=true`, {})
      refreshAlumnos(selMat!.id, fecha)
    }
  }

  async function confirmarAusente() {
    if (!motivoModal) return
    const a = motivoModal
    const q = motivoText.trim() ? `&motivo=${encodeURIComponent(motivoText.trim())}` : ''
    if (a.asistencia_id) {
      await api.put(`/asistencias/profesor/toggle/${a.asistencia_id}?presente=false${q}`, {})
      setAlumn(prev => prev.map(x => x.id === a.id ? { ...x, presente: false, motivo: motivoText.trim() || null } : x))
    } else {
      await api.post(`/asistencias/profesor/marcar?materia_id=${selMat!.id}&alumno_id=${a.id}&fecha=${fecha}&presente=false${q}`, {})
      refreshAlumnos(selMat!.id, fecha)
    }
    setMotivoModal(null); setMotivoText('')
  }

  const presentes = alumnos.filter(a => a.presente === true).length
  const total     = alumnos.length
  const qrMin = Math.floor(qrSeg / 60)
  const qrS   = qrSeg % 60
  const qrClr = qrSeg > 300 ? 'var(--accent)' : qrSeg > 60 ? '#f59e0b' : '#ef4444'

  return (
    <>
      <style>{css}</style>
      <div className="as-root">
        <div className="as-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="as-title" style={{ fontSize: 24, fontWeight: 800 }}>Control de Asistencia</div>
            <div className="as-sub">
              {selMat
                ? <>Materia: <span style={{ color: 'var(--accent-bright)', fontWeight: 700 }}>{selMat.nombre}</span></>
                : 'Gestioná la asistencia de tus cursos por carrera y materia'}
            </div>
          </div>
          {view === 'alumnos' && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-ghost"><i className="ti ti-download" /> Exportar Reporte</button>
              <button className="btn-primary" onClick={() => setQrMatId(selMat!.id)}><i className="ti ti-hand-finger" /> Pase Manual</button>
            </div>
          )}
        </div>

        {/* Breadcrumb */}
        <div className="bread">
          {view !== 'carreras' && (
            <button className="bread-btn" onClick={() => { setView('carreras'); setSelCarr(null); setSelMat(null) }}>
              Carreras
            </button>
          )}
          {selCarr && view !== 'carreras' && <span className="bread-sep">/</span>}
          {selCarr && view !== 'carreras' && (
            view === 'materias'
              ? <span className="bread-cur">{selCarr.nombre}</span>
              : <button className="bread-btn" onClick={() => { setView('materias'); setSelMat(null) }}>{selCarr.nombre}</button>
          )}
          {selMat && view === 'alumnos' && <span className="bread-sep">/</span>}
          {selMat && view === 'alumnos' && <span className="bread-cur">{selMat.nombre}</span>}
        </div>

        {view === 'carreras' && (
          loading ? <div className="as-empty">Cargando carreras…</div>
          : carreras.length === 0 ? <div className="as-empty"><div className="as-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>No tenés carreras asignadas</div>
          : <div className="grid-2">{carreras.map(c => (
              <div key={c.id} className="sel-card" onClick={() => selectCarrera(c)}>
                <div className="sel-card-nom">{c.nombre}</div>
                <div className="sel-card-sub">Carrera</div>
              </div>
            ))}</div>
        )}

        {view === 'materias' && (
          loading ? <div className="as-empty">Cargando materias…</div>
          : materias.length === 0 ? <div className="as-empty"><div className="as-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>No hay materias en esta carrera</div>
          : <div className="grid-2">{materias.map(m => (
              <div key={m.id} className="sel-card" onClick={() => selectMateria(m)}>
                <div className="sel-card-nom">{m.nombre}</div>
                <div className="sel-card-sub">{m.codigo}</div>
              </div>
            ))}</div>
        )}

        {view === 'alumnos' && (
          <>
            {/* Grid: QR en tiempo real + KPIs/Historial */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px,1fr) 1.2fr', gap: 16, marginBottom: 18 }} className="as-rt-grid">
              <style>{`@media(max-width:900px){ .as-rt-grid { grid-template-columns:1fr !important; } }`}</style>

              {/* Panel REGISTRO EN TIEMPO REAL */}
              <div className="card" style={{ textAlign: 'center' }}>
                <div className="mono-label" style={{ letterSpacing: '0.18em', marginBottom: 14 }}>Registro en Tiempo Real</div>
                <div style={{ width: 190, height: 190, margin: '0 auto', borderRadius: 18, background: '#fff', padding: 10, border: '4px solid var(--bg-elevated)', boxShadow: '0 0 40px var(--accent-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {qrImg
                    ? <img src={`data:image/png;base64,${qrImg}`} alt="QR asistencia" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    : <i className="ti ti-qrcode" style={{ fontSize: 70, color: '#0b0d11' }} />}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 30, fontWeight: 800, marginTop: 14, color: qrActive ? (qrSeg > 60 ? 'var(--accent-bright)' : 'var(--danger)') : 'var(--text-muted)' }}>
                  {qrActive ? `${String(qrMin).padStart(2, '0')}:${String(qrS).padStart(2, '0')}` : '--:--'}
                </div>
                <div className="mono-label" style={{ marginBottom: 14 }}>
                  {qrActive ? (qrSeg <= 60 ? 'CÓDIGO EXPIRA PRONTO' : 'CÓDIGO ACTIVO') : 'SIN CÓDIGO ACTIVO'}
                </div>
                <button className="btn-primary" style={{ width: '100%' }} disabled={qrCargando} onClick={generarQrInline}>
                  <i className="ti ti-refresh" /> {qrCargando ? 'Generando…' : qrActive ? 'Regenerar QR' : 'Generar QR'}
                </button>
                <div style={{ marginTop: 14 }}>
                  <div className="progress-track"><div className="progress-fill" style={{ width: `${total ? presentes / total * 100 : 0}%` }} /></div>
                  <div className="mono-label" style={{ marginTop: 6 }}>Escaneos detectados: {presentes}/{total} alumnos</div>
                </div>
              </div>

              {/* KPIs + Historial Mensual */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                  <div className="kpi-card">
                    <div className="mono-label" style={{ marginBottom: 6 }}>Asistencia Hoy</div>
                    <span className="kpi-value" style={{ fontSize: 22 }}>{total > 0 ? Math.round(presentes / total * 100) : 0}%</span>
                  </div>
                  <div className="kpi-card">
                    <div className="mono-label" style={{ marginBottom: 6 }}>Inasistencias</div>
                    <span className="kpi-value" style={{ fontSize: 22 }}>{alumnos.filter(a => a.presente === false).length}</span>
                  </div>
                  <div className="kpi-card">
                    <div className="mono-label" style={{ marginBottom: 6 }}>Sin Registro</div>
                    <span className="kpi-value" style={{ fontSize: 22 }}>{alumnos.filter(a => a.presente === null).length}</span>
                  </div>
                </div>
                <div className="card" style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 800 }}>Historial Mensual</h3>
                    <span className="mono-label">{new Date(fecha + 'T12:00:00').toLocaleDateString('es-PY', { month: 'long', year: 'numeric' })}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
                    {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <div key={i} className="mono-label" style={{ textAlign: 'center' }}>{d}</div>)}
                    {(() => {
                      const base = new Date(fecha + 'T12:00:00')
                      const y = base.getFullYear(), mo = base.getMonth()
                      const first = (new Date(y, mo, 1).getDay() + 6) % 7
                      const dias = new Date(y, mo + 1, 0).getDate()
                      const cells = []
                      for (let i = 0; i < first; i++) cells.push(<span key={`e${i}`} />)
                      for (let d = 1; d <= dias; d++) {
                        const esSel = d === base.getDate()
                        const esClase = new Date(y, mo, d).getDay() % 6 !== 0 && d % 2 === 1
                        cells.push(
                          <button key={d} onClick={() => cambiarFecha(`${y}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)}
                            style={{
                              aspectRatio: '1', borderRadius: 8, border: 'none', cursor: 'pointer',
                              fontFamily: 'var(--font-mono)', fontSize: 11,
                              background: esSel ? 'var(--accent)' : 'transparent',
                              color: esSel ? '#fff' : 'var(--text-secondary)',
                              position: 'relative',
                            }}>
                            {d}
                            {esClase && !esSel && <span style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)' }} />}
                          </button>
                        )
                      }
                      return cells
                    })()}
                  </div>
                </div>
              </div>
            </div>
            <div className="as-toolbar">
              <div className="as-toolbar-left">
                <input type="date" value={fecha} onChange={e => cambiarFecha(e.target.value)}
                  style={{ height: 34, padding: '0 12px', borderRadius: 8, border: '1px solid #2a3040', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit' }} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fechaLabel}</span>
              </div>
              <div className="as-toolbar-right">
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{presentes}/{total} presentes</span>
                {/* QR timer badge — visible without modal */}
                {qrActive && (
                  <div style={{ display:'flex', alignItems:'center', gap:6, background:'var(--bg-surface)', border:`1px solid ${qrClr}30`, borderRadius:8, padding:'5px 10px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={qrClr} strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span style={{ fontFamily:'monospace', fontSize:13, fontWeight:700, color:qrClr }}>
                      {String(qrMin).padStart(2,'0')}:{String(qrS).padStart(2,'0')}
                    </span>
                    <button className="as-btn as-btn-primary" style={{ padding:'4px 10px', fontSize:11 }} onClick={() => setQrMatId(selMat!.id)}>
                      Ver QR
                    </button>
                  </div>
                )}
                <button className="as-btn as-btn-primary" onClick={() => setQrMatId(selMat!.id)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="3" height="3"/><rect x="14" y="7" width="3" height="3"/><rect x="7" y="14" width="3" height="3"/><rect x="14" y="14" width="3" height="3"/>
                  </svg>
                  {qrActive ? 'Nuevo QR' : 'Generar QR'}
                </button>
              </div>
            </div>

            {loading ? <div className="as-empty">Cargando alumnos…</div>
            : alumnos.length === 0 ? <div className="as-empty"><div className="as-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>No hay alumnos inscriptos en esta materia</div>
            : <div className="as-table-wrap"><table className="as-table">
              <thead><tr>
                <th>N°</th>
                <th>Alumno</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr></thead>
              <tbody>
                {alumnos.map((a, i) => (
                  <tr key={a.id}>
                    <td style={{ color: 'var(--text-muted)', width:40 }}>{i + 1}</td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        {a.nombre}
                        {a.es_becado && <span className="as-badge as-badge-becado">Becado</span>}
                      </div>
                      {a.presente === false && a.motivo && (
                        <div style={{ fontSize:11, color:'#f59e0b', marginTop:3 }}>
                          Motivo: {a.motivo}
                        </div>
                      )}
                    </td>
                    <td>
                      {a.presente === true  && <span className="as-badge as-badge-presente">Presente</span>}
                      {a.presente === false && <span className="as-badge as-badge-ausente">Ausente</span>}
                      {a.presente === null  && <span className="as-badge as-badge-ausente" style={{ opacity:0.4 }}>Sin registro</span>}
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:6 }}>
                        <button
                          onClick={() => marcarPresente(a)}
                          disabled={a.presente === true}
                          style={{ padding:'5px 10px', borderRadius:7, border:'1px solid #22c55e40', background: a.presente===true ? '#22c55e18':'transparent', color:'#22c55e', fontSize:11, fontWeight:700, fontFamily:'inherit', cursor: a.presente===true ? 'default':'pointer', opacity: a.presente===true ? 0.5 : 1, transition:'all .15s' }}
                        >✓ Presente</button>
                        <button
                          onClick={() => { setMotivoModal(a); setMotivoText('') }}
                          disabled={a.presente === false}
                          style={{ padding:'5px 10px', borderRadius:7, border:'1px solid #ef444440', background: a.presente===false ? '#ef444418':'transparent', color:'#ef4444', fontSize:11, fontWeight:700, fontFamily:'inherit', cursor: a.presente===false ? 'default':'pointer', opacity: a.presente===false ? 0.5 : 1, transition:'all .15s' }}
                        >✗ Ausente</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>}

            {/* Mapa de Calor */}
            <div className="card" style={{ marginTop: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 800 }}>Mapa de Calor: Compromiso Académico</h3>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Frecuencia de asistencia por alumno (sesión actual)</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="mono-label">Baja</span>
                  {[0.15, 0.35, 0.6, 0.85, 1].map(o => (
                    <span key={o} style={{ width: 14, height: 10, borderRadius: 3, background: 'var(--accent)', opacity: o }} />
                  ))}
                  <span className="mono-label">Alta</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                {alumnos.map(a => (
                  <span key={a.id} title={a.nombre}
                    style={{ width: 42, height: 26, borderRadius: 7, background: 'var(--accent)', opacity: a.presente === true ? 0.95 : a.presente === false ? 0.15 : 0.35 }} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {qrMatId !== null && (
        <QRModal
          materiaId={qrMatId}
          materiaNombre={selMat?.nombre || ''}
          onClose={() => setQrMatId(null)}
          onQrActive={startQrTimer}
        />
      )}

      {/* Motivo ausencia modal */}
      {motivoModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', backdropFilter:'blur(4px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'var(--bg-surface)', border:'1px solid #2a3040', borderRadius:16, width:'100%', maxWidth:360, padding:24, boxShadow:'0 24px 60px rgba(0,0,0,.6)' }}>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', marginBottom:6 }}>Marcar ausente</div>
            <div style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:16 }}>{motivoModal.nombre}</div>
            <label style={{ display:'block', fontSize:10, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>Motivo de ausencia (opcional)</label>
            <input
              autoFocus
              value={motivoText}
              onChange={e => setMotivoText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmarAusente()}
              placeholder="Ej: Enfermedad, falta justificada..."
              style={{ width:'100%', background:'var(--bg-input)', border:'1px solid var(--border-light)', borderRadius:8, color:'var(--text-primary)', fontSize:13, fontFamily:'inherit', padding:'9px 12px', outline:'none', marginBottom:16 }}
            />
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => { setMotivoModal(null); setMotivoText('') }}
                style={{ flex:1, padding:10, background:'var(--bg-hover)', border:'1px solid var(--border-light)', borderRadius:9, color:'var(--text-secondary)', fontSize:13, fontWeight:600, fontFamily:'inherit', cursor:'pointer' }}>
                Cancelar
              </button>
              <button onClick={confirmarAusente}
                style={{ flex:1, padding:10, background:'#ef4444', border:'none', borderRadius:9, color:'#fff', fontSize:13, fontWeight:700, fontFamily:'inherit', cursor:'pointer' }}>
                Confirmar ausente
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ─── ADMIN: resumen global por materia ─── */
function AdminView() {
  interface ResumenRow {
    materia_id: number
    materia: string
    total: number
    presentes: number
    ausentes: number
    pct: number
  }

  const [rows, setRows]       = useState<ResumenRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  useEffect(() => {
    Promise.all([
      api.get<{ id: number; nombre: string }[]>('/materias/'),
      api.get<{ materia_id: number; presente: boolean | null }[]>('/asistencias/'),
    ]).then(([mats, asists]) => {
      const byMat: Record<number, { total: number; presentes: number }> = {}
      asists.forEach(a => {
        if (!byMat[a.materia_id]) byMat[a.materia_id] = { total: 0, presentes: 0 }
        byMat[a.materia_id].total++
        if (a.presente === true) byMat[a.materia_id].presentes++
      })
      const result: ResumenRow[] = mats.map(m => {
        const c = byMat[m.id] ?? { total: 0, presentes: 0 }
        const pct = c.total > 0 ? Math.round((c.presentes / c.total) * 100) : 0
        return {
          materia_id: m.id,
          materia: m.nombre,
          total: c.total,
          presentes: c.presentes,
          ausentes: c.total - c.presentes,
          pct,
        }
      }).sort((a, b) => b.total - a.total)
      setRows(result)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filtradas = search.trim()
    ? rows.filter(r => r.materia.toLowerCase().includes(search.toLowerCase()))
    : rows

  const totalRegistros = rows.reduce((s, r) => s + r.total, 0)
  const totalPresentes = rows.reduce((s, r) => s + r.presentes, 0)
  const pctGlobal = totalRegistros > 0 ? Math.round((totalPresentes / totalRegistros) * 100) : 0

  return (
    <>
      <style>{css}</style>
      <div className="as-root">
        <div className="as-header">
          <div className="as-title">Asistencia — Resumen institucional</div>
          <div className="as-sub">Estadísticas de asistencia por materia en todo el sistema</div>
        </div>

        {/* KPI cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12, marginBottom:24 }}>
          {[
            { lbl:'Total registros', val:totalRegistros, color:'var(--accent)', bg:'var(--accent-muted)' },
            { lbl:'Presencias',      val:totalPresentes, color:'#22c55e', bg:'#22c55e18' },
            { lbl:'Ausencias',       val:totalRegistros-totalPresentes, color:'#ef4444', bg:'#ef444418' },
            { lbl:'% Global',        val:`${pctGlobal}%`, color: pctGlobal>=75?'#22c55e':pctGlobal>=50?'#f59e0b':'#ef4444', bg:'var(--bg-hover)' },
          ].map(k => (
            <div key={k.lbl} style={{ background:'var(--bg-input)', border:'1px solid #2a3040', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6, fontWeight:600, textTransform:'uppercase', letterSpacing:'.04em' }}>{k.lbl}</div>
              <div style={{ fontSize:22, fontWeight:800, color:k.color }}>{k.val}</div>
            </div>
          ))}
        </div>

        {/* Buscador */}
        <div style={{ position:'relative', marginBottom:14, maxWidth:360 }}>
          <svg style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', width:14, height:14, color:'var(--text-muted)', pointerEvents:'none' }}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar materia…"
            style={{ width:'100%', background:'var(--bg-input)', border:'1px solid #2a3040', borderRadius:9, color:'var(--text-primary)', fontSize:13, fontFamily:'inherit', outline:'none', padding:'8px 14px 8px 34px' }}
          />
        </div>

        {loading ? (
          <div className="as-empty">Cargando datos de asistencia…</div>
        ) : filtradas.length === 0 ? (
          <div className="as-empty">
            <div className="as-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            No se encontraron materias
          </div>
        ) : (
          <div className="as-table-wrap">
            <table className="as-table">
              <thead>
                <tr>
                  <th>Materia</th>
                  <th style={{ textAlign:'center' }}>Registros</th>
                  <th style={{ textAlign:'center' }}>Presentes</th>
                  <th style={{ textAlign:'center' }}>Ausentes</th>
                  <th style={{ textAlign:'center' }}>Asistencia</th>
                  <th>Nivel</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map(r => {
                  const pctColor = r.pct >= 75 ? '#22c55e' : r.pct >= 50 ? '#f59e0b' : '#ef4444'
                  return (
                    <tr key={r.materia_id}>
                      <td style={{ fontWeight:600, color:'var(--text-primary)' }}>{r.materia}</td>
                      <td style={{ textAlign:'center', color:'var(--text-secondary)' }}>{r.total}</td>
                      <td style={{ textAlign:'center', color:'#22c55e', fontWeight:600 }}>{r.presentes}</td>
                      <td style={{ textAlign:'center', color:'#ef4444', fontWeight:600 }}>{r.ausentes}</td>
                      <td style={{ textAlign:'center', fontWeight:800, color:pctColor }}>{r.pct}%</td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ flex:1, height:6, background:'#2a3040', borderRadius:3, overflow:'hidden', minWidth:60 }}>
                            <div style={{ height:'100%', width:`${r.pct}%`, background:pctColor, borderRadius:3, transition:'width .3s' }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
