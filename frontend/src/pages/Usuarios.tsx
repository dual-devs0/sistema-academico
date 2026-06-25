import { useState } from 'react'

type Rol = 'admin' | 'profesor' | 'alumno'

interface Usuario {
  id: number
  nombre: string
  email: string
  rol: Rol
  carrera: string
  becado: boolean
  activo: boolean
}

const usuariosIniciales: Usuario[] = [
  { id: 1, nombre: 'Carlos Méndez', email: 'carlos.mendez@uca.edu.py', rol: 'profesor', carrera: 'Ing. Informática', becado: false, activo: true },
  { id: 2, nombre: 'María González', email: 'maria.gonzalez@uca.edu.py', rol: 'alumno', carrera: 'Ing. Informática', becado: true, activo: true },
  { id: 3, nombre: 'Luis Paredes', email: 'luis.paredes@uca.edu.py', rol: 'alumno', carrera: 'Ing. Civil', becado: false, activo: true },
  { id: 4, nombre: 'Ana Torres', email: 'ana.torres@uca.edu.py', rol: 'alumno', carrera: 'Ing. Informática', becado: true, activo: false },
  { id: 5, nombre: 'Pedro Rojas', email: 'pedro.rojas@uca.edu.py', rol: 'profesor', carrera: 'Ing. Civil', becado: false, activo: true },
]

const rolEstilo: Record<Rol, { color: string; bg: string }> = {
  admin:   { color: 'var(--purple)', bg: 'var(--purple-subtle)' },
  profesor: { color: 'var(--accent)', bg: 'var(--accent-subtle)' },
  alumno:  { color: 'var(--success)', bg: 'var(--success-subtle)' },
}

export default function Usuarios() {
  const [usuarios] = useState<Usuario[]>(usuariosIniciales)
  const [busqueda, setBusqueda] = useState('')
  const [filtroRol, setFiltroRol] = useState<Rol | 'todos'>('todos')

  const filtrados = usuarios.filter(u => {
    const coincide = u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.email.toLowerCase().includes(busqueda.toLowerCase())
    const rol = filtroRol === 'todos' || u.rol === filtroRol
    return coincide && rol
  })

  const inputStyle = {
    background: 'var(--bg-base)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '9px 14px',
    fontSize: '13px',
    color: 'var(--text-primary)',
    outline: 'none',
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Gestión de usuarios
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{usuarios.length} usuarios registrados</p>
        </div>
        <button style={{
          background: 'var(--accent)', border: 'none',
          borderRadius: '8px', padding: '9px 16px',
          fontSize: '13px', fontWeight: 500, color: 'white',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nuevo usuario
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ ...inputStyle, flex: 1 }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <select
          value={filtroRol}
          onChange={e => setFiltroRol(e.target.value as Rol | 'todos')}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          <option value="todos">Todos los roles</option>
          <option value="admin">Admin</option>
          <option value="profesor">Profesor</option>
          <option value="alumno">Alumno</option>
        </select>
      </div>

      {/* Tabla */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-base)' }}>
              {['Nombre', 'Email', 'Rol', 'Carrera', 'Becado', 'Estado', 'Acciones'].map(h => (
                <th key={h} style={{
                  padding: '10px 20px',
                  textAlign: ['Becado', 'Estado', 'Acciones'].includes(h) ? 'center' : 'left',
                  fontSize: '11px', fontWeight: 500,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map(u => (
              <tr key={u.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '12px 20px', fontWeight: 500, color: 'var(--text-primary)' }}>{u.nombre}</td>
                <td style={{ padding: '12px 20px', color: 'var(--text-muted)' }}>{u.email}</td>
                <td style={{ padding: '12px 20px' }}>
                  <span style={{
                    fontSize: '11px', fontWeight: 500,
                    padding: '3px 10px', borderRadius: '20px',
                    color: rolEstilo[u.rol].color,
                    background: rolEstilo[u.rol].bg,
                  }}>{u.rol}</span>
                </td>
                <td style={{ padding: '12px 20px', color: 'var(--text-muted)' }}>{u.carrera}</td>
                <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                  {u.becado
                    ? <span style={{ color: 'var(--success)', fontSize: '14px' }}>✓</span>
                    : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </td>
                <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                  <span style={{
                    fontSize: '11px', fontWeight: 500,
                    padding: '3px 10px', borderRadius: '20px',
                    color: u.activo ? 'var(--success)' : 'var(--text-muted)',
                    background: u.activo ? 'var(--success-subtle)' : 'var(--bg-hover)',
                  }}>{u.activo ? 'Activo' : 'Inactivo'}</span>
                </td>
                <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                  <button style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '12px', cursor: 'pointer', marginRight: '12px' }}>Editar</button>
                  <button style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '12px', cursor: 'pointer' }}>Desactivar</button>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No se encontraron usuarios
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}