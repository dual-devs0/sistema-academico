import { api } from '../lib/api'

export type ItemAgendaTipo = 'clase' | 'evento' | 'recordatorio'

export interface ItemAgenda {
  tipo: ItemAgendaTipo
  fecha: string
  id?: number
  hora_inicio?: string
  hora_fin?: string
  materia_id: number | null
  materia_nombre?: string | null
  aula?: string | null
  titulo?: string
  evento_tipo?: string
  descripcion?: string | null
  completado?: boolean
}

export interface AgendaResponse {
  desde: string
  hasta: string
  items: ItemAgenda[]
}

export function obtenerMiAgenda(desde: string, hasta: string) {
  return api.get<AgendaResponse>(`/profesor/mi-agenda?desde=${desde}&hasta=${hasta}`)
}

export interface RecordatorioInput {
  titulo: string
  descripcion?: string | null
  fecha: string
  materia_id?: number | null
}

export function crearRecordatorio(data: RecordatorioInput) {
  return api.post('/profesor/recordatorios', data)
}

export function actualizarRecordatorio(id: number, data: Partial<RecordatorioInput & { completado: boolean }>) {
  return api.patch(`/profesor/recordatorios/${id}`, data)
}

export function eliminarRecordatorio(id: number) {
  return api.delete(`/profesor/recordatorios/${id}`)
}
