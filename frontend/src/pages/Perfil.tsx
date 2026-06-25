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

  const iniciales = alumno.nombre.split(' ').map(n => n[0]).join('').slice(0, 2)

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Mi perfil
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Datos personales y académicos</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>

        {/* Avatar */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '32px 20px',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', textAlign: 'center',
        }}>
          <div style={{
            width: '72px', height: '72px',
            background: 'var(--accent)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', fontWeight: 600, color: 'white',
            marginBottom: '16px',
          }}>
            {iniciales}
          </div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {alumno.nombre}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            {alumno.email}
          </div>
          {alumno.becado && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'var(--success-subtle)',
              border: '1px solid rgba(52,211,153,0.2)',
              borderRadius: '20px',
              padding: '4px 12px',
              fontSize: '12px', fontWeight: 500,
              color: 'var(--success)',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              Becado
            </div>
          )}
        </div>

        {/* Datos */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '24px',
        }}>
          {/* Académicos */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
              Información académica
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[
                { label: 'Carrera', value: alumno.carrera },
                { label: 'Legajo', value: alumno.legajo },
                { label: 'Año', value: `${alumno.anio}° año` },
                { label: 'Semestre', value: `Semestre ${alumno.semestre}` },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'var(--border)', marginBottom: '24px' }} />

          {/* Contacto */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
              Datos de contacto
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>Teléfono</div>
                {editando ? (
                  <input
                    type="text"
                    value={telefono}
                    onChange={e => setTelefono(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--bg-base)',
                      border: '1px solid var(--accent)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '14px',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                ) : (
                  <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {telefono}
                  </div>
                )}
              </div>
              <button
                onClick={() => setEditando(!editando)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: editando ? 'none' : '1px solid var(--border)',
                  background: editando ? 'var(--accent)' : 'transparent',
                  color: editando ? 'white' : 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  marginTop: '16px',
                }}
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