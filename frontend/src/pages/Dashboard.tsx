const stats = [
  { label: 'Materias cursando', value: '5', icon: '📚', color: 'bg-blue-50 text-blue-600' },
  { label: 'Promedio general', value: '8.2', icon: '📊', color: 'bg-green-50 text-green-600' },
  { label: 'Asistencia', value: '92%', icon: '📋', color: 'bg-amber-50 text-amber-600' },
  { label: 'TPs pendientes', value: '2', icon: '📝', color: 'bg-red-50 text-red-600' },
]

const materias = [
  { nombre: 'Análisis Matemático I', parcial1: 7.5, parcial2: 8.0, tp: 9.0, final: null },
  { nombre: 'Física I', parcial1: 6.0, parcial2: 7.5, tp: 8.5, final: null },
  { nombre: 'Matemática Discreta', parcial1: 9.0, parcial2: null, tp: 8.0, final: null },
  { nombre: 'Programación I', parcial1: 10.0, parcial2: 9.5, tp: 10.0, final: null },
]

export default function Dashboard() {
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Bienvenido, Alumno</h1>
        <p className="text-sm text-gray-500 mt-1">Semestre 1 — 2026</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg mb-3 ${s.color}`}>
              {s.icon}
            </div>
            <div className="text-2xl font-semibold text-gray-800">{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabla de notas */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Mis puntajes</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
              <th className="text-left px-5 py-3">Materia</th>
              <th className="text-center px-3 py-3">Parcial 1</th>
              <th className="text-center px-3 py-3">Parcial 2</th>
              <th className="text-center px-3 py-3">TP</th>
              <th className="text-center px-3 py-3">Final</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {materias.map(m => (
              <tr key={m.nombre} className="hover:bg-gray-50 transition">
                <td className="px-5 py-3 font-medium text-gray-700">{m.nombre}</td>
                <td className="text-center px-3 py-3 text-gray-600">{m.parcial1 ?? '—'}</td>
                <td className="text-center px-3 py-3 text-gray-600">{m.parcial2 ?? '—'}</td>
                <td className="text-center px-3 py-3 text-gray-600">{m.tp ?? '—'}</td>
                <td className="text-center px-3 py-3 text-gray-400">{m.final ?? 'Pendiente'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}