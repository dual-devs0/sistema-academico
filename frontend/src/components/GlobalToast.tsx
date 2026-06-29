import { useState, useEffect } from 'react'

export function toast({ type, title, message }: { type?: string; title?: string; message: string }) {
  window.dispatchEvent(new CustomEvent('uca:toast', { detail: { msg: `${title ? title + ': ' : ''}${message}`, type: type || 'success' } }))
}

type ToastType = 'success' | 'error' | 'warning'

interface ToastItem {
  id: number
  msg: string
  type: ToastType
}

const colors: Record<ToastType, { border: string; color: string; bg: string; icon: string }> = {
  success: { border: '#22c55e40', color: '#22c55e', bg: '#0d1117', icon: '✓' },
  error:   { border: '#ef444440', color: '#ef4444', bg: '#0d1117', icon: '✕' },
  warning: { border: '#f59e0b40', color: '#f59e0b', bg: '#0d1117', icon: '⚠' },
}

export default function GlobalToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    function handler(e: Event) {
      const { msg, type = 'success' } = (e as CustomEvent).detail
      const id = Date.now()
      setToasts(prev => [...prev, { id, msg, type }])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
    }
    window.addEventListener('uca:toast', handler)
    return () => window.removeEventListener('uca:toast', handler)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 99999,
      display: 'flex', flexDirection: 'column', gap: 8,
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {toasts.map(t => {
        const c = colors[t.type]
        return (
          <div key={t.id} style={{
            background: c.bg,
            border: `1px solid ${c.border}`,
            borderRadius: 12,
            padding: '12px 18px',
            color: c.color,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: '0 8px 32px rgba(0,0,0,.6)',
            maxWidth: 380,
            wordBreak: 'break-word',
            lineHeight: 1.5,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            animation: 'slideInToast .25s ease',
          }}>
            <span style={{ flexShrink: 0, fontSize: 15 }}>{c.icon}</span>
            <span>{t.msg}</span>
          </div>
        )
      })}
      <style>{`
        @keyframes slideInToast {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
