import { useState, useEffect } from 'react'
import { emitToast } from '../lib/api'
import {
  obtenerUsuario, obtenerMateriasProfesor,
  actualizarUsuario, eliminarUsuario,
  type UserApi, type ProfesorMateria,
} from '../services/asignacionesService'

type Props = {
  userId: number
  onClose: () => void
  onUpdated: () => void
}

export default function ProfessorDetailModal({ userId, onClose, onUpdated }: Props) {
  const [user, setUser] = useState<UserApi | null>(null)
  const [materias, setMaterias] = useState<ProfesorMateria[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nombre: '', email: '', fecha_ingreso: '', cv: '', activo: true })

  useEffect(() => {
    setLoading(true)
    Promise.all([obtenerUsuario(userId), obtenerMateriasProfesor(userId)])
      .then(([u, m]) => {
        setUser(u)
        setMaterias(m)
        setForm({
          nombre: u.nombre || '',
          email: u.email || '',
          fecha_ingreso: u.fecha_ingreso?.split('T')[0] || '',
          cv: u.cv || '',
          activo: u.activo ?? true,
        })
      })
      .catch(() => emitToast('Error al cargar datos del profesor', 'error'))
      .finally(() => setLoading(false))
  }, [userId])

  async function handleSave() {
    setSaving(true)
    try {
      const data: Record<string, unknown> = {}
      if (form.nombre !== (user?.nombre || '')) data.nombre = form.nombre
      if (form.email !== (user?.email || '')) data.email = form.email
      if (form.fecha_ingreso !== (user?.fecha_ingreso?.split('T')[0] || '')) data.fecha_ingreso = form.fecha_ingreso || null
      if (form.cv !== (user?.cv || '')) data.cv = form.cv || null
      if (form.activo !== (user?.activo ?? true)) data.activo = form.activo
      if (Object.keys(data).length === 0) { setEditing(false); return }
      await actualizarUsuario(userId, data)
      emitToast('Profesor actualizado')
      setEditing(false)
      onUpdated()
      const u = await obtenerUsuario(userId)
      setUser(u)
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al guardar', 'error')
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar este profesor? Se borrarán todos sus datos relacionados.')) return
    try {
      await eliminarUsuario(userId)
      emitToast('Profesor eliminado')
      onUpdated()
      onClose()
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al eliminar', 'error')
    }
  }

  const aniosInstitucion = user?.fecha_ingreso
    ? new Date().getFullYear() - new Date(user.fecha_ingreso).getFullYear()
    : null

  const activas = materias.filter(m => m.activa)
  const historicas = materias.filter(m => !m.activa)

  if (loading) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 700, padding: 32 }}>
          <div className="ga-skeleton" style={{ height: 28, width: 250, marginBottom: 20 }} />
          <div className="ga-skeleton" style={{ height: 14, width: 180, marginBottom: 24 }} />
          <div className="ga-skeleton" style={{ height: 200 }} />
        </div>
      </div>
    )
  }

  if (!user) return null

  const modalCss = `
    .modal-backdrop {
      position:fixed; inset:0; background:rgba(0,0,0,.6);
      display:flex; align-items:center; justify-content:center;
      z-index:1000; padding:20px;
    }
    .modal-card {
      background:var(--bg-surface); border:1px solid var(--border-subtle);
      border-radius:var(--radius); max-height:90vh; overflow-y:auto;
      width:100%; max-width:720px; animation:fadeIn .15s;
    }
    @keyframes fadeIn { from{opacity:0;transform:scale(.97)} to{opacity:1;transform:scale(1)} }
  `

  return (
    <>
      <style>{modalCss}</style>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-card" onClick={e => e.stopPropagation()}>
          <div style={{ padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="avatar-initials" style={{
                width: 44, height: 44, fontSize: 16,
                background: 'linear-gradient(135deg, var(--accent), var(--bg-base))',
                color: '#fff',
              }}>
                {user.nombre?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'PR'}
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {editing ? (
                    <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                      style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '6px 10px', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', outline: 'none', width: '100%', fontFamily: 'var(--font-sans)' }} />
                  ) : user.nombre || user.username}
                </h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                  @{user.username} · {user.role}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => editing ? handleSave() : setEditing(true)}
                style={{
                  padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: editing ? 'var(--success)' : 'var(--accent-muted)',
                  border: `1px solid ${editing ? 'var(--success)' : 'var(--accent-hover)'}`,
                  color: editing ? '#fff' : 'var(--accent-bright)', fontFamily: 'var(--font-sans)',
                }}>
                {editing ? (saving ? 'Guardando...' : 'Guardar') : 'Editar'}
              </button>
              {editing && (
                <button onClick={() => { setEditing(false); setForm({ nombre: user.nombre || '', email: user.email || '', fecha_ingreso: user.fecha_ingreso?.split('T')[0] || '', cv: user.cv || '', activo: user.activo ?? true }) }}
                  style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, cursor: 'pointer', background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
                  Cancelar
                </button>
              )}
              <button onClick={handleDelete}
                style={{ padding: '8px 12px', borderRadius: 8, fontSize: 14, cursor: 'pointer', background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
                <i className="ti ti-trash" />
              </button>
              <button onClick={onClose}
                style={{ padding: '8px 12px', borderRadius: 8, fontSize: 14, cursor: 'pointer', background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <i className="ti ti-x" />
              </button>
            </div>
          </div>

          <div style={{ padding: '20px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <p className="mono-label" style={{ fontSize: 10, marginBottom: 4 }}>Email</p>
              {editing ? (
                <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '6px 10px', fontSize: 13, color: 'var(--text-primary)', width: '100%', fontFamily: 'var(--font-sans)' }} />
              ) : (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{user.email || '—'}</p>
              )}
            </div>
            <div>
              <p className="mono-label" style={{ fontSize: 10, marginBottom: 4 }}>Años en la Institución</p>
              <p style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {aniosInstitucion !== null ? `${aniosInstitucion} años` : '—'}
              </p>
              {editing && (
                <div style={{ marginTop: 6 }}>
                  <label className="mono-label" style={{ fontSize: 10, display: 'block', marginBottom: 2 }}>Fecha de ingreso</label>
                  <input type="date" value={form.fecha_ingreso} onChange={e => setForm(p => ({ ...p, fecha_ingreso: e.target.value }))}
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }} />
                </div>
              )}
            </div>
            <div>
              <p className="mono-label" style={{ fontSize: 10, marginBottom: 4 }}>Estado</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: form.activo ? 'var(--success)' : 'var(--danger)',
                }} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  {form.activo ? 'Activo' : 'Inactivo'}
                </span>
                {editing && (
                  <button onClick={() => setForm(p => ({ ...p, activo: !p.activo }))}
                    style={{
                      padding: '3px 10px', borderRadius: 6, fontSize: 10, cursor: 'pointer',
                      background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                      color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)',
                    }}>
                    {form.activo ? 'Dar de baja' : 'Reactivar'}
                  </button>
                )}
              </div>
            </div>
            <div>
              <p className="mono-label" style={{ fontSize: 10, marginBottom: 4 }}>Registrado desde</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {user.created_at ? new Date(user.created_at).toLocaleDateString('es-PY', { year: 'numeric', month: 'long' }) : '—'}
              </p>
            </div>
          </div>

          <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-file-text" style={{ color: 'var(--accent)' }} />
                CV / Resumen
              </h3>
            </div>
            {editing ? (
              <textarea value={form.cv} onChange={e => setForm(p => ({ ...p, cv: e.target.value }))}
                placeholder="Experiencia, títulos, especialidades..."
                style={{ width: '100%', minHeight: 90, background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 12, color: 'var(--text-primary)', fontSize: 13, resize: 'vertical', fontFamily: 'var(--font-sans)', boxSizing: 'border-box' }} />
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {user.cv || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin CV registrado</span>}
              </p>
            )}
          </div>

          <div style={{ padding: '20px 28px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
              <i className="ti ti-books" style={{ color: 'var(--accent)' }} />
              Historial de Materias
              <span className="badge" style={{ fontSize: 10, background: 'var(--bg-elevated)', color: 'var(--text-secondary)', marginLeft: 8 }}>
                {materias.length} registros
              </span>
            </h3>

            {activas.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>
                  <i className="ti ti-circle-filled" style={{ fontSize: 8 }} /> Activas ({activas.length})
                </p>
                {activas.map(m => (
                  <div key={m.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 8, marginBottom: 4,
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: 'var(--success-subtle)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, color: 'var(--success)', flexShrink: 0,
                    }}>
                      <i className="ti ti-book" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{m.materia_nombre}</p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                        {m.carrera_nombre && (
                          <span style={{ fontSize: 10, color: 'var(--accent-bright)', background: 'var(--accent-muted)', padding: '1px 6px', borderRadius: 4 }}>
                            {m.carrera_nombre}
                          </span>
                        )}
                        {m.anio && (
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {m.anio}° · {m.semestre}° Sem.
                          </span>
                        )}
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          {m.periodo}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {historicas.length > 0 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>
                  Anteriores ({historicas.length})
                </p>
                {historicas.sort((a, b) => b.periodo.localeCompare(a.periodo)).map(m => (
                  <div key={m.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 8, marginBottom: 4,
                    background: 'transparent', border: '1px solid var(--border-subtle)',
                    opacity: .7,
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: 'var(--bg-elevated)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, color: 'var(--text-muted)', flexShrink: 0,
                    }}>
                      <i className="ti ti-book-off" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{m.materia_nombre}</p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                        {m.carrera_nombre && (
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', padding: '1px 6px', borderRadius: 4 }}>
                            {m.carrera_nombre}
                          </span>
                        )}
                        {m.anio && (
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {m.anio}° · {m.semestre}° Sem.
                          </span>
                        )}
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          {m.periodo}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {materias.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
                Este profesor no tiene materias asignadas
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
