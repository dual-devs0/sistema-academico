export interface ColumnaTabla<T> {
  header: string
  render: (row: T) => React.ReactNode
  align?: 'left' | 'right' | 'center'
  width?: string | number
}

export interface TablaPaginadaProps<T> {
  columnas: ColumnaTabla<T>[]
  items: T[]
  total: number
  page: number
  pageSize: number
  loading?: boolean
  onPageChange: (page: number) => void
  getRowKey: (row: T) => string | number
  selectable?: boolean
  selectedIds?: Set<string | number>
  onToggleSelect?: (id: string | number) => void
  emptyMessage?: string
  headerExtra?: React.ReactNode
}

/**
 * Tabla genérica con paginación server-side. No hace fetch — recibe
 * items/total ya cargados por el padre y solo notifica cambios de página.
 * Reutilizable en cualquier vista de administración (Fase 4: financiero,
 * becas, solicitudes) sin cambios estructurales, solo cambiando `columnas`.
 */
export default function TablaPaginada<T>({
  columnas, items, total, page, pageSize, loading, onPageChange,
  getRowKey, selectable, selectedIds, onToggleSelect, emptyMessage, headerExtra,
}: TablaPaginadaProps<T>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const desde = total === 0 ? 0 : (page - 1) * pageSize + 1
  const hasta = Math.min(page * pageSize, total)

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: 8 }}>
        {headerExtra ?? (
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
            {loading ? 'Cargando…' : `Mostrando ${desde}-${hasta} de ${total}`}
          </span>
        )}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="table-uca">
          <thead>
            <tr>
              {selectable && <th style={{ width: 36 }}></th>}
              {columnas.map((c, i) => (
                <th key={i} style={{ width: c.width, textAlign: c.align ?? 'left' }}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading ? (
              <tr>
                <td colSpan={columnas.length + (selectable ? 1 : 0)} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>
                  {emptyMessage ?? 'Sin resultados.'}
                </td>
              </tr>
            ) : (
              items.map(row => {
                const key = getRowKey(row)
                return (
                  <tr key={key}>
                    {selectable && (
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds?.has(key) ?? false}
                          onChange={() => onToggleSelect?.(key)}
                          style={{ accentColor: 'var(--accent)' }}
                        />
                      </td>
                    )}
                    {columnas.map((c, i) => (
                      <td key={i} style={{ textAlign: c.align ?? 'left' }}>{c.render(row)}</td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Mostrando {desde} a {hasta} de {total} resultados</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn-ghost" style={{ padding: '5px 12px', fontSize: 11 }} disabled={page === 1} onClick={() => onPageChange(page - 1)}>Anterior</button>
          <button className="btn-ghost" style={{ padding: '5px 12px', fontSize: 11 }} disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>Siguiente</button>
        </div>
      </div>
    </div>
  )
}
