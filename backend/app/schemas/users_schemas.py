from pydantic import BaseModel, Field, field_validator
from datetime import datetime, date
import re


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
    csrf_token: str | None = None
    refresh_token: str | None = None


class RefreshRequest(BaseModel):
    refresh_token: str | None = None


class RecuperarRequest(BaseModel):
    username_or_email: str = Field(min_length=1, max_length=200)

    @field_validator("username_or_email")
    @classmethod
    def validar_email_o_usuario(cls, v: str) -> str:
        value = v.strip()
        if "@" in value:
            if not re.match(
                r"^[^@\s]+@[^@\s]+\.[^@\s]+$", value
            ):
                raise ValueError("El email no es válido.")
        return value


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=10, max_length=500)
    new_password: str = Field(min_length=8, max_length=100)

    @field_validator("new_password")
    @classmethod
    def contraseña_fuerte(cls, v: str) -> str:
        if not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
            raise ValueError(
                "La contraseña debe tener al menos 8 caracteres e incluir letras y números."
            )
        return v


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=100)

    @field_validator("new_password")
    @classmethod
    def contraseña_fuerte(cls, v: str) -> str:
        if not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
            raise ValueError(
                "La contraseña debe tener al menos 8 caracteres e incluir letras y números."
            )
        return v


class RegistroRequest(BaseModel):
    documento: str
    matricula: str
    tipo_documento_extranjero: str | None = None
    pais_documento: str | None = None


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
