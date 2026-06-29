from pydantic import BaseModel, ConfigDict

class TemarioBase(BaseModel):
    materia_id: int
    semana: int
    titulo: str
    descripcion: str | None = None

class TemarioCreate(TemarioBase):
    pass

class TemarioOut(TemarioBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
