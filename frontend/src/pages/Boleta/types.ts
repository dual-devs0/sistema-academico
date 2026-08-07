export interface ResumenAcademico {
  promedioGlobal: number
  materiasAprobadas: number
  materiasTotales: number
  avanceCarreraPct: number
  faltanParaGraduarse: number
}

export interface Materia {
  id: string
  nombre: string
  p1?: number | null
  p2?: number | null
  tp?: number | null
  final?: number | null
  promedio: number
  estado: 'aprobado' | 'reprobado' | 'cursando'
}

export interface SemestrePeriodo {
  anio: number
  semestre: 1 | 2
  etiqueta: string
  promedioSemestre: number
  materias: Materia[]
}

export interface BoletaData {
  resumen: ResumenAcademico
  periodos: SemestrePeriodo[]
}

export type FiltroVista = 'todos' | 'por_anio' | 'por_semestre'
export type PdfScope = 'global' | 'anio' | 'semestre_actual'
