import { useState, useEffect, useCallback } from 'react'
import { emitToast } from '../lib/api'
import {
  listarUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario,
  obtenerStatsUsuarios, listarCarreras,
  type UsersStats, type Usuario, type Carrera,
} from '../services/usersService'
import TablaPaginada, { type ColumnaTabla } from '../components/common/TablaPaginada'

type Rol = 'alumno' | 'profesor' | 'admin'

const rolCfg: Record<string, { color: string; bg: string; label: string }> = {
  alumno:   { color: 'var(--accent-bright)', bg: 'var(--accent-muted)', label: 'ALUMNO' },
  profesor: { color: '#fdba74', bg: 'rgba(251,146,60,0.14)', label: 'PROFESOR' },
  admin:    { color: '#fbbf24', bg: 'rgba(245,158,11,0.14)', label: 'ADMIN' },
}

const css = `
  .us-filtros { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:18px; }
  .us-filtro { background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:12px; padding:12px 16px; }
  .us-bottom { display:grid; grid-template-columns:1.4fr 1fr; gap:16px; margin-top:18px; }
  .us-chips { display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap; }
  .us-chip {
    display:flex; align-items:center; gap:8px; padding:8px 16px; border-radius:100px;
    border:1px solid var(--border-subtle); background:var(--bg-surface); cursor:pointer;
    transition:all .15s; font-size:13px; font-weight:600;
  }
  .us-chip:hover { border-color:var(--accent-hover); }
  .us-chip.active { background:var(--accent-muted); border-color:var(--accent); color:var(--accent-bright); }
  .us-chip i { font-size:16px; }
  select.input-uca, select { color:var(--text-primary); background:var(--bg-surface); }
  select.input-uca option, select option { background:var(--bg-elevated); color:var(--text-primary); padding:8px 12px; }
  .donut-ring { position:relative; display:inline-flex; align-items:center; justify-content:center; }
  .toggle-switch {
    position:relative; width:40px; height:22px; border-radius:11px; cursor:pointer;
    transition:background .2s; border:none; flex-shrink:0;
  }
  .toggle-switch::after {
    content:''; position:absolute; top:2px; left:2px; width:18px; height:18px;
    border-radius:50%; background:#fff; transition:transform .2s;
  }
  .toggle-switch.on { background:var(--accent); }
  .toggle-switch.on::after { transform:translateX(18px); }
  .toggle-switch.off { background:var(--bg-elevated); }
  .trend-up { color:var(--success); }
  .trend-down { color:var(--danger); }
  .spinning { animation:spin 1s linear infinite; display:inline-block; }
  @keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
  @media(max-width:900px){ .us-filtros { grid-template-columns:1fr 1fr; } .us-bottom { grid-template-columns:1fr; } }
`

const PAGE_SIZE = 10

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function timeAgo(d: string | null): string {
  if (!d) return '—'
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000)
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  if (days < 7) return `Hace ${days} días`
  if (days < 30) return `Hace ${Math.floor(days / 7)} sem.`
  if (days < 365) return `Hace ${Math.floor(days / 30)} meses`
  return `Hace ${Math.floor(days / 365)} años`
}

function DonutChart({ segments, size = 160 }: {
  segments: { value: number; color: string; label: string }[]
  size?: number
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  const radius = size * 0.38
  const circ = 2 * Math.PI * radius
  return (
    <div className="donut-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {segments.map((s, i) => {
          const pct = s.value / total
          const dash = pct * circ
          const o = segments.slice(0, i).reduce((sum, ps) => sum + (ps.value / total) * circ, 0)
          return pct > 0 ? (
            <circle key={i} cx={size / 2} cy={size / 2} r={radius}
              fill="none" stroke={s.color} strokeWidth={size * 0.1}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-o}
              strokeLinecap="round"
            />
          ) : null
        })}
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--bg-elevated)" strokeWidth={size * 0.1}
          strokeDasharray={circ} strokeDashoffset={0} opacity={0.3}
        />
      </svg>
      <div style={{ position: 'absolute', textAlign: 'center' }}>
        <div style={{ fontSize: size * 0.22, fontWeight: 900, fontFamily: 'var(--font-mono)' }}>{total}</div>
        <div className="mono-label" style={{ fontSize: size * 0.09 }}>total</div>
      </div>
    </div>
  )
}

function TrendSparkline({ data, height = 24 }: { data: number[]; height?: number }) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const w = 100
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - ((v - min) / range) * height * 0.8 - height * 0.1}`).join(' ')
  return (
    <svg width={w} height={height} style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity=".3" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${points} ${w},${height}`} fill="url(#spark-fill)" />
      <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface DraftType {
  nombre: string
  email: string
  cedula: string
  rol: Rol
  becado: boolean
  carrera_id: number | null
  password: string
  cambiarPassword: boolean
}

const emptyDraft: DraftType = {
  nombre: '', email: '', cedula: '', rol: 'alumno',
  becado: false, carrera_id: null,
  password: '', cambiarPassword: false,
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<UsersStats | null>(null)
  const [carreras, setCarreras] = useState<Carrera[]>([])
  const [chipFiltro, setChipFiltro] = useState<'todos' | 'alumno' | 'profesor' | 'becados'>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [busquedaDebounced, setBusquedaDebounced] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState<Usuario | 'nuevo' | null>(null)
  const [confirmDel, setConfirmDel] = useState<number | null>(null)
  const [draft, setDraft] = useState<DraftType>({ ...emptyDraft })
  const [saving, setSaving] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [refreshing, setRefreshing] = useState(false)

  const rolQuery = chipFiltro === 'becados' ? 'alumno' : chipFiltro === 'todos' ? '' : chipFiltro

  const cargarUsuarios = useCallback(async () => {
    const params: Record<string, string> = {
      skip: String((page - 1) * PAGE_SIZE),
      limit: String(PAGE_SIZE),
    }
    if (rolQuery) params.role = rolQuery
    if (chipFiltro === 'becados') params.es_becado = 'true'
    if (busquedaDebounced) params.q = busquedaDebounced
    try {
      const res = await listarUsuarios(params)
      setUsuarios(res.items)
      setTotal(res.total)
    } catch { /* ignore */ }
  }, [page, rolQuery, chipFiltro, busquedaDebounced])

  const cargarStats = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([
        obtenerStatsUsuarios(),
        listarCarreras().catch(() => [] as Carrera[]),
      ])
      setStats(s)
      setCarreras(c)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setBusquedaDebounced(busqueda), 300)
    return () => clearTimeout(t)
  }, [busqueda])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        await Promise.all([cargarUsuarios(), cargarStats()])
      } finally {
        setLoading(false)
      }
      setLastUpdate(new Date())
    }
    load()
  }, [cargarUsuarios, cargarStats])

  useEffect(() => {
    const interval = setInterval(() => {
      cargarUsuarios()
      cargarStats()
      setLastUpdate(new Date())
    }, 30_000)
    return () => clearInterval(interval)
  }, [cargarUsuarios, cargarStats])

  async function refreshNow() {
    setRefreshing(true)
    await Promise.all([cargarUsuarios(), cargarStats()])
    setLastUpdate(new Date())
    setRefreshing(false)
  }

  const columnas: ColumnaTabla<Usuario>[] = [
    {
      header: 'Nombre y Email',
      render: u => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="avatar-initials" style={{ width: 32, height: 32, fontSize: 11 }}>
            {(u.nombre || u.username).slice(0, 2).toUpperCase()}
          </span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{u.nombre || u.username}</div>
            <div className="mono-label" style={{ fontSize: 9.5, textTransform: 'none' }}>{u.email || `@${u.username}`}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Rol',
      render: u => {
        const cfg = rolCfg[u.role?.toLowerCase().trim()] ?? rolCfg.alumno
        return <span className="badge" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
      },
    },
    {
      header: 'Cédula',
      render: u => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
          {u.cedula || '—'}
        </span>
      ),
    },
    {
      header: 'Registro',
      render: u => (
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>{formatDate(u.created_at)}</div>
          <div className="mono-label" style={{ fontSize: 9.5 }}>{timeAgo(u.created_at)}</div>
        </div>
      ),
    },
    {
      header: 'Beca',
      width: 60,
      render: u => u.es_becado
        ? <span className="badge" style={{ background: 'var(--success-subtle)', color: 'var(--success)' }}>Sí</span>
        : <span className="mono-label" style={{ fontSize: 10 }}>—</span>,
    },
    {
      header: 'Acciones',
      align: 'right',
      render: u => (
        <div style={{ whiteSpace: 'nowrap' }}>
          <button className="btn-ghost" style={{ padding: '5px 10px', fontSize: 11, marginRight: 6 }}
            onClick={() => abrirEditar(u)} title="Editar">
            <i className="ti ti-pencil" />
          </button>
          <button className="btn-ghost" style={{ padding: '5px 10px', fontSize: 11, color: 'var(--danger)' }}
            onClick={() => setConfirmDel(u.id)} title="Eliminar">
            <i className="ti ti-trash" />
          </button>
        </div>
      ),
    },
  ]

  function abrirNuevo() {
    setDraft({ ...emptyDraft })
    setModal('nuevo')
  }

  function abrirEditar(u: Usuario) {
    setDraft({
      nombre: u.nombre || '',
      email: u.email || '',
      cedula: u.cedula || '',
      rol: (u.role as Rol) || 'alumno',
      becado: u.es_becado,
      carrera_id: u.carrera_id,
      password: '',
      cambiarPassword: false,
    })
    setModal(u)
  }

  async function guardar() {
    if (!draft.nombre || !draft.email) { emitToast('Completá nombre y email', 'warning'); return }
    setSaving(true)
    try {
      if (modal === 'nuevo') {
        await crearUsuario({
          username: draft.email,
          password: draft.password || 'default123',
          role: draft.rol,
          nombre: draft.nombre,
          email: draft.email,
          es_becado: draft.becado,
        })
        emitToast('Usuario creado' + (!draft.password ? ' (contraseña temporal: default123)' : ''))
      } else if (modal) {
        const payload: Record<string, unknown> = {
          nombre: draft.nombre,
          email: draft.email,
          role: draft.rol,
          es_becado: draft.becado,
          carrera_id: draft.rol === 'alumno' ? draft.carrera_id : null,
        }
        if (draft.cambiarPassword && draft.password) {
          payload.password = draft.password
        }
        await actualizarUsuario(modal.id, payload)
        emitToast('Usuario actualizado')
      }
      setModal(null)
      refreshNow()
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al guardar', 'error')
    } finally { setSaving(false) }
  }

  async function eliminar() {
    if (confirmDel === null) return
    try {
      await eliminarUsuario(confirmDel)
      emitToast('Usuario eliminado')
      setConfirmDel(null)
      if (page > 1 && usuarios.length <= 1) setPage(page - 1)
      else refreshNow()
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al eliminar', 'error')
    }
  }

  function exportCSV() {
    const rows = [
      ['ID', 'Nombre', 'Email', 'Cédula', 'Rol', 'Becado', 'Carrera', 'Fecha Registro'],
      ...usuarios.map(u => [
        String(u.id), u.nombre || u.username, u.email || '-', u.cedula || '-',
        u.role, u.es_becado ? 'Sí' : 'No', u.carrera_nombre || '-', formatDate(u.created_at),
      ]),
    ]
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `usuarios_uca_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const totalCuentas = stats ? stats.total_alumnos + stats.total_profesores + stats.total_admins : 0
  const maxCount = stats?.crecimiento_mensual.length
    ? Math.max(...stats.crecimiento_mensual.map(m => m.count), 1) : 1
  const trendData = stats?.crecimiento_mensual.map(m => m.count) ?? []
  const trendPct = trendData.length >= 2
    ? ((trendData[trendData.length - 1] - trendData[0]) / (trendData[0] || 1)) * 100
    : 0

  const donutSegments = stats ? [
    { value: stats.total_alumnos, color: 'var(--accent)', label: 'Alumnos' },
    { value: stats.total_profesores, color: '#fdba74', label: 'Profesores' },
    { value: stats.total_admins, color: '#fbbf24', label: 'Admins' },
  ] : []

  const chips = [
    { key: 'todos' as const, icon: 'ti ti-users', label: 'Todos', count: totalCuentas },
    { key: 'alumno' as const, icon: 'ti ti-school', label: 'Alumnos', count: stats?.total_alumnos ?? 0 },
    { key: 'profesor' as const, icon: 'ti ti-badge', label: 'Profesores', count: stats?.total_profesores ?? 0 },
    { key: 'becados' as const, icon: 'ti ti-affiliate', label: 'Becados', count: stats?.total_becados ?? 0 },
  ]

  return (
    <>
      <style>{css}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Gestión de Usuarios</h1>
          <p className="page-subtitle">Administra los accesos, roles y estados de los miembros de la institución.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="mono-label" style={{ fontSize: 10 }}>{lastUpdate.toLocaleTimeString('es-PY')}</span>
          <button className="btn-ghost" onClick={refreshNow} disabled={refreshing} title="Actualizar">
            <i className={`ti ti-refresh ${refreshing ? 'spinning' : ''}`} />
          </button>
          <button className="btn-ghost" onClick={exportCSV}><i className="ti ti-cloud-download" /> Exportar</button>
          <button className="btn-primary" onClick={abrirNuevo}><i className="ti ti-user-plus" /> Nuevo Usuario</button>
        </div>
      </div>

      {/* Chips de filtro rápido */}
      <div className="us-chips">
        {chips.map(ch => (
          <button key={ch.key} className={`us-chip${chipFiltro === ch.key ? ' active' : ''}`}
            onClick={() => { setChipFiltro(ch.key); setPage(1) }}>
            <i className={ch.icon} style={{ color: chipFiltro === ch.key ? 'var(--accent-bright)' : undefined }} />
            {ch.label}
            <span className="mono-label" style={{ fontSize: 11, fontWeight: 800 }}>{ch.count}</span>
          </button>
        ))}
        <div className="us-filtro" style={{ flex: 1, minWidth: 160, display: 'flex', alignItems: 'center', padding: '8px 14px' }}>
          <i className="ti ti-search" style={{ color: 'var(--text-muted)', marginRight: 8, fontSize: 14 }} />
          <input className="input-uca" placeholder="Buscar por nombre o email…" value={busqueda}
            onChange={e => { setBusqueda(e.target.value); setPage(1) }}
            style={{ background: 'transparent', border: 'none', padding: '4px 0', width: '100%', fontSize: 13 }} />
        </div>
      </div>

      {/* Tabla */}
      <TablaPaginada
        columnas={columnas}
        items={usuarios}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        loading={loading}
        onPageChange={setPage}
        getRowKey={u => u.id}
        emptyMessage="Sin usuarios que coincidan con el filtro."
      />

      {/* Panel inferior */}
      <div className="us-bottom">
        {/* Distribución por Rol (donut + %) */}
        <div className="card" style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          {stats && stats.total_alumnos + stats.total_profesores + stats.total_admins > 0 ? (
            <>
              <DonutChart segments={donutSegments} size={140} />
              <div style={{ flex: 1, minWidth: 180 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Distribución por Rol</h3>
                {donutSegments.map(s => {
                  const pct = totalCuentas > 0 ? ((s.value / totalCuentas) * 100).toFixed(1) : '0'
                  return (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{s.label}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 800 }}>{s.value}</span>
                      <span className="mono-label" style={{ fontSize: 11, width: 40, textAlign: 'right' }}>{pct}%</span>
                    </div>
                  )
                })}
                <div className="mono-label" style={{ marginTop: 8, fontSize: 10 }}>
                  {stats.total_becados} becados ({totalCuentas > 0 ? ((stats.total_becados / totalCuentas) * 100).toFixed(1) : 0}% del total)
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, width: '100%' }}>
              Sin datos de distribución.
            </div>
          )}
        </div>

        {/* Crecimiento (6 meses) con tendencia */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800 }}>Crecimiento (6 meses)</h3>
            {trendData.length >= 2 && (
              <span className={`mono-label ${trendPct >= 0 ? 'trend-up' : 'trend-down'}`}
                style={{ fontSize: 13, fontWeight: 800 }}>
                <i className={`ti ${trendPct >= 0 ? 'ti-trending-up' : 'ti-trending-down'}`} style={{ marginRight: 4 }} />
                {trendPct >= 0 ? '+' : ''}{trendPct.toFixed(1)}%
              </span>
            )}
          </div>
          {stats && stats.crecimiento_mensual.length > 0 ? (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80, marginBottom: 4 }}>
                {stats.crecimiento_mensual.map((m, i) => {
                  const pct = maxCount > 0 ? (m.count / maxCount) * 100 : 0
                  const isLast = i === stats.crecimiento_mensual.length - 1
                  return (
                    <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span className="mono-label" style={{ fontSize: 9, marginBottom: 2 }}>{m.count}</span>
                      <div style={{
                        width: '100%', height: `${pct}%`, minHeight: 4,
                        borderRadius: '4px 4px 0 0',
                        background: isLast
                          ? 'linear-gradient(180deg, var(--accent), var(--accent-hover))'
                          : 'var(--bg-elevated)',
                        transition: 'height .5s ease',
                      }} />
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                {stats.crecimiento_mensual.map((m, i) => (
                  <span key={m.month} className="mono-label"
                    style={{ fontSize: 8, color: i === stats.crecimiento_mensual.length - 1 ? 'var(--accent-bright)' : undefined }}>
                    {m.month.slice(2)}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
                <TrendSparkline data={trendData} />
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  <b style={{ color: 'var(--text-primary)' }}>{trendData[trendData.length - 1]}</b> nuevos este mes
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Sin datos de crecimiento disponibles.
            </div>
          )}
        </div>
      </div>

      {/* Modal crear/editar */}
      {modal !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card card-elevated" style={{ width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Header del modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {modal === 'nuevo' ? (
                  <span className="avatar-initials" style={{ width: 44, height: 44, borderRadius: 12, fontSize: 16 }}>
                    <i className="ti ti-user-plus" />
                  </span>
                ) : (
                  <span className="avatar-initials" style={{ width: 44, height: 44, borderRadius: 12, fontSize: 16 }}>
                    {(modal.nombre || modal.username).slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800 }}>
                    {modal === 'nuevo' ? 'Nuevo Usuario' : `Editar ${modal.nombre || modal.username}`}
                  </h3>
                  {modal !== 'nuevo' && (
                    <span className="badge" style={{
                      background: rolCfg[modal.role]?.bg ?? 'var(--bg-elevated)',
                      color: rolCfg[modal.role]?.color ?? 'var(--text-secondary)',
                      marginTop: 4, display: 'inline-block',
                    }}>
                      {rolCfg[modal.role]?.label ?? modal.role}
                      <span className="mono-label" style={{ marginLeft: 6, fontSize: 9 }}>#{modal.id}</span>
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setModal(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
                <i className="ti ti-x" style={{ fontSize: 20 }} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div className="mono-label" style={{ marginBottom: 4 }}>Nombre completo</div>
                <input className="input-uca" value={draft.nombre}
                  onChange={e => setDraft(d => ({ ...d, nombre: e.target.value }))} />
              </div>
              <div>
                <div className="mono-label" style={{ marginBottom: 4 }}>Cédula</div>
                <input className="input-uca" value={draft.cedula}
                  onChange={e => setDraft(d => ({ ...d, cedula: e.target.value }))}
                  placeholder="Opcional" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="mono-label" style={{ marginBottom: 4 }}>Email</div>
                <input className="input-uca" type="email" value={draft.email}
                  onChange={e => setDraft(d => ({ ...d, email: e.target.value }))} />
              </div>
              <div>
                <div className="mono-label" style={{ marginBottom: 4 }}>Rol</div>
                <select className="input-uca" value={draft.rol}
                  onChange={e => setDraft(d => ({ ...d, rol: e.target.value as Rol, carrera_id: e.target.value === 'alumno' ? d.carrera_id : null }))}>
                  <option value="alumno">Alumno</option>
                  <option value="profesor">Profesor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {draft.rol === 'alumno' && (
                <div>
                  <div className="mono-label" style={{ marginBottom: 4 }}>Carrera</div>
                  <select className="input-uca" value={draft.carrera_id ?? ''}
                    onChange={e => setDraft(d => ({ ...d, carrera_id: e.target.value ? Number(e.target.value) : null }))}>
                    <option value="">Sin carrera</option>
                    {carreras.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Toggle Becado */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
              <button type="button" className={`toggle-switch ${draft.becado ? 'on' : 'off'}`}
                onClick={() => setDraft(d => ({ ...d, becado: !d.becado }))} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Becado</span>
              {draft.becado && (
                <span className="badge" style={{ background: 'var(--success-subtle)', color: 'var(--success)', fontSize: 10 }}>
                  Descuento aplicado
                </span>
              )}
            </div>

            {/* Password (solo edición) */}
            {modal !== 'nuevo' && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginBottom: draft.cambiarPassword ? 12 : 0 }}>
                  <input type="checkbox" checked={draft.cambiarPassword}
                    onChange={e => setDraft(d => ({ ...d, cambiarPassword: e.target.checked }))}
                    style={{ accentColor: 'var(--accent)' }} />
                  Cambiar contraseña
                </label>
                {draft.cambiarPassword && (
                  <div>
                    <div className="mono-label" style={{ marginBottom: 4 }}>Nueva contraseña</div>
                    <input className="input-uca" type="text" value={draft.password}
                      onChange={e => setDraft(d => ({ ...d, password: e.target.value }))}
                      placeholder="Mín. 6 caracteres" />
                  </div>
                )}
              </div>
            )}

            {/* Password (solo nuevo) */}
            {modal === 'nuevo' && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
                <div className="mono-label" style={{ marginBottom: 4 }}>Contraseña</div>
                <input className="input-uca" type="text" value={draft.password}
                  onChange={e => setDraft(d => ({ ...d, password: e.target.value }))}
                  placeholder="Dejar vacío para usar default123" />
              </div>
            )}

            {/* Acciones */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
              <button className="btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn-primary" disabled={saving} onClick={guardar}>
                {saving ? 'Guardando…' : (modal === 'nuevo' ? 'Crear Usuario' : 'Guardar Cambios')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar eliminación */}
      {confirmDel !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card card-elevated" style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 34, color: 'var(--danger)' }} />
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: '10px 0 6px' }}>¿Eliminar usuario?</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 18 }}>Esta acción no se puede deshacer.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn-ghost" onClick={() => setConfirmDel(null)}>Cancelar</button>
              <button className="btn-primary" style={{ background: 'var(--danger)' }} onClick={eliminar}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
