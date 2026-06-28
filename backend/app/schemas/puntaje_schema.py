from pydantic import BaseModel
from datetime import datetime

class PuntajeBase(BaseModel):
    user_id: int
    materia_id: int
    tipo: str
    valor: float

class PuntajeCreate(PuntajeBase):
    pass

class PuntajeOut(PuntajeBase):
    id: int
    editado_por: int | None = None
    editado_en: datetime | None = None

    model_config = {"from_attributes": True}
