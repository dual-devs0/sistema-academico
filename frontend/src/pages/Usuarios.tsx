import { useState, useEffect } from 'react'
import { api, emitToast } from '../lib/api'
import TablaPaginada, { type ColumnaTabla } from '../components/common/TablaPaginada'

type Rol = 'alumno' | 'profesor' | 'admin'
type Usuario = { id: number; username: string; role: string; nombre: string; email: string; es_becado: boolean }

const rolCfg: Record<string, { color: string; bg: string; label: string }> = {
  alumno:   { color: 'var(--accent-bright)', bg: 'var(--accent-muted)', label: 'ALUMNO' },
  profesor: { color: '#a78bfa', bg: 'rgba(139,92,246,0.14)', label: 'PROFESOR' },
  admin:    { color: '#fbbf24', bg: 'rgba(245,158,11,0.14)', label: 'ADMIN' },
}

const css = `
  .us-filtros { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:18px; }
  .us-filtro { background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:12px; padding:12px 16px; }
  .us-bottom { display:grid; grid-template-columns:1.4fr 1fr; gap:16px; margin-top:18px; }
  .aud-row { display:flex; align-items:center; justify-content:space-between; background:var(--bg-elevated); border-radius:10px; padding:9px 13px; margin-bottom:8px; font-size:12.5px; }
  @media(max-width:900px){ .us-filtros { grid-template-columns:1fr 1fr; } .us-bottom { grid-template-columns:1fr; } }
`

const PAGE_SIZE = 10

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filtroRol, setFiltroRol] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [busquedaDebounced, setBusquedaDebounced] = useState('')
  const [checks, setChecks] = useState<Set<number>>(new Set())
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState<Usuario | 'nuevo' | null>(null)
  const [confirmDel, setConfirmDel] = useState<number | null>(null)
  const [draft, setDraft] = useState({ nombre: '', email: '', rol: 'alumno' as Rol, becado: false })
  const [saving, setSaving] = useState(false)

  // Debounce de búsqueda para no disparar un fetch por cada tecla
  useEffect(() => {
    const t = setTimeout(() => setBusquedaDebounced(busqueda), 300)
    return () => clearTimeout(t)
  }, [busqueda])

  function cargar() {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('skip', String((page - 1) * PAGE_SIZE))
    params.set('limit', String(PAGE_SIZE))
    if (filtroRol) params.set('role', filtroRol)
    if (busquedaDebounced) params.set('q', busquedaDebounced)
    api.get<{ items: Usuario[]; total: number }>(`/users/?${params}`)
      .then(res => { setUsuarios(res.items); setTotal(res.total) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(cargar, [page, filtroRol, busquedaDebounced])

  const columnas: ColumnaTabla<Usuario>[] = [
    {
      header: 'Nombre y Email',
      render: u => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="avatar-initials" style={{ width: 32, height: 32, fontSize: 11 }}>{(u.nombre || u.username).slice(0, 2)}</span>
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
        const cfg = rolCfg[u.role] ?? rolCfg.alumno
        return <span className="badge" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
      },
    },
    {
      header: 'Estado',
      render: () => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--success)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)' }} /> Activo
        </span>
      ),
    },
    {
      header: 'ID Institucional',
      render: u => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
          #{u.role === 'alumno' ? 'STD' : u.role === 'profesor' ? 'FCL' : 'ADM'}-{String(u.id).padStart(3, '0')}
        </span>
      ),
    },
    {
      header: 'Último Acceso',
      render: () => <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>Hoy</span>,
    },
    {
      header: 'Acciones',
      align: 'right',
      render: u => (
        <div style={{ whiteSpace: 'nowrap' }}>
          <button className="btn-ghost" style={{ padding: '5px 10px', fontSize: 11, marginRight: 6 }} onClick={() => abrirEditar(u)}>
            <i className="ti ti-pencil" />
          </button>
          <button className="btn-ghost" style={{ padding: '5px 10px', fontSize: 11, color: 'var(--danger)' }} onClick={() => setConfirmDel(u.id)}>
            <i className="ti ti-trash" />
          </button>
        </div>
      ),
    },
  ]

  function abrirNuevo() {
    setDraft({ nombre: '', email: '', rol: 'alumno', becado: false })
    setModal('nuevo')
  }
  function abrirEditar(u: Usuario) {
    setDraft({ nombre: u.nombre || '', email: u.email || '', rol: (u.role as Rol) || 'alumno', becado: u.es_becado })
    setModal(u)
  }

  async function guardar() {
    if (!draft.nombre || !draft.email) { emitToast('Completá nombre y email', 'warning'); return }
    setSaving(true)
    try {
      if (modal === 'nuevo') {
        await api.post('/users/', { username: draft.email, password: 'default123', role: draft.rol, nombre: draft.nombre, email: draft.email, es_becado: draft.becado })
        emitToast('Usuario creado (contraseña temporal: default123)')
      } else if (modal) {
        await api.patch(`/users/${modal.id}`, { nombre: draft.nombre, email: draft.email, role: draft.rol, es_becado: draft.becado })
        emitToast('Usuario actualizado')
      }
      setModal(null)
      cargar()
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al guardar', 'error')
    } finally { setSaving(false) }
  }

  async function eliminar() {
    if (confirmDel === null) return
    try {
      await api.delete(`/users/${confirmDel}`)
      emitToast('Usuario eliminado')
      setConfirmDel(null)
      cargar()
    } catch (e) {
      emitToast(e instanceof Error ? e.message : 'Error al eliminar', 'error')
    }
  }

  function exportCSV() {
    // Limitación aceptada: exporta solo la página actual (usuarios cargados en memoria),
    // no el total server-side. Exportar todo requeriría un endpoint dedicado sin paginar.
    const rows = [['Nombre', 'Email', 'Rol', 'Becado'], ...usuarios.map(u => [u.nombre || u.username, u.email || '-', u.role, u.es_becado ? 'Sí' : 'No'])]
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'usuarios_uca.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function toggleCheck(id: number) {
    setChecks(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  return (
    <>
      <style>{css}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Gestión de Usuarios</h1>
          <p className="page-subtitle">Administra los accesos, roles y estados de los miembros de la institución.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-ghost" onClick={exportCSV}><i className="ti ti-cloud-download" /> Exportar</button>
          <button className="btn-primary" onClick={abrirNuevo}><i className="ti ti-user-plus" /> Nuevo Usuario</button>
        </div>
      </div>

      {/* Filtros */}
      <div className="us-filtros">
        <div className="us-filtro">
          <div className="mono-label" style={{ marginBottom: 6 }}>Rol del Usuario</div>
          <select className="input-uca" style={{ padding: '6px 10px', fontSize: 13, background: 'transparent', border: 'none', fontWeight: 700 }}
            value={filtroRol} onChange={e => { setFiltroRol(e.target.value); setPage(1) }}>
            <option value="">Todos los Roles</option>
            <option value="alumno">Alumnos</option>
            <option value="profesor">Profesores</option>
            <option value="admin">Admins</option>
          </select>
        </div>
        <div className="us-filtro">
          <div className="mono-label" style={{ marginBottom: 6 }}>Estado de Cuenta</div>
          <div style={{ fontSize: 14, fontWeight: 700, padding: '6px 0' }}>Cualquier Estado</div>
        </div>
        <div className="us-filtro">
          <div className="mono-label" style={{ marginBottom: 6 }}>Última Actividad</div>
          <div style={{ fontSize: 14, fontWeight: 700, padding: '6px 0' }}>Últimos 30 días</div>
        </div>
        <div className="us-filtro" style={{ display: 'flex', alignItems: 'center' }}>
          <input className="input-uca" placeholder="Buscar por nombre o email…" value={busqueda}
            onChange={e => { setBusqueda(e.target.value); setPage(1) }} style={{ background: 'transparent', border: 'none', padding: '6px 0' }} />
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
        selectable
        selectedIds={checks}
        onToggleSelect={id => toggleCheck(id as number)}
        emptyMessage="Sin usuarios que coincidan con el filtro."
        headerExtra={checks.size > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 800 }}>{checks.size} Usuarios seleccionados</span>
            <button style={{ background: 'none', border: 'none', color: 'var(--danger)', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              <i className="ti ti-ban" /> Bloqueo Masivo
            </button>
          </div>
        ) : undefined}
      />

      {/* Panel inferior */}
      <div className="us-bottom">
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 800 }}>Crecimiento Mensual</h3>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 30, fontWeight: 800, color: 'var(--success)', margin: '6px 0 14px' }}>+12.4% <i className="ti ti-trending-up" style={{ fontSize: 18 }} /></div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 90 }}>
            {[38, 52, 44, 68, 58, 90].map((h, i) => (
              <span key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 8, background: i === 5 ? 'var(--text-primary)' : 'var(--bg-elevated)' }} />
            ))}
          </div>
        </div>
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>Auditoría de Seguridad</h3>
          <div className="aud-row"><span><i className="ti ti-shield-check" style={{ color: 'var(--success)', marginRight: 7 }} />Inicios de sesión hoy</span><b style={{ fontFamily: 'var(--font-mono)' }}>2,482</b></div>
          <div className="aud-row"><span><i className="ti ti-alert-triangle" style={{ color: 'var(--danger)', marginRight: 7 }} />Bloqueos automáticos</span><b style={{ fontFamily: 'var(--font-mono)' }}>3</b></div>
          <div className="aud-row"><span><i className="ti ti-key" style={{ color: 'var(--warning)', marginRight: 7 }} />Password resets</span><b style={{ fontFamily: 'var(--font-mono)' }}>14</b></div>
          <button className="btn-ghost" style={{ width: '100%', marginTop: 8 }}>Ver Reporte Completo</button>
        </div>
      </div>

      {/* Modal crear/editar */}
      {modal !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="card card-elevated" style={{ width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>{modal === 'nuevo' ? 'Nuevo Usuario' : 'Editar Usuario'}</h3>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><i className="ti ti-x" /></button>
            </div>
            <div className="mono-label" style={{ marginBottom: 6 }}>Nombre completo</div>
            <input className="input-uca" value={draft.nombre} onChange={e => setDraft(d => ({ ...d, nombre: e.target.value }))} style={{ marginBottom: 12 }} />
            <div className="mono-label" style={{ marginBottom: 6 }}>Email</div>
            <input className="input-uca" type="email" value={draft.email} onChange={e => setDraft(d => ({ ...d, email: e.target.value }))} style={{ marginBottom: 12 }} />
            <div className="mono-label" style={{ marginBottom: 6 }}>Rol</div>
            <select className="input-uca" value={draft.rol} onChange={e => setDraft(d => ({ ...d, rol: e.target.value as Rol }))} style={{ marginBottom: 12 }}>
              <option value="alumno">Alumno</option>
              <option value="profesor">Profesor</option>
              <option value="admin">Admin</option>
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 18, cursor: 'pointer' }}>
              <input type="checkbox" checked={draft.becado} onChange={e => setDraft(d => ({ ...d, becado: e.target.checked }))} style={{ accentColor: 'var(--accent)' }} />
              Becado
            </label>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn-primary" disabled={saving} onClick={guardar}>{saving ? 'Guardando…' : 'Guardar'}</button>
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
