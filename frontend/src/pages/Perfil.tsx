import { useState } from 'react'

const alumno = {
  nombre: 'María González',
  email: 'maria.gonzalez@uca.edu.py',
  carrera: 'Ingeniería Informática',
  anio: 2,
  semestre: 1,
  legajo: '2024-0123',
  becado: true,
  telefono: '0981-123456',
}

export default function Perfil() {
  const [editando, setEditando] = useState(false)
  const [telefono, setTelefono] = useState(alumno.telefono)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Mi perfil</h1>
        <p className="text-sm text-gray-500 mt-1">Datos personales y académicos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Avatar y datos principales */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <span className="text-white text-2xl font-bold">
              {alumno.nombre.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </span>
          </div>
          <h2 className="text-base font-semibold text-gray-800">{alumno.nombre}</h2>
          <p className="text-sm text-gray-500 mt-1">{alumno.email}</p>
          {alumno.becado && (
            <span className="mt-3 inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-medium px-3 py-1 rounded-full border border-green-200">
              ✓ Becado
            </span>
          )}
        </div>

        {/* Datos académicos */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 md:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Información académica</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Carrera', value: alumno.carrera },
              { label: 'Legajo', value: alumno.legajo },
              { label: 'Año', value: `${alumno.anio}° año` },
              { label: 'Semestre', value: `Semestre ${alumno.semestre}` },
            ].map(item => (
              <div key={item.label}>
                <div className="text-xs text-gray-400 mb-1">{item.label}</div>
                <div className="text-sm font-medium text-gray-700">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-50 mt-5 pt-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Datos de contacto</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="text-xs text-gray-400 mb-1">Teléfono</div>
                {editando ? (
                  <input
                    type="text"
                    value={telefono}
                    onChange={e => setTelefono(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="text-sm font-medium text-gray-700">{telefono}</div>
                )}
              </div>
              <button
                onClick={() => setEditando(!editando)}
                className={`text-sm px-4 py-1.5 rounded-lg border transition ${
                  editando
                    ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {editando ? 'Guardar' : 'Editar'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
