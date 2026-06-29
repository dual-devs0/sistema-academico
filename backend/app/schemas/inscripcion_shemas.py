from pydantic import BaseModel

class InscripcionBase(BaseModel):
    alumno_id: int
    materia_id: int

class InscripcionCreate(InscripcionBase):
    pass

class InscripcionOut(InscripcionBase):
    id: int

    model_config = {"from_attributes": True}
