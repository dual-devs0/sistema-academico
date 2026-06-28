from pydantic import BaseModel

class MateriaBase(BaseModel):
    nombre: str

class MateriaCreate(MateriaBase):
    profesor_id: int

class MateriaOut(MateriaBase):
    id: int
    profesor_id: int

    class Config:
        orm_mode = True
