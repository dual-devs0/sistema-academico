import { useState } from 'react'

interface Clase {
  semana: number
  titulo: string
  descripcion: string
  completada: boolean
}

interface MateriaTemario {
  materia: string
  profesor: string
  clases: Clase[]
}

const temarios: MateriaTemario[] = [
  {
    materia: 'Análisis Matemático I',
    profesor: 'Carlos Méndez',
    clases: [
      { semana: 1, titulo: 'Introducción a límites', descripcion: 'Concepto de límite, límites laterales, propiedades. Bibliografía: Stewart Cap. 2', completada: true },
      { semana: 2, titulo: 'Continuidad de funciones', descripcion: 'Funciones continuas, discontinuidades, teorema del valor intermedio.', completada: true },
      { semana: 3, titulo: 'Derivadas - definición', descripcion: 'Definición formal de derivada, reglas de derivación básicas.', completada: true },
      { semana: 4, titulo: 'Regla de la cadena', descripcion: 'Derivadas de funciones compuestas, derivadas implícitas.', completada: false },
      { semana: 5, titulo: 'Aplicaciones de derivadas', descripcion: 'Máximos y mínimos, optimización, regla de L\'Hôpital.', completada: false },
      { semana: 6, titulo: 'Integrales indefinidas', descripcion: 'Antiderivadas, técnicas de integración básicas.', completada: false },
    ],
  },
  {
    materia: 'Física I',
    profesor: 'Ana Torres',
    clases: [
      { semana: 1, titulo: 'Cinemática en 1D', descripcion: 'Posición, velocidad, aceleración. MRU y MRUA.', completada: true },
      { semana: 2, titulo: 'Cinemática en 2D', descripcion: 'Vectores, movimiento parabólico, movimiento circular.', completada: true },
      { semana: 3, titulo: 'Leyes de Newton', descripcion: 'Primera, segunda y tercera ley. Aplicaciones.', completada: true },
      { semana: 4, titulo: 'Trabajo y energía', descripcion: 'Trabajo de una fuerza, energía cinética, teorema trabajo-energía.', completada: false },
      { semana: 5, titulo: 'Energía potencial', descripcion: 'Fuerzas conservativas, energía potencial gravitatoria y elástica.', completada: false },
    ],
  },
  {
    materia: 'Programación I',
    profesor: 'Luis Paredes',
    clases: [
      { semana: 1, titulo: 'Introducción a C++', descripcion: 'Historia, compilación, primer programa. Variables y tipos de datos.', completada: true },
      { semana: 2, titulo: 'Estructuras de control', descripcion: 'If-else, switch, bucles for y while.', completada: true },
      { semana: 3, titulo: 'Funciones', descripcion: 'Declaración, definición, parámetros, valor de retorno, recursividad.', completada: true },
      { semana: 4, titulo: 'Arrays y strings', descripcion: 'Arrays unidimensionales y multidimensionales, manejo de strings.', completada: false },
      { semana: 5, titulo: 'Punteros', descripcion: 'Concepto de puntero, aritmética de punteros, punteros y arrays.', completada: false },
    ],
  },
]

export default function Temario() {
  const [materiaActiva, setMateriaActiva] = useState(temarios[0].materia)
  const [claseAbierta, setClaseAbierta] = useState<number | null>(null)

  const temario = temarios.find(t => t.materia === materiaActiva)!
  const completadas = temario.clases.filter(c => c.completada).length
  const progreso = Math.round((completadas / temario.clases.length) * 100)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Temario de clases</h1>
        <p className="text-sm text-gray-500 mt-1">Cronograma semanal por materia</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

        {/* Lista de materias */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-1 h-fit">
          <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">Materias</h3>
          {temarios.map(t => {
            const comp = t.clases.filter(c => c.completada).length
            const pct = Math.round((comp / t.clases.length) * 100)
            return (
              <button
                key={t.materia}
                onClick={() => { setMateriaActiva(t.materia); setClaseAbierta(null) }}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition text-sm ${
                  materiaActiva === t.materia
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="truncate">{t.materia}</div>
                <div className="text-xs text-gray-400 mt-0.5">{pct}% completado</div>
              </button>
            )
          })}
        </div>

        {/* Temario de la materia */}
        <div className="lg:col-span-3 space-y-3">

          {/* Header materia */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-semibold text-gray-700">{temario.materia}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Prof. {temario.profesor}</p>
              </div>
              <span className="text-sm font-semibold text-blue-600">{progreso}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-blue-500 transition-all"
                style={{ width: `${progreso}%` }}
              />
            </div>
            <div className="text-xs text-gray-400 mt-2">
              {completadas} de {temario.clases.length} clases completadas
            </div>
          </div>

          {/* Clases */}
          {temario.clases.map(c => (
            <div
              key={c.semana}
              className="bg-white rounded-xl border border-gray-100 overflow-hidden"
            >
              <button
                onClick={() => setClaseAbierta(claseAbierta === c.semana ? null : c.semana)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition"
              >
                {/* Indicador */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold
                  ${c.completada ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  {c.completada ? '✓' : c.semana}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Semana {c.semana}</span>
                    {c.completada && (
                      <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
                        Completada
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-medium text-gray-700 mt-0.5">{c.titulo}</div>
                </div>

                <span className="text-gray-400 text-xs">
                  {claseAbierta === c.semana ? '▲' : '▼'}
                </span>
              </button>

              {/* Descripción expandible */}
              {claseAbierta === c.semana && (
                <div className="px-5 pb-4 border-t border-gray-50">
                  <p className="text-sm text-gray-600 mt-3 leading-relaxed">{c.descripcion}</p>
                </div>
              )}
            </div>
          ))}

        </div>
      </div>
    </div>
  )
}