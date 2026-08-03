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


class MateriaSemestreOut(BaseModel):
    materia_id: int
    materia_nombre: str
    promedio: float
    felicitado: bool
    aprobado: bool
    recursada: bool


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
