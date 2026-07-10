from pydantic import BaseModel


class CerrarMateriaIn(BaseModel):
    alumno_id: int
    oferta_materia_id: int


class ExpedienteMateriaOut(BaseModel):
    id: int
    alumno_id: int
    materia_id: int
    materia_nombre: str
    periodo: str
    nota_final: float
    creditos: int
    condicion: str

    model_config = {"from_attributes": True}


class ExpedienteSemestreOut(BaseModel):
    periodo: str
    ppa_periodo: float | None
    creditos_periodo: int
    materias_aprobadas: int
    materias_reprobadas: int

    model_config = {"from_attributes": True}


class ExpedienteAlumnoOut(BaseModel):
    materias: list[ExpedienteMateriaOut]
    semestres: list[ExpedienteSemestreOut]


class PPAOut(BaseModel):
    ppa: float | None
    creditos_computados: int


class RegularidadOut(BaseModel):
    estado: str
    motivo: str | None
    ppa_acumulado: float | None
