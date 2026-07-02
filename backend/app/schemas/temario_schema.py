from pydantic import BaseModel
from typing import Any

class BibliografiaItem(BaseModel):
    autor: str
    titulo: str
    anio: int | None = None
    tipo: str = "libro"  # libro, articulo, video, link

class TemarioBase(BaseModel):
    materia_id: int
    semana: int
    titulo: str
    descripcion: str | None = None
    bibliografia: list[BibliografiaItem] | None = None

class TemarioCreate(TemarioBase):
    pass

class TemarioUpdate(BaseModel):
    semana: int | None = None
    titulo: str | None = None
    descripcion: str | None = None
    bibliografia: list[BibliografiaItem] | None = None

class TemarioOut(TemarioBase):
    id: int
    bibliografia: Any = None

    model_config = {"from_attributes": True}
