import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!token) {
      setError('Token de restablecimiento no encontrado en la URL.')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, new_password: password })
      setSuccess(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al restablecer la contraseña.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div style={{ maxWidth: 420, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <h2 style={{ color: '#b91c1c', marginBottom: 16 }}>Enlace inválido</h2>
        <p style={{ color: '#555', lineHeight: 1.6 }}>
          El enlace de restablecimiento no contiene un token válido.
          Solicitá un nuevo restablecimiento desde la pantalla de inicio de sesión.
        </p>
        <button onClick={() => navigate('/login')} style={{ marginTop: 24, padding: '10px 24px', border: 'none', borderRadius: 8, background: '#1a56db', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
          Volver al inicio de sesión
        </button>
      </div>
    )
  }

  if (success) {
    return (
      <div style={{ maxWidth: 420, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2 style={{ color: '#166534', marginBottom: 16 }}>Contraseña actualizada</h2>
        <p style={{ color: '#555', lineHeight: 1.6, marginBottom: 24 }}>
          Tu contraseña se ha restablecido correctamente. Ya podés iniciar sesión con tu nueva contraseña.
        </p>
        <button onClick={() => navigate('/login')} style={{ padding: '10px 24px', border: 'none', borderRadius: 8, background: '#1a56db', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
          Iniciar sesión
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 420, margin: '60px auto', padding: '0 20px' }}>
      <h2 style={{ marginBottom: 8, fontSize: 24, fontWeight: 700 }}>Restablecer contraseña</h2>
      <p style={{ color: '#666', marginBottom: 24, lineHeight: 1.5 }}>
        Ingresá tu nueva contraseña.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>
            Nueva contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            autoComplete="new-password"
            style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>
            Confirmar contraseña
          </label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Repetí la contraseña"
            autoComplete="new-password"
            style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>

        {error && <p style={{ color: '#b91c1c', fontSize: 13, margin: 0 }}>{error}</p>}

        <button
          type="submit"
          disabled={loading || !password || !confirm}
          style={{
            padding: '12px 24px',
            border: 'none',
            borderRadius: 8,
            background: loading || !password || !confirm ? '#9ca3af' : '#1a56db',
            color: '#fff',
            cursor: loading || !password || !confirm ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: 14,
            marginTop: 8,
          }}
        >
          {loading ? 'Actualizando...' : 'Restablecer contraseña'}
        </button>
      </form>
    </div>
  )
}
