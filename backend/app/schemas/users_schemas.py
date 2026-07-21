from pydantic import BaseModel, Field
from datetime import datetime, date


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
    fecha_ingreso: date | None = None
    cv: str | None = None
    activo: bool | None = None


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    refresh_token: str | None = None  # solo para clientes móviles


class RefreshRequest(BaseModel):
    refresh_token: str | None = None


class RecuperarRequest(BaseModel):
    username_or_email: str


class RegistroRequest(BaseModel):
    documento: str
    matricula: str


class UserOut(BaseModel):
    id: int
    username: str
    role: str
    nombre: str | None = None
    email: str | None = None
    carrera_id: int | None = None
    es_becado: bool | None = None
    foto_url: str | None = None
    fecha_ingreso: date | None = None
    cv: str | None = None
    activo: bool = True
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class UserListOut(BaseModel):
    items: list[UserOut]
    total: int


class AlumnoSimpleOut(BaseModel):
    id: int
    nombre: str
    username: str
    role: str

    model_config = {"from_attributes": True}


class StudentSummary(BaseModel):
    creditos_aprobados: int
    creditos_pendientes: int
    creditos_totales: int
    promedio_general: float | None = None
    asistencia_promedio: float | None = None
    avance_porcentaje: float
    estado_financiero: str
    regularidad_activa: bool
    materias_cursando: int
    carrera_nombre: str | None = None
    semestre_actual: int
