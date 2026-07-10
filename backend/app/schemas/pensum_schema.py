from pydantic import BaseModel


class PensumMateriaCreate(BaseModel):
    materia_id: int
    semestre: int
    creditos: int
    es_electiva: bool | None = False


class PensumMateriaOut(BaseModel):
    id: int
    carrera_id: int
    materia_id: int
    materia_nombre: str | None = None
    semestre: int
    creditos: int
    es_electiva: bool

    model_config = {"from_attributes": True}


class CorrelatividadCreate(BaseModel):
    materia_id: int
    prerrequisito_id: int
    tipo: str  # 'aprobada' | 'cursando'


class CorrelatividadOut(BaseModel):
    id: int
    materia_id: int
    prerrequisito_id: int
    tipo: str

    model_config = {"from_attributes": True}


class PendienteOut(BaseModel):
    materia_id: int
    materia_nombre: str
    tipo: str


class AvanceMateriaOut(BaseModel):
    pensum_materia_id: int
    materia_id: int
    materia_nombre: str
    semestre: int
    creditos: int
    estado: str
    pendientes: list[PendienteOut] = []


class CreditosAlumnoOut(BaseModel):
    creditos_acumulados: int
    creditos_totales: int | None = None
