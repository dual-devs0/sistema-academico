from pydantic import BaseModel, Field
from datetime import date


class AsistenciaBase(BaseModel):
    user_id: int
    materia_id: int
    fecha: date
    presente: bool
    es_becado: bool | None = None


class AsistenciaCreate(AsistenciaBase):
    pass


class AsistenciaOut(AsistenciaBase):
    id: int
    materia_nombre: str | None = None

    model_config = {"from_attributes": True}


# ─── Módulo 4.2 — Carga masiva ────────────────────────────────────────────────


class RegistroIndividual(BaseModel):
    """Un renglón de la planilla: alumno + presente/ausente."""

    user_id: int
    presente: bool


class AsistenciaLote(BaseModel):
    """Body del request de carga masiva de una clase completa."""

    materia_id: int
    fecha: date
    registros: list[RegistroIndividual] = Field(..., min_length=1)


class AsistenciaLoteResponse(BaseModel):
    """Resumen del resultado de la carga masiva."""

    guardados: int
    actualizados: int
    total: int


class AlumnoAsistenciaOut(BaseModel):
    """Porcentaje de asistencia de un alumno en una materia."""

    user_id: int
    nombre: str
    username: str
    es_becado: bool
    total_clases: int
    presentes: int
    porcentaje: float

    model_config = {"from_attributes": True}


class PorcentajeGlobalOut(BaseModel):
    """Porcentaje de asistencia de un alumno en todas sus materias."""

    materia_id: int
    nombre_materia: str
    total_clases: int
    presentes: int
    porcentaje: float


# ─── Módulo QR asistencia ────────────────────────────────────────────────────


class QrVerifyRequest(BaseModel):
    """Token JWT firmado por el profesor que abre el registro de asistencia."""

    qr_token: str


class QrVerifyResponse(BaseModel):
    """Confirmación de registro de asistencia del alumno + conteo en vivo."""

    materia_nombre: str
    fecha: date
    hora_registro: str  # HH:MM
    presentes: int
    ausentes: int


class QrGenerateResponse(BaseModel):
    """Datos para mostrar el QR al profesor."""

    qr_base64: str
    token: str
    scan_url: str
    expira_en: int


class ProfesorAlumnoOut(BaseModel):
    """Alumno con su estado de asistencia para una fecha dada."""

    id: int
    nombre: str
    documento: str
    asistencia_id: int | None = None
    presente: bool | None = None
    es_becado: bool = False
    motivo: str | None = None


class ProfesorAlumnosResponse(BaseModel):
    """Respuesta del endpoint de alumnos por materia+fecha."""

    fecha: str
    materia: str
    alumnos: list[ProfesorAlumnoOut]
