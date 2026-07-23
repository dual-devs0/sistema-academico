import { api } from '../lib/api'

export interface GlobalSetting {
  key: string
  value: string | null
  tipo: string
  categoria: string
  descripcion: string | null
  editable: boolean
  updated_at: string | null
  updated_by: number | null
}

export interface AuditLogEntry {
  id: number
  setting_key: string
  old_value: string | null
  new_value: string | null
  changed_by: number
  changed_at: string | null
  reason: string | null
  changer_nombre: string | null
}

export interface SettingsExport {
  settings: GlobalSetting[]
}

export interface SettingsImportResult {
  imported: number
  skipped: number
  errors: string[]
}

export const getSettings = (categoria?: string) =>
  api.get<GlobalSetting[]>(`/admin/settings${categoria ? `?categoria=${categoria}` : ''}`)

export const getSetting = (key: string) =>
  api.get<GlobalSetting>(`/admin/settings/${key}`)

export const updateSetting = (key: string, value: string | null, reason?: string) =>
  api.put<GlobalSetting>(`/admin/settings/${key}`, { value, reason })

export const getAuditLog = (settingKey?: string, limit = 50, offset = 0) => {
  let q = `/admin/settings/audit/list?limit=${limit}&offset=${offset}`
  if (settingKey) q += `&setting_key=${settingKey}`
  return api.get<AuditLogEntry[]>(q)
}

export const exportSettings = () =>
  api.get<SettingsExport>('/admin/settings/export/all')

export const importSettings = (data: SettingsExport) =>
  api.post<SettingsImportResult>('/admin/settings/import', data)
