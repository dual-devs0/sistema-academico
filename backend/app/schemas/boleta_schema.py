from typing import Literal
from pydantic import BaseModel

EstadoMateria = Literal["aprobado", "reprobado", "cursando"]


class ResumenAcademicoOut(BaseModel):
    promedioGlobal: float
    materiasAprobadas: int
    materiasTotales: int
    avanceCarreraPct: int
    faltanParaGraduarse: int


class MateriaOut(BaseModel):
    id: str
    nombre: str
    p1: float | None = None
    p2: float | None = None
    tp: float | None = None
    final: float | None = None
    promedio: float
    estado: EstadoMateria


class SemestrePeriodoOut(BaseModel):
    anio: int
    semestre: int
    etiqueta: str
    promedioSemestre: float
    materias: list[MateriaOut]


class BoletaDataOut(BaseModel):
    resumen: ResumenAcademicoOut
    periodos: list[SemestrePeriodoOut]
