from pydantic import BaseModel

class MateriaBase(BaseModel):
    nombre: str
    profesor_id: int

class MateriaCreate(MateriaBase):
    pass

class MateriaOut(MateriaBase):
    id: int
    model_config = {"from_attributes": True}

class InscripcionBase(BaseModel):
    alumno_id: int
    materia_id: int

class InscripcionCreate(InscripcionBase):
    pass

class InscripcionOut(InscripcionBase):
    id: int
    model_config = {"from_attributes": True}