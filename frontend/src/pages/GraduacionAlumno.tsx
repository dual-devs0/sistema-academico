import { useState, useEffect } from 'react'
import { getCurrentUser, emitToast } from '../lib/api'
import { getCondicionEgreso, type CondicionEgreso } from '../services/graduacionService'

const css = `
  .ga-title { font-size:22px; font-weight:800; margin-bottom:20px; color:var(--text-primary); }
  .ga-card {
    background:var(--bg-elevated); border:1px solid var(--border-subtle);
    border-radius:16px; padding:18px 22px; margin-bottom:12px;
  }
  .ga-badge {
    padding:4px 12px; border-radius:999px; font-size:11px; font-weight:700;
    text-transform:uppercase; letter-spacing:.05em;
  }
  .ga-badge.ok { background:rgba(16,185,129,.15); color:#10b981; }
  .ga-badge.fail { background:rgba(239,68,68,.15); color:#ef4444; }
`

export default function GraduacionAlumno() {
  const [condicion, setCondicion] = useState<CondicionEgreso | null>(null)
  const [loading, setLoading] = useState(true)
  const user = getCurrentUser()

  useEffect(() => {
    if (!user?.user_id) return
    getCondicionEgreso(user.user_id)
      .then(setCondicion)
      .catch(() => emitToast('Error cargando condición', 'error'))
      .finally(() => setLoading(false))
  }, [user?.user_id])

  if (loading) return <div>Cargando...</div>

  return (
    <div>
      <style>{css}</style>
      <h2 className="ga-title">Mi Graduación</h2>

      {condicion ? (
        <div className="ga-card">
          <div style={{display:'flex', gap:12, fontSize:13, flexDirection:'column'}}>
            <div>Créditos aprobados: {condicion.creditos_aprobados} / {condicion.creditos_totales}</div>
            <div>PPA actual: {condicion.ppa_actual ?? '—'} (mínimo: {condicion.ppa_minimo})</div>
            <div>
              <span className={`ga-badge ${condicion.puede_graduarse ? 'ok' : 'fail'}`}>
                {condicion.puede_graduarse ? 'Podés solicitar graduación' : 'Aún no cumplís los requisitos'}
              </span>
            </div>
            {condicion.motivo && (
              <div style={{color:'#ef4444', fontSize:12, marginTop:8}}>
                {condicion.motivo}
                <br />
                <span style={{color:'var(--text-secondary)'}}>Consultá con administración para más detalles.</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="ga-card" style={{textAlign:'center', color:'var(--text-secondary)'}}>
          No se pudo cargar la información de graduación.
        </div>
      )}
    </div>
  )
}