from pydantic import BaseModel

class OfertaMateriaBase(BaseModel):
    materia_id: int
    profesor_id: int
    periodo: str

class OfertaMateriaCreate(OfertaMateriaBase):
    activa: bool | None = True

class OfertaMateriaOut(OfertaMateriaBase):
    id: int
    activa: bool
    materia_nombre: str | None = None
    profesor_nombre: str | None = None

    model_config = {"from_attributes": True}
