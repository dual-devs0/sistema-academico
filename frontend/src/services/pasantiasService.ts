import { api } from '../lib/api'

export interface EmpresaReceptora {
  id: number
  nombre: string
  rubro: string | null
  contacto: string | null
  telefono: string | null
  email: string | null
  convenio_activo: boolean
}

export interface Pasantia {
  id: number
  alumno_id: number
  empresa_id: number
  empresa_nombre: string | null
  tutor_academico_id: number | null
  tutor_nombre: string | null
  fecha_inicio: string
  fecha_fin: string | null
  horas_requeridas: number
  horas_completadas: number
  estado: 'pendiente' | 'en_curso' | 'completada' | 'rechazada'
}

export interface InformePasantia {
  id: number
  pasantia_id: number
  tipo: string
  storage_key: string | null
  fecha_entrega: string
}

export const getEmpresas = () => api.get<EmpresaReceptora[]>('/pasantias/empresas')

export const getMisPasantias = (estado?: string) =>
  api.get<Pasantia[]>(`/pasantias/solicitudes${estado ? `?estado=${estado}` : ''}`)

export const crearEmpresa = (data: Partial<EmpresaReceptora>) =>
  api.post<EmpresaReceptora>('/pasantias/empresas', data)

export const solicitarPasantia = (empresa_id: number, fecha_inicio: string, horas_requeridas: number) =>
  api.post<Pasantia>('/pasantias/solicitudes', { empresa_id, fecha_inicio, horas_requeridas })

export const aprobarPasantia = (id: number, tutor_id: number) =>
  api.put<Pasantia>(`/pasantias/${id}/aprobar?tutor_id=${tutor_id}`, {})

export const actualizarHoras = (id: number, horas_completadas: number) =>
  api.put<Pasantia>(`/pasantias/${id}/horas`, { horas_completadas })

export const finalizarPasantia = (id: number) =>
  api.put<Pasantia>(`/pasantias/${id}/finalizar`, {})

export const subirInforme = (id: number, tipo: string, archivo?: File) => {
  const form = new FormData()
  form.append('tipo', tipo)
  if (archivo) form.append('archivo', archivo)
  return api.upload<InformePasantia>(`/pasantias/${id}/informes`, form)
}