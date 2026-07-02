from pydantic import BaseModel
from datetime import date

class AsistenciaBase(BaseModel):
    user_id: int
    materia_id: int
    fecha: date
    presente: bool
    es_becado: bool | None = None

class AsistenciaCreate(AsistenciaBase):
    pass

class AsistenciaOut(AsistenciaBase):
    id: int

    model_config = {"from_attributes": True}

class RegistroIndividual(BaseModel):
    user_id: int
    presente: bool

class AsistenciaLote(BaseModel):
    materia_id: int
    fecha: date
    registros: list[RegistroIndividual]

class AlumnoAsistenciaOut(BaseModel):
    user_id: int
    nombre: str
    username: str
    es_becado: bool
    total_clases: int
    presentes: int
    porcentaje: float

class AsistenciaLoteResponse(BaseModel):
    guardados: int
    actualizados: int
