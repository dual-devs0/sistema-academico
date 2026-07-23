from typing import Literal
from pydantic import BaseModel
from datetime import datetime

Visibilidad = Literal["publico", "privado", "solo_materia"]
TipoContenido = Literal["pdf", "video", "imagen", "link", "documento", "otro"]


class ApunteBase(BaseModel):
    user_id: int
    materia_id: int
    titulo: str
    descripcion: str | None = None
    archivo_url: str
    tags: str | None = None
    aprobado: bool | None = None
    tipo_contenido: TipoContenido = "pdf"
    visibilidad: Visibilidad = "publico"


class ApunteCreate(ApunteBase):
    pass


class ApunteUpdate(BaseModel):
    titulo: str | None = None
    descripcion: str | None = None
    archivo_url: str | None = None
    tags: str | None = None
    tipo_contenido: TipoContenido | None = None
    visibilidad: Visibilidad | None = None


class ApunteOut(ApunteBase):
    id: int
    likes: int = 0
    descargas: int = 0
    fecha_subida: datetime | None = None

    model_config = {"from_attributes": True}


class ApunteSearchParams(BaseModel):
    q: str | None = None
    materia_id: int | None = None
    tipo_contenido: TipoContenido | None = None
    aprobado: bool | None = None


class ValidarRequest(BaseModel):
    titulo: str
    descripcion: str | None = None
    tags: str | None = None
    tipo_contenido: TipoContenido = "pdf"
    materia_id: int


class ValidarResponse(BaseModel):
    valido: bool
    advertencias: list[str]
