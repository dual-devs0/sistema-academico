from pydantic import BaseModel

class ProgramaBase(BaseModel):
    materia_id: int
    semana: int
    titulo: str
    descripcion: str | None = None

class ProgramaCreate(ProgramaBase):
    pass

class ProgramaOut(ProgramaBase):
    id: int

    model_config = {"from_attributes": True}
