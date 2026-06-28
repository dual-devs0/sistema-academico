from pydantic import BaseModel, ConfigDict
from datetime import datetime

class UserBase(BaseModel):
    username: str
    role: str
    nombre: str | None = None
    email: str | None = None
    carrera_id: int | None = None
    es_becado: bool | None = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    nombre: str | None = None
    email: str | None = None
    carrera_id: int | None = None
    es_becado: bool | None = None
    role: str | None = None
    password: str | None = None

class LoginRequest(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    role: str
    nombre: str | None = None
    email: str | None = None
    carrera_id: int | None = None
    es_becado: bool | None = None
    created_at: datetime | None = None

    # Configuración Pydantic v2
    model_config = ConfigDict(from_attributes=True)
