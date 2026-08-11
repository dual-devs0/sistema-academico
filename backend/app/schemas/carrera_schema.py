from pydantic import BaseModel


class CarreraBase(BaseModel):
    nombre: str
    duracion_semestres: int | None = None
    creditos_totales: int | None = None


class CarreraCreate(CarreraBase):
    pass


class CarreraOut(CarreraBase):
    id: int

    model_config = {"from_attributes": True}
