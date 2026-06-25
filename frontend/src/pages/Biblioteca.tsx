import { useState } from 'react'

interface Apunte {
  id: number
  titulo: string
  materia: string
  carrera: string
  anio: number
  semestre: number
  autor: string
  fecha: string
  tags: string[]
  aprobado: boolean
}

const apuntesIniciales: Apunte[] = [
  { id: 1, titulo: 'Resumen Análisis Matemático I - Unidad 1 y 2', materia: 'Análisis Matemático I', carrera: 'Ing. Informática', anio: 1, semestre: 1, autor: 'María González', fecha: '2026-03-15', tags: ['límites', 'derivadas', 'resumen'], aprobado: true },
  { id: 2, titulo: 'Ejercicios resueltos Física I - Cinemática', materia: 'Física I', carrera: 'Ing. Informática', anio: 1, semestre: 1, autor: 'Luis Paredes', fecha: '2026-03-20', tags: ['cinemática', 'ejercicios', 'parcial'], aprobado: true },
  { id: 3, titulo: 'Guía completa Programación I - Punteros', materia: 'Programación I', carrera: 'Ing. Informática', anio: 1, semestre: 1, autor: 'Ana Torres', fecha: '2026-04-01', tags: ['punteros', 'C++', 'guía'], aprobado: true },
  { id: 4, titulo: 'Apuntes Matemática Discreta - Grafos', materia: 'Matemática Discreta', carrera: 'Ing. Informática', anio: 1, semestre: 2, autor: 'Carlos Méndez', fecha: '2026-04-10', tags: ['grafos', 'teoría', 'apuntes'], aprobado: true },
  { id: 5, titulo: 'Resumen Resistencia de Materiales', materia: 'Resistencia de Materiales', carrera: 'Ing. Civil', anio: 2, semestre: 1, autor: 'Pedro Rojas', fecha: '2026-04-05', tags: ['tensión', 'deformación', 'resumen'], aprobado: true },
  { id: 6, titulo: 'Ejercicios Mecánica de Suelos', materia: 'Mecánica de Suelos', carrera: 'Ing. Civil', anio: 3, semestre: 1, autor: 'Ana Torres', fecha: '2026-04-12', tags: ['suelos', 'ejercicios'], aprobado: false },
]

const carreras = ['Todas', 'Ing. Informática', 'Ing. Civil']

export default function Biblioteca() {
  const [apuntes] = useState<Apunte[]>(apuntesIniciales)
  const [busqueda, setBusqueda] = useState('')
  const [filtroCarrera, setFiltroCarrera] = useState('Todas')
  const [filtroMateria, setFiltroMateria] = useState('Todas')

  const materias = ['Todas', ...new Set(apuntes.map(a => a.materia))]

  const filtrados = apuntes.filter(a => {
    if (!a.aprobado) return false
    const coincideBusqueda =
      a.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.tags.some(t => t.toLowerCase().includes(busqueda.toLowerCase())) ||
      a.autor.toLowerCase().includes(busqueda.toLowerCase())
    const coincideCarrera = filtroCarrera === 'Todas' || a.carrera === filtroCarrera
    const coincideMateria = filtroMateria === 'Todas' || a.materia === filtroMateria
    return coincideBusqueda && coincideCarrera && coincideMateria
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Biblioteca de apuntes</h1>
          <p className="text-sm text-gray-500 mt-1">{filtrados.length} apuntes disponibles</p>
        </div>
        <button className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          + Subir apunte
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <input
          type="text"
          placeholder="Buscar por título, tag o autor..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="flex-1 min-w-48 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filtroCarrera}
          onChange={e => setFiltroCarrera(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {carreras.map(c => <option key={c}>{c}</option>)}
        </select>
        <select
          value={filtroMateria}
          onChange={e => setFiltroMateria(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {materias.map(m => <option key={m}>{m}</option>)}
        </select>
      </div>

      {/* Grilla de apuntes */}
      {filtrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="text-3xl mb-3">🗂️</div>
          <p className="text-gray-400 text-sm">No se encontraron apuntes con esos filtros</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtrados.map(a => (
            <div key={a.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-200 hover:shadow-sm transition">

              {/* Icono y título */}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 text-lg">
                  📄
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-700 leading-tight line-clamp-2">{a.titulo}</h3>
                  <p className="text-xs text-blue-600 mt-0.5">{a.materia}</p>
                </div>
              </div>

              {/* Info */}
              <div className="text-xs text-gray-400 space-y-1 mb-3">
                <div>📚 {a.carrera} · {a.anio}° año · Sem. {a.semestre}</div>
                <div>👤 {a.autor} · {new Date(a.fecha).toLocaleDateString('es-PY')}</div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-4">
                {a.tags.map(t => (
                  <span key={t} className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                    #{t}
                  </span>
                ))}
              </div>

              {/* Botón */}
              <button className="w-full text-sm text-blue-600 border border-blue-200 rounded-lg py-1.5 hover:bg-blue-50 transition">
                Ver / Descargar
              </button>

            </div>
          ))}
        </div>
      )}
    </div>
  )
}