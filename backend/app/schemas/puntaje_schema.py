from typing import Literal
from pydantic import BaseModel, Field, model_validator
from datetime import datetime

TipoEvaluacion = Literal["parcial1", "parcial2", "practico", "final1", "final2", "final3", "directa"]


class PuntajeBase(BaseModel):
    user_id: int
    materia_id: int
    tipo: TipoEvaluacion
    valor: float = Field(ge=0, le=50)
    # Solo válido junto con tipo="directa" — nota final entera 1-5 (Art. 24
    # Reglamento UCA) cargada directo por el profesor sin desglose,
    # felicitado=True marca "5F" (5 Felicitado, el maximo real de la escala).
    felicitado: bool = False

    @model_validator(mode="after")
    def _felicitado_solo_directa(self):
        if self.felicitado and self.tipo != "directa":
            raise ValueError("'felicitado' solo aplica a notas de tipo 'directa'")
        if self.tipo == "directa" and (self.valor < 1 or self.valor > 5 or self.valor != int(self.valor)):
            raise ValueError("La nota directa es un entero de 1 a 5")
        return self


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
    final1: float | None = None
    final2: float | None = None
    final3: float | None = None
    directa: float | None = None
    felicitado: bool = False
    promedio_final: float | None = None


class AlumnoExportRow(BaseModel):
    user_id: int
    nombre: str
    username: str
    parcial1: float | None = None
    parcial2: float | None = None
    practico: float | None = None
    final1: float | None = None
    final2: float | None = None
    final3: float | None = None
    directa: float | None = None
    felicitado: bool = False
    promedio: float | None = None
    asistencia_pct: float | None = None


class ExportacionMateriaOut(BaseModel):
    materia_id: int
    materia_nombre: str
    alumnos: list[AlumnoExportRow]


class PesoEvaluacionOut(BaseModel):
    materia_id: int
    parcial1_max: float
    parcial2_max: float
    practico_max: float
    final_max: float
    updated_by: int | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class PesoEvaluacionUpdate(BaseModel):
    parcial1_max: float = Field(gt=0)
    parcial2_max: float = Field(gt=0)
    practico_max: float = Field(gt=0)
    final_max: float = Field(gt=0)

    @model_validator(mode="after")
    def _suma_100(self):
        total = self.parcial1_max + self.parcial2_max + self.practico_max + self.final_max
        if round(total, 2) != 100:
            raise ValueError(f"Los pesos deben sumar 100 puntos (suma actual: {total})")
        return self
