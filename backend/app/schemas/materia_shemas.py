from pydantic import BaseModel, ConfigDict

class MateriaBase(BaseModel):
    nombre: str

class MateriaCreate(MateriaBase):
    profesor_id: int
    carrera_id: int | None = None
    anio: int | None = None
    semestre: int | None = None

class MateriaOut(MateriaBase):
    id: int
    profesor_id: int
    carrera_id: int | None = None
    anio: int | None = None
    semestre: int | None = None

    model_config = ConfigDict(from_attributes=True)
