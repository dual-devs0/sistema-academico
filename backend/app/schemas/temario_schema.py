from pydantic import BaseModel

class TemarioBase(BaseModel):
    materia_id: int
    semana: int
    titulo: str
    descripcion: str | None = None

class TemarioCreate(TemarioBase):
    pass

class TemarioOut(TemarioBase):
    id: int

    model_config = {"from_attributes": True}
