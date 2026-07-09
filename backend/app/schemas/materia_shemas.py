from pydantic import BaseModel, ConfigDict


class MateriaBase(BaseModel):
    nombre: str


class MateriaCreate(MateriaBase):
    carrera_id: int | None = None
    anio: int | None = None
    semestre: int | None = None
    creditos: int | None = None
    cupos: int | None = None
    horario: str | None = None
    secciones: int | None = None


class MateriaUpdate(BaseModel):
    nombre: str | None = None
    carrera_id: int | None = None
    anio: int | None = None
    semestre: int | None = None
    creditos: int | None = None
    cupos: int | None = None
    horario: str | None = None
    secciones: int | None = None


class MateriaOut(MateriaBase):
    id: int
    carrera_id: int | None = None
    anio: int | None = None
    semestre: int | None = None
    creditos: int | None = None
    cupos: int | None = None
    horario: str | None = None
    secciones: int | None = None
    inscritos: int | None = None
    profesor_id: int | None = None
    profesor_nombre: str | None = None
    carrera_nombre: str | None = None

    model_config = {"from_attributes": True}
