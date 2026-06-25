const asistencias = [
  {
    materia: 'Análisis Matemático I',
    clases: [
      { fecha: '2026-03-10', presente: true },
      { fecha: '2026-03-17', presente: true },
      { fecha: '2026-03-24', presente: false },
      { fecha: '2026-03-31', presente: true },
      { fecha: '2026-04-07', presente: true },
      { fecha: '2026-04-14', presente: false },
      { fecha: '2026-04-21', presente: true },
      { fecha: '2026-04-28', presente: true },
    ],
  },
  {
    materia: 'Física I',
    clases: [
      { fecha: '2026-03-11', presente: true },
      { fecha: '2026-03-18', presente: true },
      { fecha: '2026-03-25', presente: true },
      { fecha: '2026-04-01', presente: true },
      { fecha: '2026-04-08', presente: false },
      { fecha: '2026-04-15', presente: true },
    ],
  },
  {
    materia: 'Programación I',
    clases: [
      { fecha: '2026-03-12', presente: true },
      { fecha: '2026-03-19', presente: true },
      { fecha: '2026-03-26', presente: true },
      { fecha: '2026-04-02', presente: true },
      { fecha: '2026-04-09', presente: true },
      { fecha: '2026-04-16', presente: true },
    ],
  },
]

function porcentaje(clases: { presente: boolean }[]) {
  const presentes = clases.filter(c => c.presente).length
  return Math.round((presentes / clases.length) * 100)
}

function colorPorcentaje(p: number) {
  if (p >= 80) return 'text-green-600'
  if (p >= 60) return 'text-amber-600'
  return 'text-red-600'
}

function colorBarra(p: number) {
  if (p >= 80) return 'bg-green-500'
  if (p >= 60) return 'bg-amber-500'
  return 'bg-red-500'
}

export default function Asistencia() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Mi asistencia</h1>
        <p className="text-sm text-gray-500 mt-1">Semestre 1 — 2026</p>
      </div>

      <div className="space-y-4">
        {asistencias.map(a => {
          const pct = porcentaje(a.clases)
          const presentes = a.clases.filter(c => c.presente).length
          return (
            <div key={a.materia} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-700">{a.materia}</h2>
                <span className={`text-lg font-semibold ${colorPorcentaje(pct)}`}>{pct}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
                <div className={`h-2 rounded-full transition-all ${colorBarra(pct)}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
                <span>✅ {presentes} presentes</span>
                <span>❌ {a.clases.length - presentes} ausentes</span>
                <span>📅 {a.clases.length} clases totales</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {a.clases.map(c => (
                  <div
                    key={c.fecha}
                    title={c.fecha}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium
                      ${c.presente
                        ? 'bg-green-50 text-green-600 border border-green-200'
                        : 'bg-red-50 text-red-500 border border-red-200'}`}
                  >
                    {c.presente ? '✓' : '✗'}
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
