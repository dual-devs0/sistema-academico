import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, getCurrentUser, emitToast } from '../lib/api'
import { obtenerMiHistorico, type PeriodoHistorico } from '../services/historicoService'
import { obtenerMiAgenda, crearRecordatorio, actualizarRecordatorio, type ItemAgenda } from '../services/agendaService'

interface MateriaApi { id: number; nombre: string; carrera_id: number | null; carrera_nombre: string | null }
interface Subject { id: number; code: string; name: string; students: number; attendance: number }
interface Career { name: string; icon: string; subjects: Subject[] }

type Tab = 'activas' | 'historico' | 'agenda'

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function SubjectCard({ subject, onVerNotas, onVerAsistencia, onVerPrograma }: {
  subject: Subject
  onVerNotas: () => void
  onVerAsistencia: () => void
  onVerPrograma: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="card"
      style={{
        padding: 24, display: 'flex', flexDirection: 'column',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered ? '0 10px 30px -10px var(--accent-muted)' : 'none',
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        border: hovered ? '1px solid var(--accent-muted)' : undefined,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <p className="mono-label" style={{ color: 'var(--accent-bright)', marginBottom: 4, fontSize: 11 }}>{subject.code}</p>
          <h4 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>{subject.name}</h4>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, marginBottom: 24 }}>
        {[
          { label: 'Alumnos', value: subject.students.toString() },
          { label: 'Asistencia', value: `${subject.attendance}%`, border: true },
        ].map(stat => (
          <div key={stat.label} style={{ textAlign: 'center', borderLeft: stat.border ? '1px solid var(--border-subtle)' : 'none', padding: '0 4px' }}>
            <p className="mono-label" style={{ marginBottom: 4 }}>{stat.label}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600, color: 'var(--accent-bright)' }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 'auto', flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1, fontSize: 12.5 }} onClick={onVerNotas}><i className="ti ti-pencil" /> Notas</button>
        <button className="btn-ghost" style={{ flex: 1, fontSize: 12.5 }} onClick={onVerAsistencia}><i className="ti ti-qrcode" /> Asistencia</button>
        <button className="btn-ghost" style={{ flex: 1, fontSize: 12.5 }} onClick={onVerPrograma}><i className="ti ti-notebook" /> Programa</button>
      </div>
    </div>
  )
}

function inicioSemana(d: Date) {
  const dia = (d.getDay() + 6) % 7 // 0=lunes
  const r = new Date(d)
  r.setDate(d.getDate() - dia)
  r.setHours(0, 0, 0, 0)
  return r
}
function fmt(d: Date) { return d.toISOString().slice(0, 10) }

export default function MisMaterias() {
  const navigate = useNavigate()
  const user = getCurrentUser()
  const [tab, setTab] = useState<Tab>('activas')

  // ── Activas ──
  const [fabHovered, setFabHovered] = useState(false)
  const [careers, setCareers] = useState<Career[]>([])
  const [loadingActivas, setLoadingActivas] = useState(true)

  useEffect(() => {
    if (!user?.user_id) { setLoadingActivas(false); return }
    api.get<MateriaApi[]>(`/materias/?profesor_id=${user.user_id}`).then(async materias => {
      const bySubject = await Promise.all(materias.map(async m => {
        const alumnos = await api.get<any[]>(`/asistencias/materia/${m.id}/alumnos`).catch(() => [] as any[])
        const attendance = alumnos.length
          ? Math.round(alumnos.reduce((s, a) => s + (a.porcentaje ?? 0), 0) / alumnos.length)
          : 0
        return {
          id: m.id, code: `MAT-${String(m.id).padStart(3, '0')}`, name: m.nombre,
          students: alumnos.length, attendance, carrera: m.carrera_nombre || 'General',
        }
      }))
      const grouped = new Map<string, Subject[]>()
      for (const s of bySubject) {
        const list = grouped.get(s.carrera) || []
        list.push({ id: s.id, code: s.code, name: s.name, students: s.students, attendance: s.attendance })
        grouped.set(s.carrera, list)
      }
      setCareers([...grouped.entries()].map(([name, subjects]) => ({ name, icon: 'ti-terminal-2', subjects })))
    }).finally(() => setLoadingActivas(false))
  }, [])

  // ── Histórico ──
  const [historico, setHistorico] = useState<PeriodoHistorico[]>([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  useEffect(() => {
    if (tab !== 'historico') return
    setLoadingHistorico(true)
    obtenerMiHistorico().then(setHistorico).catch(() => setHistorico([])).finally(() => setLoadingHistorico(false))
  }, [tab])

  // ── Agenda ──
  const [semanaInicio, setSemanaInicio] = useState(() => inicioSemana(new Date()))
  const [items, setItems] = useState<ItemAgenda[]>([])
  const [loadingAgenda, setLoadingAgenda] = useState(false)
  const [nuevoRecOpen, setNuevoRecOpen] = useState<string | null>(null) // fecha del dia clickeado
  const [recDraft, setRecDraft] = useState({ titulo: '', descripcion: '' })

  const semanaFin = useMemo(() => { const f = new Date(semanaInicio); f.setDate(f.getDate() + 6); return f }, [semanaInicio])

  function cargarAgenda() {
    setLoadingAgenda(true)
    obtenerMiAgenda(fmt(semanaInicio), fmt(semanaFin))
      .then(res => setItems(res.items))
      .catch(() => setItems([]))
      .finally(() => setLoadingAgenda(false))
  }
  useEffect(() => { if (tab === 'agenda') cargarAgenda() }, [tab, semanaInicio])

  const itemsPorDia = useMemo(() => {
    const m: Record<string, ItemAgenda[]> = {}
    for (const it of items) {
      const key = it.fecha.slice(0, 10)
      if (!m[key]) m[key] = []
      m[key].push(it)
    }
    return m
  }, [items])

  async function toggleRecordatorio(it: ItemAgenda) {
    if (!it.id) return
    try {
      await actualizarRecordatorio(it.id, { completado: !it.completado })
      cargarAgenda()
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al actualizar recordatorio', 'error')
    }
  }

  async function guardarRecordatorio() {
    if (!nuevoRecOpen || !recDraft.titulo.trim()) return
    try {
      await crearRecordatorio({ titulo: recDraft.titulo.trim(), descripcion: recDraft.descripcion || null, fecha: `${nuevoRecOpen}T09:00:00` })
      setNuevoRecOpen(null)
      setRecDraft({ titulo: '', descripcion: '' })
      cargarAgenda()
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al crear recordatorio', 'error')
    }
  }

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 28 }}>Mis Materias</h1>
          <p className="page-subtitle">Cátedras activas, histórico docente y agenda personal.</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {([['activas', 'Activas'], ['historico', 'Histórico'], ['agenda', 'Agenda']] as [Tab, string][]).map(([t, l]) => (
            <button key={t} className="btn-ghost" style={{
              padding: '6px 14px', fontSize: 12, fontWeight: 700,
              background: tab === t ? 'var(--accent-muted)' : undefined,
              borderColor: tab === t ? 'var(--accent-hover)' : undefined,
              color: tab === t ? 'var(--accent)' : undefined,
            }} onClick={() => setTab(t)}>{l}</button>
          ))}
        </div>
      </div>

      {/* ── ACTIVAS ── */}
      {tab === 'activas' && (
        loadingActivas ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Cargando materias…</div>
        ) : careers.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 46 }}>
            <i className="ti ti-books-off" style={{ fontSize: 36, color: 'var(--text-muted)' }} />
            <p style={{ marginTop: 10, color: 'var(--text-secondary)', fontSize: 13 }}>El administrador aún no te asignó materias.</p>
          </div>
        ) : <>
          {careers.map(career => (
            <div key={career.name} style={{ marginBottom: 40 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <div style={{ padding: 8, borderRadius: 8, background: 'var(--accent-muted)', border: '1px solid var(--accent-muted)' }}>
                  <i className={`ti ${career.icon}`} style={{ color: 'var(--accent-bright)', fontSize: 20, display: 'block' }} />
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{career.name}</h3>
                <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)', marginLeft: 12 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                {career.subjects.map(subject => (
                  <SubjectCard
                    key={subject.id}
                    subject={subject}
                    onVerNotas={() => navigate(`/puntajes?materia_id=${subject.id}`)}
                    onVerAsistencia={() => navigate(`/asistencia?materia_id=${subject.id}`)}
                    onVerPrograma={() => navigate(`/programa?materia_id=${subject.id}`)}
                  />
                ))}
              </div>
            </div>
          ))}
          <button
            onMouseEnter={() => setFabHovered(true)} onMouseLeave={() => setFabHovered(false)}
            onClick={() => emitToast('Contactá al administrador para solicitar una nueva materia', 'warning')}
            className="fab" style={{ transform: fabHovered ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.2s' }}
          >
            <i className="ti ti-plus" style={{ fontSize: 28 }} />
          </button>
        </>
      )}

      {/* ── HISTÓRICO ── */}
      {tab === 'historico' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loadingHistorico ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>Cargando histórico…</div>
          ) : historico.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Todavía no tenés cátedras dictadas en períodos anteriores.
            </div>
          ) : historico.map(p => (
            <div key={p.periodo} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ padding: '12px 18px', background: 'var(--bg-elevated)', fontWeight: 800, fontSize: 13 }}>{p.periodo}</div>
              <table className="table-uca">
                <thead>
                  <tr><th>Materia</th><th>Carrera</th><th style={{ textAlign: 'center' }}>Alumnos</th><th style={{ textAlign: 'center' }}>Promedio</th><th style={{ textAlign: 'center' }}>% Aprobación</th></tr>
                </thead>
                <tbody>
                  {p.catedras.map(c => (
                    <tr key={c.materia_id}>
                      <td style={{ fontWeight: 600 }}>{c.materia_nombre}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{c.carrera_nombre ?? '—'}</td>
                      <td style={{ textAlign: 'center' }}>{c.cantidad_alumnos}</td>
                      <td style={{ textAlign: 'center', color: 'var(--accent)', fontWeight: 700 }}>{c.promedio_grupo ?? '—'}</td>
                      <td style={{ textAlign: 'center' }}>{c.porcentaje_aprobacion !== null ? `${c.porcentaje_aprobacion}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* ── AGENDA ── */}
      {tab === 'agenda' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid var(--border-subtle)' }}>
            <button className="btn-ghost" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => setSemanaInicio(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })}>← Semana anterior</button>
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>{fmt(semanaInicio)} — {fmt(semanaFin)}</span>
            <button className="btn-ghost" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => setSemanaInicio(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })}>Semana siguiente →</button>
          </div>
          {loadingAgenda ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>Cargando agenda…</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: 'var(--border-subtle)' }}>
              {DIAS.map((nombreDia, i) => {
                const fecha = new Date(semanaInicio); fecha.setDate(fecha.getDate() + i)
                const key = fmt(fecha)
                const delDia = (itemsPorDia[key] || []).sort((a, b) => (a.hora_inicio || '').localeCompare(b.hora_inicio || ''))
                return (
                  <div key={key} style={{ background: 'var(--bg-surface)', minHeight: 160, padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div className="mono-label" style={{ fontSize: 9.5 }}>{nombreDia} <span style={{ opacity: 0.6 }}>{key.slice(5)}</span></div>
                    {delDia.map((it, idx) => (
                      <div key={idx} style={{
                        fontSize: 10.5, padding: '5px 7px', borderRadius: 6,
                        background: it.tipo === 'clase' ? 'var(--accent-muted)' : it.tipo === 'evento' ? 'rgba(245,158,11,0.14)' : 'var(--bg-elevated)',
                        color: it.tipo === 'clase' ? 'var(--accent)' : it.tipo === 'evento' ? 'var(--warning)' : 'var(--text-secondary)',
                      }}>
                        {it.tipo === 'clase' && <><b>{it.hora_inicio?.slice(0, 5)}</b> {it.materia_nombre}</>}
                        {it.tipo === 'evento' && <>📌 {it.titulo}</>}
                        {it.tipo === 'recordatorio' && (
                          <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                            <input type="checkbox" checked={!!it.completado} onChange={() => toggleRecordatorio(it)} style={{ accentColor: 'var(--accent)' }} />
                            <span style={{ textDecoration: it.completado ? 'line-through' : 'none' }}>{it.titulo}</span>
                          </label>
                        )}
                      </div>
                    ))}
                    <button className="btn-ghost" style={{ marginTop: 'auto', fontSize: 9.5, padding: '4px 6px' }} onClick={() => setNuevoRecOpen(key)}>+ Recordatorio</button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {nuevoRecOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card card-elevated" style={{ width: '100%', maxWidth: 380 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>Nuevo Recordatorio — {nuevoRecOpen}</h3>
              <button onClick={() => setNuevoRecOpen(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><i className="ti ti-x" /></button>
            </div>
            <div className="mono-label" style={{ marginBottom: 6 }}>Título</div>
            <input className="input-uca" value={recDraft.titulo} onChange={e => setRecDraft(d => ({ ...d, titulo: e.target.value }))} style={{ marginBottom: 12 }} autoFocus />
            <div className="mono-label" style={{ marginBottom: 6 }}>Descripción (opcional)</div>
            <input className="input-uca" value={recDraft.descripcion} onChange={e => setRecDraft(d => ({ ...d, descripcion: e.target.value }))} style={{ marginBottom: 18 }} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setNuevoRecOpen(null)}>Cancelar</button>
              <button className="btn-primary" onClick={guardarRecordatorio}>Crear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
