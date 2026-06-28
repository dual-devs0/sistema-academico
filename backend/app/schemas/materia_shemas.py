from pydantic import BaseModel, ConfigDict

class MateriaBase(BaseModel):
    nombre: str

class MateriaCreate(MateriaBase):
    profesor_id: int

class MateriaOut(MateriaBase):
    id: int
    profesor_id: int

    # Configuración Pydantic v2
    model_config = ConfigDict(from_attributes=True)
