import { useState, useEffect } from 'react'
import { emitToast } from '../lib/api'
import { solicitarPasantia, getEmpresas,
  type EmpresaReceptora } from '../services/pasantiasService'

const css = `
  .ps-title { font-size:22px; font-weight:800; margin-bottom:20px; color:var(--text-primary); }
  .ps-card {
    background:var(--bg-elevated); border:1px solid var(--border-subtle);
    border-radius:16px; padding:18px 22px; margin-bottom:12px;
  }
  .ps-select, .ps-input {
    padding:8px 12px; border-radius:10px; font-size:13px;
    background:var(--bg-base); border:1px solid var(--border-subtle);
    color:var(--text-primary); width:100%; margin-bottom:12px;
  }
  .ps-btn {
    padding:8px 18px; border-radius:10px; font-size:13px; font-weight:700;
    border:none; cursor:pointer; background:var(--accent-bright); color:#fff;
  }
  .ps-btn:disabled { opacity:.5; cursor:not-allowed; }
  .ps-label { font-size:12px; font-weight:600; color:var(--text-primary); margin-bottom:4px; }
`

export default function PasantiasAlumno() {
  const [empresas, setEmpresas] = useState<EmpresaReceptora[]>([])
  const [empresaId, setEmpresaId] = useState<number>(0)
  const [fechaInicio, setFechaInicio] = useState('')
  const [horas, setHoras] = useState(200)
  const [loading, setLoading] = useState(false)

  const cargarEmpresas = () => {
    getEmpresas()
      .then(setEmpresas)
      .catch(() => emitToast('Error cargando empresas', 'error'))
  }

  useEffect(() => { cargarEmpresas() }, [])

  const solicitar = async () => {
    if (!empresaId || !fechaInicio) {
      emitToast('Completá todos los campos', 'error')
      return
    }
    setLoading(true)
    try {
      await solicitarPasantia(empresaId, fechaInicio, horas)
      emitToast('Solicitud enviada', 'success')
      setEmpresaId(0); setFechaInicio(''); setHoras(200)
    } catch (e: Error) {
      emitToast(e?.message || 'Error al solicitar', 'error')
    } finally { setLoading(false) }
  }

  return (
    <div>
      <style>{css}</style>
      <h2 className="ps-title">Mis Pasantías</h2>

      <div className="ps-card">
        <h3 style={{ fontWeight:700, marginBottom:12 }}>Solicitar nueva pasantía</h3>
        <div className="ps-label">Empresa receptora</div>
        <select className="ps-input" value={empresaId} onChange={e => setEmpresaId(Number(e.target.value))}>
          <option value={0}>Seleccionar empresa...</option>
          {empresas.map(e => (
            <option key={e.id} value={e.id}>{e.nombre} {e.convenio_activo ? '(convenio activo)' : ''}</option>
          ))}
        </select>
        <div className="ps-label">Fecha de inicio</div>
        <input type="date" className="ps-input" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
        <div className="ps-label">Horas requeridas</div>
        <input type="number" className="ps-input" value={horas} onChange={e => setHoras(Number(e.target.value))} min={1} />
        <button className="ps-btn" onClick={solicitar} disabled={loading}>
          {loading ? 'Enviando...' : 'Solicitar pasantía'}
        </button>
      </div>

      {empresas.length === 0 && (
        <div className="ps-card" style={{textAlign:'center', color:'var(--text-secondary)'}}>
          No hay empresas registradas aún.
        </div>
      )}
    </div>
  )
}