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


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    refresh_token: str | None = None  # solo para clientes móviles


class RefreshRequest(BaseModel):
    refresh_token: str | None = None


class RecuperarRequest(BaseModel):
    username_or_email: str
    matricula: str | None = None  # verificación adicional opcional


class UserOut(BaseModel):
    id: int
    username: str
    role: str
    nombre: str | None = None
    email: str | None = None
    carrera_id: int | None = None
    carrera_nombre: str | None = None   # nombre de la carrera (join)
    semestre: int | None = None          # semestre actual de la carrera
    legajo: str | None = None            # legajo real del alumno (= username para esta institución)
    fuente_beca: str | None = None       # fuente de la beca si es becado
    es_becado: bool | None = None
    foto_url: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class UserListOut(BaseModel):
    items: list[UserOut]
    total: int


class RegistroRequest(BaseModel):
    """Solicitud de registro de nuevo alumno."""
    documento: str = Field(..., min_length=5, max_length=20)
    matricula: str = Field(..., min_length=3, max_length=30)
    documento_extranjero: str | None = None
    pais_documento: str | None = None


class RegistroResponse(BaseModel):
    detail: str
    solicitud_id: int | None = None


class StudentSummary(BaseModel):
    """Resumen académico completo del alumno para el Dashboard."""
    creditos_aprobados: int
    creditos_pendientes: int
    creditos_totales: int
    promedio_general: float | None
    asistencia_promedio: float | None
    avance_porcentaje: float
    estado_financiero: str        # "al_dia" | "pendiente" | "vencido"
    regularidad_activa: bool
    materias_cursando: int
    carrera_nombre: str | None
    semestre_actual: int | None
