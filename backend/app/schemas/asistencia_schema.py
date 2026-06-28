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
