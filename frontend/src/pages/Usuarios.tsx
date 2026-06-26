import { useState } from 'react'

type Rol = 'alumno' | 'profesor' | 'admin'

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
  admin:    { color: '#a855f7', bg: '#a855f718' },
  profesor: { color: '#3b82f6', bg: '#3b82f618' },
  alumno:   { color: '#00b4d8', bg: '#00b4d818' },
}

const css = `
  .usuarios-root { display:flex; flex-direction:column; flex:1; font-family:'Inter',system-ui,sans-serif; }
  .topbar { display:flex; align-items:center; justify-content:space-between; padding:16px 28px; border-bottom:1px solid #1e2d3d; background:#0b0f14; position:sticky; top:0; z-index:10; }
  .topbar h1 { font-size:18px; font-weight:700; color:#f0f4f8; letter-spacing:-.01em; }
  .topbar p { font-size:11px; color:#506070; margin-top:1px; }
  .topbar-right { display:flex; align-items:center; gap:10px; }
  .topbar-btn { display:flex; align-items:center; justify-content:center; width:34px; height:34px; background:#131920; border:1px solid #243447; border-radius:8px; color:#8fa3b8; cursor:pointer; position:relative; }
  .topbar-btn svg { width:15px; height:15px; }
  .topbar-btn:hover { border-color:#00b4d8; color:#f0f4f8; }
  .topbar-btn .dot { position:absolute; top:6px; right:6px; width:7px; height:7px; background:#ef4444; border-radius:50%; border:2px solid #0b0f14; }
  .avatar { width:34px; height:34px; background:linear-gradient(135deg,#00b4d8,#0ea5e9); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; color:#000; cursor:pointer; }
  .content { padding:24px 28px; flex:1; }
  .toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; }
  .toolbar-left { font-size:13px; color:#8fa3b8; }
  .btn-primary { display:inline-flex; align-items:center; gap:7px; padding:9px 16px; background:#00b4d8; border:none; border-radius:9px; color:#000; font-size:13px; font-weight:700; font-family:inherit; cursor:pointer; transition:opacity .18s; }
  .btn-primary:hover { opacity:.88; }
  .btn-primary svg { width:13px; height:13px; }
  .card { background:#131920; border:1px solid #1e2d3d; border-radius:14px; overflow:hidden; }
  .filters { display:flex; gap:12px; padding:14px 20px; border-bottom:1px solid #1e2d3d; }
  .search-input { flex:1; background:#0b0f14; border:1px solid #243447; border-radius:9px; color:#f0f4f8; font-size:13px; font-family:inherit; outline:none; padding:8px 14px; transition:border-color .18s; }
  .search-input:focus { border-color:#00b4d8; }
  .search-input::placeholder { color:#506070; }
  select { background:#0b0f14; border:1px solid #243447; border-radius:9px; color:#f0f4f8; font-size:12px; font-family:inherit; outline:none; padding:8px 32px 8px 12px; cursor:pointer; appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23506070' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 10px center; }
  select option { background:#1a2230; }
  table { width:100%; border-collapse:collapse; }
  thead th { padding:10px 20px; font-size:10px; font-weight:600; color:#506070; text-transform:uppercase; letter-spacing:.07em; text-align:left; border-bottom:1px solid #1e2d3d; white-space:nowrap; }
  tbody td { padding:12px 20px; border-bottom:1px solid #1e2d3d44; vertical-align:middle; }
  tbody tr:last-child td { border-bottom:none; }
  tbody tr:hover { background:#1a2230; }
  .u-nombre { font-size:13px; font-weight:600; color:#f0f4f8; }
  .u-email { font-size:12px; color:#8fa3b8; }
  .badge-pill { display:inline-flex; align-items:center; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; }
  .accion-btn { background:none; border:none; font-size:12px; font-weight:500; cursor:pointer; font-family:inherit; padding:0; }
  .accion-btn.edit { color:#00b4d8; }
  .accion-btn.deact { color:#ef4444; }
  .accion-btn:hover { opacity:.7; }
`

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

  return (
    <>
      <style>{css}</style>
      <div className="usuarios-root">

        {/* Topbar */}
        <header className="topbar">
          <div>
            <h1>Gestión de usuarios</h1>
            <p>Panel de administración</p>
          </div>
          <div className="topbar-right">
            <button className="topbar-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
            <button className="topbar-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              <span className="dot" />
            </button>
            <div className="avatar">MG</div>
          </div>
        </header>

        <div className="content">
          <div className="toolbar">
            <div className="toolbar-left">{usuarios.length} usuarios registrados</div>
            <button className="btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nuevo usuario
            </button>
          </div>

          <div className="card">
            <div className="filters">
              <input
                className="search-input"
                type="text"
                placeholder="Buscar por nombre o email..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
              <select value={filtroRol} onChange={e => setFiltroRol(e.target.value as Rol | 'todos')}>
                <option value="todos">Todos los roles</option>
                <option value="alumno">Alumno</option>
                <option value="profesor">Profesor</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Carrera</th>
                  <th style={{ textAlign: 'center' }}>Becado</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(u => (
                  <tr key={u.id}>
                    <td><div className="u-nombre">{u.nombre}</div></td>
                    <td><div className="u-email">{u.email}</div></td>
                    <td>
                      <span className="badge-pill" style={{ color: rolEstilo[u.rol].color, background: rolEstilo[u.rol].bg }}>
                        {u.rol}
                      </span>
                    </td>
                    <td><span style={{ fontSize: '13px', color: '#8fa3b8' }}>{u.carrera}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      {u.becado
                        ? <span style={{ color: '#22c55e', fontWeight: 600 }}>✓</span>
                        : <span style={{ color: '#506070' }}>—</span>
                      }
                    </td>
                    <td>
                      <span className="badge-pill" style={{
                        color: u.activo ? '#22c55e' : '#506070',
                        background: u.activo ? '#15803d18' : '#1a2230',
                      }}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="accion-btn edit">Editar</button>
                        <button className="accion-btn deact">Desactivar</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#506070', fontSize: '13px' }}>
                      No se encontraron usuarios
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}