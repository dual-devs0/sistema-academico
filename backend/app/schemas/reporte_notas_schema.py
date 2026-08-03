from pydantic import BaseModel


class AlumnoReporteOut(BaseModel):
    user_id: int
    nombre: str
    cedula: str | None = None
    carrera_nombre: str | None = None


class MetricasReporteOut(BaseModel):
    promedio_general: float | None = None
    materias_aprobadas: int
    total_materias_plan: int | None = None
    materias_aprobadas_plan: int | None = None
    avance_pct: int | None = None
    faltan: int | None = None


class PesosOut(BaseModel):
    parcial1: float
    parcial2: float
    practico: float
    final: float


class MateriaSemestreOut(BaseModel):
    materia_id: int
    materia_nombre: str
    promedio: float
    felicitado: bool
    aprobado: bool
    recursada: bool
    parcial1: float | None = None
    parcial2: float | None = None
    practico: float | None = None
    final1: float | None = None
    final2: float | None = None
    final3: float | None = None
    directa: float | None = None
    pesos: PesosOut | None = None


class SemestreOut(BaseModel):
    periodo: str
    materias: list[MateriaSemestreOut]


class IntentoRecursadaOut(BaseModel):
    periodo: str
    promedio: float
    felicitado: bool
    aprobado: bool
    vigente: bool


class RecursadaOut(BaseModel):
    materia_id: int
    materia_nombre: str
    intentos: list[IntentoRecursadaOut]


class ReporteNotasOut(BaseModel):
    alumno: AlumnoReporteOut
    metricas: MetricasReporteOut
    periodos_disponibles: list[str]
    semestres: list[SemestreOut]
    recursadas: list[RecursadaOut]
