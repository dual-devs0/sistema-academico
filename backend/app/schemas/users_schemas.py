from pydantic import BaseModel, ConfigDict

class UserBase(BaseModel):
    username: str
    role: str

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: int

    # Configuración Pydantic v2
    model_config = ConfigDict(from_attributes=True)
