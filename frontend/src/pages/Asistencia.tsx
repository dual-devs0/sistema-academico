import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, decodeToken } from '../lib/api'
import { setDocTitle } from '../lib/docTitle'
import QRModal from '../components/QRModal'

type View = 'carreras' | 'materias' | 'alumnos'

interface Carrera { id: number; nombre: string }
interface Materia { id: number; nombre: string; codigo: string }
interface AlumnoAsist {
  id: number; nombre: string; documento: string
  asistencia_id: number | null; presente: boolean | null; es_becado: boolean
}

const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .as-root { padding: 28px 36px 60px; min-height: 100%; background: #0b0f14; font-family: 'Inter', system-ui, sans-serif; color: #f0f4f8; }
  .as-header { margin-bottom: 28px; }
  .as-title { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
  .as-sub { font-size: 13px; color: #8fa3b8; margin-top: 3px; }

  /* Alumno: layout de 2 columnas en desktop */
  .alumno-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
  .alumno-layout-single { display: flex; flex-direction: column; gap: 20px; max-width: 560px; }

  .as-scan-btn {
    width: 220px; height: 220px; border-radius: 50%; border: 2px dashed #1e2d3d;
    background: #0e131a; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 14px; cursor: pointer; transition: all 0.2s; margin: 0 auto;
  }
  .as-scan-btn:hover { border-color: #00b4d8; background: #00b4d808; }
  .as-scan-btn:active { transform: scale(0.97); }
  .as-scan-icon { width: 48px; height: 48px; color: #00b4d8; }
  .as-scan-label { font-size: 15px; font-weight: 600; color: #f0f4f8; }
  .as-scan-sub { font-size: 12px; color: #506070; text-align: center; max-width: 200px; }

  .as-hist { margin-top: 40px; }
  .as-hist-title { font-size: 14px; font-weight: 600; color: #8fa3b8; margin-bottom: 14px; }
  .as-hist-grid { display: flex; flex-direction: column; gap: 8px; }
  .as-hist-item {
    display: flex; align-items: center; gap: 12px; padding: 12px 16px;
    background: #0e131a; border: 1px solid #1e2d3d; border-radius: 10px;
  }
  .as-hist-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .as-hist-info { flex: 1; min-width: 0; }
  .as-hist-mat { font-size: 13px; font-weight: 600; color: #f0f4f8; }
  .as-hist-fec { font-size: 11px; color: #506070; }

  .bread { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; font-size: 13px; }
  .bread-btn { background: none; border: none; color: #8fa3b8; cursor: pointer; font-family: inherit; font-size: 13px; padding: 0; }
  .bread-btn:hover { color: #f0f4f8; }
  .bread-sep { color: #1e2d3d; }
  .bread-cur { color: #f0f4f8; font-weight: 600; }

  .grid-2 { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
  .sel-card {
    background: #0e131a; border: 1px solid #1e2d3d; border-radius: 12px;
    padding: 18px; cursor: pointer; transition: all 0.15s;
  }
  .sel-card:hover { border-color: #00b4d8; background: #00b4d808; }
  .sel-card:active { transform: scale(0.98); }
  .sel-card-nom { font-size: 14px; font-weight: 600; color: #f0f4f8; }
  .sel-card-sub { font-size: 11px; color: #506070; margin-top: 3px; }

  .as-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
  .as-toolbar-left { display: flex; align-items: center; gap: 12px; }
  .as-toolbar-right { display: flex; align-items: center; gap: 8px; }
  .as-btn {
    height: 34px; padding: 0 16px; border-radius: 8px; border: 1px solid #1e2d3d;
    background: #0e131a; color: #f0f4f8; font-size: 12px; font-weight: 500;
    cursor: pointer; font-family: inherit; display: flex; align-items: center; gap: 6px;
    transition: all 0.15s;
  }
  .as-btn:hover { border-color: #00b4d8; }
  .as-btn-primary { background: #00b4d8; border-color: #00b4d8; color: #000; font-weight: 600; }
  .as-btn-primary:hover { opacity: 0.88; }

  .as-table-wrap { overflow-x: auto; border: 1px solid #1e2d3d; border-radius: 12px; }
  .as-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .as-table th { text-align: left; padding: 12px 16px; background: #0e131a; color: #506070; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid #1e2d3d; }
  .as-table td { padding: 10px 16px; border-bottom: 1px solid #1a2230; color: #cbd5e1; }
  .as-table tr:last-child td { border-bottom: none; }
  .as-table tr:hover td { background: #0e131a; }

  .as-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 600;
  }
  .as-badge-presente { background: #34d39915; color: #34d399; }
  .as-badge-ausente  { background: #1e2d3d; color: #506070; }
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
  .as-toggle.off { background: #1e2d3d; }
  .as-toggle.off::after { left: 3px; }

  .as-empty {
    text-align: center; padding: 40px 20px; color: #506070;
  }
  .as-empty-icon { width: 40px; height: 40px; margin: 0 auto 12px; opacity: 0.3; }

  /* Alumno — instrucciones QR */
  .qr-instruc-card {
    background: #0e131a; border: 1px solid #1e2d3d; border-radius: 16px;
    padding: 28px 24px; max-width: 480px; margin: 0 auto;
  }
  .qr-instruc-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
  .qr-instruc-icon { width: 44px; height: 44px; border-radius: 12px; background: #00b4d815; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .qr-instruc-title { font-size: 16px; font-weight: 700; color: #f0f4f8; }
  .qr-instruc-sub { font-size: 12px; color: #506070; margin-top: 2px; }
  .qr-steps { display: flex; flex-direction: column; gap: 12px; }
  .qr-step { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; background: #131920; border: 1px solid #1a2230; border-radius: 10px; }
  .qr-step-num { width: 24px; height: 24px; border-radius: 50%; background: #00b4d815; border: 1px solid #00b4d830; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; color: #00b4d8; flex-shrink: 0; margin-top: 1px; }
  .qr-step-title { font-size: 13px; font-weight: 600; color: #f0f4f8; margin-bottom: 2px; }
  .qr-step-desc { font-size: 12px; color: #506070; line-height: 1.5; }
  .qr-tip { display: flex; align-items: flex-start; gap: 8px; margin-top: 20px; padding: 12px 14px; background: #f59e0b08; border: 1px solid #f59e0b20; border-radius: 8px; font-size: 12px; color: #f59e0b; line-height: 1.5; }
  .qr-tip svg { flex-shrink: 0; margin-top: 1px; }

  /* Historial mejorado */
  .as-hist-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; flex-shrink: 0; }
  .as-hist-badge.presente { background: #34d39915; color: #34d399; }
  .as-hist-badge.ausente { background: #ef444415; color: #ef4444; }
  .as-hist-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: #0e131a; border: 1px solid #1e2d3d; border-radius: 10px; }
  .as-hist-left { flex: 1; min-width: 0; }
  .as-hist-mat { font-size: 13px; font-weight: 600; color: #f0f4f8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .as-hist-fec { font-size: 11px; color: #506070; margin-top: 2px; }

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
  const navigate = useNavigate()
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
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00b4d8" strokeWidth="1.8">
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
              El QR es válido por <strong>15 minutos</strong>. Si ya lo escaneaste hoy, tu asistencia está registrada.
            </div>
          </div>

          {/* Col 2 — Historial */}
          <div>
            <div className="as-hist-title" style={{ marginBottom: 14, fontWeight: 700, color: '#8fa3b8', fontSize: 14 }}>
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
              <div style={{ textAlign:'center', padding:'40px 20px', color:'#506070', fontSize:13, background:'#0e131a', border:'1px solid #1e2d3d', borderRadius:12 }}>
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
  const [view, setView]    = useState<View>('carreras')
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

  function selectMateria(m: Materia) {
    setSelMat(m); setLoading(true)
    api.get<{ fecha: string; materia: string; alumnos: AlumnoAsist[] }>(`/asistencias/profesor/alumnos?materia_id=${m.id}&fecha=${fecha}`)
      .then(d => { setAlumn(d.alumnos || []); setLoading(false); setView('alumnos') })
      .catch(() => setLoading(false))
  }

  function cambiarFecha(nf: string) {
    setFecha(nf)
    const d = new Date(nf + 'T12:00:00')
    setFechaL(d.toLocaleDateString('es-PY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
    if (selMat) {
      setLoading(true)
      api.get<{ fecha: string; materia: string; alumnos: AlumnoAsist[] }>(`/asistencias/profesor/alumnos?materia_id=${selMat.id}&fecha=${nf}`)
        .then(d => { setAlumn(d.alumnos || []); setLoading(false) })
        .catch(() => setLoading(false))
    }
  }

  async function toggleAlumno(alumno: AlumnoAsist) {
    if (alumno.asistencia_id) {
      const nuevoEstado = !alumno.presente
      await api.put(`/asistencias/profesor/toggle/${alumno.asistencia_id}?presente=${nuevoEstado}`)
      setAlumn(prev => prev.map(a => a.id === alumno.id ? { ...a, presente: nuevoEstado } : a))
    } else {
      await api.post(`/asistencias/profesor/marcar?materia_id=${selMat!.id}&alumno_id=${alumno.id}&fecha=${fecha}&presente=true`)
      selectMateria(selMat!)
    }
  }

  const presentes = alumnos.filter(a => a.presente === true).length
  const total     = alumnos.length

  return (
    <>
      <style>{css}</style>
      <div className="as-root">
        <div className="as-header">
          <div className="as-title">Control de Asistencia</div>
          <div className="as-sub">Gestioná la asistencia de tus cursos por carrera y materia</div>
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
 