const materias = [
    {
        nombre: 'Análisis Matemático I',
        parcial1: 7.5,
        parcial2: 8.0,
        tp: 9.0,
        final: null,
    },
    {
    nombre: 'Física I',
    parcial1: 6.0,
    parcial2: 7.5,
    tp: 8.5,
    final: null,
  },
  {
    nombre: 'Matemática Discreta',
    parcial1: 9.0,
    parcial2: null,
    tp: 8.0,
    final: null,
  },
  {
    nombre: 'Programación I',
    parcial1: 10.0,
    parcial2: 9.5,
    tp: 10.0,
    final: null,
  },
]

function promedio(m: typeof materias[0]) {
  const notas = [m.parcial1, m.parcial2, m.tp].filter(n => n !== null) as number[]
  if (!notas.length) return null
  return (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1)
}

function colorNota(n: number | null) {
  if (n === null) return 'text-gray-400'
  if (n >= 8) return 'text-green-600 font-medium'
  if (n >= 6) return 'text-amber-600 font-medium'
  return 'text-red-600 font-medium'
}

export default function Puntajes() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Mis puntajes</h1>
        <p className="text-sm text-gray-500 mt-1">Semestre 1 — 2026</p>
      </div>

      <div className="space-y-4">
        {materias.map(m => {
          const prom = promedio(m)
          return (
            <div key={m.nombre} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {/* Header materia */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <h2 className="text-sm font-semibold text-gray-700">{m.nombre}</h2>
                {prom && (
                  <span className={`text-sm ${colorNota(parseFloat(prom))}`}>
                    Promedio parcial: {prom}
                  </span>
                )}
              </div>

              {/* Notas */}
              <div className="grid grid-cols-4 divide-x divide-gray-50">
                {[
                  { label: 'Parcial 1', valor: m.parcial1 },
                  { label: 'Parcial 2', valor: m.parcial2 },
                  { label: 'Trab. Práctico', valor: m.tp },
                  { label: 'Final', valor: m.final },
                ].map(item => (
                  <div key={item.label} className="px-5 py-4 text-center">
                    <div className="text-xs text-gray-400 mb-2">{item.label}</div>
                    <div className={`text-2xl ${colorNota(item.valor)}`}>
                      {item.valor ?? '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}