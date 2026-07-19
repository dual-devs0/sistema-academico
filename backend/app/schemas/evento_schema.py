from typing import Literal
from pydantic import BaseModel, Field
from datetime import date

TipoEvento = Literal["parcial", "final", "feriado", "asueto", "entrega", "actividad"]


class EventoBase(BaseModel):
    titulo: str
    tipo: TipoEvento
    fecha: date
    fecha_fin: date | None = None
    materia_id: int | None = None
    carrera_id: int | None = None
    descripcion: str | None = None
    anio: int | None = None
    semestre: int | None = None
    archivo_pdf: str | None = None


class EventoCreate(EventoBase):
    pass


class EventoUpdate(BaseModel):
    titulo: str | None = None
    tipo: TipoEvento | None = None
    fecha: date | None = None
    fecha_fin: date | None = None
    materia_id: int | None = None
    carrera_id: int | None = None
    descripcion: str | None = None
    anio: int | None = None
    semestre: int | None = None


class EventoOut(EventoBase):
    id: int
    creado_por: int | None = None

    model_config = {"from_attributes": True}


class EventoDiaOut(BaseModel):
    """Eventos agrupados por tipo para un día específico."""

    fecha: date
    eventos: list[EventoOut]


class EventoMesOut(BaseModel):
    anio: int
    mes: int
    dias: dict[str, list[EventoOut]]  # "2026-07-02" -> [EventoOut, ...]


class CargaPdfRequest(BaseModel):
    pdf_base64: str = Field(..., description="PDF del calendario académico en base64")
    nombre_archivo: str = "calendario.pdf"
    anio: int
    semestre: int
    instrucciones: str | None = Field(
        None,
        description="Instrucciones extra para Gemini (ej. 'la cursada empieza en marzo')",  # noqa: E501
    )


class EventoGemini(BaseModel):
    """Formato que devuelve Gemini para cada evento parseado."""

    titulo: str
    tipo: TipoEvento
    fecha: str  # YYYY-MM-DD
    fecha_fin: str | None = None
    descripcion: str | None = None


class CargaPdfResponse(BaseModel):
    procesados: int
    eventos: list[EventoOut]
    errores: list[str] = []
