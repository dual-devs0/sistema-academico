import { useState } from 'react'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

type TipoEvento = 'parcial' | 'final' | 'feriado' | 'asueto' | 'entrega' | 'actividad'

interface Evento {
  date: string
  tipo: TipoEvento
  nombre: string
  materia: string
}

const eventos: Evento[] = [
  { date: '2026-03-10', tipo: 'actividad', nombre: 'Inicio del semestre', materia: 'General' },
  { date: '2026-03-20', tipo: 'entrega', nombre: 'TP Nº1 - Cálculo', materia: 'Análisis Matemático I' },
  { date: '2026-04-02', tipo: 'feriado', nombre: 'Semana Santa', materia: 'General' },
  { date: '2026-04-15', tipo: 'parcial', nombre: 'Parcial 1 - Física I', materia: 'Física I' },
  { date: '2026-04-17', tipo: 'parcial', nombre: 'Parcial 1 - Mat. Discreta', materia: 'Matemática Discreta' },
  { date: '2026-04-22', tipo: 'parcial', nombre: 'Parcial 1 - Análisis', materia: 'Análisis Matemático I' },
  { date: '2026-05-01', tipo: 'asueto', nombre: 'Día del Trabajador', materia: 'General' },
  { date: '2026-05-14', tipo: 'asueto', nombre: 'Independencia PY', materia: 'General' },
  { date: '2026-05-15', tipo: 'asueto', nombre: 'Independencia PY', materia: 'General' },
  { date: '2026-06-10', tipo: 'parcial', nombre: 'Parcial 2 - Física I', materia: 'Física I' },
  { date: '2026-06-18', tipo: 'entrega', nombre: 'TP Nº2 - Cálculo', materia: 'Análisis Matemático I' },
  { date: '2026-06-25', tipo: 'parcial', nombre: 'Parcial 2 - Análisis', materia: 'Análisis Matemático I' },
  { date: '2026-08-05', tipo: 'final', nombre: 'Final - Física I', materia: 'Física I' },
  { date: '2026-08-07', tipo: 'final', nombre: 'Final - Mat. Discreta', materia: 'Matemática Discreta' },
  { date: '2026-08-12', tipo: 'final', nombre: 'Final - Análisis', materia: 'Análisis Matemático I' },
]

const tipoEstilo: Record<TipoEvento, { bg: string; text: string; dot: string }> = {
  parcial:   { bg: 'bg-purple-100 text-purple-700', text: 'text-purple-700', dot: 'bg-purple-500' },
  final:     { bg: 'bg-red-100 text-red-700',       text: 'text-red-700',    dot: 'bg-red-500' },
  feriado:   { bg: 'bg-gray-100 text-gray-600',     text: 'text-gray-600',   dot: 'bg-gray-400' },
  asueto:    { bg: 'bg-green-100 text-green-700',   text: 'text-green-700',  dot: 'bg-green-500' },
  entrega:   { bg: 'bg-amber-100 text-amber-700',   text: 'text-amber-700',  dot: 'bg-amber-500' },
  actividad: { bg: 'bg-blue-100 text-blue-700',     text: 'text-blue-700',   dot: 'bg-blue-500' },
}

function eventosDelDia(y: number, m: number, d: number) {
  const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  return eventos.filter(e => e.date === key)
}

export default function Calendario() {
  const hoy = new Date()
  const [actual, setActual] = useState(new Date(2026, 3, 1))
  const [seleccionados, setSeleccionados] = useState<Evento[]>([])
  const [diaSeleccionado, setDiaSeleccionado] = useState<string>('')

  const y = actual.getFullYear()
  const m = actual.getMonth()
  const primerDia = new Date(y, m, 1).getDay()
  const diasEnMes = new Date(y, m + 1, 0).getDate()

  function seleccionarDia(d: number) {
    const evs = eventosDelDia(y, m, d)
    setSeleccionados(evs)
    setDiaSeleccionado(`${d} de ${MESES[m]} ${y}`)
  }

  const proximosEventos = eventos
    .filter(e => new Date(e.date) >= hoy)
    .slice(0, 5)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Calendario académico</h1>
        <p className="text-sm text-gray-500 mt-1">Semestre 1 — 2026</p>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-3 mb-4">
        {(Object.entries(tipoEstilo) as [TipoEvento, typeof tipoEstilo[TipoEvento]][]).map(([tipo, estilo]) => (
          <div key={tipo} className="flex items-center gap-1.5 text-xs text-gray-600">
            <div className={`w-2.5 h-2.5 rounded-full ${estilo.dot}`} />
            <span className="capitalize">{tipo}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Calendario */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5">

          {/* Navegación */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setActual(new Date(y, m - 1, 1))}
              className="text-gray-500 hover:text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-50 transition text-sm"
            >
              ← Anterior
            </button>
            <span className="text-sm font-semibold text-gray-700">{MESES[m]} {y}</span>
            <button
              onClick={() => setActual(new Date(y, m + 1, 1))}
              className="text-gray-500 hover:text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-50 transition text-sm"
            >
              Siguiente →
            </button>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 mb-2">
            {DIAS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Grilla de días */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: primerDia }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: diasEnMes }).map((_, i) => {
              const d = i + 1
              const evs = eventosDelDia(y, m, d)
              const esHoy = hoy.getFullYear() === y && hoy.getMonth() === m && hoy.getDate() === d
              return (
                <button
                  key={d}
                  onClick={() => seleccionarDia(d)}
                  className={`min-h-14 rounded-lg border p-1 text-left transition
                    ${esHoy ? 'border-blue-400 bg-blue-50' : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'}`}
                >
                  <div className={`text-xs font-medium mb-1 ${esHoy ? 'text-blue-600' : 'text-gray-600'}`}>{d}</div>
                  {evs.slice(0, 2).map((e, idx) => (
                    <div key={idx} className={`text-xs rounded px-1 py-0.5 mb-0.5 truncate font-medium ${tipoEstilo[e.tipo].bg}`}>
                      {e.nombre}
                    </div>
                  ))}
                  {evs.length > 2 && (
                    <div className="text-xs text-gray-400">+{evs.length - 2} más</div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Panel lateral */}
        <div className="space-y-4">

          {/* Día seleccionado */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              {diaSeleccionado || 'Seleccioná un día'}
            </h3>
            {seleccionados.length === 0 ? (
              <p className="text-xs text-gray-400">
                {diaSeleccionado ? 'Sin eventos este día.' : 'Hacé clic en un día para ver sus eventos.'}
              </p>
            ) : (
              <div className="space-y-2">
                {seleccionados.map((e, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${tipoEstilo[e.tipo].dot}`} />
                    <div>
                      <div className="text-sm font-medium text-gray-700">{e.nombre}</div>
                      <div className="text-xs text-gray-400">{e.materia}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Próximos eventos */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Próximos eventos</h3>
            <div className="space-y-3">
              {proximosEventos.map((e, i) => {
                return (
                  <div key={i} className="flex items-start gap-2">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${tipoEstilo[e.tipo].dot}`} />
                    <div>
                      <div className="text-sm font-medium text-gray-700">{e.nombre}</div>
                      <div className="text-xs text-gray-400">{e.materia}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )}