from pydantic import BaseModel, ConfigDict

class CarreraBase(BaseModel):
    nombre: str

class CarreraCreate(CarreraBase):
    pass

class CarreraOut(CarreraBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
