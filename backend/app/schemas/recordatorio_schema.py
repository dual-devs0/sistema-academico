from pydantic import BaseModel
from datetime import datetime


class RecordatorioCreate(BaseModel):
    titulo: str
    descripcion: str | None = None
    fecha: datetime
    materia_id: int | None = None


class RecordatorioUpdate(BaseModel):
    titulo: str | None = None
    descripcion: str | None = None
    fecha: datetime | None = None
    materia_id: int | None = None
    completado: bool | None = None


class RecordatorioOut(BaseModel):
    id: int
    profesor_id: int
    titulo: str
    descripcion: str | None = None
    fecha: datetime
    materia_id: int | None = None
    completado: bool

    model_config = {"from_attributes": True}
