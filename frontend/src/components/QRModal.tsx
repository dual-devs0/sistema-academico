import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'

interface QRData {
  qr_base64: string
  token: string
  expira_en: number
  materia: { id: number; nombre: string }
  fecha: string
}

interface QRModalProps {
  materiaId: number
  materiaNombre: string
  onClose: () => void
  onQrActive?: (expiraEn: number) => void
}

export default function QRModal({ materiaId, materiaNombre, onClose, onQrActive }: QRModalProps) {
  const [estado, setEstado]     = useState<'cargando' | 'listo' | 'expirado' | 'error'>('cargando')
  const [qrData, setQrData]     = useState<QRData | null>(null)
  const [segundos, setSegundos] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const intervalRef             = useRef<ReturnType<typeof setInterval> | null>(null)

  const generarQR = async () => {
    setEstado('cargando')
    setQrData(null)
    setErrorMsg('')
    try {
      const data = await api.get<QRData>(`/asistencias/qr/${materiaId}`)
      setQrData(data)
      setSegundos(data.expira_en)
      setEstado('listo')
      if (onQrActive) onQrActive(data.expira_en)
    } catch (e: any) {
      setEstado('error')
      setErrorMsg(e.message || 'Error generando QR')
    }
  }

  useEffect(() => {
    if (estado !== 'listo') return
    intervalRef.current = setInterval(() => {
      setSegundos(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current!)
          setEstado('expirado')
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current!)
  }, [estado])

  useEffect(() => {
    generarQR()
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  const minutos  = Math.floor(segundos / 60)
  const segs     = segundos % 60
  const progreso = qrData ? (segundos / qrData.expira_en) * 100 : 100
  const colorCt  = segundos > 300 ? '#00b4d8' : segundos > 60 ? '#f59e0b' : '#f87171'

  const fechaStr = qrData
    ? new Date(qrData.fecha + 'T12:00:00').toLocaleDateString('es-PY', {
        weekday: 'long', day: 'numeric', month: 'long',
      })
    : ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-md mx-4 bg-[#111820] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between p-5 border-b border-white/8">
          <div>
            <p className="text-xs text-[#00b4d8] font-semibold uppercase tracking-widest mb-1">QR de asistencia</p>
            <h2 className="text-white font-semibold text-base leading-tight">{materiaNombre}</h2>
            {fechaStr && <p className="text-white/40 text-xs mt-0.5">{fechaStr}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/8 text-white/40 hover:text-white transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="p-6 flex flex-col items-center gap-5">
          {estado === 'cargando' && (
            <div className="flex flex-col items-center gap-3 py-12 text-white/50">
              <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2"/>
                <path d="M12 2a10 10 0 0110 10" stroke="#00b4d8" strokeWidth="3" strokeLinecap="round"/>
              </svg>
              <p className="text-sm">Generando QR seguro…</p>
            </div>
          )}

          {estado === 'error' && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p className="text-white/70 text-sm">{errorMsg}</p>
              <button onClick={generarQR}
                className="mt-2 px-4 py-2 rounded-lg bg-[#00b4d8]/15 text-[#00b4d8] text-sm font-medium hover:bg-[#00b4d8]/25 transition-colors">
                Reintentar
              </button>
            </div>
          )}

          {estado === 'listo' && qrData && (
            <>
              <div className="relative p-3 bg-white rounded-xl shadow-lg">
                <img src={`data:image/png;base64,${qrData.qr_base64}`} alt="QR asistencia" className="w-56 h-56 block" />
                <span className="absolute top-1 left-1 w-4 h-4 border-t-2 border-l-2 border-[#00b4d8] rounded-tl" />
                <span className="absolute top-1 right-1 w-4 h-4 border-t-2 border-r-2 border-[#00b4d8] rounded-tr" />
                <span className="absolute bottom-1 left-1 w-4 h-4 border-b-2 border-l-2 border-[#00b4d8] rounded-bl" />
                <span className="absolute bottom-1 right-1 w-4 h-4 border-b-2 border-r-2 border-[#00b4d8] rounded-br" />
              </div>

              <div className="w-full flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colorCt} strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <span className="font-mono text-2xl font-bold tabular-nums" style={{ color: colorCt }}>
                    {String(minutos).padStart(2, '0')}:{String(segs).padStart(2, '0')}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${progreso}%`, backgroundColor: colorCt }} />
                </div>
                <p className="text-white/35 text-xs">El QR expira en {minutos} min {segs} seg</p>
              </div>
            </>
          )}

          {estado === 'expirado' && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" opacity="0.3">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div>
                <p className="text-white font-medium mb-1">QR expirado</p>
                <p className="text-white/40 text-sm">Han pasado los 15 minutos. Generá uno nuevo.</p>
              </div>
              <button onClick={generarQR}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00b4d8] text-[var(--bg-base)] text-sm font-semibold hover:bg-[#00b4d8]/90 transition-colors">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
                </svg>
                Generar nuevo QR
              </button>
            </div>
          )}
        </div>

        {estado === 'listo' && qrData && (
          <div className="px-6 pb-5 flex flex-col gap-2">
            <p className="text-center text-white/25 text-xs">Los alumnos escanean con la cámara del celular o desde la app</p>
            <div className="flex gap-2 w-full" style={{ display: 'flex', gap: 8, width: '100%' }}>
              <button onClick={() => {
                const a = document.createElement('a')
                a.href = `data:image/png;base64,${qrData.qr_base64}`
                a.download = `QR-${qrData.materia.nombre.replace(/\s+/g, '-')}.png`
                a.click()
              }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/8 text-white/70 text-xs font-semibold hover:bg-white/15 transition-colors"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Descargar QR
              </button>
              <button onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: `QR Asistencia - ${qrData.materia.nombre}`,
                    text: `Escaneá este código QR para registrar tu asistencia a ${qrData.materia.nombre}`,
                    url: qrData.scan_url,
                  }).catch(() => {})
                } else {
                  navigator.clipboard.writeText(qrData.scan_url).then(() => {
                    const el = document.createElement('div')
                    el.textContent = '¡Link copiado! Compartilo en tu grupo de WhatsApp'
                    el.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#00b4d8;color:#000;padding:10px 20px;border-radius:12px;font-size:13px;font-weight:700;z-index:999;font-family:sans-serif'
                    document.body.appendChild(el)
                    setTimeout(() => el.remove(), 3000)
                  }).catch(() => {})
                }
              }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#00b4d8]/15 text-[#00b4d8] text-xs font-semibold hover:bg-[#00b4d8]/25 transition-colors"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, background: 'rgba(0,180,216,0.15)', color: '#00b4d8', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                Compartir QR
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
