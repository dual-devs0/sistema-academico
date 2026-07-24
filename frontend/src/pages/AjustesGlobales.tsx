import { useState, useEffect, useCallback, useRef } from 'react'
import { emitToast } from '../lib/api'
import {
  getSettings, getAuditLog, updateSetting, exportSettings, importSettings,
  type GlobalSetting, type AuditLogEntry, type SettingsExport,
} from '../services/settingsService'

type Tab = 'academico' | 'financiero' | 'sistema' | 'notificaciones' | 'auditoria'

const CATEGORIAS: Record<string, string> = {
  academico: 'Académico',
  financiero: 'Financiero',
  sistema: 'Sistema',
  notificaciones: 'Notificaciones',
}

const ICONOS: Record<string, string> = {
  academico: 'ti-school',
  financiero: 'ti-coin',
  sistema: 'ti-server',
  notificaciones: 'ti-bell',
  auditoria: 'ti-history',
}

const POLL_MS = 30000

const css = `
  .ag-header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:20px; }
  .ag-title { display:flex; align-items:center; gap:10px; font-size:22px; font-weight:800; color:var(--text-primary); margin:0; }
  .ag-title i { color:var(--accent-bright); font-size:22px; }
  .ag-last-upd { display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); }
  .ag-last-upd svg { width:13px; height:13px; }
  .ag-last-upd svg.spin { animation:ag-spin 1s linear infinite; }
  @keyframes ag-spin { to { transform:rotate(360deg); } }
  .ag-card {
    background:var(--bg-elevated); border:1px solid var(--border-subtle);
    border-radius:16px; padding:18px 22px; margin-bottom:12px;
  }
  .ag-input {
    padding:8px 12px; border-radius:10px; font-size:13px;
    background:var(--bg-base); border:1px solid var(--border-subtle);
    color:var(--text-primary); width:100%; box-sizing:border-box;
  }
  .ag-input:focus { outline:none; border-color:var(--accent-bright); }
  .ag-select {
    padding:8px 12px; border-radius:10px; font-size:13px;
    background:var(--bg-base); border:1px solid var(--border-subtle);
    color:var(--text-primary); width:100%; box-sizing:border-box; cursor:pointer;
  }
  .ag-select option { background:var(--bg-elevated); color:var(--text-primary); }
  .ag-btn {
    padding:9px 18px; border-radius:10px; font-size:13px; font-weight:700;
    border:none; cursor:pointer; background:var(--accent-bright); color:#fff; transition:opacity .18s;
    display:inline-flex; align-items:center; gap:6px; white-space:nowrap;
  }
  .ag-btn:hover { opacity:.88; }
  .ag-btn:disabled { opacity:.5; cursor:not-allowed; }
  .ag-btn.ghost { background:transparent; color:var(--text-primary); border:1px solid var(--border-subtle); }
  .ag-btn.ghost:hover { background:var(--bg-base); opacity:1; }
  .ag-btn.sm { padding:5px 12px; font-size:11px; }
  .ag-btn.success { background:rgba(16,185,129,.15); color:#10b981; border:1px solid rgba(16,185,129,.3); }
  .ag-btn.success:hover { background:rgba(16,185,129,.25); opacity:1; }
  .ag-tabs { display:flex; gap:4px; margin-bottom:16px; flex-wrap:wrap; }
  .ag-tab {
    padding:8px 18px; border-radius:10px; font-size:13px; font-weight:700;
    border:1px solid var(--border-subtle); cursor:pointer;
    background:transparent; color:var(--text-secondary); transition:all .18s;
    display:flex; align-items:center; gap:6px;
  }
  .ag-tab.active { background:var(--accent-bright); color:#fff; border-color:var(--accent-bright); }
  .ag-setting-row {
    display:flex; align-items:flex-start; gap:12px; padding:12px 0;
    border-bottom:1px solid var(--border-subtle);
  }
  .ag-setting-row:last-child { border-bottom:none; }
  .ag-setting-info { flex:1; min-width:0; }
  .ag-setting-label { font-weight:700; font-size:13px; color:var(--text-primary); }
  .ag-setting-desc { font-size:11px; color:var(--text-secondary); margin-top:2px; }
  .ag-setting-input { width:220px; min-width:140px; flex-shrink:0; }
  .ag-toggle {
    position:relative; display:inline-block; width:44px; height:24px; cursor:pointer;
  }
  .ag-toggle input { opacity:0; width:0; height:0; }
  .ag-toggle-slider {
    position:absolute; inset:0; background:var(--bg-base); border:1px solid var(--border-subtle);
    border-radius:24px; transition:.2s;
  }
  .ag-toggle-slider::before {
    content:''; position:absolute; left:2px; top:2px; width:18px; height:18px;
    border-radius:50%; background:var(--text-muted); transition:.2s;
  }
  .ag-toggle input:checked + .ag-toggle-slider { background:var(--accent-bright); border-color:var(--accent-bright); }
  .ag-toggle input:checked + .ag-toggle-slider::before { background:#fff; transform:translateX(20px); }
  .ag-empty { text-align:center; padding:32px; color:var(--text-secondary); font-size:14px; }
  .ag-err { background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.3); color:#ef4444; border-radius:10px; padding:10px 14px; font-size:12px; margin-bottom:12px; display:flex; align-items:center; gap:8px; }
  .ag-table { width:100%; border-collapse:collapse; font-size:12px; }
  .ag-table th { text-align:left; padding:8px 10px; font-size:10px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:.05em; border-bottom:1px solid var(--border-subtle); }
  .ag-table td { padding:8px 10px; border-bottom:1px solid var(--border-subtle); color:var(--text-primary); vertical-align:middle; }
  .ag-table tr:last-child td { border-bottom:none; }
  .ag-modal-overlay {
    position:fixed; inset:0; background:rgba(0,0,0,.7); backdrop-filter:blur(4px);
    z-index:200; display:flex; align-items:center; justify-content:center; padding:16px;
  }
  .ag-modal { width:100%; max-width:480px; }
  .ag-saved-at { font-size:10px; color:var(--text-muted); font-family:var(--font-mono); }
  .ag-textarea { resize:vertical; font-family:inherit; min-height:60px; }
`

const CATS = ['academico', 'financiero', 'sistema', 'notificaciones', 'auditoria'] as Tab[]

function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleDateString('es-PY') + ' ' + dt.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })
}

export default function AjustesGlobales() {
  const [tab, setTab] = useState<Tab>('academico')
  const [settings, setSettings] = useState<GlobalSetting[]>([])
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState<Record<string, string | null>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [showExport, setShowExport] = useState(false)
  const [exportJson, setExportJson] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [importJson, setImportJson] = useState('')
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchSettings = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    else setLoading(true)
    try {
      const data = await getSettings()
      setSettings(data)
      setError('')
      setLastUpdate(new Date())
    } catch {
      setError('No se pudieron cargar los ajustes.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const fetchAudit = useCallback(async () => {
    try {
      const data = await getAuditLog()
      setAuditLog(data)
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    const load = () => fetchSettings()
    load()
    const id = setInterval(() => fetchSettings(), POLL_MS)
    return () => clearInterval(id)
  }, [fetchSettings])

  useEffect(() => {
    const load = () => { if (tab === 'auditoria') fetchAudit() }
    load()
  }, [tab, fetchAudit])

  const handleEdit = (key: string, value: string | null) => {
    setDirty(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async (key: string) => {
    const newValue = dirty[key]
    setSaving(prev => ({ ...prev, [key]: true }))
    try {
      await updateSetting(key, newValue)
      const reason = newValue !== null ? `Cambiado a: ${newValue}` : 'Valor limpiado'
      await updateSetting(key, newValue, reason)
      emitToast(`"${key}" actualizado`, 'success')
      setDirty(prev => {
        const copy = { ...prev }
        delete copy[key]
        return copy
      })
      fetchSettings()
    } catch (e: unknown) {
      emitToast(e instanceof Error ? e.message : 'Error al guardar', 'error')
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }))
    }
  }

  const handleExport = async () => {
    try {
      const data = await exportSettings()
      setExportJson(JSON.stringify(data, null, 2))
      setShowExport(true)
    } catch (e: unknown) {
      emitToast(e instanceof Error ? e.message : 'Error al exportar', 'error')
    }
  }

  const runImport = async (parsed: SettingsExport) => {
    setImporting(true)
    try {
      const result = await importSettings(parsed)
      emitToast(`Importados: ${result.imported}, omitidos: ${result.skipped}${result.errors.length ? `, errores: ${result.errors.length}` : ''}`, result.errors.length ? 'warning' : 'success')
      setShowImport(false)
      setImportJson('')
      fetchSettings()
    } catch (e: unknown) {
      emitToast(e instanceof Error ? e.message : 'Error al importar', 'error')
    } finally {
      setImporting(false)
    }
  }

  const handleImportFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as SettingsExport
        runImport(parsed)
      } catch {
        emitToast('El archivo no es un JSON válido', 'error')
      }
    }
    reader.readAsText(file)
  }

  const handleImportPegado = () => {
    try {
      const parsed = JSON.parse(importJson) as SettingsExport
      runImport(parsed)
    } catch {
      emitToast('El JSON pegado no es válido', 'error')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => emitToast('Copiado al portapapeles', 'success'))
  }

  const renderInput = (s: GlobalSetting) => {
    const val = s.key in dirty ? dirty[s.key] : s.value
    if (!s.editable) {
      return <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{s.value || '—'}</span>
    }
    if (s.tipo === 'boolean') {
      const checked = val === 'true'
      return (
        <label className="ag-toggle">
          <input type="checkbox" checked={checked}
            onChange={e => handleEdit(s.key, e.target.checked ? 'true' : 'false')} />
          <span className="ag-toggle-slider" />
        </label>
      )
    }
    if (s.tipo === 'number') {
      return (
        <input className="ag-input" type="number" step="any"
          value={val ?? ''}
          onChange={e => handleEdit(s.key, e.target.value)} />
      )
    }
    if (s.tipo === 'date') {
      return (
        <input className="ag-input" type="date"
          value={val ?? ''}
          onChange={e => handleEdit(s.key, e.target.value)} />
      )
    }
    if (s.tipo === 'select') {
      const options = s.descripcion?.match(/\[([^\]]+)\]/g)?.map(o => o.slice(1, -1)) || []
      return (
        <select className="ag-select" value={val ?? ''}
          onChange={e => handleEdit(s.key, e.target.value)}>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )
    }
    return (
      <input className="ag-input" type="text"
        value={val ?? ''}
        onChange={e => handleEdit(s.key, e.target.value)} />
    )
  }

  const isDirty = (key: string) => key in dirty
  const isSaving = (key: string) => saving[key] === true

  const activeSettings = tab === 'auditoria' ? [] : settings.filter(s => s.categoria === tab)

  return (
    <div>
      <style>{css}</style>

      <div className="ag-header">
        <h2 className="ag-title"><i className="ti ti-settings" /> Ajustes Globales</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastUpdate && (
            <span className="ag-last-upd">
              <svg className={refreshing ? 'spin' : ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
              {lastUpdate.toLocaleTimeString('es-PY')}
            </span>
          )}
          <button className="ag-btn ghost sm" onClick={handleExport}><i className="ti ti-download" /> Exportar</button>
          <button className="ag-btn ghost sm" onClick={() => setShowImport(true)}><i className="ti ti-upload" /> Importar</button>
          <button className="ag-btn ghost sm" onClick={() => fetchSettings(true)} disabled={refreshing}>
            <i className="ti ti-refresh" /> {refreshing ? '…' : 'Actualizar'}
          </button>
        </div>
      </div>

      {error && <div className="ag-err"><i className="ti ti-alert-circle" /> {error}</div>}

      <div className="ag-tabs">
        {CATS.map(t => (
          <button key={t} className={`ag-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            <i className={`ti ${ICONOS[t]}`} /> {t === 'auditoria' ? 'Auditoría' : CATEGORIAS[t]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="ag-card ag-empty"><i className="ti ti-loader" style={{ animation: 'ag-spin 1s linear infinite', display: 'inline-block' }} /> Cargando ajustes…</div>
      ) : tab !== 'auditoria' && activeSettings.length === 0 ? (
        <div className="ag-card ag-empty">No hay ajustes en esta categoría.</div>
      ) : tab !== 'auditoria' ? (
        <div className="ag-card" style={{ paddingTop: 0, paddingBottom: 0 }}>
          {activeSettings.map(s => (
            <div key={s.key} className="ag-setting-row">
              <div className="ag-setting-info">
                <div className="ag-setting-label">{s.descripcion || s.key}</div>
                <div className="ag-setting-key">{s.key}</div>
                {s.descripcion && <div className="ag-setting-desc">{s.key}</div>}
              </div>
              <div className="ag-setting-input">
                {renderInput(s)}
                {s.editable && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 4, justifyContent: 'flex-end' }}>
                    <span className="ag-saved-at">{s.updated_at ? formatDate(s.updated_at) : ''}</span>
                    <button className="ag-btn sm" disabled={!isDirty(s.key) || isSaving(s.key)}
                      onClick={() => handleSave(s.key)}
                      style={{ display: isDirty(s.key) ? undefined : 'none' }}>
                      {isSaving(s.key) ? '…' : 'Guardar'}
                    </button>
                    <button className="ag-btn sm ghost"
                      onClick={() => handleEdit(s.key, s.value)}
                      style={{ display: isDirty(s.key) ? undefined : 'none' }}>
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="ag-card" style={{ padding: 0, overflow: 'hidden' }}>
          {auditLog.length === 0 ? (
            <div className="ag-empty">No hay cambios registrados aún.</div>
          ) : (
            <table className="ag-table">
              <thead>
                <tr>
                  <th>Ajuste</th>
                  <th>Valor anterior</th>
                  <th>Valor nuevo</th>
                  <th>Por</th>
                  <th>Fecha</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.map(e => (
                  <tr key={e.id}>
                    <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{e.setting_key}</span></td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.old_value || '—'}</td>
                    <td style={{ fontSize: 11, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.new_value || '—'}</td>
                    <td>{e.changer_nombre || `#${e.changed_by}`}</td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(e.changed_at)}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{e.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Export modal */}
      {showExport && (
        <div className="ag-modal-overlay" onClick={() => setShowExport(false)}>
          <div className="card card-elevated ag-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>Exportar ajustes</h3>
              <button onClick={() => setShowExport(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><i className="ti ti-x" /></button>
            </div>
            <textarea className="ag-input ag-textarea" value={exportJson} readOnly rows={12} style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="ag-btn ghost sm" onClick={() => copyToClipboard(exportJson)}><i className="ti ti-copy" /> Copiar</button>
              <button className="ag-btn sm" onClick={() => { const a = document.createElement('a'); a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(exportJson); a.download = 'ajustes_globales.json'; a.click() }}><i className="ti ti-download" /> Descargar</button>
            </div>
          </div>
        </div>
      )}

      {/* Import modal */}
      {showImport && (
        <div className="ag-modal-overlay" onClick={() => { setShowImport(false); setImportJson('') }}>
          <div className="card card-elevated ag-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>Importar ajustes</h3>
              <button onClick={() => { setShowImport(false); setImportJson('') }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><i className="ti ti-x" /></button>
            </div>
            <input ref={fileInputRef} type="file" accept="application/json,.json" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImportFile(f); e.target.value = '' }} />
            <button className="ag-btn ghost" style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}
              onClick={() => fileInputRef.current?.click()} disabled={importing}>
              <i className="ti ti-file-upload" /> Elegir archivo .json
            </button>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', margin: '4px 0 10px' }}>— o pegá el JSON —</div>
            <textarea className="ag-input ag-textarea" value={importJson} onChange={e => setImportJson(e.target.value)} placeholder='{"settings": [...]}' rows={8} style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="ag-btn ghost sm" onClick={() => { setShowImport(false); setImportJson('') }}>Cancelar</button>
              <button className="ag-btn sm" disabled={!importJson.trim() || importing} onClick={handleImportPegado}>
                {importing ? 'Importando…' : 'Importar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
