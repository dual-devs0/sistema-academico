import { useState, useEffect, useCallback } from 'react'
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

const POLL_MS = 30000

type Tab = 'catalogo' | 'postulaciones' | 'activas'

const badgeBeca = (estado: string) => {
  const m: Record<string, { bg: string; color: string; border: string; icon: string }> = {
    pendiente: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)', icon: 'ti-clock' },
    aprobada: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e', border: 'rgba(34,197,94,0.3)', icon: 'ti-check' },
    rechazada: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'rgba(239,68,68,0.3)', icon: 'ti-x' },
    vigente: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e', border: 'rgba(34,197,94,0.3)', icon: 'ti-shield-check' },
  }
  return m[estado] ?? { bg: 'rgba(148,163,184,0.1)', color: 'var(--text-muted)', border: 'var(--border-light)', icon: 'ti-minus' }
}

export default function BecasAlumno() {
  const user = getCurrentUser()
  const userId = Number(user?.user_id ?? 0)

  const [tab, setTab] = useState<Tab>('catalogo')
  const [catalogo, setCatalogo] = useState<BecaCatalogo[]>([])
  const [becasActivas, setBecasActivas] = useState<BecaActiva[]>([])
  const [fuentes, setFuentes] = useState<FuenteBeca[]>([])
  const [fuenteFilter, setFuenteFilter] = useState<number | ''>('')
  const [postulando, setPostulando] = useState<number | null>(null)
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>([])
  const [loadingCat, setLoadingCat] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const cargarTodo = useCallback((manual = false) => {
    if (manual) setRefreshing(true)
    Promise.allSettled([
      getCatalogoBecas(),
      getFuentes(),
      userId ? getBecasActivas(userId) : Promise.resolve([] as BecaActiva[]),
      userId ? api.get<Postulacion[]>('/becas/mis-postulaciones') : Promise.resolve([] as Postulacion[]),
    ]).then(([cat, fue, act, post]) => {
      const fails: string[] = []
      if (cat.status === 'fulfilled') setCatalogo(cat.value)
      else fails.push('catálogo de becas')
      if (fue.status === 'fulfilled') setFuentes(fue.value)
      else fails.push('fuentes')
      if (act.status === 'fulfilled') setBecasActivas(act.value)
      else fails.push('becas activas')
      if (post.status === 'fulfilled') setPostulaciones(post.value)
      else fails.push('postulaciones')
      setError(fails.length ? `No se pudo cargar: ${fails.join(', ')}. Mostrando último dato disponible.` : '')
      setLastUpdate(new Date())
    }).finally(() => { setLoadingCat(false); setRefreshing(false) })
  }, [userId])

  useEffect(() => {
    const load = () => cargarTodo()
    load()
    const id = setInterval(() => cargarTodo(), POLL_MS)
    return () => clearInterval(id)
  }, [cargarTodo])

  const catalogoFiltrado = fuenteFilter === ''
    ? catalogo
    : catalogo.filter(b => b.fuente_id === fuenteFilter)

  async function handlePostular(becaId: number) {
    setPostulando(becaId)
    try {
      await postularBeca(becaId)
      emitToast('Postulación enviada con éxito')
      cargarTodo(true)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al postular'
      emitToast(msg, 'error')
    } finally {
      setPostulando(null)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Becas y Ayudas</h1>
          <p className="page-subtitle" style={{ marginBottom: 20 }}>
            Postulate a becas disponibles y gestioná tus beneficios
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastUpdate && (
            <span className="mono-label" style={{ fontSize: 11 }}>
              <i className="ti ti-clock" style={{ marginRight: 4 }} />
              {lastUpdate.toLocaleTimeString('es-PY')}
            </span>
          )}
          <button type="button" className="btn-ghost" onClick={() => cargarTodo(true)} disabled={refreshing}>
            <i className={`ti ti-refresh${refreshing ? ' beca-spin' : ''}`} /> {refreshing ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      <style>{`@keyframes beca-spin{to{transform:rotate(360deg)}}.beca-spin{display:inline-block;animation:beca-spin 1s linear infinite}`}</style>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: 12.5, color: 'var(--danger)', marginBottom: 16 }}>
          <i className="ti ti-alert-triangle" /> {error}
        </div>
      )}

      <div className="line-tabs" style={{ marginBottom: 20 }}>
        <button className={`line-tab${tab === 'catalogo' ? ' active' : ''}`} onClick={() => setTab('catalogo')}>
          <i className="ti ti-bookmark" /> Catálogo
        </button>
        <button className={`line-tab${tab === 'postulaciones' ? ' active' : ''}`} onClick={() => setTab('postulaciones')}>
          <i className="ti ti-send" /> Mis Postulaciones
          {postulaciones.length > 0 && <span className="badge" style={{ marginLeft: 6, background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', padding: '1px 8px', fontSize: 10 }}>{postulaciones.length}</span>}
        </button>
        <button className={`line-tab${tab === 'activas' ? ' active' : ''}`} onClick={() => setTab('activas')}>
          <i className="ti ti-award" /> Mis Becas
          {becasActivas.length > 0 && <span className="badge" style={{ marginLeft: 6, background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', padding: '1px 8px', fontSize: 10 }}>{becasActivas.length}</span>}
        </button>
      </div>

      {tab === 'catalogo' && (
        <div>
          {fuentes.length > 1 && (
            <div className="card" style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 16px', marginBottom: 16 }}>
              <i className="ti ti-filter" style={{ color: 'var(--text-muted)', fontSize: 14 }} />
              <span className="mono-label" style={{ fontSize: 10.5 }}>Filtrar por fuente:</span>
              <select className="input-uca" value={fuenteFilter} onChange={e => setFuenteFilter(e.target.value ? Number(e.target.value) : '')}
                style={{ maxWidth: 200, padding: '6px 10px', fontSize: 12.5 }}>
                <option value="">Todas</option>
                {fuentes.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
              </select>
            </div>
          )}

          {loadingCat ? (
            <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>
              <i className="ti ti-loader" style={{ animation: 'beca-spin 1s linear infinite', display: 'inline-block', fontSize: 24, marginBottom: 12 }} />
              <div style={{ fontSize: 13 }}>Cargando becas disponibles…</div>
            </div>
          ) : catalogoFiltrado.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 52 }}>
              <i className="ti ti-bookmark-off" style={{ fontSize: 40, color: 'var(--text-muted)' }} />
              <p style={{ marginTop: 12, color: 'var(--text-secondary)', fontSize: 14 }}>No hay becas disponibles en este momento.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 14 }}>
              {catalogoFiltrado.map(beca => {
                const yaActiva = becasActivas.some(a => a.beca_nombre === beca.nombre)
                const sinCupos = beca.cupos_disponibles !== null && beca.cupos_disponibles <= 0
                return (
                  <div key={beca.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 18, borderLeft: `3px solid ${yaActiva ? '#22c55e' : sinCupos ? '#ef4444' : 'var(--accent-bright)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{beca.nombre}</div>
                        <span className="badge" style={{
                          background: beca.fuente.es_externa ? 'rgba(139,92,246,0.1)' : 'var(--accent-muted)',
                          color: beca.fuente.es_externa ? '#8b5cf6' : 'var(--accent-bright)',
                          border: `1px solid ${beca.fuente.es_externa ? 'rgba(139,92,246,0.3)' : 'var(--accent-hover)'}`,
                          padding: '3px 10px', fontSize: 10.5,
                        }}>
                          <i className={`ti ${beca.fuente.es_externa ? 'ti-building-bank' : 'ti-school'}`} style={{ marginRight: 4, fontSize: 10 }} />
                          {beca.fuente.nombre}
                        </span>
                      </div>
                      <span style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: beca.fuente.es_externa ? 'rgba(139,92,246,0.1)' : 'var(--accent-muted)',
                        color: beca.fuente.es_externa ? '#8b5cf6' : 'var(--accent-bright)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                      }}>
                        <i className={`ti ${beca.fuente.es_externa ? 'ti-building-bank' : 'ti-school'}`} />
                      </span>
                    </div>

                    {beca.requisitos && (
                      <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '8px 12px', fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        <span className="mono-label" style={{ fontSize: 9, marginBottom: 3, display: 'block' }}>REQUISITOS</span>
                        {beca.requisitos}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 80 }}>
                        <span className="mono-label" style={{ fontSize: 9 }}>Descuento</span>
                        <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--accent-bright)' }}>{beca.porcentaje_descuento}%</div>
                      </div>
                      {beca.monto_fijo && (
                        <div style={{ flex: 1, minWidth: 80 }}>
                          <span className="mono-label" style={{ fontSize: 9 }}>Monto fijo</span>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>Gs {Number(beca.monto_fijo).toLocaleString()}</div>
                        </div>
                      )}
                      {beca.cupos_disponibles !== null && (
                        <div style={{ flex: 1, minWidth: 80 }}>
                          <span className="mono-label" style={{ fontSize: 9 }}>Cupos</span>
                          <div style={{ fontWeight: 700, fontSize: 13, color: beca.cupos_disponibles <= 5 ? '#ef4444' : 'var(--text-primary)' }}>{beca.cupos_disponibles}</div>
                        </div>
                      )}
                    </div>

                    <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                      disabled={yaActiva || sinCupos || postulando === beca.id}
                      onClick={() => handlePostular(beca.id)}>
                      {postulando === beca.id
                        ? <><i className="ti ti-loader-2" style={{ animation: 'beca-spin 1s linear infinite' }} /> Postulando…</>
                        : yaActiva ? <><i className="ti ti-shield-check" /> Ya activa</>
                        : sinCupos ? <><i className="ti ti-x" /> Sin cupos</>
                        : <><i className="ti ti-send" /> Postular</>}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'postulaciones' && (
        loadingCat ? (
          <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>
            <i className="ti ti-loader" style={{ animation: 'beca-spin 1s linear infinite', display: 'inline-block', fontSize: 24, marginBottom: 12 }} />
            <div style={{ fontSize: 13 }}>Cargando postulaciones…</div>
          </div>
        ) : postulaciones.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 52 }}>
            <i className="ti ti-send-off" style={{ fontSize: 40, color: 'var(--text-muted)' }} />
            <p style={{ marginTop: 12, color: 'var(--text-secondary)', fontSize: 14 }}>No realizaste ninguna postulación aún.</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Explorá el catálogo de becas disponibles para postularte.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{postulaciones.length} postulaciones</span>
            </div>
            {postulaciones.map(p => {
              const b = badgeBeca(p.estado)
              return (
                <div key={p.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', transition: 'border-color .15s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: b.bg, color: b.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
                    }}>
                      <i className={`ti ${b.icon}`} />
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{p.beca.nombre}</div>
                      <div className="mono-label" style={{ fontSize: 10, marginTop: 2 }}>
                        <i className="ti ti-calendar" style={{ marginRight: 3, fontSize: 9 }} />
                        {new Date(p.fecha_postulacion).toLocaleDateString('es-PY', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {p.motivo_rechazo && <span className="mono-label" style={{ fontSize: 11, maxWidth: 160, color: '#ef4444' }}>{p.motivo_rechazo}</span>}
                    <span className="badge" style={{ background: b.bg, color: b.color, border: `1px solid ${b.border}`, padding: '4px 14px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                      <i className={`ti ${b.icon}`} style={{ marginRight: 4, fontSize: 10 }} />
                      {p.estado === 'aprobada' ? 'Aprobada' : p.estado === 'rechazada' ? 'Rechazada' : 'Pendiente'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {tab === 'activas' && (
        loadingCat ? (
          <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>
            <i className="ti ti-loader" style={{ animation: 'beca-spin 1s linear infinite', display: 'inline-block', fontSize: 24, marginBottom: 12 }} />
            <div style={{ fontSize: 13 }}>Cargando becas activas…</div>
          </div>
        ) : becasActivas.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 52 }}>
            <i className="ti ti-award-off" style={{ fontSize: 40, color: 'var(--text-muted)' }} />
            <p style={{ marginTop: 12, color: 'var(--text-secondary)', fontSize: 14 }}>No tenés becas activas actualmente.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {becasActivas.map(b => {
              const bb = badgeBeca(b.estado_renovacion)
              const desc = Number(b.porcentaje_descuento)
              return (
                <div key={b.id} className="card" style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '16px 18px', borderLeft: `3px solid ${desc >= 50 ? '#22c55e' : desc >= 25 ? 'var(--accent-bright)' : '#f59e0b'}` }}>
                  <span style={{
                    width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                    background: b.es_externa ? 'rgba(139,92,246,0.1)' : 'var(--accent-muted)',
                    color: b.es_externa ? '#8b5cf6' : 'var(--accent-bright)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                  }}>
                    <i className={`ti ${b.es_externa ? 'ti-building-bank' : 'ti-award'}`} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 1 }}>{b.beca_nombre}</div>
                    <div className="mono-label" style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <i className="ti ti-building" style={{ fontSize: 9 }} />{b.fuente}
                      <span style={{ color: 'var(--border-light)', margin: '0 4px' }}>|</span>
                      <i className="ti ti-calendar" style={{ fontSize: 9 }} />
                      {b.periodo_inicio} al {b.periodo_fin || 'Presente'}
                    </div>
                    {b.promedio_actual && (
                      <div className="progress-track" style={{ marginTop: 6, height: 4, maxWidth: 200 }}>
                        <div className="progress-fill" style={{ width: `${Math.min(100, Number(b.promedio_actual) / Number(b.promedio_minimo_requerido || 5) * 100)}%`, height: 4, background: Number(b.promedio_actual) >= Number(b.promedio_minimo_requerido || 0) ? '#22c55e' : undefined }} />
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span className="badge" style={{ background: bb.bg, color: bb.color, border: `1px solid ${bb.border}`, padding: '4px 12px', fontSize: 10.5, fontWeight: 700 }}>
                      <i className={`ti ${bb.icon}`} style={{ marginRight: 3, fontSize: 9 }} />
                      {b.estado_renovacion === 'vigente' ? 'Vigente' : b.estado_renovacion}
                    </span>
                    <div style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: 20, color: desc >= 50 ? '#22c55e' : 'var(--accent-bright)' }}>
                      {desc}% <span className="mono-label" style={{ fontSize: 9 }}>desc.</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
