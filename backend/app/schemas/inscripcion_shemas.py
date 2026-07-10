from pydantic import BaseModel



class InscripcionBase(BaseModel):
    alumno_id: int
    materia_id: int


class InscripcionCreate(InscripcionBase):
    override_mora: bool = (
        False  # solo admin puede usar; se registra en auditoria_override_mora
    )


class InscripcionOut(BaseModel):
    id: int
    alumno_id: int
    materia_id: int
    oferta_materia_id: int

    model_config = {"from_attributes": True}
