from pydantic import BaseModel

class InscripcionBase(BaseModel):
    alumno_id: int
    materia_id: int

class InscripcionCreate(InscripcionBase):
    pass

class InscripcionOut(BaseModel):
    id: int
    alumno_id: int
    materia_id: int
    oferta_materia_id: int

    model_config = {"from_attributes": True}
