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

const rolColor: Record<Rol, string> = {
  admin: 'bg-purple-50 text-purple-700 border-purple-200',
  profesor: 'bg-blue-50 text-blue-700 border-blue-200',
  alumno: 'bg-green-50 text-green-700 border-green-200',
}

export default function Usuarios() {
  const [usuarios] = useState<Usuario[]>(usuariosIniciales)
  const [busqueda, setBusqueda] = useState('')
  const [filtroRol, setFiltroRol] = useState<Rol | 'todos'>('todos')

  const filtrados = usuarios.filter(u => {
    const coincideBusqueda = u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.email.toLowerCase().includes(busqueda.toLowerCase())
    const coincideRol = filtroRol === 'todos' || u.rol === filtroRol
    return coincideBusqueda && coincideRol
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Gestión de usuarios</h1>
          <p className="text-sm text-gray-500 mt-1">{usuarios.length} usuarios registrados</p>
        </div>
        <button className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          + Nuevo usuario
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filtroRol}
          onChange={e => setFiltroRol(e.target.value as Rol | 'todos')}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="todos">Todos los roles</option>
          <option value="admin">Admin</option>
          <option value="profesor">Profesor</option>
          <option value="alumno">Alumno</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
              <th className="text-left px-5 py-3">Nombre</th>
              <th className="text-left px-5 py-3">Email</th>
              <th className="text-left px-5 py-3">Rol</th>
              <th className="text-left px-5 py-3">Carrera</th>
              <th className="text-center px-5 py-3">Becado</th>
              <th className="text-center px-5 py-3">Estado</th>
              <th className="text-center px-5 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtrados.map(u => (
              <tr key={u.id} className="hover:bg-gray-50 transition">
                <td className="px-5 py-3 font-medium text-gray-700">{u.nombre}</td>
                <td className="px-5 py-3 text-gray-500">{u.email}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full border font-medium ${rolColor[u.rol]}`}>
                    {u.rol}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-500">{u.carrera}</td>
                <td className="px-5 py-3 text-center">
                  {u.becado ? <span className="text-green-600">✓</span> : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-5 py-3 text-center">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.activo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-5 py-3 text-center">
                  <button className="text-blue-500 hover:text-blue-700 text-xs mr-3">Editar</button>
                  <button className="text-red-400 hover:text-red-600 text-xs">Desactivar</button>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-gray-400 text-sm">
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
