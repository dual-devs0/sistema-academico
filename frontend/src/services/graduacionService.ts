import { api } from '../lib/api'

export interface CondicionEgreso {
  cumple_creditos: boolean
  creditos_aprobados: number
  creditos_totales: number
  cumple_ppa: boolean
  ppa_actual: number | null
  ppa_minimo: number
  cumple_pasantia: boolean
  pasantia_exigida: boolean
  pasantia_completada: boolean
  puede_graduarse: boolean
  motivo: string | null
}

export interface ProcesoGraduacion {
  id: number
  alumno_id: number
  fecha_inicio: string
  estado: string
  tutor_id: number | null
}

export interface EtapaTesis {
  id: number
  proceso_id: number
  nombre_etapa: string
  fecha_limite: string | null
  estado: string
  observaciones: string | null
}

export const getCondicionEgreso = (alumnoId: number) =>
  api.get<CondicionEgreso>(`/graduacion/alumno/${alumnoId}/condicion`)

export const crearProcesoGraduacion = (alumno_id: number) =>
  api.post<ProcesoGraduacion>('/graduacion/procesos', { alumno_id })

export const asignarTutor = (procesoId: number, tutor_id: number) =>
  api.put<ProcesoGraduacion>(`/graduacion/procesos/${procesoId}/tutor`, { tutor_id })

export const actualizarEtapa = (procesoId: number, etapaId: number, estado: string, observaciones?: string) =>
  api.put<EtapaTesis>(`/graduacion/procesos/${procesoId}/etapas/${etapaId}`, { estado, observaciones })

export const getEtapasProceso = (procesoId: number) =>
  api.get<EtapaTesis[]>(`/graduacion/procesos/${procesoId}/etapas`)

export interface VerificacionSolvencia {
  id: number
  proceso_id: number
  solvencia_financiera: boolean
  solvencia_biblioteca: boolean
  fecha_verificacion: string
}

export const getSolvencia = (procesoId: number) =>
  api.get<VerificacionSolvencia[]>(`/graduacion/procesos/${procesoId}/solvencia`)