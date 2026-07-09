from pydantic import BaseModel, Field
from datetime import time


class HorarioBase(BaseModel):
    materia_id: int
    dia_semana: int = Field(ge=0, le=6)
    hora_inicio: time
    hora_fin: time
    aula: str | None = None


class HorarioCreate(HorarioBase):
    pass


class HorarioOut(HorarioBase):
    id: int
    materia_nombre: str | None = None

    model_config = {"from_attributes": True}
