from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from sqlalchemy import (
    Boolean,
    Integer,
    String,
    Numeric,
    DateTime,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.database import Base


# Nota individual por tipo de evaluación (parcial1/parcial2/practico/final1-3), puntos crudos.
# Fuente del motor de notas — ver services/puntajes_utils.py::calcular_promedio_final.
class Puntaje(Base):
    __tablename__ = "puntajes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    oferta_materia_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("ofertas_materia.id"), nullable=False, index=True
    )
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)  # parcial1, parcial2, practico, final, directa
    valor: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    # Solo aplica a tipo="directa": nota final cargada directo por el profesor (0-10),
    # sin pasar por el desglose parcial/practico/final. felicitado=True -> "5F" (5 Felicitado).
    felicitado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    editado_por: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    editado_en: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    oferta = relationship("OfertaMateria")

    @property
    def materia_id(self):
        return self.oferta.materia_id if self.oferta else None

    __table_args__ = (
        UniqueConstraint(
            "user_id", "oferta_materia_id", "tipo", name="uq_puntaje_user_oferta_tipo"
        ),
    )
