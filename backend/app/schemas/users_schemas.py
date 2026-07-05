from pydantic import BaseModel, Field
from datetime import datetime

class UserBase(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    role: str
    nombre: str | None = None
    email: str | None = None
    carrera_id: int | None = None
    es_becado: bool | None = None

class UserCreate(UserBase):
    password: str = Field(min_length=6, max_length=100)

class UserUpdate(BaseModel):
    nombre: str | None = None
    email: str | None = None
    carrera_id: int | None = None
    es_becado: bool | None = None
    role: str | None = None
    password: str | None = Field(None, min_length=6, max_length=100)

class LoginRequest(BaseModel):
    username: str
    password: str

class RecuperarRequest(BaseModel):
    username_or_email: str

class UserOut(BaseModel):
    id: int
    username: str
    role: str
    nombre: str | None = None
    email: str | None = None
    carrera_id: int | None = None
    es_becado: bool | None = None
    foto_url: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}
