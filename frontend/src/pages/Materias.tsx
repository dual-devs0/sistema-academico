import { useState } from 'react'

interface Materia {
  id: number
  nombre: string
  carrera: string
  anio: number
  semestre: number
  profesor: string
  alumnos: number
}

const materiasIniciales: Materia[] = [
  { id: 1, nombre: 'Análisis Matemático I', carrera: 'Ing. Informática', anio: 1, semestre: 1, profesor: 'Carlos Méndez', alumnos: 32 },
  { id: 2, nombre: 'Física I', carrera: 'Ing. Informática', anio: 1, semestre: 1, profesor: 'Ana Torres', alumnos: 30 },
  { id: 3, nombre: 'Programación I', carrera: 'Ing. Informática', anio: 1, semestre: 1, profesor: 'Luis Paredes', alumnos: 35 },
  { id: 4, nombre: 'Matemática Discreta', carrera: 'Ing. Informática', anio: 1, semestre: 2, profesor: 'Carlos Méndez', alumnos: 28 },
  { id: 5, nombre: 'Resistencia de Materiales', carrera: 'Ing. Civil', anio: 2, semestre: 1, profesor: 'Pedro Rojas', alumnos: 22 },
  { id: 6, nombre: 'Mecánica de Suelos', carrera: 'Ing. Civil', anio: 3, semestre: 1, profesor: 'Pedro Rojas', alumnos: 18 },
]

export default function Materias() {
  const [materias] = useState<Materia[]>(materiasIniciales)
  const [busqueda, setBusqueda] = useState('')
  const [filtroCarrera, setFiltroCarrera] = useState('todas')

  const carreras = [...new Set(materias.map(m => m.carrera))]

  const filtradas = materias.filter(m => {
    const coincideBusqueda = m.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      m.profesor.toLowerCase().includes(busqueda.toLowerCase())
    const coincideCarrera = filtroCarrera === 'todas' || m.carrera === filtroCarrera
    return coincideBusqueda && coincideCarrera
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Materias y carreras</h1>
          <p className="text-sm text-gray-500 mt-1">{materias.length} materias registradas</p>
        </div>
        <button className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          + Nueva materia
        </button>
      </div>

      {/* Stats por carrera */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {carreras.map(c => {
          const count = materias.filter(m => m.carrera === c).length
          const totalAlumnos = materias.filter(m => m.carrera === c).reduce((a, m) => a + m.alumnos, 0)
          return (
            <div key={c} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="text-sm font-semibold text-gray-700 mb-2">{c}</div>
              <div className="flex gap-4 text-xs text-gray-500">
                <span>📚 {count} materias</span>
                <span>👥 {totalAlumnos} alumnos</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Buscar por materia o profesor..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filtroCarrera}
          onChange={e => setFiltroCarrera(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="todas">Todas las carreras</option>
          {carreras.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
              <th className="text-left px-5 py-3">Materia</th>
              <th className="text-left px-5 py-3">Carrera</th>
              <th className="text-center px-5 py-3">Año</th>
              <th className="text-center px-5 py-3">Semestre</th>
              <th className="text-left px-5 py-3">Profesor</th>
              <th className="text-center px-5 py-3">Alumnos</th>
              <th className="text-center px-5 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtradas.map(m => (
              <tr key={m.id} className="hover:bg-gray-50 transition">
                <td className="px-5 py-3 font-medium text-gray-700">{m.nombre}</td>
                <td className="px-5 py-3 text-gray-500">{m.carrera}</td>
                <td className="px-5 py-3 text-center text-gray-600">{m.anio}°</td>
                <td className="px-5 py-3 text-center text-gray-600">{m.semestre}</td>
                <td className="px-5 py-3 text-gray-500">{m.profesor}</td>
                <td className="px-5 py-3 text-center text-gray-600">{m.alumnos}</td>
                <td className="px-5 py-3 text-center">
                  <button className="text-blue-500 hover:text-blue-700 text-xs mr-3">Editar</button>
                  <button className="text-red-400 hover:text-red-600 text-xs">Eliminar</button>
                </td>
              </tr>
            ))}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-gray-400 text-sm">
                  No se encontraron materias
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
