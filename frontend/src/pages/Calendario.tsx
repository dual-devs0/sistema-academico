import { useState, useEffect } from 'react'
import { api, emitToast, decodeToken } from '../lib/api'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

type TipoEvento = 'parcial' | 'final' | 'feriado' | 'asueto' | 'entrega' | 'actividad'
type Evento = { id?: number; titulo: string; tipo: TipoEvento; fecha: string; fecha_fin?: string | null; descripcion?: string | null; materia_id?: number | null }

const tipoCfg: Record<TipoEvento, { color: string; bg: string; label: string; badge: string }> = {
  parcial:   { color: '#f87171', bg: 'rgba(239,68,68,0.15)', label: 'Parcial', badge: 'URGENTE' },
  final:     { color: '#ef4444', bg: 'rgba(239,68,68,0.20)', label: 'Final', badge: 'URGENTE' },
  entrega:   { color: '#fbbf24', bg: 'rgba(245,158,11,0.15)', label: 'Entrega', badge: 'ENTREGA' },
  feriado:   { color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', label: 'Feriado', badge: 'FERIADO' },
  asueto:    { color: '#34d399', bg: 'rgba(16,185,129,0.15)', label: 'Asueto', badge: 'SOCIAL' },
  actividad: { color: 'var(--accent-bright)', bg: 'var(--accent-muted)', label: 'Clase', badge: 'CLASE' },
}

const css = `
  .cal-grid-page { display:grid; grid-template-columns:1fr 280px; gap:18px; align-items:start; }
  .cal-month { display:grid; grid-template-columns:repeat(7,1fr); gap:4px; }
  .cal-dia-lbl { text-align:center; font-family:var(--font-mono); font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; padding:6px 0; }
  .cal-cell {
    min-height:86px; border-radius:10px; padding:6px; cursor:pointer;
    background:var(--bg-input); border:1px solid transparent; transition:all .12s;
    display:flex; flex-direction:column; gap:3px; overflow:hidden;
  }
  .cal-cell:hover { border-color:var(--border-light); }
  .cal-cell.fuera { opacity:.28; pointer-events:none; }
  .cal-cell.hoy { border-color:var(--accent); }
  .cal-cell.sel { background:var(--bg-elevated); border-color:var(--accent-bright); }
  .cal-num { font-family:var(--font-mono); font-size:11px; font-weight:700; color:var(--text-secondary); }
  .cal-chip {
    font-size:9px; font-weight:700; border-radius:4px; padding:2px 5px;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    border-left:2px solid;
  }
  .prox-item { border-radius:12px; background:var(--bg-elevated); padding:11px 13px; margin-bottom:10px; }
  .cal-timeline { display:none; }
  @media(max-width:1024px){ .cal-grid-page { grid-template-columns:1fr; } }
  @media(max-width:768px){
    .cal-month-card { display:none; }
    .cal-timeline { display:block; }
  }
`

function dateKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export default function Calendario() {
  const hoy = new Date()
  const [actual, setActual] = useState(new Date(hoy.getFullYear(), hoy.getMonth(), 1))
  const [eventos, setEventos] = useState<Evento[]>([])
  const [selDia, setSelDia] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [draft, setDraft] = useState<Evento>({ titulo: '', tipo: 'actividad', fecha: hoy.toISOString().slice(0, 10), descripcion: '' })
  const [saving, setSaving] = useState(false)
  const role = decodeToken(sessionStorage.getItem('token') || '')?.role

  function cargar() {
    api.get<Evento[]>('/eventos/').then(setEventos).catch(() => {})
  }
  useEffect(cargar, [])

  const y = actual.getFullYear(), m = actual.getMonth()
  const primerDia = (new Date(y, m, 1).getDay() + 6) % 7 // lunes=0
  const diasMes = new Date(y, m + 1, 0).getDate()
  const celdas: { d: number; fuera: boolean; key: string }[] = []
  const prevDias = new Date(y, m, 0).getDate()
  for (let i = primerDia - 1; i >= 0; i--) celdas.push({ d: prevDias - i, fuera: true, key: '' })
  for (let d = 1; d <= diasMes; d++) celdas.push({ d, fuera: false, key: dateKey(y, m, d) })
  while (celdas.length % 7 !== 0) celdas.push({ d: celdas.length, fuera: true, key: '' })

  const porDia = (k: string) => eventos.filter(e => e.fecha === k)
  const hoyKey = dateKey(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const proximos = [...eventos].filter(e => e.fecha >= hoyKey).sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 5)
  const delMes = eventos.filter(e => e.fecha.startsWith(`${y}-${String(m + 1).padStart(2, '0')}`)).sort((a, b) => a.fecha.localeCompare(b.fecha))

  async function guardarEvento() {
    if (!draft.titulo || !draft.fecha) { emitToast('Completá título y fecha', 'warning'); return }
    setSaving(true)
    try {
      await api.post('/eventos/', { titulo: draft.titulo, tipo: draft.tipo, fecha: draft.fecha, descripcion: draft.descripcion || null })
      emitToast('Evento agendado')
      setModalOpen(false)
      setDraft({ titulo: '', tipo: 'actividad', fecha: hoy.toISOString().slice(0, 10), descripcion: '' })
      cargar()
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al crear evento', 'error')
    } finally { setSaving(false) }
  }

  return (
    <>
      <style>{css}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <h1 className="page-title">{MESES[m]} {y}</h1>
          <span className="badge" style={{ background: 'var(--accent-muted)', color: 'var(--accent-bright)' }}>
            <i className="ti ti-sparkles" /> {delMes.length} eventos este mes
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={() => setActual(new Date(y, m - 1, 1))} aria-label="Mes anterior"><i className="ti ti-chevron-left" /></button>
          <button className="btn-ghost" onClick={() => setActual(new Date(hoy.getFullYear(), hoy.getMonth(), 1))}>Hoy</button>
          <button className="btn-ghost" onClick={() => setActual(new Date(y, m + 1, 1))} aria-label="Mes siguiente"><i className="ti ti-chevron-right" /></button>
          <button className="btn-ghost" onClick={() => emitToast('Sincronización — próximamente', 'warning')}><i className="ti ti-refresh" /> Sincronizar</button>
        </div>
      </div>

      <div className="cal-grid-page">
        <div>
          {/* Grid mensual desktop */}
          <div className="card cal-month-card" style={{ padding: 14 }}>
            <div className="cal-month" style={{ marginBottom: 4 }}>
              {DIAS.map(d => <div key={d} className="cal-dia-lbl">{d}</div>)}
            </div>
            <div className="cal-month">
              {celdas.map((c, i) => {
                const evs = c.key ? porDia(c.key) : []
                return (
                  <div key={i}
                    className={`cal-cell${c.fuera ? ' fuera' : ''}${c.key === hoyKey ? ' hoy' : ''}${c.key === selDia ? ' sel' : ''}`}
                    onClick={() => !c.fuera && setSelDia(c.key === selDia ? null : c.key)}>
                    <span className="cal-num" style={c.key === hoyKey ? { color: 'var(--accent-bright)' } : undefined}>{c.d}</span>
                    {evs.slice(0, 2).map(e => {
                      const cfg = tipoCfg[e.tipo] ?? tipoCfg.actividad
                      return <span key={e.id} className="cal-chip" style={{ background: cfg.bg, color: cfg.color, borderLeftColor: cfg.color }}>{cfg.label}: {e.titulo}</span>
                    })}
                    {evs.length > 2 && <span className="mono-label" style={{ fontSize: 8.5 }}>+{evs.length - 2} más</span>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Timeline mobile */}
          <div className="cal-timeline">
            {delMes.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>Sin eventos este mes.</div>
            ) : delMes.map(e => {
              const cfg = tipoCfg[e.tipo] ?? tipoCfg.actividad
              return (
                <div key={e.id} className="card" style={{ padding: '12px 16px', marginBottom: 10, borderLeft: `3px solid ${cfg.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span className="badge" style={{ background: cfg.bg, color: cfg.color }}>{cfg.badge}</span>
                    <span className="mono-label">{e.fecha.slice(8, 10)}/{e.fecha.slice(5, 7)}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{e.titulo}</div>
                  {e.descripcion && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{e.descripcion}</div>}
                </div>
              )
            })}
          </div>

          {/* Detalle día seleccionado */}
          {selDia && (
            <div className="card" style={{ marginTop: 14 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>
                Eventos del {selDia.slice(8, 10)}/{selDia.slice(5, 7)}
              </h3>
              {porDia(selDia).length === 0 ? (
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Sin eventos. Usá "Agendar Evento" para crear uno.</p>
              ) : porDia(selDia).map(e => {
                const cfg = tipoCfg[e.tipo] ?? tipoCfg.actividad
                return (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{e.titulo}</div>
                      {e.descripcion && <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{e.descripcion}</div>}
                    </div>
                    <span className="badge" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Panel derecho */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card">
            <div className="mono-label" style={{ marginBottom: 10 }}>Sincronización <i className="ti ti-refresh" style={{ float: 'right' }} /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                <i className="ti ti-brand-google" style={{ color: 'var(--accent-bright)' }} />
              </span>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>Google Calendar</div>
                <div className="mono-label" style={{ fontSize: 9 }}>Última sinc: —</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800 }}>Próximos</h3>
              <span className="mono-label" style={{ color: 'var(--accent-bright)', cursor: 'pointer' }}>Ver todo</span>
            </div>
            {proximos.length === 0 ? (
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Sin eventos próximos.</p>
            ) : proximos.map(e => {
              const cfg = tipoCfg[e.tipo] ?? tipoCfg.actividad
              return (
                <div key={e.id} className="prox-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <span className="badge" style={{ background: cfg.bg, color: cfg.color }}>{cfg.badge}</span>
                    <span className="mono-label" style={{ fontSize: 9 }}>{e.fecha.slice(8, 10)}/{e.fecha.slice(5, 7)}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{e.titulo}</div>
                  {e.descripcion && <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>{e.descripcion}</div>}
                </div>
              )
            })}
          </div>

          <button className="card" onClick={() => setModalOpen(true)}
            style={{ cursor: 'pointer', textAlign: 'center', borderStyle: 'dashed', color: 'var(--text-secondary)' }}>
            <i className="ti ti-circle-plus" style={{ fontSize: 24, display: 'block', marginBottom: 6, color: 'var(--accent-bright)' }} />
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Agendar Evento</span>
            <div style={{ fontSize: 11.5, marginTop: 3 }}>Presiona para crear un nuevo recordatorio</div>
          </button>

          {(role === 'admin' || role === 'profesor') && (
            <div className="card" style={{ padding: '14px 16px' }}>
              <div className="mono-label" style={{ marginBottom: 6 }}>Carga automática (PDF)</div>
              <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Subí el PDF del semestre vía <code style={{ color: 'var(--accent-bright)' }}>POST /eventos/cargar-pdf</code> (requiere GEMINI_API_KEY en backend/.env).
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal agendar */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card card-elevated" style={{ width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>Agendar Evento</h3>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><i className="ti ti-x" /></button>
            </div>
            <div className="mono-label" style={{ marginBottom: 6 }}>Título</div>
            <input className="input-uca" value={draft.titulo} onChange={e => setDraft(d => ({ ...d, titulo: e.target.value }))} style={{ marginBottom: 12 }} autoFocus />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <div className="mono-label" style={{ marginBottom: 6 }}>Tipo</div>
                <select className="input-uca" value={draft.tipo} onChange={e => setDraft(d => ({ ...d, tipo: e.target.value as TipoEvento }))}>
                  {Object.entries(tipoCfg).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <div className="mono-label" style={{ marginBottom: 6 }}>Fecha</div>
                <input className="input-uca" type="date" value={draft.fecha} onChange={e => setDraft(d => ({ ...d, fecha: e.target.value }))} />
              </div>
            </div>
            <div className="mono-label" style={{ marginBottom: 6 }}>Descripción</div>
            <input className="input-uca" value={draft.descripcion ?? ''} onChange={e => setDraft(d => ({ ...d, descripcion: e.target.value }))} style={{ marginBottom: 18 }} placeholder="Aula, materia, detalle…" />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" disabled={saving} onClick={guardarEvento}>{saving ? 'Guardando…' : 'Agendar'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
