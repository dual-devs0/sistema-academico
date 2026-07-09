import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

type Estado = 'idle' | 'verificando' | 'exito' | 'duplicado' | 'expirado' | 'no_autorizado' | 'error'
type ResultData = { materia: string; fecha: string; alumno: string }
type MateriaAsist = { materia_id: number; materia_nombre: string; total_clases: number; presentes: number; porcentaje: number }

const css = `
  .scan-visor {
    position:relative; height:300px; border-radius:18px; overflow:hidden;
    background:radial-gradient(circle at 50% 40%, rgba(0,180,216,0.08), transparent 65%), var(--bg-input);
    border:1px solid var(--border-subtle);
    display:flex; align-items:center; justify-content:center;
  }
  .scan-visor video { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
  .scan-corner { position:absolute; width:34px; height:34px; border-color:#22d3ee; border-style:solid; border-width:0; }
  .scan-corner.tl { top:22px; left:22px; border-top-width:3px; border-left-width:3px; border-radius:8px 0 0 0; }
  .scan-corner.tr { top:22px; right:22px; border-top-width:3px; border-right-width:3px; border-radius:0 8px 0 0; }
  .scan-corner.bl { bottom:22px; left:22px; border-bottom-width:3px; border-left-width:3px; border-radius:0 0 0 8px; }
  .scan-corner.br { bottom:22px; right:22px; border-bottom-width:3px; border-right-width:3px; border-radius:0 0 8px 0; }
  @keyframes scanline { 0%,100%{ transform:translateY(-70px) } 50%{ transform:translateY(70px) } }
  .scan-line { position:absolute; left:15%; right:15%; height:2px; background:linear-gradient(90deg,transparent,#22d3ee,transparent); animation:scanline 2.4s ease-in-out infinite; }
  .ring-mat { position:relative; width:46px; height:46px; flex-shrink:0; }
`

function RingPct({ pct }: { pct: number }) {
  const r = 19, c = 2 * Math.PI * r
  const color = pct >= 80 ? 'var(--accent-bright)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)'
  return (
    <div className="ring-mat">
      <svg width="46" height="46" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="23" cy="23" r={r} stroke="var(--bg-elevated)" strokeWidth="4" fill="none" />
        <circle cx="23" cy="23" r={r} stroke={color} strokeWidth="4" fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} strokeLinecap="round" />
      </svg>
      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 800 }}>{Math.round(pct)}%</span>
    </div>
  )
}

export default function AsistenciaScan() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token')
  const [estado, setEstado] = useState<Estado>(token ? 'verificando' : 'idle')
  const [result, setResult] = useState<ResultData | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [materias, setMaterias] = useState<MateriaAsist[]>([])
  const [camara, setCamara] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const nombre = sessionStorage.getItem('user_nombre') || 'Alumno'

  useEffect(() => {
    api.get<MateriaAsist[]>('/alumno/mi-asistencia').then(setMaterias).catch(() => {})
  }, [])

  useEffect(() => {
    if (!token) return
    const authToken = sessionStorage.getItem('token')
    const userRol = sessionStorage.getItem('user_rol')
    if (!authToken) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)
      return
    }
    const prom = userRol !== 'alumno'
      ? Promise.reject(new Error('no_autorizado'))
      : api.post<ResultData>('/asistencias/scan', { token })
    prom
      .then(res => { setResult(res); setEstado('exito') })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : ''
        if (msg.includes('no_autorizado')) setEstado('no_autorizado')
        else if (msg.includes('expirado') || msg.includes('inválido')) setEstado('expirado')
        else if (msg.includes('ya registraste')) setEstado('duplicado')
        else { setEstado('error'); setErrorMsg(msg || 'Error al conectar con el servidor') }
      })
  }, [token, navigate])

  // Cámara + detección QR nativa (BarcodeDetector)
  async function activarCamara() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      setCamara(true)
      setTimeout(async () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        interface BarcodeDetectorCtor {
  new (options: { formats: string[] }): {
    detect(el: HTMLVideoElement): Promise<Array<{ rawValue: string }>>
  }
}
const BD = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
        if (!BD) { setErrorMsg('Tu navegador no soporta detección QR nativa. Usá la cámara del teléfono.'); return }
        const detector = new BD({ formats: ['qr_code'] })
        const tick = async () => {
          if (!streamRef.current || !videoRef.current) return
          try {
            const codes = await detector.detect(videoRef.current)
            if (codes.length > 0) {
              const raw = codes[0].rawValue as string
              const m = raw.match(/token=([\w.-]+)/)
              pararCamara()
              if (m) { window.location.href = `/asistencia/scan?token=${m[1]}`; return }
            }
          } catch { /* frame no listo */ }
          requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }, 50)
    } catch {
      setErrorMsg('No se pudo acceder a la cámara. Verificá los permisos.')
    }
  }

  function pararCamara() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCamara(false)
  }
  useEffect(() => () => pararCamara(), [])

  /* ── Resultado de scan (llegó con ?token) ── */
  if (token) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div className="card card-elevated" style={{ width: '100%', maxWidth: 380, textAlign: 'center', padding: 30 }}>
          {estado === 'verificando' && (<>
            <i className="ti ti-loader-2" style={{ fontSize: 36, color: 'var(--accent-bright)', animation: 'spin 1s linear infinite', display: 'inline-block' }} />
            <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
            <h2 style={{ fontSize: 17, fontWeight: 800, marginTop: 12 }}>Verificando…</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Registrando tu asistencia</p>
          </>)}
          {estado === 'exito' && result && (<>
            <i className="ti ti-circle-check" style={{ fontSize: 42, color: 'var(--success)' }} />
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: '10px 0 4px' }}>¡Asistencia registrada!</h2>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 16 }}>Tu presencia quedó confirmada</p>
            <div style={{ textAlign: 'left', background: 'var(--bg-input)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
              {[['Materia', result.materia], ['Fecha', result.fecha], ['Alumno', result.alumno]].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
                  <span className="mono-label">{l}</span><b>{v}</b>
                </div>
              ))}
            </div>
            <button className="btn-primary" style={{ width: '100%' }} onClick={() => navigate('/asistencia')}>Ver mis asistencias</button>
          </>)}
          {estado === 'duplicado' && (<>
            <i className="ti ti-checks" style={{ fontSize: 40, color: 'var(--warning)' }} />
            <h2 style={{ fontSize: 17, fontWeight: 800, margin: '10px 0 4px' }}>Ya registraste tu asistencia</h2>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 16 }}>Tu presencia ya estaba confirmada.</p>
            <button className="btn-ghost" style={{ width: '100%' }} onClick={() => navigate('/asistencia')}>Ver mis asistencias</button>
          </>)}
          {estado === 'expirado' && (<>
            <i className="ti ti-clock-x" style={{ fontSize: 40, color: 'var(--text-muted)' }} />
            <h2 style={{ fontSize: 17, fontWeight: 800, margin: '10px 0 4px' }}>QR expirado</h2>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>Pedile al profesor que genere uno nuevo.</p>
          </>)}
          {estado === 'no_autorizado' && (<>
            <i className="ti ti-lock" style={{ fontSize: 40, color: 'var(--danger)' }} />
            <h2 style={{ fontSize: 17, fontWeight: 800, margin: '10px 0 4px' }}>Acceso denegado</h2>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>Solo alumnos pueden registrar asistencia con QR.</p>
          </>)}
          {estado === 'error' && (<>
            <i className="ti ti-alert-circle" style={{ fontSize: 40, color: 'var(--danger)' }} />
            <h2 style={{ fontSize: 17, fontWeight: 800, margin: '10px 0 4px' }}>Algo salió mal</h2>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 16 }}>{errorMsg}</p>
            <button className="btn-ghost" style={{ width: '100%' }} onClick={() => window.location.reload()}>Reintentar</button>
          </>)}
        </div>
      </div>
    )
  }

  /* ── Pantalla scanner (sin token) ── */
  return (
    <>
      <style>{css}</style>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <h1 className="page-title" style={{ marginBottom: 2 }}>Hola, {nombre}</h1>
        <p className="page-subtitle" style={{ marginBottom: 16 }}>Escanea el código QR de la clase.</p>

        <div className="scan-visor">
          {camara && <video ref={videoRef} muted playsInline />}
          <span className="scan-corner tl" /><span className="scan-corner tr" />
          <span className="scan-corner bl" /><span className="scan-corner br" />
          {camara ? <span className="scan-line" /> : (
            <i className="ti ti-scan" style={{ fontSize: 40, color: 'var(--accent-bright)', opacity: 0.7 }} />
          )}
        </div>

        {errorMsg && <p style={{ fontSize: 12, color: 'var(--warning)', marginTop: 10 }}>{errorMsg}</p>}

        <button className="btn-primary" style={{ width: '100%', marginTop: 14, padding: 13, fontSize: 14, borderRadius: 14 }}
          onClick={camara ? pararCamara : activarCamara}>
          <i className={`ti ${camara ? 'ti-camera-off' : 'ti-camera'}`} /> {camara ? 'Detener Cámara' : 'Activar Cámara'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '26px 0 12px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>Mis Materias</h2>
          <span className="mono-label" style={{ color: 'var(--accent-bright)' }}>Ciclo {String(new Date().getMonth() < 6 ? 1 : 2).padStart(2, '0')}-{new Date().getFullYear()}</span>
        </div>

        {materias.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>Sin registros de asistencia aún.</div>
        ) : materias.map(mt => (
          <div key={mt.materia_id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 800 }}>{mt.materia_nombre}</div>
              <div className="mono-label" style={{ fontSize: 9.5, marginTop: 3 }}>
                <i className="ti ti-clock" /> {mt.presentes}/{mt.total_clases} clases presentes
              </div>
            </div>
            <RingPct pct={mt.porcentaje} />
          </div>
        ))}
      </div>
    </>
  )
}
