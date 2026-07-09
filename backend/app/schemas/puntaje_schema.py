from typing import Literal
from pydantic import BaseModel, Field
from datetime import datetime

TipoEvaluacion = Literal["parcial1", "parcial2", "practico", "final"]


class PuntajeBase(BaseModel):
    user_id: int
    materia_id: int
    tipo: TipoEvaluacion
    valor: float = Field(ge=0, le=10)


class PuntajeCreate(PuntajeBase):
    pass


class PuntajeOut(PuntajeBase):
    id: int
    editado_por: int | None = None
    editado_en: datetime | None = None
    materia_nombre: str | None = None

    model_config = {"from_attributes": True}


class PromedioFinalOut(BaseModel):
    user_id: int
    nombre: str
    parcial1: float | None = None
    parcial2: float | None = None
    practico: float | None = None
    final: float | None = None
    promedio_final: float | None = None


class AlumnoExportRow(BaseModel):
    user_id: int
    nombre: str
    username: str
    parcial1: float | None = None
    parcial2: float | None = None
    practico: float | None = None
    final: float | None = None
    promedio: float | None = None
    asistencia_pct: float | None = None


class ExportacionMateriaOut(BaseModel):
    materia_id: int
    materia_nombre: str
    alumnos: list[AlumnoExportRow]
