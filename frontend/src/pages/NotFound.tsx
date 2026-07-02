import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-base)', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: 'Inter, sans-serif', textAlign: 'center',
    }}>
      <div className="card card-elevated" style={{
        fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)',
        padding: '14px 22px', marginBottom: 28,
      }}>
        <div style={{ color: 'var(--danger)', fontSize: 30, marginBottom: 8 }}>
          <i className="ti ti-unlink" />
        </div>
        <div>SERVER_ID: 404_UCA</div>
        <div style={{ color: 'var(--text-muted)' }}>ROUTE_NOT_FOUND</div>
      </div>

      <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
        ¡Ups! El aula digital que buscas no está aquí.
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28, maxWidth: 420 }}>
        La página solicitada no existe o fue movida. Verificá la dirección o volvé al inicio.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="btn-primary" onClick={() => navigate('/dashboard')}>
          Volver al Dashboard
        </button>
        <button className="btn-ghost" onClick={() => navigate('/login')}>
          Centro de Ayuda
        </button>
      </div>

      <div style={{ marginTop: 48, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
        UCA V2 · build 2.0 · {new Date().toLocaleString('es-PY')}
      </div>
    </div>
  )
}
