from pydantic import BaseModel
from datetime import datetime

class ForoHiloCreate(BaseModel):
    materia_id: int
    titulo: str
    descripcion: str | None = None

class ForoHiloUpdate(BaseModel):
    titulo: str | None = None
    descripcion: str | None = None
    fijado: bool | None = None
    cerrado: bool | None = None

class ForoMensajeCreate(BaseModel):
    contenido: str

class ForoMensajeUpdate(BaseModel):
    contenido: str

class ForoMensajeOut(BaseModel):
    id: int
    hilo_id: int
    user_id: int
    nombre_usuario: str | None = None
    contenido: str
    created_at: datetime | None = None

    model_config = {"from_attributes": True}

class ForoMensajesListOut(BaseModel):
    items: list[ForoMensajeOut]
    total: int

class ForoHiloOut(BaseModel):
    id: int
    materia_id: int
    titulo: str
    descripcion: str | None = None
    creado_por: int
    nombre_creador: str | None = None
    fijado: bool = False
    cerrado: bool = False
    created_at: datetime | None = None
    mensajes: list[ForoMensajeOut] = []

    model_config = {"from_attributes": True}
