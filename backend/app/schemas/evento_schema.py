from pydantic import BaseModel, ConfigDict
from datetime import date

class EventoBase(BaseModel):
    titulo: str
    tipo: str
    fecha: date
    materia_id: int | None = None
    carrera_id: int | None = None
    descripcion: str | None = None
    creado_por: int | None = None

class EventoCreate(EventoBase):
    pass

class EventoOut(EventoBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
