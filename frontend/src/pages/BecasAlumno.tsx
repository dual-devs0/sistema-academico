import { useState, useEffect } from 'react'
import { getCurrentUser, emitToast, api } from '../lib/api'
import {
  getCatalogoBecas,
  postularBeca,
  getBecasActivas,
  getFuentes,
  type BecaCatalogo,
  type BecaActiva,
  type Postulacion,
  type FuenteBeca,
} from '../services/finanzasService'

type Tab = 'catalogo' | 'postulaciones' | 'activas'

export default function BecasAlumno() {
  const user = getCurrentUser()
  const userId = Number(user?.user_id ?? 0)

  const [tab, setTab] = useState<Tab>('catalogo')
  const [catalogo, setCatalogo] = useState<BecaCatalogo[]>([])
  const [becasActivas, setBecasActivas] = useState<BecaActiva[]>([])
  const [fuentes, setFuentes] = useState<FuenteBeca[]>([])
  const [fuenteFilter, setFuenteFilter] = useState<number | ''>('')
  const [postulando, setPostulando] = useState<number | null>(null)

  useEffect(() => {
    getCatalogoBecas().then(setCatalogo).catch(() => {})
    getFuentes().then(setFuentes).catch(() => {})
    if (userId) getBecasActivas(userId).then(setBecasActivas).catch(() => {})
  }, [userId])

  const catalogoFiltrado = fuenteFilter === ''
    ? catalogo
    : catalogo.filter(b => b.fuente_id === fuenteFilter)

  async function handlePostular(becaId: number) {
    setPostulando(becaId)
    try {
      await postularBeca(becaId)
      emitToast('Postulación enviada con éxito')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al postular'
      emitToast(msg, 'error')
    } finally {
      setPostulando(null)
    }
  }

  return (
    <div>
      <h1 className="page-title" style={{ marginBottom: 4 }}>Becas y Ayudas</h1>
      <p className="page-subtitle" style={{ marginBottom: 20 }}>
        Postulate a becas disponibles y gestioná tus beneficios
      </p>

      <div className="line-tabs" style={{ marginBottom: 20 }}>
        <button className={`line-tab${tab === 'catalogo' ? ' active' : ''}`} onClick={() => setTab('catalogo')}>
          <i className="ti ti-bookmark" /> Catálogo
        </button>
        <button className={`line-tab${tab === 'postulaciones' ? ' active' : ''}`} onClick={() => setTab('postulaciones')}>
          <i className="ti ti-send" /> Mis Postulaciones
        </button>
        <button className={`line-tab${tab === 'activas' ? ' active' : ''}`} onClick={() => setTab('activas')}>
          <i className="ti ti-award" /> Mis Becas
        </button>
      </div>

      {tab === 'catalogo' && (
        <div>
          {fuentes.length > 1 && (
            <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="mono-label">Filtrar por fuente:</span>
              <select className="input-uca" value={fuenteFilter} onChange={e => setFuenteFilter(e.target.value ? Number(e.target.value) : '')}
                style={{ maxWidth: 200, padding: '6px 10px', fontSize: 12.5 }}>
                <option value="">Todas</option>
                {fuentes.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
              </select>
            </div>
          )}

          {catalogoFiltrado.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
              <i className="ti ti-bookmark-off" style={{ fontSize: 36, color: 'var(--text-muted)' }} />
              <p style={{ marginTop: 10, color: 'var(--text-secondary)', fontSize: 13 }}>
                No hay becas disponibles en este momento.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 14 }}>
              {catalogoFiltrado.map(beca => {
                const yaActiva = becasActivas.some(a => a.beca_nombre === beca.nombre)
                const sinCupos = beca.cupos_disponibles !== null && beca.cupos_disponibles <= 0
                return (
                  <div key={beca.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{beca.nombre}</div>
                        <span className="badge" style={{ background: 'var(--accent-muted)', color: 'var(--accent-bright)' }}>{beca.fuente.nombre}</span>
                      </div>
                      <span style={{ fontSize: 24 }}>{beca.fuente.es_externa ? '🏦' : '🎓'}</span>
                    </div>
                    {beca.requisitos && (
                      <p style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>{beca.requisitos}</p>
                    )}
                    <div style={{ display: 'flex', gap: 16, fontSize: 12.5 }}>
                      <div>
                        <span className="mono-label">Descuento</span>
                        <div style={{ fontWeight: 700 }}>{beca.porcentaje_descuento}%</div>
                      </div>
                      {beca.monto_fijo && (
                        <div>
                          <span className="mono-label">Monto fijo</span>
                          <div style={{ fontWeight: 700 }}>Gs {Number(beca.monto_fijo).toLocaleString()}</div>
                        </div>
                      )}
                      {beca.cupos_disponibles !== null && (
                        <div>
                          <span className="mono-label">Cupos</span>
                          <div style={{ fontWeight: 700 }}>{beca.cupos_disponibles}</div>
                        </div>
                      )}
                    </div>
                    <button className="btn-primary" style={{ width: '100%' }}
                      disabled={yaActiva || sinCupos || postulando === beca.id}
                      onClick={() => handlePostular(beca.id)}>
                      {postulando === beca.id ? <><i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }} /> Postulando...</>
                        : yaActiva ? 'Ya activa'
                        : sinCupos ? 'Sin cupos'
                        : <><i className="ti ti-send" /> Postular</>}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'postulaciones' && <MisPostulacionesTab userId={userId} />}
      {tab === 'activas' && <MisBecasTab userId={userId} />}
    </div>
  )
}

function MisPostulacionesTab({ userId }: { userId: number }) {
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    // Usamos el nuevo endpoint backend /becas/mis-postulaciones que
    // devuelve las postulaciones del alumno autenticado directamente
    api.get<Postulacion[]>('/becas/mis-postulaciones')
      .then((data) => {
        setPostulaciones(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Cargando...</p>
  if (postulaciones.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 48 }}>
        <i className="ti ti-send-off" style={{ fontSize: 36, color: 'var(--text-muted)' }} />
        <p style={{ marginTop: 10, color: 'var(--text-secondary)', fontSize: 13 }}>
          No realizaste ninguna postulación aún.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {postulaciones.map(p => (
        <div key={p.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{p.beca.nombre}</div>
            <div className="mono-label" style={{ fontSize: 10 }}>
              {new Date(p.fecha_postulacion).toLocaleDateString()}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="badge" style={{
              background: p.estado === 'aprobada' ? 'var(--success-subtle)' : p.estado === 'rechazada' ? 'var(--danger-subtle)' : 'var(--warning-subtle)',
              color: p.estado === 'aprobada' ? 'var(--success)' : p.estado === 'rechazada' ? 'var(--danger)' : 'var(--warning)',
            }}>
              {p.estado === 'aprobada' ? 'Aprobada' : p.estado === 'rechazada' ? 'Rechazada' : 'Pendiente'}
            </span>
            {p.motivo_rechazo && <span className="mono-label" style={{ fontSize: 12, maxWidth: 160 }}>{p.motivo_rechazo}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

function MisBecasTab({ userId }: { userId: number }) {
  const [becas, setBecas] = useState<BecaActiva[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    getBecasActivas(userId).then(d => {
      setBecas(d)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [userId])

  if (loading) return <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Cargando...</p>
  if (becas.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 48 }}>
        <i className="ti ti-award-off" style={{ fontSize: 36, color: 'var(--text-muted)' }} />
        <p style={{ marginTop: 10, color: 'var(--text-secondary)', fontSize: 13 }}>
          No tenés becas activas actualmente.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {becas.map(b => (
        <div key={b.id} className="card" style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '16px 20px' }}>
          <div style={{ fontSize: 28 }}>{b.es_externa ? '🏦' : '🎓'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, marginBottom: 2 }}>{b.beca_nombre}</div>
            <div className="mono-label" style={{ fontSize: 10 }}>
              {b.fuente} · {b.periodo_inicio} al {b.periodo_fin || 'Presente'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="badge" style={{
              background: b.estado_renovacion === 'vigente' ? 'var(--success-subtle)' : 'var(--warning-subtle)',
              color: b.estado_renovacion === 'vigente' ? 'var(--success)' : 'var(--warning)',
            }}>
              {b.estado_renovacion === 'vigente' ? 'Vigente' : b.estado_renovacion}
            </div>
            <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16, color: 'var(--accent-bright)' }}>
              {b.porcentaje_descuento}% desc.
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
