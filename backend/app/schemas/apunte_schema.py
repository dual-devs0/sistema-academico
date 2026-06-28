from pydantic import BaseModel

class ApunteBase(BaseModel):
    user_id: int
    materia_id: int
    titulo: str
    archivo_url: str
    tags: str | None = None
    aprobado: bool | None = None

class ApunteCreate(ApunteBase):
    pass

class ApunteOut(ApunteBase):
    id: int

    model_config = {"from_attributes": True}
