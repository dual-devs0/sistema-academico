from pydantic import BaseModel, ConfigDict


class InscripcionBase(BaseModel):
    alumno_id: int
    materia_id: int

class InscripcionCreate(InscripcionBase):
    pass

class InscripcionOut(InscripcionBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
