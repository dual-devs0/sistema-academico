import { useState, useEffect } from 'react'
import { getCurrentUser, emitToast } from '../lib/api'
import { crearSolicitudEquivalencia, getEquivalenciasAlumno,
  type SolicitudEquivalencia } from '../services/equivalenciasService'

const badgeEstilo = (estado: string) => {
  const colores: Record<string, { bg: string; color: string }> = {
    pendiente: { bg: 'var(--warning-subtle)', color: 'var(--warning)' },
    resuelta: { bg: 'var(--success-subtle)', color: 'var(--success)' },
    rechazada: { bg: 'var(--danger-subtle)', color: 'var(--danger)' },
  }
  return colores[estado] ?? colores.pendiente
}

export default function EquivalenciasAlumno() {
  const [solicitudes, setSolicitudes] = useState<SolicitudEquivalencia[]>([])
  const [tipo, setTipo] = useState('equivalencia')
  const [universidad, setUniversidad] = useState('')
  const [loading, setLoading] = useState(true)
  const user = getCurrentUser()

  const cargar = () => {
    if (!user?.user_id) return
    getEquivalenciasAlumno(user.user_id)
      .then(setSolicitudes)
      .catch(() => emitToast('Error cargando equivalencias', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [user?.user_id])

  const solicitar = async () => {
    setLoading(true)
    try {
      await crearSolicitudEquivalencia(tipo, universidad || undefined)
      emitToast('Solicitud creada', 'success')
      setTipo('equivalencia'); setUniversidad('')
      cargar()
    } catch (e: unknown) {
      emitToast(e instanceof Error ? e.message : 'Error creando solicitud', 'error')
    } finally { setLoading(false) }
  }

  return (
    <div>
      <h1 className="page-title" style={{ marginBottom: 4 }}>🔄 Equivalencias</h1>
      <p className="page-subtitle" style={{ marginBottom: 20 }}>
        Solicitá equivalencias o convalidaciones de materias cursadas en otras instituciones.
      </p>

      {/* Formulario de nueva solicitud */}
      <div className="card" style={{ maxWidth: 520, marginBottom: 24 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}><i className="ti ti-plus" style={{ color: 'var(--accent-bright)' }} /> Nueva Solicitud</h3>

        <div style={{ marginBottom: 14 }}>
          <span className="mono-label" style={{ marginBottom: 6, display: 'block' }}>Tipo</span>
          <select className="input-uca" value={tipo} onChange={e => setTipo(e.target.value)}>
            <option value="equivalencia">Equivalencia</option>
            <option value="convalidacion">Convalidación</option>
            <option value="homologacion">Homologación</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <span className="mono-label" style={{ marginBottom: 6, display: 'block' }}>Universidad de Origen</span>
          <input className="input-uca" value={universidad}
            onChange={e => setUniversidad(e.target.value)} placeholder="Ej: UNIOESTE, UNA, ..." />
        </div>

        <button type="button" className="btn-primary" onClick={solicitar} disabled={loading}>
          {loading ? 'Enviando...' : '📤 Solicitar Equivalencia'}
        </button>
      </div>

      {/* Lista de solicitudes */}
      <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: 16, color: 'var(--text-primary)' }}>
        <i className="ti ti-history" style={{ color: 'var(--accent-bright)' }} /> Mis Solicitudes
      </h3>

      {loading && solicitudes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>Cargando...</div>
      ) : solicitudes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <i className="ti ti-shuffle-off" style={{ fontSize: 36, color: 'var(--text-muted)' }} />
          <p style={{ marginTop: 10, color: 'var(--text-secondary)', fontSize: 13 }}>
            No tenés solicitudes de equivalencia aún.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {solicitudes.map(s => {
            const b = badgeEstilo(s.estado)
            return (
              <div key={s.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, textTransform: 'capitalize' }}>{s.tipo}</div>
                  {s.universidad_origen && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      <i className="ti ti-building" style={{ marginRight: 4 }} />{s.universidad_origen}
                    </div>
                  )}
                </div>
                <span className="badge" style={{ background: b.bg, color: b.color }}>
                  {s.estado === 'resuelta' ? 'Aprobada' : s.estado === 'rechazada' ? 'Rechazada' : 'Pendiente'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
