import { useState, useEffect } from 'react'
import { decodeToken, emitToast } from '../lib/api'
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
  const token = sessionStorage.getItem('token')
  const user = token ? decodeToken(token) : null
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
      <style>{`
        .bc-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:14px; }
        .bc-card { background:var(--bg-elevated); border:1px solid var(--border-subtle); border-radius:14px; padding:18px 20px; }
        .bc-card:hover { border-color:var(--accent-hover); }
        .bc-icon { font-size:24px; }
        .bc-muted { color:var(--text-muted); font-size:11.5px; }
        .bc-tag { display:inline-block; background:var(--accent-muted); color:var(--accent-bright); font-family:var(--font-mono); font-size:9.5px; font-weight:700; border-radius:999px; padding:3px 10px; }
      `}</style>

      <h1 className="page-title" style={{ marginBottom: 4 }}>Becas y Ayudas</h1>
      <p className="page-subtitle" style={{ marginBottom: 20 }}>
        Postulate a becas disponibles y gestiona tus beneficios
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
            <div className="bc-grid">
              {catalogoFiltrado.map(beca => {
                const yaActiva = becasActivas.some(a => a.beca_nombre === beca.nombre)
                const sinCupos = beca.cupos_disponibles !== null && beca.cupos_disponibles <= 0
                return (
                  <div key={beca.id} className="bc-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{beca.nombre}</div>
                        <span className="bc-tag">{beca.fuente.nombre}</span>
                      </div>
                      <span className="bc-icon">{beca.fuente.es_externa ? '🏦' : '🎓'}</span>
                    </div>
                    {beca.requisitos && (
                      <p className="bc-muted" style={{ marginBottom: 8 }}>{beca.requisitos}</p>
                    )}
                    <div style={{ display: 'flex', gap: 16, marginBottom: 14, fontSize: 12.5 }}>
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
    if (!userId) return
    getBecasActivas(userId).then(activas => {
      const fuenteIds = [...new Set(activas.map(a => a.id))]
      Promise.all(fuenteIds.map(id =>
        getCatalogoBecas().then(cat => cat.filter(b => b.id === id))
      )).then(() => {
        getCatalogoBecas().then(catalogo => {
          const todas: Postulacion[] = []
          Promise.all(catalogo.map(b =>
            fetch(`/api/becas/postulaciones?fuente_id=${b.fuente_id}`, {
              headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
            }).then(r => r.ok ? r.json() : [])
              .then((posts: Postulacion[]) => posts.filter((p: Postulacion) => p.alumno_id === userId))
              .then(posts => todas.push(...posts))
          )).then(() => {
            todas.sort((a, b) => new Date(b.fecha_postulacion).getTime() - new Date(a.fecha_postulacion).getTime())
            setPostulaciones(todas)
            setLoading(false)
          })
        })
      })
    }).catch(() => setLoading(false))
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
            <span className={`badge ${p.estado === 'aprobada' ? '' : p.estado === 'rechazada' ? '' : ''}`}
              style={{
                background: p.estado === 'aprobada' ? 'rgba(16,185,129,0.12)' : p.estado === 'rechazada' ? 'rgba(239,68,68,0.12)' : 'rgba(234,179,8,0.12)',
                color: p.estado === 'aprobada' ? '#10b981' : p.estado === 'rechazada' ? '#ef4444' : '#eab308',
              }}>
              {p.estado === 'aprobada' ? 'Aprobada' : p.estado === 'rechazada' ? 'Rechazada' : 'Pendiente'}
            </span>
            {p.motivo_rechazo && <span className="mono-label" style={{ fontSize: 9, maxWidth: 160 }}>{p.motivo_rechazo}</span>}
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
            <div className="badge" style={{ background: b.estado_renovacion === 'vigente' ? 'rgba(16,185,129,0.12)' : 'rgba(234,179,8,0.12)', color: b.estado_renovacion === 'vigente' ? '#10b981' : '#eab308' }}>
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
